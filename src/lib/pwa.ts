import { useEffect, useReducer } from 'react'

// ── Install prompt ──────────────────────────────────────────────────────
// Chrome/Android fires `beforeinstallprompt` once, early: this module is imported
// from main.tsx so the event is captured before any page mounts.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as BeforeInstallPromptEvent
  emit()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  emit()
})

const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function useInstall() {
  const [, rerender] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    listeners.add(rerender)
    return () => void listeners.delete(rerender)
  }, [])
  const installed = standalone()
  return {
    installed,
    canPrompt: !!deferred,
    iosManual: ios() && !installed, // iOS has no prompt: show "Share → Add to Home Screen"
    ios: ios(),
    prompt: async () => {
      if (!deferred) return false
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      emit()
      return outcome === 'accepted'
    },
  }
}

// ── Notifications ───────────────────────────────────────────────────────
// Local notifications for "session finished". Best effort: they fire when the app
// is in the background but still alive (ambient audio keeps it alive on Android).
// Guaranteed delivery with the app closed needs Web Push (server, phase 2).

export const notifySupported = () => 'Notification' in window
export const notifyPermission = (): NotificationPermission => (notifySupported() ? Notification.permission : 'denied')

export async function enableNotifications() {
  if (!notifySupported()) return false
  return (await Notification.requestPermission()) === 'granted'
}

export async function notify(title: string, body: string) {
  if (notifyPermission() !== 'granted' || document.visibilityState === 'visible') return
  const options: NotificationOptions = { body, icon: '/pwa-192.png', badge: '/pwa-192.png', tag: 'syncrobac-timer' }
  const reg = navigator.serviceWorker?.controller ? await navigator.serviceWorker.ready : null
  if (reg) await reg.showNotification(title, options)
  else new Notification(title, options)
}
