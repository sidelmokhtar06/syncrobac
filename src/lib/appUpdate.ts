import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { db } from './db'

// App updates. The service worker serves the cached version instantly (offline-first) and downloads a
// new one in the background. We look for one on launch, when the app comes back to the screen, and
// hourly, then switch to it at a moment that loses nothing:
// - just opened or brought back (nothing started yet): switch right away;
// - in the middle of something: offer it (banner), and switch when the app next goes to the background,
//   unless a focus session is running.

const CHECK_EVERY = 30 * 60_000
const FRESH_MS = 15_000

let activeSince = Date.now() // last time the app was opened or brought back to the screen
let waiting = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (Date.now() - activeSince < FRESH_MS) return void updateSW(true)
    waiting = true
    emit()
  },
  onRegisteredSW(_url, reg) {
    if (!reg) return
    let lastCheck = Date.now()
    const check = () => {
      if (!navigator.onLine || Date.now() - lastCheck < CHECK_EVERY) return
      lastCheck = Date.now()
      reg.update().catch(() => {})
    }
    setInterval(check, CHECK_EVERY * 2)
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        activeSince = Date.now()
        check()
      } else if (waiting && !(await db.settings.get(1))?.timer.endsAt) {
        updateSW(true) // switch in the background: the next visit opens on the new version
      }
    })
  },
})

/** Switches to the downloaded version now (reloads the page). */
export const applyUpdate = () => updateSW(true)
export const useUpdateWaiting = () =>
  useSyncExternalStore(
    (fn) => (listeners.add(fn), () => void listeners.delete(fn)),
    () => waiting,
  )
