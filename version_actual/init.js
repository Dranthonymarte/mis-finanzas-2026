// ══════════════════════════════════════════════════
// init.js — Bootstrap principal de Mis Finanzas 2026
// Extraído de app-core.js bytes ~66.5k–90k (Sesión 12)
// Depende de: sb, currentUser, _appInitialized, HOUSEHOLD_ID,
//             realtimeChannel (globals en app-core.js),
//             onLoginSuccess, doLogout, _showPasswordResetModal (auth.js),
//             SUPABASE_URL, SUPABASE_KEY (config.js), toast (global)
// ══════════════════════════════════════════════════

// ─── LOADING OVERLAY ─────────────────────────────────────
function showLoadingOverlay(show) {
  let el = document.getElementById('loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-overlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(13,17,23,.9);z-index:500;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px';
    el.innerHTML = '<div style="width:36px;height:36px;border:3px solid #30363d;border-top-color:#58a6ff;border-radius:50%;animation:spin 0.8s linear infinite"></div><p style="color:#8b949e;font-size:.78rem">Cargando tus datos...</p>';
    document.body.appendChild(el);
  }
  el.style.display = show ? 'flex' : 'none';
}

// ── 1. MANEJO GLOBAL DE ERRORES JS ───────────────────────
window.onerror = function(msg, src, line, col, err) {
  console.error('[GlobalError]', msg, 'en', src, 'línea', line);
  if (msg && !msg.includes('ResizeObserver') && !msg.includes('Script error')) {
    toast('⚠️ Error interno: ' + (msg||'').substring(0, 60), 'err');
  }
  return false;
};
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason) || 'Error desconocido';
  console.error('[UnhandledPromise]', msg);
  if (!msg.includes('network') && !msg.includes('fetch') && !msg.includes('Load failed')) {
    toast('⚠️ Error de proceso: ' + msg.substring(0, 60), 'err');
  }
});

// ── 2. AUTO-REFRESH DE SESIÓN SUPABASE ──────────────────
let _sessionRefreshInterval = null;
function startSessionRefresh() {
  if (_sessionRefreshInterval) clearInterval(_sessionRefreshInterval);
  _sessionRefreshInterval = setInterval(async () => {
    if (!currentUser) return;
    try {
      const { error } = await sb.auth.refreshSession();
      if (error) console.warn('[SessionRefresh] Error:', error.message);
    } catch(e) { console.log('[SessionRefresh] Sin conexión, reintentará.'); }
  }, 25 * 60 * 1000);
}
function stopSessionRefresh() {
  if (_sessionRefreshInterval) { clearInterval(_sessionRefreshInterval); _sessionRefreshInterval = null; }
}

// ── 3. TIMEOUT POR INACTIVIDAD ──────────────────────────
const INACTIVITY_MINUTES = 30;
let _inactivityTimer = null;
let _inactivityWarnTimer = null;
function resetInactivityTimer() {
  clearTimeout(_inactivityTimer);
  clearTimeout(_inactivityWarnTimer);
  if (!currentUser) return;
  _inactivityWarnTimer = setTimeout(() => {
    if (currentUser) toast('⏰ Sesión cerrará en 2 min por inactividad', 'warn');
  }, (INACTIVITY_MINUTES - 2) * 60 * 1000);
  _inactivityTimer = setTimeout(async () => {
    if (currentUser) {
      toast('🔒 Sesión cerrada por inactividad', 'warn');
      await doLogout();
    }
  }, INACTIVITY_MINUTES * 60 * 1000);
}
function startInactivityWatcher() {
  ['click','touchstart','keydown','scroll','mousemove'].forEach(ev => {
    document.addEventListener(ev, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
}
function stopInactivityWatcher() {
  clearTimeout(_inactivityTimer);
  clearTimeout(_inactivityWarnTimer);
}

// ── PWA INSTALL ─────────────────────────────────────────
var deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!isInstalled && !sessionStorage.getItem('pwa_install_dismissed')) {
    _showInstallBanner();
  }
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'none';
  localStorage.setItem('pwa_installed', '1');
  sessionStorage.setItem('pwa_install_dismissed', '1');
  const statusEl = document.getElementById('pwa-install-status');
  if (statusEl) statusEl.textContent = '✅ App instalada';
  const btnHeader = document.getElementById('btn-pwa-install');
  if (btnHeader) btnHeader.style.display = 'none';
  toast('✅ App instalada correctamente', 'ok');
});

