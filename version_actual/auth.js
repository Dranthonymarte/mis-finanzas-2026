
// ═══════════════════════════════════════════════
// AUTH.JS — Autenticación, sesión y utilidades de usuario
// Globals: sb, currentUser, HOUSEHOLD_ID, CONFIG, realtimeChannel
// Depende de: resolveHouseholdId(household.js), loadFromSupabase(data-load.js),
//             startRealtime, startSessionRefresh, startInactivityWatcher,
//             stopSessionRefresh, stopInactivityWatcher, logConnection,
//             loadFire, loadGoal, checkNuevoMesAlLogin, toast, openModal,
//             getDisplayName, USER_NAMES, USER_EMAILS_WHITELIST
// ═══════════════════════════════════════════════

// ─── UTILIDADES FECHA/USUARIO ─────────────────
function getLocalToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function isPro() {
  if (CONFIG.subscriptionStatus === 'pro') {
    if (!CONFIG.subscriptionExpires) return true;
    return new Date(CONFIG.subscriptionExpires) > new Date();
  }
  return false;
}
function requirePro(featureName) {
  if (isPro()) return true;
  showProPaywall(featureName);
  return false;
}
function showProPaywall(featureName) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:20000;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = e => { if (e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div style="background:#161b22;border:1px solid #e3b341;border-radius:16px;padding:28px;max-width:360px;width:100%;text-align:center">
      <div style="font-size:2rem;margin-bottom:12px">⭐</div>
      <div style="font-family:serif;font-size:1.1rem;font-weight:700;color:#e6edf3;margin-bottom:8px">Función Pro</div>
      <div style="font-size:.85rem;color:#8b949e;margin-bottom:20px;line-height:1.6">
        <b style="color:#e3b341">${featureName}</b> está disponible en el plan Pro.<br>
        Desbloquea IA, escaneo OCR, exportación Excel y más.
      </div>
      <a href="https://misfinanzas.pages.dev/#precios" target="_blank"
        style="display:block;background:#238636;border:1px solid #3fb950;color:#fff;padding:11px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.9rem;margin-bottom:10px">
        ✨ Ver Plan Pro — $4.99/mes
      </a>
      <button onclick="this.closest('[style*=fixed]').remove()"
        style="background:none;border:none;color:#8b949e;font-size:.82rem;cursor:pointer;padding:6px">
        Quizás después
      </button>
    </div>`;
  document.body.appendChild(overlay);
}
function getDisplayName(email) {
  return USER_NAMES[email?.toLowerCase()] || email?.split('@')[0] || 'Usuario';
}
function isAnthonyAuthor(raw) {
  if (!raw) return false;
  const s = raw.toLowerCase().trim();
  if (USER_EMAILS_WHITELIST.anthony.some(e => s === e || s.includes(e.split('@')[0]))) return true;
  return s.includes('anthony') || s === 'anthony marte';
}
function isIsabelAuthor(raw) {
  if (!raw) return false;
  const s = raw.toLowerCase().trim();
  if (USER_EMAILS_WHITELIST.isabel.some(e => s === e || s.includes(e.split('@')[0]))) return true;
  return s.includes('isabel') || s.includes('pedrales') || s === 'isabel pedrales';
}
function validateAmount(v) {
  const n = parseFloat(v);
  if (isNaN(n) || !isFinite(n) || n < 0 || n > 999999.99) return false;
  if ((v + '').includes('.') && (v + '').split('.')[1]?.length > 2) return false;
  return true;
}

// ─── LOGIN / REGISTER / LOGOUT ────────────────
async function doGoogleLogin() {
  if (!sb) { showLoginError('⚠️ Error: módulo de autenticación no disponible.'); return; }
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'https://finanzasprueba.pages.dev/' }
  });
  if (error) showLoginError('Error Google: ' + error.message);
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('login-pass').value;
  const btn   = document.getElementById('login-btn');
  if (!email || !pass) { showLoginError('Completa correo y contraseña.'); return; }
  if (!sb) {
    if (typeof _sbLoadPromise !== 'undefined') {
      btn.textContent = 'Cargando...'; btn.disabled = true;
      try { await _sbLoadPromise; } catch(_) {}
      btn.textContent = 'Entrar'; btn.disabled = false;
    }
    if (!sb) { showLoginError('⚠️ Error: módulo de autenticación no disponible. Recarga la página.'); return; }
  }
  btn.textContent = 'Entrando...'; btn.disabled = true;
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    btn.textContent = 'Entrar'; btn.disabled = false;
    if (error) {
      const msg = error.message || '';
      if (msg.includes('not confirmed')) showLoginError('Correo no confirmado. Revisa tu bandeja.');
      else if (msg.includes('Invalid') || msg.includes('invalid')) showLoginError('Correo o contraseña incorrectos.');
      else showLoginError('Error: ' + msg);
      return;
    }
    if (!data || !data.user) { showLoginError('Correo no confirmado o sesión inválida.'); return; }
    currentUser = data.user;
    if (data.session) {
      localStorage.setItem('finanzas_sb_refresh', data.session.refresh_token);
      localStorage.setItem('finanzas_sb_access', data.session.access_token);
    }
    await onLoginSuccess();
  } catch(e) {
    btn.textContent = 'Entrar'; btn.disabled = false;
    const msg = e.message || '';
    if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('load failed')) {
      const savedRefresh = localStorage.getItem('finanzas_sb_refresh');
      const savedAccess  = localStorage.getItem('finanzas_sb_access');
      if (savedRefresh) {
        showLoginError('📵 Sin internet. Intentando restaurar sesión guardada...');
        try {
          const { data: sd } = await sb.auth.setSession({ access_token: savedAccess || '', refresh_token: savedRefresh });
          if (sd?.session?.user) {
            currentUser = sd.session.user;
            localStorage.setItem('finanzas_sb_refresh', sd.session.refresh_token);
            localStorage.setItem('finanzas_sb_access',  sd.session.access_token);
            await onLoginSuccess();
            return;
          }
        } catch(_) {}
        showLoginError('📵 Sin internet y la sesión guardada expiró. Conéctate e intenta de nuevo.');
      } else {
        showLoginError('📵 Sin conexión a internet. Conéctate e intenta de nuevo.');
      }
    } else {
      showLoginError('Error al iniciar sesión: ' + (msg || 'intenta de nuevo'));
    }
    console.error('[doLogin]', e);
  }
}

async function doRegister() {
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass  = document.getElementById('reg-pass').value;
  if (!email || !pass) { showLoginError('Completa los campos.'); return; }
  const regCaptcha = (typeof hcaptcha !== 'undefined') ? hcaptcha.getResponse(document.getElementById('h-captcha-login')) : undefined;
  const signUpOpts = regCaptcha ? { email, password: pass, options: { captchaToken: regCaptcha } } : { email, password: pass };
  const { data, error } = await sb.auth.signUp(signUpOpts);
  if (typeof hcaptcha !== 'undefined') hcaptcha.reset();
  if (error) { showLoginError(error.message); return; }
  showLoginError('✅ Cuenta creada. Revisa tu correo para confirmar, luego inicia sesión.', true);
}

async function doLogout() {
  if (currentUser) {
    try {
      const ua = navigator.userAgent;
      const device  = /Mobile|Android|iPhone|iPad/.test(ua) ? '📱 Móvil' : '💻 Escritorio';
      const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Otro';
      await sb.from('registro_conexiones').insert({
        user_id: currentUser.id, email: currentUser.email,
        device_type: device, browser, event_type: 'logout',
        connected_at: new Date().toISOString()
      });
    } catch(e) { console.log('Log logout:', e.message); }
  }
  await sb.auth.signOut({ scope: 'local' });
  currentUser = null;
  _appInitialized = false;
  HOUSEHOLD_ID = null;
  if (realtimeChannel) { try{realtimeChannel.unsubscribe();}catch(e){} realtimeChannel = null; }
  stopSessionRefresh();
  stopInactivityWatcher();
  document.getElementById('app-shell').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('user-email-badge').style.display = 'none';
}

function showLoginError(msg, isOk=false) {
  const el = document.getElementById('login-error');
  el.style.display = 'block';
  el.style.background = isOk ? '#0d261a' : '#3d1a1a';
  el.style.borderColor = isOk ? '#3fb950' : '#f85149';
  el.style.color = isOk ? '#3fb950' : '#f85149';
  el.textContent = msg;
}
function showRegister() { document.getElementById('register-section').style.display = 'block'; }

// ─── PASSWORD RESET ───────────────────────────
function _showPasswordResetModal() {
  let modal = document.getElementById('modal-password-reset');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-password-reset';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);align-items:center;justify-content:center;padding:16px';
    modal.innerHTML = `
      <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;width:100%;max-width:340px">
        <h3 style="color:#e6edf3;font-size:.95rem;font-weight:700;margin:0 0 6px">🔑 Nueva contraseña</h3>
        <p style="color:#8b949e;font-size:.72rem;margin:0 0 16px">Elige una contraseña nueva para tu cuenta.</p>
        <input id="reset-new-pass" type="password" placeholder="Nueva contraseña" maxlength="72"
          style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:9px 12px;border-radius:7px;font-size:.82rem;outline:none;box-sizing:border-box;margin-bottom:10px">
        <input id="reset-confirm-pass" type="password" placeholder="Repetir contraseña" maxlength="72"
          style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:9px 12px;border-radius:7px;font-size:.82rem;outline:none;box-sizing:border-box;margin-bottom:10px">
        <div id="reset-new-msg" style="font-size:.72rem;min-height:18px;margin-bottom:10px;color:#f85149"></div>
        <button id="reset-new-btn" onclick="doPasswordReset()"
          style="width:100%;background:#238636;color:#fff;border:none;padding:10px;border-radius:7px;font-size:.85rem;font-weight:600;cursor:pointer">
          Guardar contraseña
        </button>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}
async function doPasswordReset() {
  const p1  = document.getElementById('reset-new-pass')?.value || '';
  const p2  = document.getElementById('reset-confirm-pass')?.value || '';
  const msg = document.getElementById('reset-new-msg');
  const btn = document.getElementById('reset-new-btn');
  if (p1.length < 6) { if(msg){msg.style.color='#f85149';msg.textContent='Mínimo 6 caracteres.';} return; }
  if (p1 !== p2)     { if(msg){msg.style.color='#f85149';msg.textContent='Las contraseñas no coinciden.';} return; }
  if (btn) { btn.disabled=true; btn.textContent='Guardando...'; }
  try {
    const { error } = await sb.auth.updateUser({ password: p1 });
    if (error) throw error;
    if (msg) { msg.style.color='#3fb950'; msg.textContent='✅ Contraseña actualizada. Inicia sesión.'; }
    setTimeout(() => {
      const m = document.getElementById('modal-password-reset');
      if (m) m.style.display = 'none';
      const ls = document.getElementById('login-screen');
      if (ls) ls.style.display = 'flex';
    }, 2000);
  } catch(e) {
    if (msg) { msg.style.color='#f85149'; msg.textContent='Error: ' + (e.message||'intenta de nuevo'); }
    if (btn) { btn.disabled=false; btn.textContent='Guardar contraseña'; }
  }
}
window.doPasswordReset = doPasswordReset;

function openForgotModal() {
  document.getElementById('modal-forgot').style.display = 'flex';
  document.getElementById('forgot-email').value = document.getElementById('login-email').value || '';
  document.getElementById('forgot-msg').textContent = '';
}
function closeForgotModal() { document.getElementById('modal-forgot').style.display = 'none'; }
async function doForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim().toLowerCase();
  const msgEl = document.getElementById('forgot-msg');
  if (!email) { msgEl.style.color='#f85149'; msgEl.textContent='Escribe tu correo.'; return; }
  if (!sb) { msgEl.style.color='#f85149'; msgEl.textContent='Error: recarga la página.'; return; }
  const btn = document.getElementById('forgot-btn');
  btn.disabled=true; btn.textContent='Enviando...';
  try {
    await sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://finanzasprueba.pages.dev/' });
  } catch(_) {}
  msgEl.style.color='#3fb950';
  msgEl.textContent='Si ese correo existe, recibirás un enlace en tu bandeja.';
  btn.textContent='Enviado';
  setTimeout(() => { closeForgotModal(); btn.disabled=false; btn.textContent='Enviar enlace'; }, 3000);
}

