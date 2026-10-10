// Imported into the generated service worker: tapping a notification focuses the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => 'focus' in c)
      return client ? client.focus() : self.clients.openWindow('/focus')
    }),
  )
})
