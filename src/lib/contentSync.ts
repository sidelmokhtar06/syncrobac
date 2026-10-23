import { DEFAULT_CONTENT, fetchRemoteContent, remoteConfigured, setContent, type ContentBundle } from '../config/content'
import { db } from './db'

// Startup: apply the cached bundle before the first render (fast, offline), then
// refresh from Supabase in the background. Newer remote content is applied live.

const newer = (a: ContentBundle, b: ContentBundle) => a.version > b.version || (a.version === b.version && a.updatedAt > b.updatedAt)

export async function loadCachedContent() {
  try {
    const row = await db.content.get('bundle')
    // Ignore a cache older than the bundled defaults (e.g. after an app update).
    if (row && row.bundle.version >= DEFAULT_CONTENT.version) setContent(row.bundle)
  } catch {
    /* keep bundled defaults */
  }
}

let lastRefresh = 0

/** Coming back to the app: refresh if the last check is older than 30 minutes (new messages, papers…). */
export function refreshContentIfStale() {
  if (Date.now() - lastRefresh > 30 * 60_000) refreshContent()
}

export async function refreshContent() {
  if (!remoteConfigured || !navigator.onLine) return
  lastRefresh = Date.now()
  try {
    const remote = await fetchRemoteContent()
    const cached = (await db.content.get('bundle'))?.bundle ?? DEFAULT_CONTENT
    await db.content.put({ key: 'bundle', bundle: remote, fetchedAt: Date.now() })
    if (newer(remote, cached) || JSON.stringify(remote.series) !== JSON.stringify(cached.series)) setContent(remote)
  } catch (e) {
    console.warn('[content] refresh failed, keeping cached content', e)
  }
}
