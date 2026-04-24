
// ╔══════════════════════════════════════════════════════════════════════╗
// ║  vapid-push.js · Cliente PWA · Mis Finanzas 2026                   ║
// ║  v1 — Suscripción push nativa en el dispositivo                     ║
// ║  Expone: window.VapidPush.init() · subscribe() · unsubscribe()      ║
// ╚══════════════════════════════════════════════════════════════════════╝

(function() {
  'use strict';

  // URL del Edge Function en Supabase
  const VAPID_EF_URL = 'https://jcgoccaisemrfsuwwrrl.supabase.co/functions/v1/vapid-push';

  // ── Convertir base64url a Uint8Array ─────────────────────────────────
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  // ── Estado interno ───────────────────────────────────────────────────
  let _vapidPublicKey = null;
  let _subscription   = null;
  let _initialized    = false;

  // ── Obtener VAPID public key del server ──────────────────────────────
  async function fetchPublicKey() {
    if (_vapidPublicKey) return _vapidPublicKey;
    const res = await fetch(`${VAPID_EF_URL}/public-key`);
    const { publicKey } = await res.json();
    _vapidPublicKey = publicKey;
    return publicKey;
  }

  // ── Suscribir dispositivo ────────────────────────────────────────────
  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[VapidPush] Push no soportado en este navegador');
      return false;
    }

    // Pedir permiso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[VapidPush] Permiso de notificaciones denegado');
      window._showToast && window._showToast('🔕 Permiso de notificaciones denegado', 'warn');
      return false;
    }

    try {
      const pubKey = await fetchPublicKey();
      const reg    = await navigator.serviceWorker.ready;

      // Cancelar suscripción anterior si existe
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      // Crear nueva suscripción
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(pubKey),
      });
      _subscription = sub;

      // Serializar y enviar al servidor
      const subJson = sub.toJSON();
      const { data: { session } } = await window.sb.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const res = await fetch(`${VAPID_EF_URL}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          p256dh:   subJson.keys?.p256dh,
          auth:     subJson.keys?.auth,
        }),
      });

      if (!res.ok) throw new Error(`Subscribe failed: ${res.status}`);

      console.log('[VapidPush] ✅ Suscripción registrada');
      // Guardar estado en localStorage
      localStorage.setItem('vapid_subscribed', '1');
      window._showToast && window._showToast('🔔 Notificaciones push activadas en este dispositivo', 'ok');
      return true;

    } catch (e) {
      console.error('[VapidPush] Error suscribiendo:', e);
      window._showToast && window._showToast('⚠️ Error activando notificaciones: ' + e.message, 'err');
      return false;
    }
  }

  // ── Desuscribir ──────────────────────────────────────────────────────
  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        // Borrar de Supabase
        const { data: { session } } = await window.sb.auth.getSession();
        if (session) {
          await window.sb.from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
      }
      localStorage.removeItem('vapid_subscribed');
      _subscription = null;
      console.log('[VapidPush] Suscripción cancelada');
      window._showToast && window._showToast('🔕 Notificaciones push desactivadas', 'ok');
    } catch(e) {
      console.error('[VapidPush] Error desuscribiendo:', e);
    }
  }

  // ── Verificar estado actual ──────────────────────────────────────────
  async function getStatus() {
    if (!('PushManager' in window)) return { supported: false };
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    const permission = Notification.permission;
    return {
      supported:   true,
      permission,
      subscribed:  !!sub,
      subscription: sub ? sub.toJSON() : null,
    };
  }

  // ── Init: auto-suscribir si ya tenía permiso concedido ───────────────
  async function init() {
    if (_initialized) return;
    _initialized = true;

    // Esperar a que haya sesión
    if (!window.sb) {
      console.warn('[VapidPush] window.sb no disponible');
      return;
    }

    const { data: { session } } = await window.sb.auth.getSession();
    if (!session) return; // No logueado

    const status = await getStatus();
    if (!status.supported) return;

    if (status.permission === 'granted' && !status.subscribed) {
      // Tenía permiso pero perdió la suscripción → re-suscribir silenciosamente
      console.log('[VapidPush] Re-suscribiendo (permiso previo)...');
      await subscribe();
    }

    // Actualizar ícono de campana si existe
    _updateBellIcon(status.subscribed && status.permission === 'granted');
  }

  // ── Actualizar ícono de campana en la app ────────────────────────────
  function _updateBellIcon(active) {
    const bells = document.querySelectorAll('[data-vapid-bell]');
    bells.forEach(b => {
      b.textContent = active ? '🔔' : '🔕';
      b.title = active ? 'Push activo — toca para desactivar' : 'Activar notificaciones push';
    });
  }

  // ── Toggle para el botón de campana ─────────────────────────────────
  async function togglePush() {
    const status = await getStatus();
    if (status.subscribed && status.permission === 'granted') {
      await unsubscribe();
      _updateBellIcon(false);
    } else {
      const ok = await subscribe();
      _updateBellIcon(ok);
    }
  }

  // ── API pública ──────────────────────────────────────────────────────
  window.VapidPush = { init, subscribe, unsubscribe, getStatus, togglePush };

  // Auto-init cuando DOM listo y usuario logueado
  document.addEventListener('DOMContentLoaded', () => {
    // Dar tiempo a app-core.js para inicializar session
    setTimeout(init, 3000);
  });

  console.log('[vapid-push.js] Módulo cargado ✅');
})();
