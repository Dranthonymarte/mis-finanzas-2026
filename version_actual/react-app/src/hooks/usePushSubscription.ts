import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

// VAPID public key — Anthony debe generar con: npx web-push generate-vapid-keys
// y pegar la public key aquí (no es secreta)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushSubscription() {
  const userId      = useAuthStore(s => s.userId)
  const householdId = useAuthStore(s => s.householdId)
  const [supported] = useState(
    () => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
  )
  const [subscribed,  setSubscribed]  = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    )
  }, [supported])

  async function subscribe() {
    if (!supported || !VAPID_PUBLIC_KEY || !userId) return
    setSubscribing(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })
      const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await supabase.from('push_subscriptions').upsert({
        user_id:      userId,
        household_id: householdId,
        endpoint,
        p256dh:  keys.p256dh,
        auth:    keys.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })
      setSubscribed(true)
    } finally {
      setSubscribing(false)
    }
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    }
    setSubscribed(false)
  }

  return { supported, subscribed, subscribing, subscribe, unsubscribe }
}
