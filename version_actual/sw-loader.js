// ╔══════════════════════════════════════════════════════════════════════╗
// ║  sw-loader.js · Mis Finanzas 2026                                    ║
// ║  v13 — Versión correcta + sin loop de unregister                     ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── SAFETY SPLASH TIMEOUT ─────────────────────────────────────────────
(function() {
  const SPLASH_MAX_MS = 12000;
  function _forceSplashHide() {
    const s = document.getElementById('splash-overlay');
    if (!s) return;
    if (s.style.display === 'none' || s.style.opacity === '0') return;
    console.warn('[Splash] Safety timeout activado — forzando cierre splash');
    s.style.transition = 'opacity 0.4s';
    s.style.opacity = '0';
    setTimeout(() => { if (s) s.style.display = 'none'; }, 420);
    const shell = document.getElementById('app-shell');
    if (shell && shell.style.display === 'none') shell.style.display = 'block';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_forceSplashHide, SPLASH_MAX_MS));
  } else {
    setTimeout(_forceSplashHide, SPLASH_MAX_MS);
  }
  window._forceSplashHide = _forceSplashHide;
})();

// VERSIÓN ESPERADA — debe coincidir con CACHE_VERSION en service-worker.js
const SW_EXPECTED_VERSION = 'finanzas-v59-batch62';

if ('serviceWorker' in navigator) {

  window.addEventListener('load', async () => {
    try {
      // Desregistrar sw.js viejo (v4, cache-first JS → servía init.js obsoleto con BUG-1)
      const oldRegs = await navigator.serviceWorker.getRegistrations();
      for (const r of oldRegs) {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
        if (url.includes('/sw.js') && !url.includes('service-worker')) {
          console.log('[SW-Loader] Eliminando SW obsoleto:', url);
          await r.unregister();
        }
      }

      const reg = await navigator.serviceWorker.register('/service-worker.js', {
        updateViaCache: 'none'   // el navegador siempre valida el SW en el servidor
      });

      console.log('[SW-Loader] Registrado:', reg.scope);

      // Si hay un SW esperando, activarlo ahora
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Cuando un nuevo SW toma control → recargar SOLO UNA VEZ por sesión
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const reloadKey = 'sw_reloaded_' + SW_EXPECTED_VERSION;
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, '1');
          console.log('[SW-Loader] Nuevo SW activo — recargando');
          window.location.reload();
        }
      });

      // Verificar actualizaciones periódicamente y al volver a la pestaña
      setInterval(() => reg.update().catch(() => {}), 30 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => {});
      });

    } catch(err) {
      console.error('[SW-Loader] Error registrando SW:', err);
      setTimeout(() => window._forceSplashHide && window._forceSplashHide(), 3000);
    }
  });

  window.checkSWVersion = async function() {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) { console.log('[SW] No hay SW activo'); return; }
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => console.log('[SW] Versión activa:', e.data?.version);
    reg.active.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
  };

} else {
  console.warn('[SW-Loader] Service Workers no soportados');
  setTimeout(() => window._forceSplashHide && window._forceSplashHide(), 3000);
}
