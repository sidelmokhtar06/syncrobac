import { accessToken, currentUser } from './auth'
import { db, today } from './db'
import { uuid } from './uuid'

// What the owner learns from the app, read in the admin (supabase/insights.sql):
// - feedback the student writes,
// - crash reports (message + stack + page, nothing personal),
// - anonymous usage: one row per phone per day with the features opened. The phone id is random
//   and linked to nothing. Students can turn it off in Réglages.

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const insightsAvailable = !!(URL && KEY)
export const APP_VERSION = __APP_VERSION__

const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    } catch {
      /* private mode */
    }
  },
}

/** Insert one row as the student (signed in) or anonymously. */
async function insert(table: string, body: object, keepalive = false) {
  const token = currentUser() ? await accessToken().catch(() => null) : null
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST',
    keepalive,
    headers: { apikey: KEY!, Authorization: `Bearer ${token ?? KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status}`)
}

// ── Feedback ────────────────────────────────────────────────────────────

export type FeedbackKind = 'idea' | 'bug' | 'content' | 'other'

export async function sendFeedback(kind: FeedbackKind, message: string, contact: string) {
  const s = await db.settings.get(1)
  await insert('feedback', {
    kind,
    message: message.trim().slice(0, 2000),
    contact: contact.trim().slice(0, 120) || null,
    context: { v: APP_VERSION, serie: s?.serie, lang: s?.lang, ua: navigator.userAgent.slice(0, 160), w: innerWidth },
  })
}

// ── Crash reports ───────────────────────────────────────────────────────
// Queued in localStorage so a crash while offline is sent later. At most 5 per launch.

const ERR_QUEUE = 'syncrobac-errors'
const reported = new Set<string>()

type ErrorReport = { message: string; stack?: string; page: string; app_version: string; user_agent: string }

const IGNORED = /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection|AbortError|NotAllowedError|Load failed|Failed to fetch|NetworkError/i
// After a new deploy, an old open tab asks for page chunks that no longer exist: reload once.
const STALE_CHUNK = /dynamically imported module|Importing a module script failed|error loading dynamically imported/i

export function reportError(error: unknown) {
  const e = error instanceof Error ? error : new Error(String(error))
  const message = `${e.name}: ${e.message}`.slice(0, 500)
  if (STALE_CHUNK.test(message) && !sessionStorage.getItem('syncrobac-reloaded')) {
    sessionStorage.setItem('syncrobac-reloaded', '1')
    location.reload()
    return
  }
  if (!insightsAvailable || IGNORED.test(message) || reported.has(message) || reported.size >= 5) return
  reported.add(message)
  const queue: ErrorReport[] = JSON.parse(ls.get(ERR_QUEUE) ?? '[]')
  queue.push({ message, stack: e.stack?.slice(0, 4000), page: location.pathname.slice(0, 200), app_version: APP_VERSION, user_agent: navigator.userAgent.slice(0, 300) })
  ls.set(ERR_QUEUE, JSON.stringify(queue.slice(-10)))
  flushErrors()
}

async function flushErrors() {
  const queue: ErrorReport[] = JSON.parse(ls.get(ERR_QUEUE) ?? '[]')
  if (!queue.length || !navigator.onLine) return
  ls.set(ERR_QUEUE, null)
  try {
    await insert('client_errors', queue)
  } catch {
    ls.set(ERR_QUEUE, JSON.stringify(queue)) // retry next launch / when back online
  }
}

// ── Anonymous usage ─────────────────────────────────────────────────────

const STATS_OFF = 'syncrobac-stats-off'
const USAGE = 'syncrobac-usage'
export const statsEnabled = () => ls.get(STATS_OFF) !== '1'
export const setStatsEnabled = (on: boolean) => ls.set(STATS_OFF, on ? null : '1')

const deviceId = () => {
  let id = ls.get('syncrobac-device')
  if (!id) ls.set('syncrobac-device', (id = uuid()))
  return id
}

type Usage = { day: string; features: string[]; sent: number }
const readUsage = (): Usage => {
  const u: Usage | null = JSON.parse(ls.get(USAGE) ?? 'null')
  return u?.day === today() ? u : { day: today(), features: [], sent: -1 }
}

let flushTimer: ReturnType<typeof setTimeout> | undefined

/** Notes that a feature was used today (e.g. 'focus', 'plan', 'focus_done'). Sent in the background. */
export function track(feature: string) {
  if (!insightsAvailable || !statsEnabled()) return
  const u = readUsage()
  if (!u.features.includes(feature)) u.features.push(feature)
  ls.set(USAGE, JSON.stringify(u))
  clearTimeout(flushTimer)
  flushTimer = setTimeout(flushUsage, 10_000)
}

async function flushUsage(keepalive = false) {
  const u = readUsage()
  if (!statsEnabled() || u.sent === u.features.length || !navigator.onLine) return
  const s = await db.settings.get(1)
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/track_day`, {
      method: 'POST',
      keepalive,
      headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_device: deviceId(), p_day: u.day, p_serie: s?.serie ?? null, p_lang: s?.lang ?? null, p_features: u.features }),
    })
    if (res.ok) ls.set(USAGE, JSON.stringify({ ...u, sent: u.features.length }))
  } catch {
    /* offline: next time */
  }
}

/** Global error listeners + background flushing. Call once at startup. */
export function startInsights() {
  addEventListener('error', (e) => reportError(e.error ?? e.message))
  addEventListener('unhandledrejection', (e) => reportError(e.reason))
  addEventListener('online', () => (flushErrors(), flushUsage()))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushUsage(true))
  if (insightsAvailable) {
    flushErrors()
    track('open')
  }
}
