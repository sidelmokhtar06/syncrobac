import type { Table } from 'dexie'
import { accessToken, currentUser, restCall, subscribeAuth } from './auth'
import { db, type Settings } from './db'
import { uuid } from './uuid'

// Offline-first sync. The phone is the source of truth: every change is written locally,
// stamped (`updatedAt`), and pushed to Supabase when online; changes from the student's other
// devices are pulled back. Per record, the most recent edit wins (same rule on the server).

export const COLLECTIONS = ['settings', 'tasks', 'sessions', 'days', 'chapters', 'customChapters', 'links', 'mistakes'] as const
type Collection = (typeof COLLECTIONS)[number]
type Row = Record<string, unknown>

const UID_TABLES: Collection[] = ['tasks', 'sessions', 'customChapters', 'links', 'mistakes']
// Settings that follow the student across devices (the running timer, dismissed cards… stay per device).
const SYNCED_SETTINGS = ['name', 'serie', 'lang', 'theme', 'dailyGoal', 'weeklyGoal', 'bacDate', 'bacCustom', 'durations', 'sound', 'keepAwake'] as const

const table = (c: Collection) => db.table(c) as Table<Row>
const recordId = (c: Collection, r: Row) => String(c === 'settings' ? 'me' : c === 'chapters' ? r.key : c === 'days' ? r.date : r.uid)
const stamp = (c: Collection, r: Row) => Number((c === 'settings' ? r.syncUpdatedAt : r.updatedAt) ?? 0)

// ── Change tracking (Dexie hooks) ───────────────────────────────────────
// Installed once at startup, signed in or not, so every record always has a uid and a stamp.

let applyingRemote = false // set while writing pulled data: those writes must not look like local edits

export function installSyncHooks() {
  for (const c of COLLECTIONS) {
    const t = table(c)
    t.hook('creating', function (_key, obj, tx) {
      if (applyingRemote) return
      if (UID_TABLES.includes(c)) obj.uid ??= uuid()
      if (c === 'settings') obj.syncUpdatedAt = Date.now()
      else obj.updatedAt = Date.now()
      tx.on('complete', scheduleSync)
    })
    t.hook('updating', function (mods, _key, _obj, tx) {
      if (applyingRemote) return
      if (c === 'settings') {
        // Only a change to a synced setting counts (timer ticks, dismissed cards… don't).
        if (!Object.keys(mods).some((k) => (SYNCED_SETTINGS as readonly string[]).includes(k))) return
        tx.on('complete', scheduleSync)
        return { syncUpdatedAt: Date.now() }
      }
      tx.on('complete', scheduleSync)
      return { updatedAt: Date.now() }
    })
    t.hook('deleting', function (_key, obj, tx) {
      if (applyingRemote || !obj) return
      const key = recordId(c, obj as Row)
      tx.on('complete', () => void db.deletions.add({ collection: c, key, at: Date.now() }).then(scheduleSync))
    })
  }
}

// ── Status (for the UI) ─────────────────────────────────────────────────

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'offline'
  lastSync: number | null
}
let status: SyncStatus = { state: 'idle', lastSync: null }
const statusListeners = new Set<() => void>()
const setStatus = (s: Partial<SyncStatus>) => {
  status = { ...status, ...s }
  statusListeners.forEach((f) => f())
}
export const syncStatus = () => status
export const subscribeSync = (fn: () => void) => (statusListeners.add(fn), () => void statusListeners.delete(fn))

// Per-account sync cursors (a different account on the same phone starts fresh).
const metaKey = () => `syncrobac-sync-${currentUser()?.id}`
const readMeta = (): { lastPushAt: number; lastPull: string; lastSync: number | null } => {
  try {
    return { lastPushAt: 0, lastPull: '1970-01-01T00:00:00Z', lastSync: null, ...JSON.parse(localStorage.getItem(metaKey()) ?? '{}') }
  } catch {
    return { lastPushAt: 0, lastPull: '1970-01-01T00:00:00Z', lastSync: null }
  }
}
const writeMeta = (m: ReturnType<typeof readMeta>) => {
  try {
    localStorage.setItem(metaKey(), JSON.stringify(m))
  } catch {
    /* ignore */
  }
}

// ── Push / pull ─────────────────────────────────────────────────────────

function serialize(c: Collection, r: Row) {
  let data: Row
  if (c === 'settings') data = Object.fromEntries(SYNCED_SETTINGS.map((k) => [k, r[k]]))
  else {
    const { id: _localId, ...rest } = r // local numeric ids differ per device
    data = UID_TABLES.includes(c) ? rest : r
  }
  return { collection: c, id: recordId(c, r), data, deleted: false, client_updated_at: stamp(c, r) }
}