function _showInstallBanner() {
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isInstalled) return;
  if (localStorage.getItem('pwa_installed') === '1') return;
  if (sessionStorage.getItem('pwa_install_dismissed')) return;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'block';
  const btn = document.getElementById('btn-pwa-install');
  if (btn) { btn.style.display = 'inline-flex'; btn.onclick = triggerPWAInstall; }
}

async function triggerPWAInstall() {
  if (!deferredPrompt) {
    toast('Usa el menú del navegador → "Agregar a pantalla de inicio"', 'ok');
    return;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if (outcome === 'accepted') {
    localStorage.setItem('pwa_installed', '1');
    sessionStorage.setItem('pwa_install_dismissed', '1');
  }
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'none';
}

function dismissInstallBanner() {
  sessionStorage.setItem('pwa_install_dismissed', '1');
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'none';
}

// ── 4. DETECCIÓN DE NUEVA VERSIÓN DEL SW ─────────────────
function startSWUpdateWatcher() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    setInterval(() => reg.update(), 10 * 60 * 1000);
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          const banner = document.createElement('div');
          banner.style.cssText = 'position:fixed;bottom:80px;left:16px;right:16px;background:#0d261a;border:1px solid #3fb950;border-radius:10px;padding:12px 14px;z-index:99999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,.6)';
          banner.innerHTML = '<span style="font-size:1.2rem">🆕</span><div style="flex:1"><div style="font-size:.78rem;font-weight:700;color:#e6edf3">Nueva versión disponible</div><div style="font-size:.67rem;color:#8b949e">Actualiza para tener las últimas mejoras</div></div><button onclick="window.location.reload()" style="background:#238636;border:none;color:#fff;padding:6px 14px;border-radius:6px;font-size:.75rem;font-weight:700;cursor:pointer">Actualizar</button><button onclick="this.closest(\'div\').remove()" style="background:none;border:none;color:#8b949e;font-size:1rem;cursor:pointer">✕</button>';
          document.body.appendChild(banner);
        }
      });
    });
  });
}

