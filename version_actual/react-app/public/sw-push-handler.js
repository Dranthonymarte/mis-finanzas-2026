// Importado por el SW generado por vite-plugin-pwa via importScripts
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() } catch { payload = { title: 'Mis Finanzas', body: event.data.text() } }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Mis Finanzas', {
      body: payload.body ?? '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: payload.url ? { url: payload.url } : undefined,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url.includes(url))
      if (match) return match.focus()
      return clients.openWindow(url)
    })
  )
})
