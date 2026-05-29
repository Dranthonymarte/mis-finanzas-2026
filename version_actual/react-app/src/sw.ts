/// <reference lib="WebWorker" />
// ═══════════════════════════════════════════════════
// Service Worker — Mis Finanzas 2026
// injectManifest mode: Workbox precaching + custom handlers
// ═══════════════════════════════════════════════════

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// ── Workbox precache manifest (injected by vite-plugin-pwa) ──
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Claim clients immediately so SW activates without reload ──
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ════════════════════════════════════════════════════
// PUSH NOTIFICATION HANDLER
// ════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  interface PushPayload {
    title?: string
    body?: string
    tag?: string
    url?: string
    requireInteraction?: boolean
  }

  let data: PushPayload

  try {
    data = (event as PushEvent).data?.json() ?? {}
  } catch {
    data = { body: (event as PushEvent).data?.text() ?? '' }
  }

  const title = data.title ?? 'Mis Finanzas'
  const options: NotificationOptions = {
    body:               data.body ?? 'Nueva notificación',
    icon:               '/icon-192.png',
    badge:              '/icon-192.png',
    tag:                data.tag ?? 'misfinanzas-notif',
    data:               { url: data.url ?? '/' },
    requireInteraction: data.requireInteraction ?? false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ════════════════════════════════════════════════════
// NOTIFICATION CLICK HANDLER
// ════════════════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  const ne = event as NotificationEvent
  ne.notification.close()
  const url = (ne.notification.data as { url?: string } | null)?.url ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window and navigate
        const existing = clientList.find((c) => 'focus' in c)
        if (existing) {
          existing.postMessage({ type: 'NAVIGATE', url })
          return existing.focus()
        }
        // Open new window
        return self.clients.openWindow(url)
      })
  )
})

// ════════════════════════════════════════════════════
// PUSH SUBSCRIPTION CHANGE HANDLER
// Renews subscription automatically when browser rotates keys
// ════════════════════════════════════════════════════
self.addEventListener('pushsubscriptionchange', (event) => {
  // PushSubscriptionChangeEvent is not in all TS WebWorker libs — cast carefully
  const psce = event as Event & {
    oldSubscription?: PushSubscription
    newSubscription?: PushSubscription
  }
  const oldKey = psce.oldSubscription?.options?.applicationServerKey

  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly:      true,
        applicationServerKey: oldKey ?? undefined,
      })
      .then((subscription) => {
        console.log('[SW] Push subscription renovada:', subscription.endpoint)
        // Notify all clients so they can update the backend
        return self.clients.matchAll().then((clientList) => {
          clientList.forEach((c) =>
            c.postMessage({
              type:         'PUSH_SUBSCRIPTION_CHANGED',
              subscription: subscription.toJSON(),
            })
          )
        })
      })
      .catch((err: unknown) => {
        console.error('[SW] pushsubscriptionchange error:', err)
      })
  )
})