// ─── ON LOGIN SUCCESS ─────────────────────────
// _appInitialized declarado en globals-init.js como var (window-accessible)
async function onLoginSuccess() {
  if (_appInitialized) { console.log('[Init] onLoginSuccess ya ejecutado — ignorando'); return; }
  _appInitialized = true;
  document.getElementById('login-screen').style.display = 'none';
  if (typeof Chart === 'undefined') {
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
      s.onload = resolve;
      s.onerror = () => { console.warn('[FIN] Chart.js CDN falló'); resolve(); };
      document.head.appendChild(s);
    });
  }
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'nuevo') {
    setTimeout(() => openModal(null, urlParams.get('tipo') || ''), 800);
  }
  const badge = document.getElementById('user-email-badge');
  const displayName = getDisplayName(currentUser.email);
  badge.textContent = '👤 ' + displayName;
  badge.title = currentUser.email;
  badge.style.display = 'inline';
  document.querySelectorAll('[id*="name-display"],[id*="perfil-name"]').forEach(el => {
    if (el) el.textContent = displayName;
  });
  try {
    await resolveHouseholdId();
    await loadFromSupabase();
  } catch(initErr) {
    console.error('[Init] Error cargando datos:', initErr?.message || initErr);
    toast('⚠️ Error cargando datos. Intenta recargar.', 'err');
  } finally {
    document.getElementById('app-shell').style.display = 'block';
    const _splashEl = document.getElementById('splash-overlay');
    if (_splashEl) _splashEl.style.display = 'none';
  }
  const _inviteToken = new URLSearchParams(window.location.search).get('invite');
  if (_inviteToken && typeof handleInviteToken === 'function') {
    setTimeout(() => handleInviteToken(_inviteToken), 1500);
  }
  startRealtime();
  startSessionRefresh();
  (async function enviarSesionAlSW() {
    if (!navigator.serviceWorker?.controller) return;
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_SESSION', token: session.access_token, userId: session.user.id
      });
    } catch(e) { console.warn('[SW] enviarSesionAlSW:', e.message); }
  })();
  startInactivityWatcher();
  logConnection();
  setTimeout(loadFire, 800);
  setTimeout(loadGoal, 900);
  setTimeout(checkNuevoMesAlLogin, 2200);
  setTimeout(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const dismissed   = sessionStorage.getItem('pwa_install_dismissed');
    if (!isInstalled && !dismissed) {
      _showInstallBanner();
      setTimeout(() => {
        const banner = document.getElementById('pwa-install-banner');
        if (banner && banner.style.display !== 'none') {
          banner.style.transition = 'opacity .5s';
          banner.style.opacity = '0';
          setTimeout(() => { banner.style.display='none'; banner.style.opacity=''; }, 500);
        }
      }, 5000);
    }
  }, 2000);
  if (typeof window._checkNovedades === 'function') window._checkNovedades();
  const _nb = document.getElementById('btn-novedades');
  if (_nb) _nb.style.display = 'inline-flex';
}