// ── INIT PRINCIPAL ───────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // DEBUG batch51: instrumentación para diagnosticar bloqueo post-F5
  console.log('[AUTH-DEBUG] DOMContentLoaded fired | _appInitialized:', _appInitialized);
  try {
    const _allKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-') || k.includes('finanzas_sb'));
    console.log('[AUTH-DEBUG] localStorage auth keys:', _allKeys.length ? _allKeys : 'NONE');
    _allKeys.forEach(k => {
      const v = localStorage.getItem(k) || '';
      console.log('[AUTH-DEBUG]   ', k, '=', v.length > 60 ? v.slice(0, 60) + '...('+v.length+'ch)' : v);
    });
  } catch(e) { console.warn('[AUTH-DEBUG] localStorage inspect error:', e.message); }

  const _safetyTimer = setTimeout(() => {
    console.warn('[AUTH-DEBUG] Safety timer 8s DISPARÓ | _appInitialized:', _appInitialized);
    // Si onLoginSuccess() ya arrancó (_appInitialized=true), no interrumpir.
    if (_appInitialized) return;
    console.warn('[SAFETY] Timeout 8s — forzando login');
    const sp = document.getElementById('splash-overlay');
    if (sp) sp.style.display = 'none';
    const ls = document.getElementById('login-screen');
    if (ls && ls.style.display === 'none') ls.style.display = 'flex';
    _appInitialized = false;
  }, 8000);
  console.log('[AUTH-DEBUG] Safety timer 8s registrado');
  window._clearSafetyTimer = () => { console.log('[AUTH-DEBUG] Safety timer CANCELADO'); clearTimeout(_safetyTimer); };

  startSWUpdateWatcher();

  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    let tapped = false;
    loginBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (tapped) return; tapped = true;
      setTimeout(() => { tapped = false; }, 400);
      doLogin();
    }, { passive: false });
    loginBtn.addEventListener('click', () => {
      if (!('ontouchstart' in window)) doLogin();
    });
  }

  if (loginBtn) { loginBtn.textContent = 'Conectando...'; loginBtn.disabled = true; }
  try {
    await window._sbLoadPromise;
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { detectSessionInUrl: true, persistSession: true }
    });
    window._supabase = sb;
    document.dispatchEvent(new Event('sb-ready')); // FIX BUG-2
    console.log('[Init] supabase-js OK ✓');

    sb.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH-DEBUG] onAuthStateChange fired | event:', event, '| session:', session ? 'YES ('+session.user?.email+')' : 'NO', '| _appInitialized:', _appInitialized);
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && !_appInitialized) {
        currentUser = session.user;
        if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
          history.replaceState(null, '', window.location.pathname);
        }
        window._clearSafetyTimer && window._clearSafetyTimer();
        // FIX batch52: defer onLoginSuccess() con setTimeout(0) para escapar el lock
        // interno del SDK Supabase que se activa durante _initialize() en auto-restore post-F5.
        // Sin este defer, las queries sb.from() dentro de resolveHouseholdId/loadFromSupabase
        // deadlockean silenciosamente (ref: supabase/auth-js#762).
        console.log('[AUTH-DEBUG] Handler: SIGNED_IN/INITIAL_SESSION con session → defer onLoginSuccess()');
        setTimeout(async () => {
          console.log('[AUTH-DEBUG] Defer 0ms ejecutado → onLoginSuccess()');
          try { await onLoginSuccess(); }
          catch(e) { console.error('[AUTH-DEBUG] onLoginSuccess() falló post-defer:', e?.message || e); }
        }, 0);
      }
      if (event === 'INITIAL_SESSION' && !session && !_appInitialized) {
        console.log('[AUTH-DEBUG] Handler: INITIAL_SESSION sin session → mostrar login screen');
        window._clearSafetyTimer && window._clearSafetyTimer();
        const sp = document.getElementById('splash-overlay');
        if (sp) sp.style.display = 'none';
        const ls = document.getElementById('login-screen');
        if (ls) ls.style.display = 'flex';
      }
      if (event === 'SIGNED_OUT') {
        console.log('[AUTH-DEBUG] Handler: SIGNED_OUT → reset state');
        currentUser = null; _appInitialized = false; HOUSEHOLD_ID = null;
        if (realtimeChannel) { try{realtimeChannel.unsubscribe();}catch(e){} realtimeChannel = null; }
        // FIX batch66: recovery timer — si SIGNED_IN no vuelve en 4s (token refresh falló)
        // mostrar login screen para que el usuario pueda re-autenticarse manualmente.
        // Si SIGNED_IN llega antes, _appInitialized se pone true → clearTimeout evita el flash.
        const _signOutRecovery = setTimeout(() => {
          if (!_appInitialized) {
            console.warn('[AUTH-DEBUG] SIGNED_OUT sin SIGNED_IN en 4s → mostrando login screen');
            const ls = document.getElementById('login-screen');
            const as = document.getElementById('app-shell');
            const sp = document.getElementById('splash-overlay');
            if (sp) sp.style.display = 'none';
            if (as) as.style.display = 'none';
            if (ls) ls.style.display = 'flex';
          }
        }, 4000);
        // Cancelar timer cuando SIGNED_IN vuelva (se re-inicializa correctamente)
        const _cancelRecovery = () => { clearTimeout(_signOutRecovery); };
        sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN') _cancelRecovery(); });
      }
    });
    console.log('[AUTH-DEBUG] onAuthStateChange listener registrado');
  } catch(cdnErr) {
    console.error('[Init] supabase-js no cargó:', cdnErr.message);
    const errEl = document.getElementById('login-error');
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = '⚠️ No se pudo conectar con el servidor. Verifica tu internet y recarga la página.'; }
    if (loginBtn) { loginBtn.textContent = 'Sin conexión — Recarga'; loginBtn.disabled = true; }
    return;
  }
  if (loginBtn) { loginBtn.textContent = 'Entrar'; loginBtn.disabled = false; }

  if (window.location.hash.includes('type=recovery')) {
    window._clearSafetyTimer && window._clearSafetyTimer();
    history.replaceState(null, '', window.location.pathname);
    document.getElementById('splash-overlay')?.style.setProperty('display','none');
    document.getElementById('login-screen')?.style.setProperty('display','none');
    _showPasswordResetModal();
    return;
  }

  if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
    _appInitialized = false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (!isStandalone) {
      const pwaUrl = 'https://finanzasprueba.pages.dev/' + window.location.hash + window.location.search;
      setTimeout(() => {
        if (!document.getElementById('pwa-redirect-banner')) {
          const b = document.createElement('div');
          b.id = 'pwa-redirect-banner';
          b.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#238636;color:#fff;padding:12px 16px;font-size:.85rem;font-weight:600;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:8px';
          b.innerHTML = '<span>✅ Autenticado — ¿Tienes la app instalada?</span><a href="' + pwaUrl + '" style="background:#fff;color:#238636;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none;white-space:nowrap">Abrir App</a>';
          document.body.prepend(b);
        }
      }, 300);
    }
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        currentUser = session.user;
        localStorage.setItem('finanzas_sb_refresh', session.refresh_token);
        localStorage.setItem('finanzas_sb_access',  session.access_token);
        history.replaceState(null, '', window.location.pathname);
        window._clearSafetyTimer && window._clearSafetyTimer();
        await onLoginSuccess();
        return;
      }
    } catch(e) { console.warn('[OAuth] callback error:', e.message); }
  }

  // Esperar a que INITIAL_SESSION complete su refresh de token (async ~200-500ms).
  // NO usar setSession() — usa el mismo refresh_token que el SDK → SIGNED_OUT race → $0 data.
  console.log('[AUTH-DEBUG] Esperando 500ms para INITIAL_SESSION');
  await new Promise(r => setTimeout(r, 500));
  console.log('[AUTH-DEBUG] 500ms pasaron | _appInitialized:', _appInitialized);

  if (!_appInitialized) {
    console.log('[AUTH-DEBUG] !_appInitialized → intentando getSession con timeout 3s');
    try {
      // Timeout 3s para evitar colgado infinito si SDK no responde
      const _getSessionResult = await Promise.race([
        sb.auth.getSession(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('getSession_timeout_3s')), 3000))
      ]);
      const { data: { session } } = _getSessionResult;
      console.log('[AUTH-DEBUG] getSession resolvió | session:', session ? 'YES ('+session.user?.email+')' : 'NO');
      if (session && !_appInitialized) {
        currentUser = session.user;
        window._clearSafetyTimer && window._clearSafetyTimer();
        console.log('[AUTH-DEBUG] getSession OK → onLoginSuccess()');
        await onLoginSuccess();
      } else if (!session) {
        console.log('[AUTH-DEBUG] getSession sin session → ocultando splash');
        window._clearSafetyTimer && window._clearSafetyTimer();
        document.getElementById('splash-overlay')?.style.setProperty('display','none');
        const ls = document.getElementById('login-screen');
        if (ls && ls.style.display !== 'flex') ls.style.display = 'flex';
      }
    } catch (e) {
      console.warn('[AUTH-DEBUG] getSession error/timeout:', e.message);
      // Fallback: leer localStorage manualmente y decidir
      try {
        const _rawToken = localStorage.getItem('sb-jcgoccaisemrfsuwwrrl-auth-token');
        if (_rawToken) {
          console.log('[AUTH-DEBUG] Fallback: token presente en localStorage → forzando login screen (no arriesgar auto-restore)');
        } else {
          console.log('[AUTH-DEBUG] Fallback: localStorage vacío → login screen');
        }
      } catch(_) {}
      window._clearSafetyTimer && window._clearSafetyTimer();
      document.getElementById('splash-overlay')?.style.setProperty('display','none');
      const ls = document.getElementById('login-screen');
      if (ls && ls.style.display !== 'flex') ls.style.display = 'flex';
    }
  } else {
    console.log('[AUTH-DEBUG] _appInitialized=true después de 500ms → handler ya corrió OK');
  }
});