async function push(meta: ReturnType<typeof readMeta>) {
  const startedAt = Date.now()
  const records: ReturnType<typeof serialize>[] = []
  for (const c of COLLECTIONS) {
    for (const r of await table(c).toArray()) if (stamp(c, r) > meta.lastPushAt) records.push(serialize(c, r))
  }
  const deletions = await db.deletions.toArray()
  // A record deleted then written again (e.g. restoring a backup = clear + put) is not deleted.
  const tombstones = []
  for (const d of deletions) {
    if (!(await findLocal(d.collection as Collection, d.key))) tombstones.push({ collection: d.collection, id: d.key, data: null, deleted: true, client_updated_at: d.at })
  }
  const all = [...records, ...tombstones]
  for (let i = 0; i < all.length; i += 500) {
    await restCall('rpc/sync_push', { method: 'POST', body: JSON.stringify({ records: all.slice(i, i + 500) }) })
  }
  if (deletions.length) await db.deletions.bulkDelete(deletions.map((d) => d.id!))
  meta.lastPushAt = startedAt
}

interface RemoteRow {
  collection: Collection
  id: string
  data: Row | null
  deleted: boolean
  client_updated_at: number
  updated_at: string
}

async function findLocal(c: Collection, id: string): Promise<Row | undefined> {
  if (c === 'settings') return db.settings.get(1) as Promise<Row | undefined>
  if (c === 'chapters' || c === 'days') return table(c).get(id)
  return table(c).where('uid').equals(id).first()
}

async function apply(rows: RemoteRow[]) {
  if (!rows.length) return
  await db.transaction('rw', COLLECTIONS.map((c) => db.table(c)), async () => {
    applyingRemote = true
    try {
      for (const r of rows) {
        if (!(COLLECTIONS as readonly string[]).includes(r.collection)) continue
        const local = await findLocal(r.collection, r.id)
        if (local && stamp(r.collection, local) >= r.client_updated_at) continue // local is newer: keep it
        const t = table(r.collection)
        if (r.deleted) {
          if (local) await t.delete(r.collection === 'settings' ? 1 : UID_TABLES.includes(r.collection) ? (local.id as number) : r.id)
          continue
        }
        if (r.collection === 'settings') {
          const current = ((await db.settings.get(1)) ?? {}) as Partial<Settings>
          await db.settings.put({ ...(current as Settings), ...(r.data as Partial<Settings>), id: 1, syncUpdatedAt: r.client_updated_at })
        } else if (UID_TABLES.includes(r.collection)) {
          await t.put({ ...r.data, ...(local ? { id: local.id } : {}), uid: r.id, updatedAt: r.client_updated_at })
        } else {
          await t.put({ ...r.data, updatedAt: r.client_updated_at })
        }
      }
    } finally {
      applyingRemote = false
    }
  })
}

// Pulls overlap the previous one by 2 minutes: two pushes landing at the same moment can commit
// out of timestamp order, and re-applying a row is harmless (same or older stamps are skipped).
const PULL_OVERLAP_MS = 2 * 60_000

async function pull(meta: ReturnType<typeof readMeta>) {
  let since = new Date(Math.max(0, Date.parse(meta.lastPull) - PULL_OVERLAP_MS)).toISOString()
  for (;;) {
    const rows = await restCall<RemoteRow[]>(
      `user_records?select=collection,id,data,deleted,client_updated_at,updated_at&updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc&limit=1000`,
    )
    await apply(rows)
    if (rows.length) meta.lastPull = since = rows[rows.length - 1].updated_at
    if (rows.length < 1000) break
  }
}

let running: Promise<void> | null = null

/** Push local changes, then pull remote ones. Safe to call often; concurrent calls share one run. */
export function syncNow(): Promise<void> {
  if (running) return running
  running = (async () => {
    if (!currentUser()) return
    if (!navigator.onLine || !(await accessToken())) return setStatus({ state: 'offline' })
    setStatus({ state: 'syncing' })
    try {
      const meta = readMeta()
      await push(meta)
      await pull(meta)
      meta.lastSync = Date.now()
      writeMeta(meta)
      setStatus({ state: 'idle', lastSync: meta.lastSync })
    } catch (e) {
      console.warn('[sync] failed, will retry', e)
      setStatus({ state: navigator.onLine ? 'error' : 'offline' })
    }
  })().finally(() => (running = null))
  return running
}

let timer: ReturnType<typeof setTimeout> | undefined
/** Debounced sync after local edits (a burst of edits = one request). */
export function scheduleSync() {
  if (!currentUser()) return
  clearTimeout(timer)
  timer = setTimeout(syncNow, 4000)
}

/** Starts background sync: on launch, every 3 minutes, when back online or back in the app, and right after login. */
export function startSync() {
  setStatus({ lastSync: currentUser() ? readMeta().lastSync : null })
  syncNow()
  setInterval(() => document.visibilityState === 'visible' && syncNow(), 3 * 60_000)
  window.addEventListener('online', () => syncNow())
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && syncNow())
  let wasSignedIn = !!currentUser()
  subscribeAuth(() => {
    const signedIn = !!currentUser()
    if (signedIn && !wasSignedIn) {
      setStatus({ lastSync: readMeta().lastSync })
      syncNow()
    }
    if (!signedIn) setStatus({ state: 'idle', lastSync: null })
    wasSignedIn = signedIn
  })
}
