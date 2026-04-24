
// ═══════════════════════════════════════════════
// SUPABASE CONFIG
// ═══════════════════════════════════════════════
// SUPABASE_URL → defined in config.js
// SUPABASE_KEY → defined in config.js
// FIX-CDN-ASYNC (Batch-F): sb ya NO se inicializa aquí sincrónicamente.
// El cargador async en <head> resuelve _sbLoadPromise cuando supabase está listo.
// sb se asigna en DOMContentLoaded → ver abajo.
// REGLA ACTUALIZADA: sb puede ser null hasta que DOMContentLoaded resuelva.
// doLogin() ya tiene guard if(!sb) para este caso.
var sb = null;
var currentUser = null;

// ─── AUTH HELPERS ────────────────────────────
// Batch-XX: Simplificado a 2 usuarios activos del hogar
// ALLOWED_EMAILS → defined in config.js

// ─── HOUSEHOLD — sistema multi-usuario con hogares aislados ───
// Cada usuario tiene su propio hogar por defecto.
// Para compartir: el owner invita a un partner via invitePartner().
// El partner opera bajo el hogar del owner mientras esté vinculado.
// Para separarse: el partner usa otro correo/cuenta. Simple y sin edge cases.
var HOUSEHOLD_ID = null; // uuid del hogar activo, resuelto tras login

async function resolveHouseholdId() {
  if (!currentUser || !sb) return;
  const uid = currentUser.id;

  try {
    // 1. Detectar invitación pendiente → mostrar modal de confirmación
    const invite = await checkPendingInvitation();
    if (invite) {
      const accepted = await showInvitationModal(invite);
      if (accepted) {
        await sb.from('household_members').update({
          user_id: uid, invite_status: 'accepted',
          accepted_at: new Date().toISOString()
        }).eq('id', invite.id);
        HOUSEHOLD_ID = invite.household_id;
        console.log('[Household] invitación aceptada por usuario:', HOUSEHOLD_ID);
        return;
      } else {
        await sb.from('household_members').update({ invite_status: 'declined' }).eq('id', invite.id);
        console.log('[Household] invitación rechazada — creando hogar propio');
      }
    }

    // 2. Buscar membresía activa (owner o partner aceptado)
    const { data: membership, error: memErr } = await sb
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', uid)
      .eq('invite_status', 'accepted')
      .maybeSingle();

    if (memErr) throw memErr;

    if (membership?.household_id) {
      HOUSEHOLD_ID = membership.household_id;
      console.log('[Household] membresía activa:', HOUSEHOLD_ID, '| rol:', membership.role);
      return;
    }

    // 3. Sin hogar → crear uno propio automáticamente
    const { data: newHousehold, error: hhErr } = await sb
      .from('households')
      .insert({ owner_user_id: uid, name: 'Mi Hogar' })
      .select('id').single();

    if (hhErr) throw hhErr;

    const { error: memInsertErr } = await sb.from('household_members').insert({
      household_id: newHousehold.id, user_id: uid,
      role: 'owner', invite_status: 'accepted',
      invite_email: currentUser.email?.toLowerCase()
    });

    if (memInsertErr) throw memInsertErr;

    HOUSEHOLD_ID = newHousehold.id;
    console.log('[Household] hogar nuevo creado:', HOUSEHOLD_ID);

  } catch (e) {
    console.error('[Household] error en resolución, usando uid propio como fallback:', e.message);
    HOUSEHOLD_ID = uid;
  }
}

// ─── DETECTAR INVITACIÓN PENDIENTE (sin auto-aceptar) ────────────────────
async function checkPendingInvitation() {
  if (!currentUser || !sb) return null;
  try {
    const { data: invite } = await sb
      .from('household_members')
      .select('id, household_id')
      .eq('invite_email', currentUser.email?.toLowerCase())
      .eq('invite_status', 'pending')
      .maybeSingle();
    return invite || null;
  } catch (e) {
    console.warn('[Household] checkPendingInvitation falló:', e.message);
    return null;
  }
}

// ─── MODAL DE CONFIRMACIÓN DE INVITACIÓN ──────────────────────────────────
// Muestra términos antes de unirse al hogar compartido.
// Retorna Promise<boolean>: true = acepta, false = rechaza.
async function showInvitationModal(invite) {
  // Obtener nombre del hogar y del owner
  let hogarName = 'Hogar compartido';
  let ownerEmail = '';
  try {
    const { data: hh } = await sb.from('households')
      .select('name, owner_user_id').eq('id', invite.household_id).maybeSingle();
    if (hh?.name) hogarName = hh.name;
    // Buscar email del owner en household_members
    const { data: ownerMem } = await sb.from('household_members')
      .select('invite_email').eq('household_id', invite.household_id)
      .eq('role', 'owner').maybeSingle();
    if (ownerMem?.invite_email) ownerEmail = ownerMem.invite_email;
  } catch(_) {}

  const ownerDisplay = ownerEmail
    ? (USER_NAMES?.[ownerEmail] || ownerEmail.split('@')[0])
    : 'otro usuario';

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:30000;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:28px;max-width:380px;width:100%;font-family:system-ui,sans-serif">
        <div style="font-size:2rem;text-align:center;margin-bottom:12px">🏠</div>
        <div style="font-size:1rem;font-weight:700;color:#e6edf3;text-align:center;margin-bottom:6px">Invitación a hogar compartido</div>
        <div style="font-size:.83rem;color:#8b949e;text-align:center;margin-bottom:20px">
          <b style="color:#58a6ff">${escHtml(ownerDisplay)}</b> te invitó a unirte a <b style="color:#e6edf3">${escHtml(hogarName)}</b>
        </div>
        <div style="background:#0d1117;border:1px solid #21262d;border-radius:10px;padding:14px;margin-bottom:18px;font-size:.78rem;color:#8b949e;line-height:1.6">
          <div style="margin-bottom:8px"><span style="color:#3fb950;font-weight:700">✔</span> Podrás registrar movimientos y hacer cambios en el hogar compartido.</div>
          <div style="margin-bottom:8px"><span style="color:#3fb950;font-weight:700">✔</span> Ambos verán los mismos datos financieros en tiempo real.</div>
          <div style="color:#e3b341"><span style="font-weight:700">⚠</span> Si en el futuro deseas registrar finanzas <b>personales separadas</b>, deberás usar un correo distinto para crear tu propio hogar.</div>
        </div>
        <div style="display:flex;gap:10px">
          <button id="_inv-decline" style="flex:1;padding:11px;border-radius:8px;border:1px solid #30363d;background:transparent;color:#8b949e;font-size:.85rem;cursor:pointer;font-weight:600">
            ✗ Rechazar
          </button>
          <button id="_inv-accept" style="flex:2;padding:11px;border-radius:8px;border:none;background:#238636;color:#fff;font-size:.85rem;cursor:pointer;font-weight:700">
            ✓ Aceptar y unirme
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#_inv-accept').onclick  = () => { overlay.remove(); resolve(true);  };
    overlay.querySelector('#_inv-decline').onclick = () => { overlay.remove(); resolve(false); };
  });
}

// ─── INVITAR PARTNER AL HOGAR ──────────────────────────────────────────────
// Solo el owner puede invitar. El invitado verá los datos compartidos al iniciar sesión.
// Para desvincular datos: el partner debe crear una cuenta nueva.
async function invitePartner(partnerEmail) {
  if (!HOUSEHOLD_ID || !currentUser) {
    toast('Error: sesión no iniciada', 'err'); return;
  }

  const email = partnerEmail?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    toast('Escribe un correo válido', 'err'); return;
  }

  // Verificar que quien invita es el owner del hogar activo
  const { data: me } = await sb
    .from('household_members')
    .select('role')
    .eq('household_id', HOUSEHOLD_ID)
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (me?.role !== 'owner') {
    toast('Solo el administrador del hogar puede invitar', 'err'); return;
  }

  // No invitarse a sí mismo
  if (email === currentUser.email?.toLowerCase()) {
    toast('No puedes invitarte a ti mismo', 'err'); return;
  }

  const { error } = await sb.from('household_members').insert({
    household_id:  HOUSEHOLD_ID,
    role:          'partner',
    invite_status: 'pending',
    invite_email:  email
  });

  if (error) {
    if (error.code === '23505') { // unique violation
      toast('Ya existe una invitación para ese correo', 'err');
    } else {
      toast('Error al crear invitación: ' + error.message, 'err');
    }
    return;
  }

  toast(`✅ Invitación creada para ${email}. Se activará cuando inicie sesión.`, 'ok');
  console.log('[Household] invitación creada para:', email);
}

// ─── UI WRAPPER: INVITAR DESDE SETTINGS ──────────
function invitePartnerFromUI() {
  const input = document.getElementById('invite-email-input');
  const email = input?.value?.trim();
  if (!email) { toast('Ingresa un correo electrónico', 'err'); return; }
  invitePartner(email);
  if (input) input.value = '';
}

// ─── UI: ELIMINAR CUENTA ─────────────────────────
async function confirmDeleteAccount() {
  if (!currentUser) return;
  const uid = currentUser.id;
  const hid = HOUSEHOLD_ID;

  // Detectar rol para personalizar el mensaje
  const { data: me } = await sb
    .from('household_members')
    .select('role')
    .eq('user_id', uid)
    .eq('household_id', hid)
    .maybeSingle();

  const isOwner = me?.role === 'owner';

  const titulo = isOwner ? '⚠️ Eliminar cuenta y datos' : '🚪 Salir del hogar compartido';
  const msg = isOwner
    ? 'Se borrarán TODOS los datos del hogar (movimientos, cuentas, presupuestos). IRREVERSIBLE.'
    : 'Saldrás del hogar compartido y recuperarás tu cuenta personal vacía. Los datos del hogar NO se borran.';

  const ok = await showConfirm(titulo, msg, '🗑️');
  if (!ok) return;

  const palabra = isOwner ? 'ELIMINAR' : 'SALIR';
  const word = prompt(`Escribe ${palabra} para confirmar:`);
  if (word?.trim().toUpperCase() !== palabra) {
    toast('Cancelado', 'ok'); return;
  }

  try {
    toast(isOwner ? '🗑️ Eliminando todos los datos...' : '🚪 Saliendo del hogar...', 'ok');

    if (isOwner) {
      // Borrar todo el hogar en cascada
      await sb.from('registro_movimientos').delete().eq('user_id', hid);
      await sb.from('movimientos').delete().eq('household_id', hid);
      await sb.from('cuentas').delete().eq('household_id', hid);
      await sb.from('fondo_emergencia').delete().eq('user_id', hid);
      await sb.from('dinero_fuera').delete().eq('user_id', hid);
      await sb.from('config_usuario').delete().eq('user_id', uid);
      await sb.from('tasas_cambio').delete().eq('user_id', hid);
      await sb.from('household_members').delete().eq('household_id', hid);
      await sb.from('households').delete().eq('id', hid);

      // B4: Eliminar auth user via Edge Function
      const { data: sessionData } = await sb.auth.getSession();
      await fetch('https://jcgoccaisemrfsuwwrrl.supabase.co/functions/v1/delete-user', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionData.session.access_token}` }
      });

      await doLogout();
      toast('✅ Cuenta eliminada permanentemente.', 'ok');
    } else {
      // Partner: solo salir del hogar, conservar cuenta
      await sb.from('household_members').delete()
        .eq('user_id', uid).eq('household_id', hid);

      HOUSEHOLD_ID = null;
      await resolveHouseholdId();
      await loadFromSupabase();
      toast('✅ Saliste del hogar. Ahora tienes tu espacio personal.', 'ok');
    }
  } catch(e) {
    toast('Error al eliminar: ' + e.message, 'err');
  }
}

// ─── NOMBRES DE USUARIO POR CORREO ──────────────
// Batch-XX: Solo 2 usuarios activos
const USER_EMAILS_WHITELIST = {
  anthony: ['anthonymarte12@gmail.com'],
  isabel:  ['isabelcristinapedrales@gmail.com']
};
// USER_NAMES → defined in config.js
// ── SUSCRIPCIÓN ───────────────────────────────────────────────
// ─── FIX-BATCH-XXVII: fecha local (evita día+1 por UTC) ───
function getLocalToday() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
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
// Matchers flexibles: reconocen displayName, email crudo y aliases parciales
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

// ─── VALIDACIÓN DE MONTOS (SEC-05) ───────────────────────────────────────
function validateAmount(v) {
  const n = parseFloat(v);
  if (isNaN(n) || !isFinite(n)) return false;
  if (n < 0) return false;
  if (n > 999999.99) return false;
  if ((v + '').includes('.') && (v + '').split('.')[1]?.length > 2) return false;
  return true;
}

async function doGoogleLogin() {
  // DESPUÉS
// ANTES
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
  // DESPUÉS
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
    // FIX-FETCH: "Failed to fetch" = sin internet. Intentar restaurar sesión desde tokens locales.
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
        showLoginError('📵 Sin internet y la sesión guardada expiró. Conéctate a internet e intenta de nuevo.');
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
  // Sistema abierto: cualquier email puede registrarse
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
      const device = /Mobile|Android|iPhone|iPad/.test(ua) ? '📱 Móvil' : '💻 Escritorio';
      const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Otro';
      await sb.from('registro_conexiones').insert({
        user_id: currentUser.id, email: currentUser.email,
        device_type: device, browser: browser,
        event_type: 'logout', connected_at: new Date().toISOString()
      });
    } catch(e) { console.log('Log logout:', e.message); }
  }
  // IMPORTANTE: usar scope:'local' para NO revocar el refresh token en servidor
  // Así la huella puede restaurar sesión en la próxima entrada
  await sb.auth.signOut({ scope: 'local' });
  currentUser = null;
  _appInitialized = false; // FIX-TRIPLE-CALL: permitir re-login en la misma sesión de navegador
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
function showRegister() {
  document.getElementById('register-section').style.display = 'block';
}
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
  if (p1.length < 6) { if(msg) { msg.style.color='#f85149'; msg.textContent='Mínimo 6 caracteres.'; } return; }
  if (p1 !== p2)     { if(msg) { msg.style.color='#f85149'; msg.textContent='Las contraseñas no coinciden.'; } return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  try {
    const { error } = await sb.auth.updateUser({ password: p1 });
    if (error) throw error;
    if (msg) { msg.style.color='#3fb950'; msg.textContent='✅ Contraseña actualizada. Inicia sesión.'; }
    setTimeout(() => {
      const modal = document.getElementById('modal-password-reset');
      if (modal) modal.style.display = 'none';
      const ls = document.getElementById('login-screen');
      if (ls) ls.style.display = 'flex';
    }, 2000);
  } catch(e) {
    if (msg) { msg.style.color='#f85149'; msg.textContent='Error: ' + (e.message || 'intenta de nuevo'); }
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar contraseña'; }
  }
}
window.doPasswordReset = doPasswordReset;

function openForgotModal() {
  document.getElementById('modal-forgot').style.display = 'flex';
  document.getElementById('forgot-email').value = document.getElementById('login-email').value || '';
  document.getElementById('forgot-msg').textContent = '';
}
function closeForgotModal() {
  document.getElementById('modal-forgot').style.display = 'none';
}
async function doForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim().toLowerCase();
  const msgEl = document.getElementById('forgot-msg');
  if (!email) { msgEl.style.color='#f85149'; msgEl.textContent='Escribe tu correo.'; return; }
  if (!sb) { msgEl.style.color='#f85149'; msgEl.textContent='Error: recarga la página.'; return; }
  const btn = document.getElementById('forgot-btn');
  btn.disabled = true; btn.textContent = 'Enviando...';
  try {
    await sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://finanzasprueba.pages.dev/' });
  } catch(_) {}
  // Mensaje genérico siempre (evita account enumeration)
  msgEl.style.color = '#3fb950';
  msgEl.textContent = 'Si ese correo existe, recibirás un enlace en tu bandeja.';
  btn.textContent = 'Enviado';
  setTimeout(() => { closeForgotModal(); btn.disabled=false; btn.textContent='Enviar enlace'; }, 3000);
}
// _appInitialized declarado en globals-init.js como var (window-accessible)
async function onLoginSuccess() {
  if (_appInitialized) { console.log('[Init] onLoginSuccess ya ejecutado — ignorando llamada extra'); return; }
  _appInitialized = true;
  document.getElementById('login-screen').style.display = 'none';
  // FIX-RACE: app-shell se muestra DESPUÉS de loadFromSupabase() 
  // para que el primer frame visible tenga datos reales (ver abajo).
  // Lazy load Chart.js — solo después del login para no bloquear el render inicial
  if (typeof Chart === 'undefined') {
    // FIX-1: onerror→resolve para que fallo de CDN no rompa el login
    // REVERT: cambiar s.onerror = () => resolve() de vuelta a s.onerror = reject
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
      s.onload = resolve;
      s.onerror = () => { console.warn('[FIN] Chart.js CDN falló — gráficos diferidos'); resolve(); };
      document.head.appendChild(s);
    });
  }
  // Manejar URL params de shortcuts PWA
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'nuevo') {
    setTimeout(() => openModal(null, urlParams.get('tipo') || ''), 800);
  }
  const badge = document.getElementById('user-email-badge');
  const displayName = getDisplayName(currentUser.email);
  badge.textContent = '👤 ' + displayName;
  badge.title = currentUser.email;
  badge.style.display = 'inline';
  // Actualizar nombre en settings si existe
  document.querySelectorAll('[id*="name-display"],[id*="perfil-name"]').forEach(el => {
    if (el) el.textContent = displayName;
  });
  // Batch-XX: resolver household_id antes de cargar datos
  // FIX-SPLASH: try/finally garantiza que app-shell SIEMPRE aparece aunque loadFromSupabase falle
  try {
    await resolveHouseholdId();
    await loadFromSupabase();
  } catch(initErr) {
    console.error('[Init] Error cargando datos iniciales:', initErr?.message || initErr);
    toast('⚠️ Error cargando datos. Intenta recargar.', 'err');
  } finally {
    // SIEMPRE mostrar app-shell y ocultar splash — sin importar si hubo error
    document.getElementById('app-shell').style.display = 'block';
    const _splashEl = document.getElementById('splash-overlay');
    if (_splashEl) _splashEl.style.display = 'none';
  }
  // Verificar token de invitación en URL (/?invite=TOKEN)
  const _inviteToken = new URLSearchParams(window.location.search).get('invite');
  if (_inviteToken && typeof handleInviteToken === 'function') {
    setTimeout(() => handleInviteToken(_inviteToken), 1500);
  }
  startRealtime();
  startSessionRefresh();
  // PASO 3 — Enviar sesión al SW para push notifications
  (async function enviarSesionAlSW() {
    if (!navigator.serviceWorker?.controller) return;
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_SESSION',
        token: session.access_token,
        userId: session.user.id
      });
    } catch(e) { console.warn('[SW] enviarSesionAlSW:', e.message); }
  })();
  // Smart module hooks
  if (typeof window._checkNovedades === 'function') window._checkNovedades();
  const _nb = document.getElementById('btn-novedades');
  if (_nb) _nb.style.display = 'inline-flex';
  startInactivityWatcher();
  logConnection();
  // Cargar config FIRE guardada
  setTimeout(loadFire, 800);
  setTimeout(loadGoal, 900);
  // Batch-XVII: biométrico eliminado — stub para evitar ReferenceError
  // setTimeout(offerBiometricSetup, 1500); ← removido
  // Detectar inicio de mes nuevo y notificar al usuario
  setTimeout(checkNuevoMesAlLogin, 2200);
  // Mostrar banner PWA después del login (si no instalada ni dismisseada)
  setTimeout(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
                     || window.navigator.standalone;
    const dismissed   = sessionStorage.getItem('pwa_install_dismissed');
    if (!isInstalled && !dismissed) {
      _showInstallBanner();
      // Auto-ocultar después de 5 segundos si no hay interacción
      setTimeout(() => {
        const banner = document.getElementById('pwa-install-banner');
        if (banner && banner.style.display !== 'none') {
          banner.style.transition = 'opacity .5s';
          banner.style.opacity = '0';
          setTimeout(() => { banner.style.display = 'none'; banner.style.opacity = ''; }, 500);
        }
      }, 5000);
    }
  }, 2000);
}

// ─── SUPABASE: CARGAR DATOS ──────────────────
async function loadFromSupabase() {
  showLoadingOverlay(true);
  // Batch-XX: usar HOUSEHOLD_ID para datos compartidos del hogar
  const hid = HOUSEHOLD_ID || currentUser.id;
  try {
    const [cfgRes, movsRes, tasasGlobalRes, tasasMesRes, fondosRes] = await Promise.all([
      sb.from('config_usuario').select('*').eq('user_id', hid).single(),
      sb.from('movimientos').select('*').eq('user_id', hid).is('deleted_at', null).order('fecha', { ascending: true }),
      sb.from('tasas_cambio').select('*').eq('user_id', hid).eq('mes', 'global').single(),
      sb.from('tasas_cambio').select('*').eq('user_id', hid).eq('mes', currentMonth).single(),
      sb.from('fondo_emergencia').select('*').eq('user_id', hid)
    ]);

    const cfgData = cfgRes.data;
    if (cfgData) {
      // FIX-XI-1: guards relajados — aceptar cualquier objeto no vacío
      if (cfgData.tipos?.length > 0) CONFIG.tipos = cfgData.tipos;
      if (cfgData.categorias && typeof cfgData.categorias === 'object' && Object.keys(cfgData.categorias).length > 0)
        CONFIG.categorias = cfgData.categorias;
      if (cfgData.subcategorias && typeof cfgData.subcategorias === 'object' && Object.keys(cfgData.subcategorias).length > 0)
        CONFIG.subcategorias = cfgData.subcategorias;
      if (cfgData.presupuestos && typeof cfgData.presupuestos === 'object' && Object.keys(cfgData.presupuestos).length > 0)
        CONFIG.presupuestos = cfgData.presupuestos;
      if (cfgData.presupuestos_ingresos) CONFIG.presupuestosIngresos = cfgData.presupuestos_ingresos;
      if (cfgData.closed_months) CONFIG.closedMonths = cfgData.closed_months;
      if (cfgData.dashboard_order && Array.isArray(cfgData.dashboard_order))
        CONFIG.dashboardOrder = cfgData.dashboard_order;
      if (cfgData.nav_order && Array.isArray(cfgData.nav_order) && cfgData.nav_order.length > 0)
        CONFIG.navOrder = cfgData.nav_order;
      // Batch-XX: fondo de emergencia separado en base manual + contribuciones automáticas
      if (cfgData.ef_manual_base != null) CONFIG.efManualBase = parseFloat(cfgData.ef_manual_base) || 0;
      if (cfgData.ef_auto_contrib != null) CONFIG.efAutoContrib = parseFloat(cfgData.ef_auto_contrib) || 0;
      if (cfgData.ef_reset_date != null) CONFIG.efResetDate = cfgData.ef_reset_date;
      if (Array.isArray(cfgData.wallet_order) && cfgData.wallet_order.length) CONFIG.walletOrder = cfgData.wallet_order;
      // Compatibilidad legacy: si existen campos viejos y no los nuevos, migrar
      if (cfgData.emergency_fund_base != null && cfgData.ef_manual_base == null) {
        CONFIG.efManualBase = parseFloat(cfgData.emergency_fund_base) || 0;
        CONFIG.efAutoContrib = 0;
      }
      CONFIG.emergencyFundBase = (CONFIG.efManualBase || 0) + (CONFIG.efAutoContrib || 0);
      if (cfgData.emergency_fund_goal != null) CONFIG.emergencyFundGoal = parseFloat(cfgData.emergency_fund_goal) || 3000;
      // Suscripción
      CONFIG.subscriptionStatus  = cfgData.subscription_status || 'free';
      CONFIG.subscriptionExpires = cfgData.subscription_expires_at || null;
      // Batch-XX: cargar recurrentes y plantillas desde Supabase
      if (cfgData.recurrentes && Array.isArray(cfgData.recurrentes) && cfgData.recurrentes.length > 0) RECURRENTES = cfgData.recurrentes;
      // FIX-TEMPLATE: plantillas ahora tienen tabla propia (plantillas_usuario).
      // Se cargan en bloque separado después del try principal.
      if (cfgData.pin_hash) {
        CONFIG._pinHash = cfgData.pin_hash;
        // Restore PIN to localStorage if missing
        if (!localStorage.getItem('fin_pin_v2')) {
          localStorage.setItem('fin_pin_v2', cfgData.pin_hash);
        }
      }
      if (cfgData.cat_emojis && typeof cfgData.cat_emojis === 'object') {
        CONFIG.catEmojis = cfgData.cat_emojis;
      }
      // FIX-EMOJI-PERSIST: fusionar overrides locales (cubre caso partner/Isabel cuyo
      // sbSaveConfig escribe en su propio user_id pero loadFromSupabase lee del owner).
      try {
        const _localEmojis = localStorage.getItem('fin_cat_emojis_local');
        if (_localEmojis) {
          const _parsed = JSON.parse(_localEmojis);
          if (_parsed && typeof _parsed === 'object' && Object.keys(_parsed).length > 0) {
            CONFIG.catEmojis = Object.assign({}, CONFIG.catEmojis || {}, _parsed);
          }
        }
      } catch(e) {}
      // cat_rules: sincronizar desde Supabase → localStorage (fuente de verdad: Supabase)
      if (cfgData.cat_rules && Array.isArray(cfgData.cat_rules) && cfgData.cat_rules.length > 0) {
        try { localStorage.setItem('fin_cat_rules_v1', JSON.stringify(cfgData.cat_rules)); } catch(e) {}
      }
      if (cfgData.presupuestos_subcat && typeof cfgData.presupuestos_subcat === 'object')
        CONFIG.presupuestosSubcat = cfgData.presupuestos_subcat;
      if (cfgData.metas_ahorro && Array.isArray(cfgData.metas_ahorro)) {
        CONFIG.metasAhorro = cfgData.metas_ahorro;
      } else {
        // Fallback: cargar desde localStorage si Supabase no tiene la columna aún
        try {
          const localMetas = localStorage.getItem('fin_metas_ahorro');
          if (localMetas) CONFIG.metasAhorro = JSON.parse(localMetas);
        } catch(e) {}
      }
    }
    // FIX-XIII-3: seed SIEMPRE fuera del if(cfgData) — cubre caso sin fila en Supabase
    // FIX-XVIII-4: verifica tipos Y categorias — ambos deben existir para omitir seed
    const _needsSeed = !CONFIG.tipos?.length ||
                       !CONFIG.categorias ||
                       Object.keys(CONFIG.categorias).length === 0;
    if (_needsSeed) {
      initConfigFromDefaults();
      sbSaveConfig(); // persiste en Supabase
    }

    // Batch-X: migración legacy eliminada — datos 100% en Supabase
    const movs = movsRes.data || [];
    processMovimientosFromDB(movs, cfgData?.ef_auto_contrib);

    const tasas = tasasGlobalRes.data || tasasMesRes.data;
    if (tasas) {
      rateBCV = tasas.rate_bcv; rateEUR = tasas.rate_eur;
      const elBcv = document.getElementById('rate-bcv');
      const elEur = document.getElementById('rate-eur');
      if (elBcv) elBcv.value = rateBCV;
      if (elEur) elEur.value = rateEUR;
      lastRateDate = tasas.updated_at ? tasas.updated_at.slice(0,10) : null;
    }
    if (fondosRes.data) {
      fondosRes.data.forEach(f => { emergencyFundByMonth[f.mes] = parseFloat(f.monto); });
      window._efLoadedFromSupabase = true;
    }

    // ── Fallback localStorage — plantillas se cargan en bloque separado ──
    if (!RECURRENTES || RECURRENTES.length === 0) {
      try {
        const lsRec = localStorage.getItem('fin_recurrentes_bk');
        if (lsRec) { RECURRENTES = JSON.parse(lsRec); console.log('[loadFromSupabase] recurrentes desde localStorage:', RECURRENTES.length); }
      } catch(e) {}
    }

    // ── Fallback localStorage para EF split ──────────────────────────────────
    // Si ef_manual_base es null (columna no existe), leer del backup local
    if (cfgData && cfgData.ef_manual_base == null) {
      try {
        const lsEF = localStorage.getItem('fin_ef_split');
        if (lsEF) {
          const ef = JSON.parse(lsEF);
          CONFIG.efManualBase  = ef.base  || 0;
          CONFIG.efAutoContrib = ef.auto  || 0;
          CONFIG.efResetDate   = ef.reset || null;
          if (ef.goal) CONFIG.emergencyFundGoal = ef.goal;
          CONFIG.emergencyFundBase = CONFIG.efManualBase + CONFIG.efAutoContrib;
          console.log('[loadFromSupabase] EF split desde localStorage:', ef);
        }
      } catch(e) {}
    }

    // ── Fallback localStorage para metas_ahorro ──────────────────────────────
    if (!CONFIG.metasAhorro || CONFIG.metasAhorro.length === 0) {
      try {
        const lsMetas = localStorage.getItem('fin_metas_ahorro');
        if (lsMetas) CONFIG.metasAhorro = JSON.parse(lsMetas);
      } catch(e) {}
    }

  } catch(e) {
    console.warn('[loadFromSupabase] Error en bloque principal:', e?.message || e);
    // FIX-OFFLINE: si el error fue de red, intentar restaurar todo desde localStorage
    const isNetworkError = e?.message && (
      e.message.toLowerCase().includes('fetch') ||
      e.message.toLowerCase().includes('network') ||
      e.message.toLowerCase().includes('load failed') ||
      e.message.toLowerCase().includes('offline')
    );
    if (isNetworkError) {
      console.warn('[loadFromSupabase] Sin internet — restaurando desde localStorage');
      toast('📵 Sin internet — cargando datos guardados localmente...', 'warn');
      // Restaurar plantillas
      try { const t = localStorage.getItem('fin_templates_v3'); if (t) templates = JSON.parse(t); } catch(_) {}
      // Restaurar recurrentes
      try { const r = localStorage.getItem('fin_recurrentes_bk'); if (r) RECURRENTES = JSON.parse(r); } catch(_) {}
      // Restaurar movimientos desde snapshot
      processMovimientosFromDB([], null);
      // Restaurar EF
      try {
        const ef = JSON.parse(localStorage.getItem('fin_ef_split') || '{}');
        CONFIG.efManualBase = ef.base || 0; CONFIG.efAutoContrib = ef.auto || 0;
        CONFIG.efResetDate = ef.reset || null;
        if (ef.goal) CONFIG.emergencyFundGoal = ef.goal;
        CONFIG.emergencyFundBase = CONFIG.efManualBase + CONFIG.efAutoContrib;
      } catch(_) {}
    }
  }

  // ── PLANTILLAS — tabla dedicada, fuera del try principal ─────────────────
  await loadTemplatesFromSupabase();

  // ── DINERO FUERA (deudas + préstamos) — fuera del try principal ─────────
  // FIX-RLS: consultar con currentUser.id (auth.uid()) Y con hid (household)
  // para cubrir tanto el dueño como el partner del hogar.
  window._deudasData    = { deudas: [] };
  window._prestamosData = { prestamos: [] };
  window._dfLoadedFromSupabase = false;
  try {
    const uid = currentUser.id;
    // Buscar registros propios del usuario (auth.uid()) — los que él mismo guardó
    const { data: dfOwn, error: dfOwnErr } = await sb.from('dinero_fuera')
      .select('*').eq('user_id', uid).order('created_at', { ascending: true });
    // Buscar también registros del hogar (por si el partner guardó con hid distinto)
    let dfHousehold = [];
    if (hid !== uid) {
      const { data: dfH } = await sb.from('dinero_fuera')
        .select('*').eq('user_id', hid).order('created_at', { ascending: true });
      if (dfH) dfHousehold = dfH;
    }
    if (dfOwnErr) console.warn('[dinero_fuera] load error:', dfOwnErr.message);
    // Combinar y deduplicar por id
    const seen = new Set();
    const dfData = [...(dfOwn || []), ...dfHousehold].filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id); return true;
    });
    if (dfData.length > 0) {
      window._deudasData = { deudas: dfData.filter(r => r.tipo === 'deuda').map(r => ({
        id: r.id, acreedor: r.nombre || '', concepto: r.concepto || '',
        saldo: parseFloat(r.monto_original || 0) - parseFloat(r.monto_abonado || 0),
        montoOriginal: parseFloat(r.monto_original || 0),
        montoAbonado: parseFloat(r.monto_abonado || 0),
        abonos: Array.isArray(r.abonos) ? r.abonos : [],
        pagada: r.pagado || false, fecha: r.fecha_inicio,
        fechaVencimiento: r.fecha_vencimiento, fechaPago: r.fecha_pago
      })) };
      window._prestamosData = { prestamos: dfData.filter(r => r.tipo === 'prestamo').map(r => ({
        id: r.id, deudor: r.nombre || '', concepto: r.concepto || '',
        monto: parseFloat(r.monto_original || 0) - parseFloat(r.monto_abonado || 0),
        montoOriginal: parseFloat(r.monto_original || 0),
        montoAbonado: parseFloat(r.monto_abonado || 0),
        abonos: Array.isArray(r.abonos) ? r.abonos : [],
        cobrado: r.pagado || false, fecha: r.fecha_inicio,
        fechaVencimiento: r.fecha_vencimiento, fechaCobro: r.fecha_pago
      })) };
      window._dfLoadedFromSupabase = true;
      // Actualizar localStorage backup tras carga exitosa
      try {
        localStorage.setItem('fin_deudas_bk',    JSON.stringify(window._deudasData.deudas));
        localStorage.setItem('fin_prestamos_bk', JSON.stringify(window._prestamosData.prestamos));
      } catch(_) {}
      console.log('[dinero_fuera] ✅ deudas:', window._deudasData.deudas.length, '· préstamos:', window._prestamosData.prestamos.length);
    } else {
      // Sin datos en Supabase — restaurar desde localStorage backup
      try {
        const bkD = localStorage.getItem('fin_deudas_bk');
        const bkP = localStorage.getItem('fin_prestamos_bk');
        if (bkD) { const p = JSON.parse(bkD); if (p.length) window._deudasData = { deudas: p }; }
        if (bkP) { const p = JSON.parse(bkP); if (p.length) window._prestamosData = { prestamos: p }; }
        if (window._deudasData.deudas.length || window._prestamosData.prestamos.length) {
          console.log('[dinero_fuera] restaurado desde localStorage bk');
        } else {
          console.log('[dinero_fuera] sin registros');
        }
      } catch(_) {}
    }
  } catch(e) {
    console.warn('[dinero_fuera] exception:', e.message);
    // Sin red — restaurar desde localStorage
    try {
      const bkD = localStorage.getItem('fin_deudas_bk');
      const bkP = localStorage.getItem('fin_prestamos_bk');
      if (bkD) { const p = JSON.parse(bkD); if (p.length) window._deudasData = { deudas: p }; }
      if (bkP) { const p = JSON.parse(bkP); if (p.length) window._prestamosData = { prestamos: p }; }
    } catch(_) {}
  }

  // ── Healthcheck ──
  setTimeout(() => runHealthCheck(), 2000);

  showLoadingOverlay(false);
  init();
  // FIX-EF-DISPLAY: syncEF explícito después de init() para garantizar
  // que el KPI y panel muestren el valor cargado de Supabase/localStorage.
  if (typeof syncEF === 'function') syncEF();
  // FIX-TEMPLATE-DISPLAY: renderTemplatePills también en loadFromSupabase
  // porque init() puede correr antes de que app-analytics.js defina la función.
  if (typeof renderTemplatePills === 'function') renderTemplatePills();
}

// ─── Procesar movimientos desde DB ───────────
// Batch-X: EXCEL_DATA_RAW eliminado — Supabase es la única fuente de verdad.
// FIX-X-2: normalizar campo mes desde Supabase a Title Case español
function normalizeMes(raw) {
  if (!raw) return null;
  const map = {
    'january':'Enero','enero':'Enero','february':'Febrero','febrero':'Febrero','march':'Marzo','marzo':'Marzo',
    'april':'Abril','abril':'Abril','may':'Mayo','mayo':'Mayo','june':'Junio','junio':'Junio',
    'july':'Julio','julio':'Julio','august':'Agosto','agosto':'Agosto',
    'september':'Septiembre','septiembre':'Septiembre','october':'Octubre','octubre':'Octubre',
    'november':'Noviembre','noviembre':'Noviembre','december':'Diciembre','diciembre':'Diciembre'
  };
  // handle YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const mn = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const idx = parseInt(raw.split('-')[1], 10) - 1;
    return mn[idx] || null;
  }
  return map[raw.toLowerCase()] || raw;
}

function processMovimientosFromDB(movs, _cfgDataEfAutoContrib) {
  // _cfgDataEfAutoContrib: valor de ef_auto_contrib pasado desde loadFromSupabase
  // para evitar referenciar cfgData (fuera de scope)
  const mesNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  mesNames.forEach(m => {
    EXCEL_DATA[m] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
  });

  // FIX-OFFLINE: si no hay movimientos de red, intentar restaurar desde snapshot local
  if (!movs || movs.length === 0) {
    try {
      const _snapKey = 'fin_movimientos_snapshot_' + (currentUser?.id || 'anon');
      const snap = localStorage.getItem(_snapKey);
      if (snap) {
        let parsed = null;
        try { parsed = JSON.parse(snap); } catch(_je) { localStorage.removeItem(_snapKey); }
        if (parsed) {
        // snap = { Enero: [...txns], Febrero: [...txns], ... }
        let restored = 0;
        Object.entries(parsed).forEach(([mes, txns]) => {
          if (Array.isArray(txns) && txns.length > 0) {
            EXCEL_DATA[mes] = EXCEL_DATA[mes] || {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
            EXCEL_DATA[mes].transactions = txns;
            restored += txns.length;
          }
        });
        if (restored > 0) {
          console.warn('[processMovimientos] Sin datos de red — restaurados', restored, 'movimientos desde snapshot local');
          toast('📵 Sin datos de red — mostrando último snapshot guardado (' + restored + ' movimientos)', 'warn');
          // Continuar con el procesado de snapshot como si fueran movimientos reales
          mesNames.forEach(m => {
            if (EXCEL_DATA[m].transactions.length > 0) { userModifiedMonths.add(m); recalcMonth(m); }
          });
          const activeMeses = mesNames.filter(m => EXCEL_DATA[m]?.transactions?.length > 0);
          if (activeMeses.length > 0) {
            activeMonths.length = 0;
            activeMeses.forEach(m => activeMonths.push(m));
            currentMonth = activeMeses[activeMeses.length - 1];
          }
        }
      }
      }
    } catch(_) {}
    return;
  }

  if (movs && movs.length > 0) {
    movs.forEach(r => {
      const m = normalizeMes(r.mes);
      if (!m) return;
      if (!EXCEL_DATA[m]) EXCEL_DATA[m] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
      const newTxn = {
        id: r.id, desc: r.descripcion, tipo: r.tipo, cat: r.cat,
        subcat: r.subcat, amount: parseFloat(r.amount),
        amountBs: parseFloat(r.amount_bs||0), method: r.method, date: r.fecha,
        author: r.author || null,
        cuenta_id: r.cuenta_id || null,
        rate_type: r.rate_type || 'bcv',
        ef_contribution: r.ef_contribution ? parseFloat(r.ef_contribution) : null
      };
      const idx = EXCEL_DATA[m].transactions.findIndex(t => t.id === r.id);
      if (idx >= 0) {
        EXCEL_DATA[m].transactions[idx] = newTxn;
      } else {
        EXCEL_DATA[m].transactions.push(newTxn);
      }
    });
    mesNames.forEach(m => {
      if (EXCEL_DATA[m].transactions.length > 0) { userModifiedMonths.add(m); recalcMonth(m); }
    });
    const activeMeses = mesNames.filter(m => EXCEL_DATA[m]?.transactions?.length > 0);
    if (activeMeses.length > 0) {
      activeMonths.length = 0;
      activeMeses.forEach(m => activeMonths.push(m));
      currentMonth = activeMeses[activeMeses.length - 1];
    }

    // FIX-EF-v6: recalcular siempre desde transacciones reales.
    // El valor guardado en Supabase (ef_auto_contrib) puede ser 0 por bug previo,
    // lo que pisaba el acumulado real. Ahora: si hay transacciones con ef_contribution,
    // siempre recalculamos desde ellas. El valor de Supabase solo se usa como fallback
    // cuando no hay transacciones de ingreso registradas.
    {
      const resetDate = CONFIG.efResetDate || null;
      let autoTotalFromTxns = 0;
      let hasIngresoTxns = false;
      Object.values(EXCEL_DATA).forEach(md => {
        (md.transactions || []).forEach(t => {
          if (['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)) {
            hasIngresoTxns = true;
            if (!resetDate || !t.date || t.date > resetDate) {
              autoTotalFromTxns += t.ef_contribution ?? (parseFloat(t.amount) * 0.30);
            }
          }
        });
      });

      if (hasIngresoTxns) {
        // Fuente de verdad: las transacciones reales (siempre recalcular)
        CONFIG.efAutoContrib = autoTotalFromTxns;
        console.log('[EF-v6] recalculado desde transacciones:', CONFIG.efAutoContrib);
      } else {
        // Sin ingresos registrados — usar valor guardado en Supabase si existe
        const savedAutoContrib = _cfgDataEfAutoContrib;
        if (savedAutoContrib != null && parseFloat(savedAutoContrib) > 0) {
          CONFIG.efAutoContrib = parseFloat(savedAutoContrib);
          console.log('[EF-v6] sin transacciones — usando Supabase:', CONFIG.efAutoContrib);
        } else {
          CONFIG.efAutoContrib = 0;
          console.log('[EF-v6] sin ingresos ni base guardada — EF auto = 0');
        }
      }
      CONFIG.emergencyFundBase = (CONFIG.efManualBase || 0) + CONFIG.efAutoContrib;
    }

    // FIX-SNAPSHOT: guardar snapshot de movimientos en localStorage tras carga exitosa
    try {
      const snap = {};
      mesNames.forEach(m => {
        if (EXCEL_DATA[m]?.transactions?.length > 0) snap[m] = EXCEL_DATA[m].transactions;
      });
      localStorage.setItem('fin_movimientos_snapshot_' + currentUser.id, JSON.stringify(snap));
    } catch(_) {}
  }
}

// ─── Healthcheck al iniciar ───────────────────
function runHealthCheck() {
  const mesNames = ['Enero','Febrero','Marzo'];
  let warnings = [];
  // Verificar que meses activos tienen transacciones
  activeMonths.forEach(m => {
    if (!EXCEL_DATA[m]?.transactions?.length) {
      warnings.push(`⚠️ ${m} sin transacciones en memoria`);
    }
  });
  // Verificar totales lógicos
  activeMonths.forEach(m => {
    const d = EXCEL_DATA[m];
    if (d && d.ingresos < 0) warnings.push(`⚠️ Ingresos negativos en ${m}`);
  });
  if (warnings.length > 0) {
    console.warn('[Healthcheck]', warnings);
    toast('⚠️ Healthcheck: ' + warnings[0], 'warn');
  } else {
    console.log('[Healthcheck] ✅ Todos los datos íntegros');
  }
}

// ─── SUPABASE: GUARDAR MOVIMIENTO ────────────
async function sbSaveMov(mov, month, _retry = 0) {
  if (!currentUser || !sb) {
    pushOfflineQueue({ type: 'saveMov', mov, month });
    return;
  }
  // FIX-RLS-MOV: SIEMPRE auth.uid() para cumplir RLS.
  const uid = currentUser.id;
  const hid = HOUSEHOLD_ID || currentUser.id;
  const payload = {
    id: mov.id,
    user_id: uid,   // FIX-RLS: auth.uid() — nunca hid
    mes: month,
    descripcion: mov.desc || '',
    tipo: mov.tipo || 'Gasto',
    cat: mov.cat || '',
    subcat: mov.subcat || '',
    amount: typeof mov.amount === 'number' ? mov.amount : parseFloat(mov.amount) || 0,
    amount_bs: typeof mov.amountBs === 'number' ? mov.amountBs : parseFloat(mov.amountBs) || 0,
    method: mov.method || 'Otro',
    fecha: mov.date || getLocalToday(),
    cuenta_id: mov.cuenta_id || null,
    rate_type: mov.rate_type || 'bcv',
    author: mov.author || null,
    ef_contribution: mov.ef_contribution || null
  };
  // Guard: rechazar payloads inválidos
  if (!payload.id || !payload.user_id || !payload.mes) {
    console.error('[sbSaveMov] Payload inválido — falta id, user_id o mes:', payload);
    toast('⚠️ Error interno al guardar (payload inválido)', 'err');
    return;
  }
  try {
    const { data, error } = await sb.from('movimientos').upsert(payload, { onConflict: 'id' });
    if (error) {
      // Mostrar error INMEDIATAMENTE en el primer intento (no esperar 3 reintentos)
      console.error('[sbSaveMov] Error Supabase (retry=' + _retry + '):', JSON.stringify(error), '\nPayload:', JSON.stringify(payload));
      if (_retry === 0) {
        toast(`⚠️ No se sincronizó "${(mov.desc||'').slice(0,20)}" — ${error.message||error.code||'Error desconocido'}`, 'err');
      }
      if (_retry < 2) {
        setTimeout(() => sbSaveMov(mov, month, _retry + 1), 3000);
      } else {
        pushOfflineQueue({ type: 'saveMov', mov, month });
      }
    } else {
      // Éxito — log en consola para debugging
      if (_retry > 0) console.log('[sbSaveMov] Guardado exitoso en reintento #' + _retry, mov.id);
    }
  } catch(e) {
    console.error('[sbSaveMov] Excepción (retry=' + _retry + '):', e.message, '\nPayload:', JSON.stringify(payload));
    if (_retry === 0) {
      toast(`⚠️ Error de red al guardar "${(mov.desc||'').slice(0,20)}". Se reintentará.`, 'err');
    }
    if (_retry < 2) {
      setTimeout(() => sbSaveMov(mov, month, _retry + 1), 3000);
    } else {
      pushOfflineQueue({ type: 'saveMov', mov, month });
    }
  }
}

// ─── SUPABASE: SOFT DELETE ────────────────────
async function sbDeleteMov(id) {
  if (!currentUser) return;
  // Anomaly detection: alerta si se borran 5+ en poco tiempo
  window._deleteCount = (window._deleteCount || 0) + 1;
  window._deleteTimer = window._deleteTimer || setTimeout(() => { window._deleteCount = 0; window._deleteTimer = null; }, 60000);
  if (window._deleteCount >= 5) {
    const ok = await showConfirm('⚠️ Muchas eliminaciones', `Has eliminado ${window._deleteCount} movimientos en menos de 1 minuto. ¿Continuar?`, '⚠️');
    if (!ok) return;
    window._deleteCount = 0;
  }
  try {
    const movToDelete = Object.values(EXCEL_DATA).flatMap(d => d.transactions || []).find(t => t.id === id);
    // SOFT DELETE: marcar como eliminado en lugar de borrar permanentemente
    const { error } = await sb.from('movimientos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', HOUSEHOLD_ID || currentUser.id);
    if (error) {
      console.error('Error eliminando movimiento:', error);
      toast('⚠️ No se pudo eliminar de la nube. Recarga la app.', 'err');
    } else if (movToDelete) {
      sbLogMovimiento('eliminar', movToDelete, movToDelete._mes || currentMonth, null);
    }
  } catch(e) {
    toast('⚠️ Error de red al eliminar. Revisa tu conexión.', 'err');
  }
}

// ─── SUPABASE: LOG DE MOVIMIENTOS (auditoría) ─
async function sbLogMovimiento(accion, mov, mes, movAnterior) {
  if (!currentUser) return;
  try {
    await sb.from('registro_movimientos').insert({
      user_id: currentUser.id, email: currentUser.email,
      accion, mov_id: mov.id, mes,
      descripcion: mov.desc, tipo: mov.tipo, cat: mov.cat||'',
      amount: mov.amount, fecha_mov: mov.date,
      valor_anterior: movAnterior ? JSON.stringify(movAnterior) : null,
      created_at: new Date().toISOString()
    });
  } catch(e) { console.log('[AuditLog]', e.message); }
}

// ─── COLA OFFLINE PERSISTENTE (localStorage) ──
function pushOfflineQueue(item) {
  try {
    const q = JSON.parse(localStorage.getItem('finanzas_sync_queue') || '[]');
    q.push({ ...item, ts: Date.now() });
    localStorage.setItem('finanzas_sync_queue', JSON.stringify(q));
  } catch(e) {}
}
function popOfflineQueue() {
  try { return JSON.parse(localStorage.getItem('finanzas_sync_queue') || '[]'); } catch(e) { return []; }
}
function clearOfflineQueue() {
  localStorage.removeItem('finanzas_sync_queue');
}

// ─── REINTENTO AL RECONECTAR ─────────────────
window.addEventListener('online', async () => {
  const cola = popOfflineQueue();
  if (cola.length > 0) {
    toast(`📡 Reconectado — sincronizando ${cola.length} movimiento(s)...`, 'ok');
    clearOfflineQueue();
    for (const item of cola) {
      if (item.type === 'saveMov') await sbSaveMov(item.mov, item.month);
    }
    toast('✅ Sincronización completa', 'ok');
  }
});

// ─── SUPABASE: GUARDAR CONFIG ────────────────
// FIX-XI-1: seed de CONFIG con valores por defecto cuando Supabase no tiene datos
// Esto es solo para recuperación de emergencia — los datos reales vienen de Supabase
function initConfigFromDefaults() {
  // FIX-XVIII-4: ELIMINADO el guard "if tipos.length > 0 return".
  // ESA LÍNEA ERA LA CAUSA RAÍZ del bug de 10+ iteraciones.
  // tipos venía de Supabase → guard disparaba → fn salía → cats/subcats/presupuestos = {} SIEMPRE.
  // REGLA DEFINITIVA: cada campo tiene su propio guard. La función nunca sale completa.
  if (!CONFIG.tipos?.length) {
    CONFIG.tipos = ['Gasto','Ingreso Fijo','Ingreso Variable','Ahorro en efectivo','Prestamo recibido','Prestamo pagado','Ajuste'];
  }
  if (!CONFIG.categorias || Object.keys(CONFIG.categorias).length === 0) {
  CONFIG.categorias = {
    'Gasto': ['🏡Casa','🥑ComidaMercado','Familia','🚓Transporte','Viajes','🏦Cashea','🚑Salud','📺Suscripciones','💅CuidadoPersonal','📽️Entretenimiento','🛸Otros','Antojos','Deudas'],
    'Ingreso Fijo': ['Salario mensual neto Isabel','Salario mensual neto Anthony','Salario pacientes Anthony','Dinerito extra'],
    'Ingreso Variable': ['Salario mensual neto Isabel','Salario mensual neto Anthony','Salario pacientes Anthony','Dinerito extra'],
    'Ahorro en efectivo': ['AHORRO COCHINITO'],
    'Prestamo recibido': ['🛸Otros','Familia','Amigos'],
    'Prestamo pagado': ['Familia','Amigos','🛸Otros','🏦Cashea'],
    'Ajuste': ['Ajuste general']
  };
  } // end if categorias vacías
  if (!CONFIG.subcategorias || Object.keys(CONFIG.subcategorias).length === 0) {
  CONFIG.subcategorias = {
    '🏡Casa': ['Condominio','Luz y aseo','Articulo hogar','Internet'],
    '🥑ComidaMercado': ['Mercado','Restaurantes','Chucheria','Pan dulce','Charcuteria','Verduras','Mercadito','Proteinas','Frutas','Comida'],
    'Familia': ['Colegiaturas','Clases de deporte'],
    '🚓Transporte': ['Yummy','Autobus'],
    'Viajes': ['Vuelos de avión','Hospedajes'],
    '🏦Cashea': ['Pago de Cashea'],
    '🚑Salud': ['Consultas médicas','Ginecologo','Gimnasio'],
    '📺Suscripciones': ['Netflix','Spotify','Max','Amazon Prime','Disney +','Google One','Ads Facebook'],
    '💅CuidadoPersonal': ['Corte de cabello','Manos y pies','Cejas y uñas'],
    '📽️Entretenimiento': ['Tickets de cine','Otros'],
    '🛸Otros': ['Otros','Prestamo','Cashea'],
    'Antojos': ['Comida','Articulos','Ropa','Compras nerviosas'],
    'Deudas': ['Pago de Cashea','Pago de prestamos'],
    'AHORRO COCHINITO': [], 'Salario mensual neto Isabel': [],
    'Salario mensual neto Anthony': [], 'Salario pacientes Anthony': [],
    'Dinerito extra': [], 'Ajuste general': []
  };
  } // end if subcategorias vacías
  if (!CONFIG.presupuestos || Object.keys(CONFIG.presupuestos).length === 0) {
    CONFIG.presupuestos = {
      'ingresos': 550, 'gastos': 1229.98,
      '🏡Casa': 130, '🥑ComidaMercado': 300, 'Familia': 0, '🚓Transporte': 144,
      'Viajes': 0, '🏦Cashea': 209.98, '🚑Salud': 60, '📺Suscripciones': 106,
      '💅CuidadoPersonal': 70, '📽️Entretenimiento': 0, '🛸Otros': 0, 'Antojos': 0, 'Deudas': 210
    };
  }
  console.log('[initConfigFromDefaults] CONFIG seed aplicado desde defaults');
}

async function sbSaveConfig() {
  if (!currentUser) return;
  const hid = HOUSEHOLD_ID || currentUser.id;
  // FIX-CFG-RLS: para escritura SIEMPRE usar auth.uid() (currentUser.id).
  // Usar hid (que puede ser el ID del partner) viola la RLS de Supabase → el upsert
  // se rechaza silenciosamente y los cambios (tipos, categorias, subcategorias) no persisten.
  const writeUid = currentUser.id;

  // ── Capa 0: localStorage backup (sin red, sin guards) ─────────────
  try {
    localStorage.setItem('fin_templates_v3',   JSON.stringify(templates || []));
    localStorage.setItem('fin_recurrentes_bk', JSON.stringify(RECURRENTES || []));
    localStorage.setItem('fin_ef_split', JSON.stringify({
      base:  CONFIG.efManualBase  || 0,
      auto:  CONFIG.efAutoContrib || 0,
      reset: CONFIG.efResetDate   || null,
      goal:  CONFIG.emergencyFundGoal || 3000
    }));
    localStorage.setItem('fin_metas_ahorro', JSON.stringify(CONFIG.metasAhorro || []));
  } catch(e) {}

  // FIX-GUARD: nunca omitir Supabase — cat_emojis, closedMonths, subcategorias y
  // recurrentes deben persistir siempre. El guard anterior los bloqueaba silenciosamente.
  if (!currentUser) return;

  // ── Supabase: upsert único con TODAS las columnas confirmadas ──────
  // Todas las columnas verificadas en config_usuario (SELECT ejecutado Marzo 2026)
  try {
    const { error } = await sb.from('config_usuario').upsert({
      user_id:                writeUid, // FIX-CFG-RLS: auth.uid() para cumplir RLS
      tipos:                  CONFIG.tipos,
      categorias:             CONFIG.categorias,
      subcategorias:          CONFIG.subcategorias,
      presupuestos:           CONFIG.presupuestos,
      presupuestos_ingresos:  CONFIG.presupuestosIngresos || {},
      // FIX-PRESUP-SUBCAT: columna confirmada en Supabase (ALTER TABLE ejecutado)
      presupuestos_subcat:    CONFIG.presupuestosSubcat   || {},
      closed_months:          CONFIG.closedMonths,
      dashboard_order:        CONFIG.dashboardOrder || null,
      nav_order:              CONFIG.navOrder       || null,
      emergency_fund_base:    (CONFIG.efManualBase || 0) + (CONFIG.efAutoContrib || 0),
      emergency_fund_goal:    CONFIG.emergencyFundGoal || 3000,
      ef_manual_base:         CONFIG.efManualBase  || 0,
      ef_auto_contrib:        CONFIG.efAutoContrib || 0,
      ef_reset_date:          CONFIG.efResetDate   || null,
      recurrentes:            RECURRENTES || [],
      plantillas:             templates   || [],
      metas_ahorro:           CONFIG.metasAhorro || [],
      pin_hash:               CONFIG._pinHash    || null,
      cat_emojis:             CONFIG.catEmojis   || {},
      cat_rules:              (function(){ try { return JSON.parse(localStorage.getItem('fin_cat_rules_v1') || '[]'); } catch(e) { return []; } })(),
      wallet_order:           CONFIG.walletOrder || [],
      updated_at:             getLocalToday() + 'T' + new Date().toTimeString().slice(0,8) + 'Z'
    }, { onConflict: 'user_id' });

    // FIX-EMOJI-PERSIST: mantener localStorage sincronizado como backup
    try {
      if (CONFIG.catEmojis && Object.keys(CONFIG.catEmojis).length > 0)
        localStorage.setItem('fin_cat_emojis_local', JSON.stringify(CONFIG.catEmojis));
    } catch(e) {}

    if (error) {
      console.error('[sbSaveConfig] upsert error:', error.message, '| code:', error.code);
      // Si alguna columna nueva fue agregada al schema pero no aquí → 42703
      // Agregar la columna faltante al upsert de arriba
    } else {
      console.log('[sbSaveConfig] ✓ guardado');
    }
  } catch(e) {
    console.error('[sbSaveConfig] exception:', e.message);
  }
}

// FIX-SYNC-BTN: forzar sincronización de toda la configuración hacia Supabase
// Útil cuando categorías/presupuestos existen en localStorage pero no en Supabase
async function forzarSincConfig() {
  if (!currentUser) { toast('Inicia sesión primero', 'err'); return; }
  toast('🔄 Sincronizando configuración...', 'ok');
  try {
    await sbSaveConfig();
    toast('✅ Configuración sincronizada correctamente', 'ok');
    // Recargar el panel de presupuestos si está abierto
    if (typeof renderSettingsTab === 'function') {
      const activePanelTab = document.querySelector('.sett-tab-btn.active');
      if (activePanelTab) renderSettingsTab(activePanelTab.dataset.tab || 'presupuestos');
    }
  } catch(e) {
    toast('❌ Error al sincronizar: ' + e.message, 'err');
  }
}

async function sbSaveTasas() {
  if (!currentUser) return;
  const hid = HOUSEHOLD_ID || currentUser.id;
  // Guardar globalmente (mes='global') — la tasa es la misma para toda la app
  await sb.from('tasas_cambio').upsert({
    user_id: hid, mes: 'global',
    rate_bcv: rateBCV, rate_eur: rateEUR,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,mes' });
  // Batch-XX: guardar también en tasas_historicas
  sbSaveTasaHistorica();
}

// ─── SUPABASE: GUARDAR TASA HISTÓRICA (por fecha) ─────────
async function sbSaveTasaHistorica(fecha) {
  if (!rateBCV || rateBCV <= 0) return;
  const dia = fecha || new Date().toISOString().slice(0, 10);
  try {
    await sb.from('tasas_historicas').upsert({
      fecha: dia,
      household_key: 'anthony-isabel-2026',
      rate_bcv: rateBCV,
      rate_eur: rateEUR
    }, { onConflict: 'fecha,household_key' });
  } catch(e) { console.warn('[tasas_historicas] save error:', e.message); }
}

// ─── SUPABASE: OBTENER TASA POR FECHA ─────────────────────
async function getTasaByFecha(fecha) {
  if (!fecha || !sb) return null;
  try {
    const { data } = await sb.from('tasas_historicas')
      .select('rate_bcv, rate_eur')
      .eq('fecha', fecha)
      .eq('household_key', 'anthony-isabel-2026')
      .single();
    if (!data) return null;
    // Si rate_eur es null en registros viejos, usar rateEUR actual como aproximación
    return {
      rate_bcv: data.rate_bcv,
      rate_eur: data.rate_eur || rateEUR || null
    };
  } catch(e) { return null; }
}

// ─── SUPABASE: GUARDAR FONDO EMERGENCIA ──────
async function sbSaveFondo(month) {
  if (!currentUser) return;
  const hid = HOUSEHOLD_ID || currentUser.id;
  await sb.from('fondo_emergencia').upsert({
    user_id: hid, mes: month,
    monto: emergencyFundByMonth[month] || 0,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,mes' });
}

// ─── LOADING OVERLAY ─────────────────────────
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

// ─── AUTH: verificar sesión al cargar ────────
// ═══════════════════════════════════════════════════════════
// SEGURIDAD — AUTO-REFRESH SESIÓN + INACTIVIDAD + ERRORES
// ═══════════════════════════════════════════════════════════

// ── 1. MANEJO GLOBAL DE ERRORES JS — canonical: init.js ─────

// ── 2. AUTO-REFRESH DE SESIÓN SUPABASE ─────────────────────
// El token JWT expira cada hora — esto lo renueva silenciosamente
// MOVED TO init.js — declarado allí como let _sessionRefreshInterval (evita SyntaxError duplicado)
// let _sessionRefreshInterval = null;
function startSessionRefresh() {
  if (_sessionRefreshInterval) clearInterval(_sessionRefreshInterval);
  _sessionRefreshInterval = setInterval(async () => {
    if (!currentUser) return;
    try {
      const { error } = await sb.auth.refreshSession();
      if (error) console.warn('[SessionRefresh] Error:', error.message);
    } catch(e) { console.log('[SessionRefresh] Sin conexión, reintentará.'); }
  }, 25 * 60 * 1000); // cada 25 min (token dura 60 min)
}
function stopSessionRefresh() {
  if (_sessionRefreshInterval) { clearInterval(_sessionRefreshInterval); _sessionRefreshInterval = null; }
}

// ── 3. TIMEOUT POR INACTIVIDAD ──────────────────────────────
// const INACTIVITY_MINUTES = 30; // DUPLICADO — canonical: init.js
// let _inactivityTimer = null;   // DUPLICADO — canonical: init.js
// let _inactivityWarnTimer = null; // DUPLICADO — canonical: init.js
function resetInactivityTimer() {
  clearTimeout(_inactivityTimer);
  clearTimeout(_inactivityWarnTimer);
  if (!currentUser) return;
  // Advertencia 2 minutos antes
  _inactivityWarnTimer = setTimeout(() => {
    if (currentUser) toast('⏰ Sesión cerrará en 2 min por inactividad', 'warn');
  }, (INACTIVITY_MINUTES - 2) * 60 * 1000);
  // Cierre automático
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

// ── PWA INSTALL ────────────────────────────────────────────
var deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  // Si la app ya está abierta en el login, mostrar banner ahí también
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!isInstalled && !sessionStorage.getItem('pwa_install_dismissed')) {
    _showInstallBanner();
  }
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  // Ocultar banner y marcar como instalada permanentemente
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
  // No mostrar si ya está instalada como PWA
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
    // Chrome ya instaló o no soporta — redirigir a instrucciones manuales
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

// ── 4. DETECCIÓN DE NUEVA VERSIÓN DEL SW ──────────────────
function startSWUpdateWatcher() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    // Revisar actualizaciones cada 10 minutos
    setInterval(() => reg.update(), 10 * 60 * 1000);
    // Detectar cuando hay una nueva versión instalada esperando
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Hay nueva versión lista — notificar al usuario
          const banner = document.createElement('div');
          banner.style.cssText = 'position:fixed;bottom:80px;left:16px;right:16px;background:#0d261a;border:1px solid #3fb950;border-radius:10px;padding:12px 14px;z-index:99999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,.6)';
          banner.innerHTML = `
            <span style="font-size:1.2rem">🆕</span>
            <div style="flex:1">
              <div style="font-size:.78rem;font-weight:700;color:#e6edf3">Nueva versión disponible</div>
              <div style="font-size:.67rem;color:#8b949e">Actualiza para tener las últimas mejoras</div>
            </div>
            <button onclick="window.location.reload()" style="background:#238636;border:none;color:#fff;padding:6px 14px;border-radius:6px;font-size:.75rem;font-weight:700;cursor:pointer">Actualizar</button>
            <button onclick="this.closest('div').remove()" style="background:none;border:none;color:#8b949e;font-size:1rem;cursor:pointer">✕</button>`;
          document.body.appendChild(banner);
        }
      });
    });
  });
}

// ── INIT PRINCIPAL — DISABLED (init.js lo maneja en el split modular) ──
window.addEventListener('DOMContentLoaded__disabled', async () => {
  // SAFETY: si en 3s nada cargó, forzar pantalla de login
  const _safetyTimer = setTimeout(() => {
    console.warn('[SAFETY] Timeout 3s — forzando login');
    const sp = document.getElementById('splash-overlay');
    if (sp) sp.style.display = 'none';
    const ls = document.getElementById('login-screen');
    if (ls && ls.style.display === 'none') ls.style.display = 'flex';
    _appInitialized = false;
  }, 3000);
  window._clearSafetyTimer = () => clearTimeout(_safetyTimer);

  startSWUpdateWatcher();

  // FIX-BTN-v2: binding correcto touchend+click en login-btn
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

  // FIX-CDN-ASYNC (Batch-F): esperar que supabase-js cargue antes de hacer NADA.
  // Muestra "Conectando..." para que el usuario sepa que está cargando.
  if (loginBtn) { loginBtn.textContent = 'Conectando...'; loginBtn.disabled = true; }
  try {
    await window._sbLoadPromise;
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { detectSessionInUrl: true, persistSession: true } });
    window._supabase = sb; // exponer para notificaciones-panel.js y otros módulos
    console.log('[Init] supabase-js OK ✓');

    // ── OAuth callback para PWA abierta sin recarga de página ────────────────
    // Cubre el caso en que Chrome Android intercepta el callback y abre la PWA
    // que ya estaba en memoria — detectSessionInUrl no dispara en ese escenario.
    sb.auth.onAuthStateChange(async (event, session) => {
      // FIX-SESSION-RESTORE: INITIAL_SESSION = refresh de página con sesión guardada
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && !_appInitialized) {
        currentUser = session.user;
        if (session.refresh_token) localStorage.setItem('finanzas_sb_refresh', session.refresh_token);
        if (session.access_token)  localStorage.setItem('finanzas_sb_access',  session.access_token);
        // Limpiar token de la URL si quedó visible
        if (window.location.hash.includes('access_token') ||
            window.location.search.includes('code=')) {
          history.replaceState(null, '', window.location.pathname);
        }
        window._clearSafetyTimer && window._clearSafetyTimer(); // cancelar el timer de 8s
        await onLoginSuccess();
      }
      // Sin sesión guardada → mostrar login de inmediato sin esperar timer
      if (event === 'INITIAL_SESSION' && !session && !_appInitialized) {
        window._clearSafetyTimer && window._clearSafetyTimer();
        const sp = document.getElementById('splash-overlay');
        if (sp) sp.style.display = 'none';
        const ls = document.getElementById('login-screen');
        if (ls) ls.style.display = 'flex';
      }
      if (event === 'SIGNED_OUT') {
        currentUser = null;
        _appInitialized = false;
        HOUSEHOLD_ID = null;
        if (realtimeChannel) { try{realtimeChannel.unsubscribe();}catch(e){} realtimeChannel = null; }
      }
    });
    // BUG-1 fix: getSession() explícito por si INITIAL_SESSION no disparó antes del handler
    const { data: { session: _existingSession } } = await sb.auth.getSession();
    if (_existingSession && !_appInitialized) {
      currentUser = _existingSession.user;
      if (_existingSession.refresh_token) localStorage.setItem('finanzas_sb_refresh', _existingSession.refresh_token);
      if (_existingSession.access_token)  localStorage.setItem('finanzas_sb_access',  _existingSession.access_token);
      window._clearSafetyTimer && window._clearSafetyTimer();
      await onLoginSuccess();
    }
  } catch(cdnErr) {
    console.error('[Init] supabase-js no cargó:', cdnErr.message);
    const errEl = document.getElementById('login-error');
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = '⚠️ No se pudo conectar con el servidor. Verifica tu internet y recarga la página.';
    }
    if (loginBtn) { loginBtn.textContent = 'Sin conexión — Recarga'; loginBtn.disabled = true; }
    return; // Detener init si supabase no está disponible
  }
  if (loginBtn) { loginBtn.textContent = 'Entrar'; loginBtn.disabled = false; }

  // ── RECOVERY: link de restablecer contraseña ──────────────
  if (window.location.hash.includes('type=recovery')) {
    window._clearSafetyTimer && window._clearSafetyTimer();
    history.replaceState(null, '', window.location.pathname);
    const sp = document.getElementById('splash-overlay');
    if (sp) sp.style.display = 'none';
    const ls = document.getElementById('login-screen');
    if (ls) ls.style.display = 'none';
    _showPasswordResetModal();
    return;
  }

  // ── Fix OAuth callback: si viene de Google, el token está en la URL ──
  if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
    _appInitialized = false; // FIX-OAUTH-HANG: garantiza que onLoginSuccess corra exactamente una vez
    // Detectar si estamos en el browser del sistema (no en la PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (!isStandalone) {
      // Intentar redirigir a la PWA usando deep link antes de procesar aquí
      const pwaUrl = 'https://finanzasprueba.pages.dev/' + window.location.hash + window.location.search;
      // Mostrar banner de redirección mientras procesamos la sesión en paralelo
      setTimeout(() => {
        const banner = document.getElementById('pwa-redirect-banner') || (() => {
          const b = document.createElement('div');
          b.id = 'pwa-redirect-banner';
          b.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#238636;color:#fff;padding:12px 16px;font-size:.85rem;font-weight:600;z-index:99999;display:flex;align-items:center;justify-content:space-between;gap:8px';
          b.innerHTML = `<span>✅ Autenticado — ¿Tienes la app instalada?</span><a href="${pwaUrl}" style="background:#fff;color:#238636;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none;white-space:nowrap">Abrir App</a>`;
          document.body.prepend(b);
          return b;
        })();
      }, 300);
    }
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        currentUser = session.user;
        localStorage.setItem('finanzas_sb_refresh', session.refresh_token);
        localStorage.setItem('finanzas_sb_access',  session.access_token);
        history.replaceState(null, '', window.location.pathname); // limpiar URL
        window._clearSafetyTimer && window._clearSafetyTimer();
        await onLoginSuccess();
        return; // salir del init — ya está logueado
      }
    } catch(e) { console.warn('[OAuth] callback error:', e.message); }
  }

  // ── Verificar sesión — restaurar desde token local si existe (más rápido) ──
  // sb.auth.getSession() hace llamada a red (~300ms).
  // Con tokens en localStorage: setSession() restaura sin red en ~0ms.
  const _cachedRefresh = localStorage.getItem('finanzas_sb_refresh');
  const _cachedAccess  = localStorage.getItem('finanzas_sb_access');
  let _sessionRestored = false;

  if (_cachedRefresh) {
    try {
      const { data: sd } = await sb.auth.setSession({
        access_token:  _cachedAccess  || '',
        refresh_token: _cachedRefresh
      });
      if (sd?.session?.user) {
        currentUser = sd.session.user;
        // Actualizar tokens con los nuevos (pueden haber rotado)
        localStorage.setItem('finanzas_sb_refresh', sd.session.refresh_token);
        localStorage.setItem('finanzas_sb_access',  sd.session.access_token);
        _sessionRestored = true;
        window._clearSafetyTimer && window._clearSafetyTimer();
        await onLoginSuccess();
      }
    } catch(e) { /* token expirado o inválido — caer a getSession normal */ }
  }

  if (!_sessionRestored) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        currentUser = session.user;
        window._clearSafetyTimer && window._clearSafetyTimer();
        await onLoginSuccess();
      } else {
        // Sin sesión: ocultar splash, mostrar login
        window._clearSafetyTimer && window._clearSafetyTimer();
        const _sp = document.getElementById('splash-overlay');
        if (_sp) _sp.style.display = 'none';
      }
    } catch (e) {
      window._clearSafetyTimer && window._clearSafetyTimer();
      const _sp = document.getElementById('splash-overlay');
      if (_sp) _sp.style.display = 'none';
      console.warn('[Init] getSession error:', e.message);
    }
  }
});

// ═══════════════════════════════════════════════
// DATA: TIPOS, CATEGORÍAS, SUBCATEGORÍAS
// ═══════════════════════════════════════════════
var CONFIG = {
  // Batch-X: sin datos hardcodeados. Todo viene de config_usuario en Supabase.
  tipos: [],
  categorias: {},
  subcategorias: {},
  presupuestosIngresos: {},
  presupuestos: {},
  closedMonths: [],
  emergencyFundGoal: 3000,
  emergencyFundBase: 0,
  // Batch-XX: EF split — base manual editable + contribuciones automáticas 30%
  efManualBase: 0,
  efAutoContrib: 0,
  subscriptionStatus:  'free',
  subscriptionExpires: null,
  metasAhorro: [],
  _pinHash: null,
  efResetDate: null   // fecha desde la que se cuentan contribuciones auto (tras último edit manual)
};

// ═══════════════════════════════════════════════
// EXCEL_DATA — inicializado vacío (datos 100% en Supabase desde Batch-X)
// ═══════════════════════════════════════════════
var EXCEL_DATA = {};

// State — MOVED TO globals-init.js (const/let duplicados causan SyntaxError cross-script)
// const months = [...];          → globals-init.js L19
// const activeMonths = [...];    → globals-init.js L21 (var)
// const emergencyFundByMonth = {}; → globals-init.js L28
// const userModifiedMonths = new Set(); → globals-init.js L35
// months.forEach(...)            → globals-init.js L37-40
var currentMonth = 'Marzo';
var charts = {};
var currentCurrency = 'USD';
var rateBCV = 431.01;   // Bs por 1 USD
var rateEUR = 499.62;   // Bs por 1 EUR
var lastRateDate = null, lastRateTime = null;
var templates = [];
var templateMode = false;
var selectedSubcatFilter = null;
var calcVal = '0', calcOperator = null, calcPrev = null, calcNewNum = true, calcHistory = '';

// ─── CURRENCY ─────────────────────────────────
function setCurrency(c) {
  currentCurrency = c;
  document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('cur-' + c).classList.add('active');
  render();
}

function updateRates() {
  rateBCV = parseFloat(document.getElementById('rate-bcv').value) || 431.01;
  rateEUR = parseFloat(document.getElementById('rate-eur').value) || 499.62;
  lastRateDate = new Date().toLocaleDateString('es-VE');
  lastRateTime = new Date().toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'});
  const warning = document.getElementById('rate-date-warning');
  if (warning) warning.style.display = 'none';
  const cdBcv = document.getElementById('cd-bcv-val');
  const cdEur = document.getElementById('cd-eur-val');
  const cdFecha = document.getElementById('cd-fecha');
  if (cdBcv) cdBcv.textContent = rateBCV.toFixed(2);
  if (cdEur) cdEur.textContent = rateEUR.toFixed(2);
  if (cdFecha) {
    const hoy = new Date();
    const dow = ['dom','lun','mar','mie','jue','vie','sab'][hoy.getDay()];
    cdFecha.textContent = dow + ' ' + hoy.toLocaleDateString('es-VE',{day:'2-digit',month:'short',year:'numeric'});
  }
  updateRateNote();
  render();
  sbSaveTasas();
}

function updateRateNote() {
  // sync modal editable inputs
  const rnBcvIn = document.getElementById('rn-bcv-input');
  const rnEurIn = document.getElementById('rn-eur-input');
  if (rnBcvIn && !rnBcvIn._userEdited) rnBcvIn.value = rateBCV;
  if (rnEurIn && !rnEurIn._userEdited) rnEurIn.value = rateEUR;
  // update date label in modal
  const rnFecha = document.getElementById('rn-fecha-label');
  if (rnFecha && lastRateDate) {
    const d = new Date(lastRateDate + 'T12:00:00');
    rnFecha.textContent = d.toLocaleDateString('es-VE',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
  }
}
function onEditModalRate() {
  const bcvIn = document.getElementById('rn-bcv-input');
  const eurIn = document.getElementById('rn-eur-input');
  if (bcvIn) bcvIn._userEdited = true;
  if (eurIn) eurIn._userEdited = true;
  // apply to globals immediately so amounts update
  const newBCV = parseFloat(bcvIn?.value) || rateBCV;
  const newEUR = parseFloat(eurIn?.value) || rateEUR;
  rateBCV = newBCV; rateEUR = newEUR;
  document.getElementById('rate-bcv').value = newBCV;
  document.getElementById('rate-eur').value = newEUR;
  const cdBcv = document.getElementById('cd-bcv-val');
  const cdEur = document.getElementById('cd-eur-val');
  if (cdBcv) cdBcv.textContent = newBCV.toFixed(2);
  if (cdEur) cdEur.textContent = newEUR.toFixed(2);
}
function syncModalRatesFromGlobal() {
  const bcvIn = document.getElementById('rn-bcv-input');
  const eurIn = document.getElementById('rn-eur-input');
  if (bcvIn) { bcvIn.value = rateBCV; bcvIn._userEdited = false; }
  if (eurIn) { eurIn.value = rateEUR; eurIn._userEdited = false; }
  const dateVal = document.getElementById('f-date')?.value;
  if (dateVal) lastRateDate = dateVal;
  document.getElementById('rate-date-warning').style.display = 'none';
  updateRateNote();
  toast('?? Tasas actualizadas para este movimiento', 'ok');
}

// Convierte USD a la moneda activa para visualización
// rateBCV = Bs/USD, rateEUR = Bs/EUR → USD→EUR = usd * rateBCV / rateEUR
function convertAmt(usd) {
  if (currentCurrency === 'BS') return usd * rateBCV;
  if (currentCurrency === 'EUR') return usd * rateBCV / rateEUR;
  return usd;
}

// ── HAPTIC FEEDBACK ──────────────────────────────────
function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  const patterns = { light: [30], medium: [60], success: [30,50,30], error: [100,50,100] };
  navigator.vibrate(patterns[type] || [30]);
}

function fmt(n) {
  if (window._hideAmounts) return '••••••';
  const val = convertAmt(Math.abs(n || 0));
  const prefix = currentCurrency === 'BS' ? 'Bs ' : currentCurrency === 'EUR' ? '€' : '$';
  return prefix + val.toLocaleString('es-VE', {minimumFractionDigits:2,maximumFractionDigits:2});
}
// fmtSigned: igual que fmt pero incluye el signo - para valores negativos
function fmtSigned(n) {
  if (window._hideAmounts) return '••••••';
  return (n < 0 ? '-' : '') + fmt(n);
}

// ── OCULTAR CIFRAS — C2 ───────────────────────────────────────
window._hideAmounts = localStorage.getItem('fin_hide_amounts') === '1';
function toggleHideAmounts() {
  window._hideAmounts = !window._hideAmounts;
  localStorage.setItem('fin_hide_amounts', window._hideAmounts ? '1' : '0');
  const btn = document.getElementById('btn-hide-balance');
  if (btn) btn.classList.toggle('hide-active', window._hideAmounts);
  updateHeroBalance();
  if (typeof renderWalletCards === 'function') renderWalletCards();
  render();
}
function initHideBtn() {
  const btn = document.getElementById('btn-hide-balance');
  if (btn) btn.classList.toggle('hide-active', !!window._hideAmounts);
}

// ── GESTIÓN DE NUEVO MES ─────────────────────────────────────────────────
// checkActivarMesBtn: muestra/oculta el botón "Abrir Mes" en buildTabs() e init().
// Detecta si el mes real del calendario supera el último mes activo con datos.
const _MES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function checkActivarMesBtn() {
  const hoy           = new Date();
  const mesRealNombre = _MES_NOMBRES[hoy.getMonth()];
  const mesRealIdx    = hoy.getMonth();
  const currentIdx    = _MES_NOMBRES.indexOf(currentMonth);

  // Crear el botón si no existe en el DOM
  let btn = document.getElementById('btn-activar-mes');
  if (!btn) {
    const closeBtn  = document.getElementById('btn-close-month');
    const tabsWrap  = document.getElementById('month-tabs');
    const container = closeBtn?.parentNode || tabsWrap?.parentNode
                    || document.querySelector('.controls-bar,.month-controls,.tabs-row');
    btn = document.createElement('button');
    btn.id = 'btn-activar-mes';
    btn.onclick = activarMesActual;
    if (container) {
      btn.style.cssText = [
        'display:none','padding:6px 14px','border-radius:8px',
        'border:1px solid var(--blue,#58a6ff)','background:rgba(88,166,255,.12)',
        'color:var(--blue,#58a6ff)','font-size:.75rem','font-weight:700',
        'cursor:pointer','margin-left:6px','white-space:nowrap'
      ].join(';');
      if (closeBtn) closeBtn.parentNode.insertBefore(btn, closeBtn.nextSibling);
      else container.appendChild(btn);
      console.log('[MesBtn] inyectado en contenedor:', container.id || container.className);
    } else {
      // Fallback: botón flotante fijo en esquina superior derecha
      btn.style.cssText = [
        'display:none','position:fixed','top:64px','right:12px','z-index:9000',
        'padding:8px 16px','border-radius:10px',
        'border:1.5px solid var(--blue,#58a6ff)','background:var(--bg-card,#161b22)',
        'color:var(--blue,#58a6ff)','font-size:.8rem','font-weight:700',
        'cursor:pointer','box-shadow:0 4px 16px rgba(0,0,0,.4)'
      ].join(';');
      document.body.appendChild(btn);
      console.log('[MesBtn] inyectado como FAB flotante (ningún contenedor encontrado)');
    }
  }

  if (mesRealIdx > currentIdx && !activeMonths.includes(mesRealNombre)) {
    btn.textContent = `📅 Abrir ${mesRealNombre}`;
    btn.style.display = '';
    console.log('[MesBtn] visible — mesReal:', mesRealNombre, '| currentMonth:', currentMonth);
  } else {
    btn.style.display = 'none';
  }
}

async function activarMesActual() {
  const hoy        = new Date();
  const mesReal    = _MES_NOMBRES[hoy.getMonth()];
  const mesRealIdx = hoy.getMonth();
  const currentIdx = _MES_NOMBRES.indexOf(currentMonth);

  if (activeMonths.includes(mesReal)) {
    switchMonth(mesReal); return;
  }
  // Si hay más de un mes de diferencia, avisar cuántos meses hay sin abrir
  const mesesPendientes = _MES_NOMBRES.slice(currentIdx + 1, mesRealIdx + 1)
    .filter(m => !activeMonths.includes(m));
  const detalle = mesesPendientes.length > 1
    ? `Los meses <b>${mesesPendientes.join(', ')}</b> no tienen movimientos registrados.`
    : '';

  const ok = await showConfirm(
    `📅 Abrir ${mesReal}`,
    `¿Deseas activar <b>${mesReal}</b> como mes actual?<br>${detalle}<br><br>Podrás registrar movimientos desde hoy.`,
    '📅'
  );
  if (!ok) return;

  // Inicializar estructura vacía para el nuevo mes
  if (!EXCEL_DATA[mesReal]) {
    EXCEL_DATA[mesReal] = {ingresos:0, gastos:0, ahorros:0, ajustes:0, balance:0, cat_totals:{}, transactions:[]};
  }
  // Agregar meses intermedios vacíos también (para que no queden huérfanos en el timeline)
  mesesPendientes.forEach(m => {
    if (!activeMonths.includes(m)) activeMonths.push(m);
    if (!EXCEL_DATA[m]) EXCEL_DATA[m] = {ingresos:0, gastos:0, ahorros:0, ajustes:0, balance:0, cat_totals:{}, transactions:[]};
  });

  currentMonth = mesReal;
  buildTabs();
  if (typeof buildMobileMonthSelect === 'function') buildMobileMonthSelect(); // FIX-MES-DROPDOWN
  render();
  const _btnMes = document.getElementById('btn-activar-mes');
  if (_btnMes) _btnMes.style.display = 'none';
  toast(`✅ ${mesReal} abierto — ya puedes registrar movimientos`, 'ok');
}

// Llamada al login: si el mes real > último mes activo, mostrar aviso con acción
function checkNuevoMesAlLogin() {
  // FIX-MES-AUTO: abrir el mes real automáticamente al login, sin botón
  const mesRealIdx = new Date().getMonth();
  const mesReal    = _MES_NOMBRES[mesRealIdx];
  const lastIdx    = _MES_NOMBRES.indexOf(currentMonth);
  if (mesRealIdx > lastIdx && !activeMonths.includes(mesReal)) {
    const mesesPendientes = _MES_NOMBRES.slice(lastIdx + 1, mesRealIdx + 1)
      .filter(m => !activeMonths.includes(m));
    mesesPendientes.forEach(m => {
      if (!activeMonths.includes(m)) activeMonths.push(m);
      if (!EXCEL_DATA[m]) EXCEL_DATA[m] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
    });
    currentMonth = mesReal;
    buildTabs();
    if (typeof buildMobileMonthSelect === 'function') buildMobileMonthSelect();
    render();
    const btnMes = document.getElementById('btn-activar-mes');
    if (btnMes) btnMes.style.display = 'none';
    setTimeout(() => toast(`📅 ${mesReal} abierto automáticamente`, 'ok'), 1800);
  }
}

// ─── INIT ─────────────────────────────────────
function init() {
  applyStoredOrder();
  buildTabs();
  initHideBtn();
  // FIX-NAV-PERSIST: si el usuario tiene orden guardado, reconstruir la barra
  if (CONFIG.navOrder && Array.isArray(CONFIG.navOrder) && CONFIG.navOrder.length > 0) {
    if (typeof buildNavBar === 'function') setTimeout(() => buildNavBar(), 50);
  }
  initAllSortable();
  initNavSortable();
  initPushNotifications();
  document.getElementById('f-date').value = getLocalToday();
  updateRateNote();
  updateRates();
  updateMobileRatesStrip();
  checkActivarMesBtn();
  render();
  populateSearchFilters();
  // FIX-XIX-2: retry banner si beforeinstallprompt llegó antes del DOM
  if (deferredPrompt) _showInstallBanner();
  // Notificaciones inteligentes: vencimientos, anomalías, racha
  if (typeof runSmartNotifications === 'function') runSmartNotifications();
  // FIX-TEMPLATE-RELOAD: renderTemplatePills necesita correr en init() para que
  // las plantillas restauradas de localStorage aparezcan en el primer render.
  if (typeof renderTemplatePills === 'function') renderTemplatePills();
  // Auto-fetch tasa BCV si no se actualizó hoy
  const hoy = getLocalToday();
  if (!lastRateDate || lastRateDate !== hoy) {
    setTimeout(() => fetchTasaBCV(false), 1800);
  }
}

function buildTabs() {
  const wrap = document.getElementById('month-tabs');
  wrap.innerHTML = '';
  months.forEach(m => {
    const btn = document.createElement('button');
    const isClosed = CONFIG.closedMonths.includes(m);
    btn.className = 'month-tab' + (m === currentMonth ? ' active' : '') +
      (!activeMonths.includes(m) ? ' disabled' : '') +
      (isClosed ? ' closed' : '');
    btn.textContent = m.slice(0,3);
    btn.title = m + (isClosed ? ' (cerrado)' : '');
    // FIX-TABS-VISIBLE: tabs futuros visibles pero no clickeables
    if (!activeMonths.includes(m)) {
      btn.style.opacity = '0.35';
      btn.style.cursor = 'default';
      btn.style.pointerEvents = 'none';
    }
    if (activeMonths.includes(m)) btn.onclick = () => switchMonth(m);
    wrap.appendChild(btn);
  });
  const closeBtn = document.getElementById('btn-close-month');
  const isCurrent = CONFIG.closedMonths.includes(currentMonth);
  closeBtn.textContent = isCurrent ? '🔓 Reabrir Mes' : '🔒 Cerrar Mes';
  closeBtn.style.borderColor = isCurrent ? 'var(--green)' : 'var(--border)';
  closeBtn.style.color = isCurrent ? 'var(--green)' : '';
  buildMobileMonthSelect();
  checkActivarMesBtn();
}
function buildMobileMonthSelect() {
  const sel = document.getElementById('mobile-month-select');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    opt.disabled = !activeMonths.includes(m);
    if (m === currentMonth) opt.selected = true;
    sel.appendChild(opt);
  });
  // restore si cambio externo
  if (prev && activeMonths.includes(prev) && prev !== currentMonth) sel.value = currentMonth;
  const statusEl = document.getElementById('mobile-month-status');
  if (statusEl) {
    const isClosed = CONFIG.closedMonths.includes(currentMonth);
    statusEl.textContent = isClosed ? '🔒 Cerrado' : '✅ Activo';
    statusEl.style.color = isClosed ? 'var(--red)' : 'var(--green)';
  }
}

async function switchMonth(m) {
  currentMonth = m;
  document.querySelectorAll('.month-tab').forEach((b,i) => b.classList.toggle('active', months[i] === m));
  const isClosed = CONFIG.closedMonths.includes(m);
  const closeBtn = document.getElementById('btn-close-month');
  if (closeBtn) {
    closeBtn.textContent = isClosed ? '🔓 Reabrir Mes' : '🔒 Cerrar Mes';
    closeBtn.style.borderColor = isClosed ? 'var(--green)' : 'var(--border)';
    closeBtn.style.color = isClosed ? 'var(--green)' : '';
  }
  buildMobileMonthSelect();
  // FIX-XII-2: si el mes no tiene transacciones en memoria, recargar desde Supabase
  if (!EXCEL_DATA[m]?.transactions?.length && navigator.onLine && sb && currentUser) {
    try {
      const { data } = await sb.from('movimientos')
        .select('*').eq('user_id', HOUSEHOLD_ID || currentUser.id).eq('mes', m)
        .is('deleted_at', null).order('fecha', { ascending: true });
      if (data && data.length > 0) {
        if (!EXCEL_DATA[m]) EXCEL_DATA[m] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
        data.forEach(r => {
          const newTxn = { id:r.id, desc:r.descripcion, tipo:r.tipo, cat:r.cat,
            subcat:r.subcat, amount:parseFloat(r.amount), amountBs:parseFloat(r.amount_bs||0),
            method:r.method, date:r.fecha, author:r.author||null,
            cuenta_id: r.cuenta_id||null, rate_type: r.rate_type||'bcv' };
          const idx = EXCEL_DATA[m].transactions.findIndex(t => t.id === r.id);
          if (idx >= 0) EXCEL_DATA[m].transactions[idx] = newTxn;
          else EXCEL_DATA[m].transactions.push(newTxn);
        });
        userModifiedMonths.add(m);
        recalcMonth(m);
      }
    } catch(e) { console.error('[switchMonth] Error cargando mes', m, e); }
  }
  // FIX-EF-v4: al cambiar mes, recalcular efAutoContrib desde reset_date
  {
    const resetDate = CONFIG.efResetDate || null;
    let autoTotal = 0;
    Object.values(EXCEL_DATA).forEach(md => {
      (md.transactions || []).forEach(t => {
        if (['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)) {
          if (!resetDate || !t.date || t.date > resetDate) {
            autoTotal += t.ef_contribution ?? (parseFloat(t.amount) * 0.30);
          }
        }
      });
    });
    CONFIG.efAutoContrib = autoTotal;
    CONFIG.emergencyFundBase = (CONFIG.efManualBase || 0) + autoTotal;
  }
  render();
}

async function toggleCloseMonth() {
  if (!navigator.onLine) { toast('📵 Sin internet — no se puede cerrar/abrir el mes ahora', 'err'); return; }
  const isClosed = CONFIG.closedMonths.includes(currentMonth);
  const action = isClosed ? 'Reabrir mes' : 'Cerrar mes';
  const msg = isClosed ? `¿Reabrir ${currentMonth}? Podrás registrar movimientos nuevamente.` : `¿Cerrar ${currentMonth}? No podrás registrar movimientos hasta reabrirlo.`;
  const ok = await showConfirm(action, msg, isClosed ? '🔓' : '🔒');
  if (!ok) return;
  const idx = CONFIG.closedMonths.indexOf(currentMonth);
  if (idx >= 0) CONFIG.closedMonths.splice(idx, 1);
  else CONFIG.closedMonths.push(currentMonth);
  buildTabs();
  toast(CONFIG.closedMonths.includes(currentMonth) ? `Mes ${currentMonth} cerrado 🔒` : `Mes ${currentMonth} reabierto 🔓`, 'ok');
  sbSaveConfig();
}

// ─── COMPUTE TOTALS ───────────────────────────
function recalcMonth(m) {
  // FIX-VII-1: Prestamo recibido excluido de ingresos (informativo, no afecta balance)
  // coincide con lógica Excel: ingresos = Ingreso Fijo + Ingreso Variable únicamente
  const txns = EXCEL_DATA[m].transactions;
  // FIX-XVIII-2: excluir cat='Transferencia Interna' — solo afecta saldos de cuentas, NO balance
  const ingresos = txns.filter(t =>
    ['Ingreso Fijo','Ingreso Variable'].includes(t.tipo) && t.cat !== 'Transferencia Interna'
  ).reduce((s,t) => s+t.amount, 0);
  const gastos = txns.filter(t =>
    ['Gasto','Prestamo pagado'].includes(t.tipo) && t.cat !== 'Transferencia Interna'
  ).reduce((s,t) => s+t.amount, 0);
  const prestamos= txns.filter(t => t.tipo === 'Prestamo recibido').reduce((s,t) => s+t.amount, 0);
  const ahorros  = txns.filter(t => t.tipo === 'Ahorro en efectivo').reduce((s,t) => s+t.amount, 0);
  const ajustes  = txns.filter(t => t.tipo === 'Ajuste').reduce((s,t) => s+t.amount, 0);
  EXCEL_DATA[m].ingresos  = ingresos;
  EXCEL_DATA[m].gastos    = gastos;
  EXCEL_DATA[m].prestamos = prestamos;
  EXCEL_DATA[m].ahorros   = ahorros;
  EXCEL_DATA[m].ajustes   = ajustes;
  EXCEL_DATA[m].balance   = ingresos - gastos + ajustes;
  const cats = {};
  txns.filter(t => ['Gasto','Prestamo pagado'].includes(t.tipo)).forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.amount; });
  EXCEL_DATA[m].cat_totals = Object.fromEntries(Object.entries(cats).sort((a,b) => b[1]-a[1]));
  // FIX-WALLET-HOOK: notificar a las billeteras después de cada recálculo
  // Esto garantiza que calcCuentaBalance siempre lea EXCEL_DATA actualizado
  if (typeof window._walletNeedsUpdate !== 'undefined') window._walletNeedsUpdate = true;
}

// ─── EMERGENCY FUND ───────────────────────────
// El fondo = base manual (CONFIG.emergencyFundBase) + 30% ingresos acumulado de todos los meses activos
// getEmergencyFund(month) → 30% ingresos del mes indicado
// syncEF() → actualiza KPI, sub-KPI, renderEmergencyFund y openDineroFuera en un solo paso
function getEmergencyFund(month) {
  const m = month || currentMonth;
  if (window._efLoadedFromSupabase && emergencyFundByMonth[m] !== undefined) {
    return emergencyFundByMonth[m] || 0;
  }
  const d = EXCEL_DATA[m];
  if (!d) return 0;
  // FIX-VII-2: consistente con recalcMonth — sin Prestamo recibido
  const ingMes = (d.transactions||[]).filter(t => ['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)).reduce((s,t)=>s+t.amount,0);
  return ingMes * 0.30;
}

// Fuente única de verdad: calcula total EF y actualiza TODAS las vistas
function syncEF() {
  // Batch-XX: efTotal = efManualBase (editado manualmente) + efAutoContrib (30% acumulado de ingresos)
  const efManual  = CONFIG.efManualBase  || 0;
  const efAuto    = CONFIG.efAutoContrib || 0;
  const efTotal   = efManual + efAuto;
  CONFIG.emergencyFundBase = efTotal;
  const efGoal    = CONFIG.emergencyFundGoal || 3000;
  const pct       = Math.min(efTotal / efGoal * 100, 100);
  const kEl    = document.getElementById('k-emergency');
  const kSub   = document.getElementById('k-emergency-sub');
  if (kEl)  kEl.textContent  = fmt(efTotal);
  if (kSub) kSub.textContent = pct.toFixed(0) + '% de meta';
  const efDisp = document.getElementById('emergency-fund-display');
  if (efDisp) {
    efDisp.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:.75rem;margin-bottom:4px">
        <span style="color:var(--orange);font-weight:700">${fmt(efTotal)}</span>
        <div style="display:flex;align-items:center;gap:5px">
          <span style="color:var(--muted);font-size:.65rem">Meta $</span>
          <input type="number" id="ef-goal-input" value="${efGoal}"
            style="background:#0d1117;border:1px solid #e3b341;color:#e3b341;padding:2px 5px;border-radius:4px;font-size:.7rem;width:72px;outline:none;font-weight:600"
            onkeydown="if(event.key===\'Enter\')saveEFGoal()" title="Edita tu meta de fondo de emergencia">
          <button onclick="saveEFGoal()" style="background:#1a3626;border:1px solid #3fb950;color:#3fb950;padding:2px 8px;border-radius:4px;font-size:.65rem;cursor:pointer;font-weight:600">Guardar</button>
        </div>
      </div>
      <div class="ef-bar-track"><div class="ef-bar-fill" style="width:${pct}%"></div></div>
      <div style="font-size:.68rem;color:var(--muted);margin-top:4px">${pct.toFixed(1)}% de la meta · +30% de cada ingreso registrado</div>
      <div class="ef-stats">
        <div class="ef-stat"><div class="ef-stat-val">${fmt(efTotal)}</div><div class="ef-stat-label">Total</div></div>
        <div class="ef-stat"><div class="ef-stat-val" style="color:#f0a83a">${fmt(efAuto)}</div><div class="ef-stat-label">Auto 30%</div></div>
        <div class="ef-stat"><div class="ef-stat-val">${fmt(efGoal - efTotal > 0 ? efGoal - efTotal : 0)}</div><div class="ef-stat-label">Faltante</div></div>
      </div>`;
  }
  return { efTotal, efManual, efAuto, pct, efGoal };
}

// ─── RENDER ──────────────────────────────────
// FIX-VII: alias para compatibilidad con llamadas renderDashboard()
function renderDashboard() { render(); }
function render() {
  userModifiedMonths.add(currentMonth);
  recalcMonth(currentMonth);
  const d = EXCEL_DATA[currentMonth];
  renderKPIs(d);
  // FIX-XIII-1: actualizar hero balance e ingresos/gastos en tiempo real
  updateHeroBalance();
  renderMobileRecentTxn();
  renderAlertas(d);
  renderCharts(d);
  renderSubcatChart(d);
  renderIncomeTypeChart(d);
  renderRanking(d);
  renderIncomeRanking(d);
  renderEmergencyFund();
  renderBudgetBars(d);
  typeof renderIncomeBudgetBars==='function' && renderIncomeBudgetBars(d);
  renderWeeklyBreakdown();
  renderAnomalias(d);
  renderTransactions(d);
  renderPatrimonio();
  // FIX-WALLET-ALWAYS: actualizar tarjetas de cuentas en cada render (siempre)
  if (typeof renderWalletCards === 'function') {
    window._walletNeedsUpdate = false;
    renderWalletCards();
  }
  calcFire();
  // Smart features
  if (typeof renderForecast === 'function') renderForecast();
}

function renderKPIs(d) {
  document.getElementById('k-ingresos').textContent = fmt(d.ingresos);
  document.getElementById('k-gastos').textContent = fmt(d.gastos);
  // Ahorros: mes actual + total todos los meses
  const totalAhorrosTodosMeses = activeMonths.reduce((s,m) => s + (EXCEL_DATA[m]?.ahorros||0), 0);
  document.getElementById('k-ahorros').textContent = fmt(d.ahorros);
  const kAhorrosSub = document.getElementById('k-ahorros-sub');
  if (kAhorrosSub) kAhorrosSub.textContent = `Total: ${fmt(totalAhorrosTodosMeses)}`;
  const bal = d.balance;
  const balEl = document.getElementById('k-balance');
  balEl.textContent = (bal >= 0 ? '+' : '') + fmtSigned(bal);
  balEl.style.color = bal >= 0 ? 'var(--green)' : 'var(--red)';
  const score = calcScore(d);
  const [slabel, scolor] = scoreLabel(score);
  document.getElementById('k-score').textContent = score + '/100';
  document.getElementById('k-score').style.color = scolor;
  document.getElementById('k-score-label').textContent = slabel;
  document.getElementById('k-score-bar').style.width = score + '%';
  // FIX-VII-2b: syncEF() es la fuente única de verdad para KPI y panel EF
  syncEF();
  const avgSaving = activeMonths.reduce((s,m) => s + EXCEL_DATA[m].ahorros, 0) / activeMonths.length;
  document.getElementById('k-forecast').textContent = fmt(avgSaving * 12);
}

function calcScore(d) {
  if (!d.ingresos) return 0;
  const ratioAhorro = d.ahorros / d.ingresos;
  const ratioGasto = d.gastos / d.ingresos;
  let score = Math.min(ratioAhorro * 200, 50) + Math.max(0, 50 - ratioGasto * 50);
  if (d.balance > 0) score += 10;
  return Math.round(Math.min(100, Math.max(0, score)));
}
function scoreLabel(s) {
  if (s >= 80) return ['Excelente 🌟','#3fb950'];
  if (s >= 60) return ['Bueno ✅','#58a6ff'];
  if (s >= 40) return ['Regular ⚠️','#e3b341'];
  return ['Crítico 🚨','#f85149'];
}

function renderAlertas(d) {
  const c = document.getElementById('alertas-container');
  c.innerHTML = '';
  if (!d.ingresos && !d.gastos) return;
  const alerts = [];
  const ratioAhorro = d.ingresos ? d.ahorros / d.ingresos : 0;
  const ratioGasto = d.ingresos ? d.gastos / d.ingresos : 0;
  // 1. Balance
  if (d.balance < 0) alerts.push(['bad','🚨',`Déficit de ${fmt(Math.abs(d.balance))} este mes. Gastos superaron ingresos + ajustes.`]);
  else if (d.balance > 0) alerts.push(['ok','✅',`Superávit de ${fmt(d.balance)} — excelente gestión financiera este mes.`]);
  // 2. Ahorro
  if (ratioAhorro >= 0.20) alerts.push(['ok','🐷',`Tasa de ahorro: ${Math.round(ratioAhorro*100)}% — sobre meta 20%. ¡Excelente disciplina!`]);
  else if (ratioAhorro > 0) alerts.push(['warn','⚠️',`Tasa de ahorro: ${Math.round(ratioAhorro*100)}%. Meta recomendada: 20%.`]);
  // 3. Gasto excesivo
  if (ratioGasto > 1) alerts.push(['bad','🔴',`Gastos = ${Math.round(ratioGasto*100)}% de ingresos. Estás gastando más de lo que entra.`]);
  else if (ratioGasto > 0.8) alerts.push(['warn','🟡',`Gastos = ${Math.round(ratioGasto*100)}% de ingresos. Margen financiero ajustado.`]);
  // 4. Presupuesto excedido
  const catExcedidas = Object.entries(d.cat_totals).filter(([cat, amt]) => CONFIG.presupuestos[cat] > 0 && amt > CONFIG.presupuestos[cat]);
  if (catExcedidas.length > 0) alerts.push(['bad','📊',`Presupuesto excedido en: ${catExcedidas.map(([c]) => c.replace(/[🛸🏡🥑💅🚑🚓🏦📺📽️]/gu,'')).join(', ')}`]);
  // 5. Fondo emergencia — usar exactamente el mismo cálculo que syncEF/dashboard
  const efManualAlert = CONFIG.efManualBase  || 0;
  const efAutoAlert   = CONFIG.efAutoContrib || 0;
  const ef    = efManualAlert + efAutoAlert;
  const efPct = ef / (CONFIG.emergencyFundGoal || 3000);
  if (efPct < 0.20) alerts.push(['warn','🆘',`Fondo de emergencia al ${Math.round(efPct*100)}%. Meta: ${fmt(CONFIG.emergencyFundGoal)}. Considera reforzarlo.`]);
  else if (efPct >= 1) alerts.push(['ok','🆘',`¡Fondo de emergencia completo! ${fmt(ef)} acumulados.`]);
  // 6. Mes cerrado
  if (CONFIG.closedMonths.includes(currentMonth)) alerts.push(['info','🔒',`El mes ${currentMonth} está cerrado. Reabre para registrar movimientos.`]);
  // 7. Top gasto
  const topCat = Object.entries(d.cat_totals)[0];
  if (topCat) alerts.push(['info','📊',`Top gasto: "${topCat[0].replace(/[🛸🏡🥑💅🚑🚓🏦📺📽️]/gu,'')}" — ${fmt(topCat[1])} (${Math.round(topCat[1]/d.gastos*100)}% del total).`]);
  alerts.forEach(([type, icon, msg]) => {
    const div = document.createElement('div');
    div.className = `alerta alerta-${type}`;
    div.innerHTML = `<span class="alerta-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(div);
  });
}

function renderCharts(d) {
  const ctx1 = document.getElementById('chart-overview').getContext('2d');
  if (charts.overview) charts.overview.destroy();
  charts.overview = new Chart(ctx1, {
    type:'bar', data:{
      labels: activeMonths,
      datasets:[
        {label:'Ingresos',data:activeMonths.map(m=>convertAmt(EXCEL_DATA[m].ingresos)),backgroundColor:'rgba(63,185,80,.7)',borderRadius:4},
        {label:'Gastos',data:activeMonths.map(m=>convertAmt(EXCEL_DATA[m].gastos)),backgroundColor:'rgba(248,81,73,.7)',borderRadius:4},
        {label:'Ahorros',data:activeMonths.map(m=>convertAmt(EXCEL_DATA[m].ahorros)),backgroundColor:'rgba(88,166,255,.7)',borderRadius:4},
        {label:'Ajustes',data:activeMonths.map(m=>convertAmt(EXCEL_DATA[m].ajustes||0)),backgroundColor:'rgba(188,140,255,.7)',borderRadius:4}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8b949e',font:{size:10}}}},scales:{x:{ticks:{color:'#8b949e'},grid:{color:'rgba(48,54,61,.4)'}},y:{ticks:{color:'#8b949e',callback:v=>(currentCurrency==='BS'?'Bs ':currentCurrency==='EUR'?'€':'$')+v.toLocaleString()},grid:{color:'rgba(48,54,61,.4)'}}}}
  });
  const cats = Object.entries(d.cat_totals).slice(0,7);
  const ctx2 = document.getElementById('chart-pie').getContext('2d');
  if (charts.pie) charts.pie.destroy();
  const pieColors = ['#f85149','#e3b341','#58a6ff','#3fb950','#bc8cff','#39d353','#ff7b72'];
  charts.pie = new Chart(ctx2, {
    type:'doughnut', data:{
      labels: cats.map(([k])=>k.replace(/[🛸🏡🥑💅🚑🚓🏦📺📽️]/gu,'')),
      datasets:[{data:cats.map(([,v])=>convertAmt(v)),backgroundColor:pieColors,borderColor:'#0d1117',borderWidth:2}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8b949e',font:{size:9},boxWidth:9}}}}
  });
  const ctx3 = document.getElementById('chart-patrimonio').getContext('2d');
  if (charts.pat) charts.pat.destroy();
  let cumAhorro = 0, cumBalance = 0;
  const patData = activeMonths.map(m => { cumAhorro += EXCEL_DATA[m].ahorros; cumBalance += EXCEL_DATA[m].balance; return convertAmt(cumAhorro + cumBalance); });
  charts.pat = new Chart(ctx3, {
    type:'line', data:{
      labels:activeMonths,
      datasets:[{label:'Patrimonio Neto',data:patData,borderColor:'#e3b341',backgroundColor:'rgba(227,179,65,.1)',fill:true,tension:.4,pointBackgroundColor:'#e3b341',pointRadius:4}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8b949e',font:{size:10}}}},scales:{x:{ticks:{color:'#8b949e'},grid:{color:'rgba(48,54,61,.4)'}},y:{ticks:{color:'#8b949e',callback:v=>'$'+v},grid:{color:'rgba(48,54,61,.4)'}}}}
  });
  // chart-comparative eliminado - ahora es panel IA inline
}

function renderSubcatChart(d) {
  const filtersDiv = document.getElementById('subcat-cat-filters');
  const cats = Object.keys(d.cat_totals);
  filtersDiv.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'currency-btn' + (!selectedSubcatFilter ? ' active' : '');
  allBtn.textContent = 'Todos';
  allBtn.style.fontSize = '.65rem';
  allBtn.onclick = () => { selectedSubcatFilter = null; renderSubcatChart(d); };
  filtersDiv.appendChild(allBtn);
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'currency-btn' + (selectedSubcatFilter === cat ? ' active' : '');
    btn.textContent = cat.replace(/[🛸🏡🥑💅🚑🚓🏦📺📽️]/gu,'');
    btn.style.fontSize = '.65rem';
    btn.onclick = () => { selectedSubcatFilter = cat; renderSubcatChart(d); };
    filtersDiv.appendChild(btn);
  });
  // Build subcat data
  const subcatTotals = {};
  d.transactions.filter(t => t.tipo === 'Gasto' && (!selectedSubcatFilter || t.cat === selectedSubcatFilter))
    .forEach(t => {
      const k = t.subcat || t.cat;
      subcatTotals[k] = (subcatTotals[k] || 0) + t.amount;
    });
  const entries = Object.entries(subcatTotals).sort((a,b) => b[1]-a[1]).slice(0,10);
  const ctx = document.getElementById('chart-subcat').getContext('2d');
  if (charts.subcat) charts.subcat.destroy();
  if (!entries.length) return;
  charts.subcat = new Chart(ctx, {
    type:'bar', data:{
      labels: entries.map(([k]) => k),
      datasets:[{label:'Gasto',data:entries.map(([,v])=>convertAmt(v)),backgroundColor:'rgba(248,81,73,.7)',borderRadius:3}]
    },
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b949e',font:{size:9}},grid:{color:'rgba(48,54,61,.3)'}},y:{ticks:{color:'#8b949e',font:{size:9}},grid:{color:'rgba(48,54,61,.3)'}}}}
  });
}

function renderIncomeTypeChart(d) {
  // Batch-XX: paleta de verdes diferenciada por categoría de ingreso
  const GREEN_PALETTE = [
    '#3fb950','#56d364','#2ea043','#4ac26b','#26a641',
    '#6fdd8b','#1f7a35','#34d058','#22863a','#85e89d'
  ];
  const typeTotals = {};
  d.transactions.filter(t => ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo))
    .forEach(t => { typeTotals[t.tipo] = (typeTotals[t.tipo] || 0) + t.amount; });
  // Por categoría (más granular, ej: "Salario Anthony" vs "Salario Isabel")
  const catTotals = {};
  d.transactions.filter(t => ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo))
    .forEach(t => { catTotals[t.cat||t.tipo] = (catTotals[t.cat||t.tipo] || 0) + t.amount; });
  const catKeys   = Object.keys(catTotals);
  const catColors = catKeys.map((_,i) => GREEN_PALETTE[i % GREEN_PALETTE.length]);
  const ctx = document.getElementById('chart-income-type').getContext('2d');
  if (charts.incType) charts.incType.destroy();
  charts.incType = new Chart(ctx, {
    type:'doughnut', data:{
      labels: catKeys,
      datasets:[{data:catKeys.map(k=>convertAmt(catTotals[k])),backgroundColor:catColors,borderColor:'#0d1117',borderWidth:2}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#8b949e',font:{size:10},boxWidth:10}}}}
  });
  // List with per-category color
  const listDiv = document.getElementById('income-type-list');
  const catEntries = Object.entries(catTotals).sort((a,b) => b[1]-a[1]).slice(0,4);
  listDiv.innerHTML = catEntries.map(([cat, amt],i) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;font-size:.72rem;padding:3px 0;border-bottom:1px solid rgba(48,54,61,.4)">
      <span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:${GREEN_PALETTE[i]};display:inline-block"></span>${cat}</span>
      <span style="color:${GREEN_PALETTE[i]};font-weight:600">${fmt(amt)}</span>
    </div>`
  ).join('');
}

function renderRanking(d) {
  const c = document.getElementById('ranking-container');
  const entries = Object.entries(d.cat_totals).slice(0,5);
  const max = entries[0]?.[1] || 1;
  const colors = ['#f85149','#e3b341','#58a6ff','#3fb950','#bc8cff'];
  c.innerHTML = entries.map(([cat,amt],i) => `
    <div class="rank-item">
      <div class="rank-num">#${i+1}</div>
      <div class="rank-bar-wrap">
        <div class="rank-label">
          <span>${cat.replace(/[🛸🏡🥑💅🚑🚓🏦📺📽️]/gu,'')}</span>
          <span style="color:${colors[i]};font-weight:600">${fmt(amt)}</span>
        </div>
        <div class="rank-bar"><div class="rank-fill" style="width:${Math.round(amt/max*100)}%;background:${colors[i]}"></div></div>
      </div>
    </div>`).join('') || '<p style="color:var(--muted);font-size:.77rem">Sin datos.</p>';
}

function renderIncomeRanking(d) {
  const c = document.getElementById('income-ranking-container');
  const catTotals = {};
  d.transactions.filter(t => ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo))
    .forEach(t => { catTotals[t.cat] = (catTotals[t.cat] || 0) + t.amount; });
  const entries = Object.entries(catTotals).sort((a,b) => b[1]-a[1]).slice(0,3);
  const max = entries[0]?.[1] || 1;
  const colors = ['#3fb950','#39d353','#58a6ff'];
  c.innerHTML = entries.map(([cat,amt],i) => `
    <div class="rank-item">
      <div class="rank-num">#${i+1}</div>
      <div class="rank-bar-wrap">
        <div class="rank-label">
          <span>${cat}</span>
          <span style="color:${colors[i]};font-weight:600">${fmt(amt)}</span>
        </div>
        <div class="rank-bar"><div class="rank-fill" style="width:${Math.round(amt/max*100)}%;background:${colors[i]}"></div></div>
      </div>
    </div>`).join('') || '<p style="color:var(--muted);font-size:.77rem">Sin ingresos registrados.</p>';
}

function renderEmergencyFund() {
  // FIX-VII-2c: delega a syncEF() para consistencia total
  syncEF();
}
async function saveEFGoal() {
  const val = parseFloat(document.getElementById('ef-goal-input')?.value);
  if (isNaN(val) || val <= 0) { toast('Ingresa un monto válido para la meta.', 'err'); return; }
  // FIX-XII-3: confirmación
  const ok = await showConfirm('🎯 Cambiar Meta del Fondo',
    `¿Establecer la meta en ${fmt(val)}?`, '🎯');
  if (!ok) return;
  CONFIG.emergencyFundGoal = val;
  syncEF();
  sbSaveConfig();
  toast(`🎯 Meta guardada: ${fmt(val)}`, 'ok');
}
function updateEFGoal(val) {
  const v = parseFloat(val);
  if (isNaN(v) || v <= 0) return;
  CONFIG.emergencyFundGoal = v;
  syncEF();
}

function renderWeeklyBreakdown() {
  const cont = document.getElementById('weekly-breakdown-container');
  if (!cont) return;
  const d = EXCEL_DATA[currentMonth];
  const txns = (d?.transactions || []).filter(t => t.date && t.tipo !== 'Ajuste');
  if (!txns.length) { cont.innerHTML = '<div style="color:#484f58;font-size:.75rem;padding:10px 0">Sin movimientos en este mes.</div>'; return; }

  // Agrupar por semana del mes (1-4+)
  const weeks = [{label:'Sem 1', gastos:0, ingresos:0, ahorros:0, dias:'1–7'},
                  {label:'Sem 2', gastos:0, ingresos:0, ahorros:0, dias:'8–14'},
                  {label:'Sem 3', gastos:0, ingresos:0, ahorros:0, dias:'15–21'},
                  {label:'Sem 4+',gastos:0, ingresos:0, ahorros:0, dias:'22–31'}];

  txns.forEach(t => {
    const day = parseInt((t.date||'').split('-')[2]) || parseInt((t.date||'').split('/')[0]) || 0;
    const wi = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    if      (['Gasto','Prestamo pagado'].includes(t.tipo)) weeks[wi].gastos   += t.amount;
    else if (['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo)) weeks[wi].ingresos += t.amount;
    else if (t.tipo.includes('Ahorro'))  weeks[wi].ahorros  += t.amount;
  });

  const maxVal = Math.max(...weeks.map(w => Math.max(w.gastos, w.ingresos, w.ahorros)), 1);

  cont.innerHTML = weeks.map(w => {
    const gPct = Math.round((w.gastos / maxVal) * 100);
    const iPct = Math.round((w.ingresos / maxVal) * 100);
    const aPct = Math.round((w.ahorros / maxVal) * 100);
    const hasData = w.gastos > 0 || w.ingresos > 0 || w.ahorros > 0;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:.72rem;font-weight:600;color:var(--text)">${w.label}</span>
        <span style="font-size:.65rem;color:var(--muted)">${w.dias}</span>
      </div>
      ${!hasData ? `<div style="font-size:.68rem;color:#484f58;padding:2px 0">Sin movimientos</div>` : `
      ${w.ingresos>0?`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        <span style="font-size:.62rem;color:var(--green);width:14px">↑</span>
        <div style="flex:1;background:#1c2128;border-radius:3px;height:6px;overflow:hidden">
          <div style="width:${iPct}%;height:100%;background:var(--green);border-radius:3px;transition:.3s"></div>
        </div>
        <span style="font-size:.65rem;color:var(--green);min-width:44px;text-align:right">$${w.ingresos.toFixed(0)}</span>
      </div>`:''}
      ${w.gastos>0?`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        <span style="font-size:.62rem;color:var(--red);width:14px">↓</span>
        <div style="flex:1;background:#1c2128;border-radius:3px;height:6px;overflow:hidden">
          <div style="width:${gPct}%;height:100%;background:var(--red);border-radius:3px;transition:.3s"></div>
        </div>
        <span style="font-size:.65rem;color:var(--red);min-width:44px;text-align:right">$${w.gastos.toFixed(0)}</span>
      </div>`:''}
      ${w.ahorros>0?`<div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:.62rem;color:var(--blue);width:14px">🐷</span>
        <div style="flex:1;background:#1c2128;border-radius:3px;height:6px;overflow:hidden">
          <div style="width:${aPct}%;height:100%;background:var(--blue);border-radius:3px;transition:.3s"></div>
        </div>
        <span style="font-size:.65rem;color:var(--blue);min-width:44px;text-align:right">$${w.ahorros.toFixed(0)}</span>
      </div>`:''}
      `}
    </div>`;
  }).join('') + `<div style="display:flex;gap:12px;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
    <span style="font-size:.62rem;color:var(--green);font-weight:700;cursor:pointer" onclick="toast('💵 Ingresos '+currentMonth+': '+fmt((EXCEL_DATA[currentMonth]||{}).ingresos||0),'ok')">↑ Ingresos</span>
    <span style="font-size:.62rem;color:var(--red);font-weight:700;cursor:pointer" onclick="toast('💸 Gastos '+currentMonth+': '+fmt((EXCEL_DATA[currentMonth]||{}).gastos||0),'err')">↓ Gastos</span>
    <span style="font-size:.62rem;color:var(--blue)">🐷 Ahorros</span>
  </div>`;
}

function renderBudgetBars(d) {
  const div  = document.getElementById('budget-bars');
  const cats = Object.entries(CONFIG.presupuestos).filter(([k,v]) => k !== 'ingresos' && k !== 'gastos' && v > 0);
  if (!cats.length) {
    div.innerHTML = '<p style="color:var(--muted);font-size:.73rem;text-align:center;padding:10px">Sin presupuestos configurados.<br><small>Ve a Ajustes → Presupuestos.</small></p>';
    return;
  }
  div.innerHTML = cats.slice(0,8).map(([cat, budget]) => {
    const real      = d.cat_totals[cat] || 0;
    const pct       = Math.min(real / budget * 100, 120);
    const colorText = pct > 100 ? 'var(--red)' : pct > 80 ? 'var(--gold)' : 'var(--green)';
    const barBg     = pct > 100 ? 'var(--red)' : pct > 80 ? 'var(--gold)' : 'var(--green)';
    const realBold  = pct > 100 ? 'font-weight:700;' : '';
    // FIX-PRESUP-SUBCAT-DASH: desglose por subcategoría en el dashboard
    const subcatPresup = CONFIG.presupuestosSubcat?.[cat] || {};
    const subcatItems  = Object.entries(subcatPresup).filter(([,v]) => v > 0);
    const subcatHtml   = subcatItems.map(([sc, bSc]) => {
      const realSc = (d.transactions||[])
        .filter(t => t.tipo==='Gasto' && t.cat===cat && t.subcat===sc)
        .reduce((s,t) => s+t.amount, 0);
      const pSc = bSc > 0 ? Math.min(realSc/bSc*100,120) : 0;
      const cSc = pSc > 100 ? 'var(--red)' : pSc > 80 ? 'var(--gold)' : '#484f58';
      return `<div style="display:flex;align-items:center;gap:6px;margin-top:3px;padding-left:10px">
        <span style="font-size:.62rem;color:#8b949e;flex:1">${sc}</span>
        <span style="font-size:.62rem;color:${cSc}">${fmt(realSc)}/${fmt(bSc)}</span>
        <div style="width:50px;height:3px;background:#21262d;border-radius:2px">
          <div style="width:${Math.min(pSc,100)}%;height:3px;background:${cSc};border-radius:2px"></div>
        </div>
      </div>`;
    }).join('');
    return `<div class="budget-cat" style="margin-bottom:${subcatItems.length?'10':'8'}px">
      <div class="budget-label">
        <span style="font-size:.7rem">${cat}</span>
        <span style="font-size:.67rem;color:${colorText};${realBold}">${fmt(real)} / ${fmt(budget)}</span>
      </div>
      <div class="budget-track"><div class="budget-fill" style="width:${Math.min(pct,100)}%;background:${barBg}"></div></div>
      ${subcatHtml}
    </div>`;
  }).join('');
}

function renderAnomalias(d) {
  const c = document.getElementById('anomalias-container');
  c.innerHTML = '';
  const gastos = d.transactions.filter(t => t.tipo === 'Gasto');
  if (!gastos.length) { c.innerHTML='<div class="alerta alerta-ok"><span class="alerta-icon">✅</span><span>Sin transacciones para analizar.</span></div>'; return; }
  const avg = gastos.reduce((s,t) => s+t.amount,0)/gastos.length;
  const anomalias = gastos.filter(t => t.amount > avg * 1.8).sort((a,b) => b.amount-a.amount).slice(0,3);
  if (!anomalias.length) {
    c.innerHTML=`<div class="alerta alerta-ok"><span class="alerta-icon">✅</span><span>Sin gastos anómalos. Promedio: ${fmt(avg)}</span></div>`;
    return;
  }
  anomalias.forEach(t => {
    c.innerHTML += `<div style="background:var(--red-dim);border:1px solid var(--red);border-radius:6px;padding:8px 10px;margin-bottom:6px;font-size:.73rem">
      <strong style="color:var(--red)">⚡ ${t.desc}</strong> — ${fmt(t.amount)}<br>
      <span style="color:var(--muted);font-size:.67rem">${t.date} · ${t.cat} · ${Math.round(t.amount/avg*100)}% del prom (${fmt(avg)})</span>
    </div>`;
  });
}

function renderTransactions(d) {
  const tbody = document.getElementById('txn-body');
  tbody.innerHTML = '';
  const txns = [...d.transactions].sort((a,b) => b.date.localeCompare(a.date));
  document.getElementById('txn-count').textContent = `(${txns.length} mov.)`;
  if (!txns.length) {
    tbody.innerHTML='<tr><td colspan="7" style="color:var(--muted);padding:16px;text-align:center">Sin movimientos registrados</td></tr>';
    return;
  }

  const isMobile = document.body.classList.contains('is-mobile') || window.innerWidth <= 820;
  const isClosed = CONFIG.closedMonths.includes(currentMonth);

  if (isMobile) {
    // ── Modo móvil: tarjetas con swipe ──────────────────
    tbody.innerHTML = `<tr><td colspan="7" style="padding:0;border:none"><div id="txn-mobile-list"></div></td></tr>`;
    const container = document.getElementById('txn-mobile-list');
    txns.forEach(t => {
      const isIncome = ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo);
      const isSaving = t.tipo === 'Ahorro en efectivo';
      const isAdjust = t.tipo === 'Ajuste';
      const amtColor = isAdjust ? 'var(--purple)' : isIncome ? 'var(--green)' : isSaving ? 'var(--blue)' : 'var(--red)';
      const sign = isAdjust ? (t.amount >= 0 ? '+' : '') : isIncome ? '+' : isSaving ? '~' : '-';
      const typeShort = t.tipo.replace('en efectivo','').replace('recibido','').replace(' Fijo','').replace(' Variable','').trim();
      const card = document.createElement('div');
      card.className = 'txn-mobile-card';
      card.dataset.id = t.id;
      card.style.cssText = 'position:relative;border-bottom:1px solid rgba(48,54,61,.5)';
      card.innerHTML = `
        <div class="txn-card-content" style="display:flex;align-items:center;gap:10px;padding:11px 12px;background:transparent">
          <div style="flex:1;min-width:0">
            <div style="font-size:.8rem;color:var(--text);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.desc}${t.author ? `<span class="txn-author ${t.author.toLowerCase().includes('isabel')?'isabel':'anthony'}">${t.author}</span>` : ''}</div>
            <div style="font-size:.65rem;color:var(--muted);margin-top:2px">${t.date.slice(5)} · <span style="color:${amtColor};font-weight:600">${typeShort}</span> · ${t.cat}${t.subcat?(' · '+((typeof getCatDisplayIcon==='function'?getCatDisplayIcon(t.subcat):getCatEmoji(t.subcat))?(typeof getCatDisplayIcon==='function'?getCatDisplayIcon(t.subcat):getCatEmoji(t.subcat))+'  ':'')+t.subcat):''}${t.rate_type && t.rate_type!=='bcv'?` · <span style="color:#e3b341">${t.rate_type}</span>`:''}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-right:6px">
            <div style="font-size:.9rem;font-weight:700;color:${amtColor}">${sign}${fmt(t.amount)}</div>
            <div style="font-size:.6rem;color:var(--muted)">${t.method||'—'}</div>
          </div>
          ${!isClosed ? `<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
            <button onclick="editMov('${t.id}','${currentMonth}')" style="background:rgba(58,166,255,0.12);border:1px solid rgba(88,166,255,0.3);color:var(--blue);width:30px;height:30px;border-radius:8px;font-size:.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center">✏️</button>
            <button onclick="deleteMov('${t.id}','${currentMonth}')" style="background:rgba(248,81,73,0.12);border:1px solid rgba(248,81,73,0.3);color:var(--red);width:30px;height:30px;border-radius:8px;font-size:.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center">🗑️</button>
          </div>` : ''}
        </div>`;
      container.appendChild(card);
    });
    return;
  }

  // ── Modo escritorio: tabla clásica ──────────────────
  txns.forEach(t => {
    const isIncome = ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo);
    const isSaving = t.tipo === 'Ahorro en efectivo';
    const isAdjust = t.tipo === 'Ajuste';
    const badge = {'Gasto':'tipo-gasto','Ingreso Fijo':'tipo-ingreso','Ingreso Variable':'tipo-ingreso',
      'Ahorro en efectivo':'tipo-ahorro','Prestamo recibido':'tipo-prestamo','Prestamo pagado':'tipo-gasto','Ajuste':'tipo-ajuste'}[t.tipo]||'tipo-ajuste';
    const amtClass = isAdjust ? 'txn-amount-adj' : isIncome ? 'txn-amount-pos' : isSaving ? 'txn-amount-sav' : 'txn-amount-neg';
    const sign = isAdjust ? (t.amount >= 0 ? '+' : '') : isIncome ? '+' : isSaving ? '~' : '-';
    tbody.innerHTML += `<tr>
      <td style="color:var(--muted);white-space:nowrap">${t.date.slice(5)}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.desc}</td>
      <td><span class="tipo-badge ${badge}">${t.tipo.replace('en efectivo','').replace('recibido','').replace('pagado','').trim()}</span></td>
      <td style="color:var(--muted);font-size:.7rem">${t.cat}${t.subcat?('· '+((typeof getCatDisplayIcon==='function'?getCatDisplayIcon(t.subcat):getCatEmoji(t.subcat))?(typeof getCatDisplayIcon==='function'?getCatDisplayIcon(t.subcat):getCatEmoji(t.subcat))+'  ':'')+t.subcat):''}</td>
      <td style="color:var(--muted);font-size:.68rem">${t.method||'—'}</td>
      <td class="${amtClass}">${sign}${fmt(t.amount)}</td>
      <td>${isClosed?'':`<button class="btn-icon btn-edit" onclick="editMov('${t.id}','${currentMonth}')" title="Editar">✏️</button><button class="btn-icon btn-delete" onclick="deleteMov('${t.id}','${currentMonth}')" title="Eliminar">🗑️</button>`}</td>
    </tr>`;
  });
}

function renderPatrimonio() {
  // Ahorro acumulado: suma todos los meses activos
  let cumAhorro = 0;
  activeMonths.forEach(m => { cumAhorro += (EXCEL_DATA[m].ahorros || 0); });
  // Balance: solo el mes actual
  const d = EXCEL_DATA[currentMonth] || {};
  const currentBalance = d.balance || 0;
  // FIX-PATRIMONIO: incluir deudas y préstamos
  const totalDeudas = (window._deudasData?.deudas || [])
    .filter(x => !x.pagada)
    .reduce((s, x) => s + ((x.montoOriginal||0) - (x.montoAbonado||0)), 0);
  const totalPrestamos = (window._prestamosData?.prestamos || [])
    .filter(x => !x.cobrado)
    .reduce((s, x) => s + ((x.montoOriginal||0) - (x.montoAbonado||0)), 0);
  // Fórmula: balance_actual + ahorro_acumulado − deudas + préstamos_por_cobrar
  const total = currentBalance + cumAhorro - totalDeudas + totalPrestamos;

  document.getElementById('p-ahorro').textContent   = fmt(cumAhorro);
  document.getElementById('p-balance').textContent  = (currentBalance >= 0 ? '+' : '') + fmt(currentBalance);

  const pDeudas    = document.getElementById('p-deudas');
  const pPrestamos = document.getElementById('p-prestamos');
  if (pDeudas)    pDeudas.textContent    = totalDeudas    > 0 ? '-' + fmt(totalDeudas)    : '$0.00';
  if (pPrestamos) pPrestamos.textContent = totalPrestamos > 0 ? '+' + fmt(totalPrestamos) : '$0.00';

  const el = document.getElementById('p-total');
  el.textContent = (total >= 0 ? '+' : '') + fmt(total);
  el.style.color = total >= 0 ? 'var(--gold)' : 'var(--red)';
}

function showPatrimonioHelp() {
  showConfirm(
    '🏦 ¿Qué es el Patrimonio Estimado?',
    `<div style="text-align:left;line-height:1.7;font-size:.78rem">
      <b>💰 Ahorro acumulado:</b> Todo lo que has apartado como "Ahorro en efectivo" (cochinito) en todos los meses registrados.<br><br>
      <b>💵 Balance (mes actual)ulado:</b> La suma de (Ingresos − Gastos + Ajustes) de todos los meses. Lo que "quedó en mano" cada mes.<br><br>
      <b>📊 Patrimonio Neto:</b> Ahorro + Balance. Es el valor económico total que han construido Anthony e Isabel desde que empezaron a registrar en esta app.<br><br>
      <i style="color:#8b949e">⚠️ No incluye propiedades, inversiones externas, deudas ni activos físicos. Solo refleja lo registrado aquí.</i>
    </div>`,
    'ℹ️'
  );
}

function calcFire() {
  const meta = parseFloat(document.getElementById('fire-meta').value)||200000;
  const retorno = parseFloat(document.getElementById('fire-retorno').value)/100||0.07;
  const gastosAnuales = parseFloat(document.getElementById('fire-gastos-anuales').value)||15000;
  const avgAhorro = activeMonths.reduce((s,m)=>s+EXCEL_DATA[m].ahorros,0)/activeMonths.length;
  const ahorroAnual = avgAhorro * 12;
  let patrimonioActual = 0;
  activeMonths.forEach(m=>{patrimonioActual+=EXCEL_DATA[m].ahorros+EXCEL_DATA[m].balance});
  // Extra savings from Cochinito
  try{var _esRaw=localStorage.getItem('finanzas_cochinito_v2');if(_esRaw){var _esArr=JSON.parse(_esRaw);var _extraSavings=_esArr.reduce(function(s,x){return s+(parseFloat(x.amount)||0);},0);patrimonioActual+=_extraSavings;}}catch(e){}
  let años=0, acumulado=patrimonioActual;
  while(acumulado<meta && años<100){acumulado=acumulado*(1+retorno)+ahorroAnual;años++;}
  const capitalNecesario = gastosAnuales / 0.04;
  let añosFire=0, acc2=patrimonioActual;
  while(acc2<capitalNecesario && añosFire<100){acc2=acc2*(1+retorno)+ahorroAnual;añosFire++;}
  const añosFaltanMeta = años >= 100 ? '> 100' : `${años} años`;
  const añosFaltanFire = añosFire >= 100 ? '> 100' : `${añosFire} años`;
  const pctAvance = Math.min(100, (patrimonioActual / capitalNecesario * 100)).toFixed(1);
  document.getElementById('fire-result').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:7px;text-align:center">
        <div style="font-size:.6rem;color:var(--muted)">Ahorro mensual prom.</div>
        <div style="font-size:.95rem;font-weight:700;color:var(--green)">${fmt(avgAhorro)}</div>
      </div>
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:7px;text-align:center">
        <div style="font-size:.6rem;color:var(--muted)">Patrimonio actual</div>
        <div style="font-size:.95rem;font-weight:700;color:var(--blue)">${fmt(patrimonioActual)}</div>
      </div>
    </div>
    <div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:.65rem;margin-bottom:3px">
        <span style="color:var(--muted)">Avance hacia FIRE</span>
        <span style="color:var(--gold);font-weight:600">${pctAvance}%</span>
      </div>
      <div style="background:#0d1117;border-radius:4px;height:6px;overflow:hidden">
        <div style="height:100%;width:${pctAvance}%;background:linear-gradient(90deg,#e3b341,#3fb950);border-radius:4px;transition:.5s"></div>
      </div>
    </div>
    <hr style="border-color:var(--border);margin:6px 0">
    <strong>Capital FIRE necesario:</strong> ${fmt(capitalNecesario)}<br>
    <strong>Para llegar a tu meta ${fmt(meta)}:</strong> ${añosFaltanMeta} años<br>
    <strong>🎯 Independencia financiera:</strong> <span class="highlight">Año ${new Date().getFullYear()+Math.min(añosFire,100)}</span> (${añosFaltanFire} años)<br>
    <span style="font-size:.65rem;color:#484f58">Retorno ${(retorno*100).toFixed(1)}%/año · Gastos ${fmt(gastosAnuales)}/año · Regla 4%</span>`;
}

// ─── SIMULADOR META DE AHORRO ────────────────
function calcGoal() {
  const meta       = parseFloat(document.getElementById('goal-meta')?.value) || 3000;
  const yaAhorrado = parseFloat(document.getElementById('goal-actual')?.value) || 0;
  const extra      = parseFloat(document.getElementById('goal-extra')?.value) || 0;
  const plazoDeseado = parseInt(document.getElementById('goal-plazo')?.value) || 12;

  // Promedio mensual de ahorro real de los datos
  const avgAhorro = activeMonths.length
    ? activeMonths.reduce((s,m) => s + EXCEL_DATA[m].ahorros, 0) / activeMonths.length
    : 0;

  const totalMensual = avgAhorro + extra;
  const faltante     = Math.max(0, meta - yaAhorrado);
  const resultEl     = document.getElementById('goal-result');
  if (!resultEl) return;

  // Cuánto se necesita ahorrar para lograr la meta en el plazo deseado
  const ahorroNecesarioPorMes = plazoDeseado > 0 ? faltante / plazoDeseado : 0;

  if (totalMensual <= 0 && ahorroNecesarioPorMes <= 0) {
    resultEl.innerHTML = '<span style="color:var(--red)">⚠️ Sin datos de ahorro aún. Registra movimientos primero.</span>';
    return;
  }

  const meses         = totalMensual > 0 ? Math.ceil(faltante / totalMensual) : 9999;
  const años          = Math.floor(meses / 12);
  const mesesResto    = meses % 12;
  const fechaMeta     = new Date();
  fechaMeta.setMonth(fechaMeta.getMonth() + meses);
  const fechaStr      = fechaMeta.toLocaleDateString('es-VE', { month:'long', year:'numeric' });
  const pct           = Math.min(100, (yaAhorrado / meta * 100)).toFixed(1);
  const tiempoStr     = años > 0
    ? `${años} año${años>1?'s':''} y ${mesesResto} mes${mesesResto!==1?'es':''}`
    : `${meses} mes${meses!==1?'es':''}`;

  const diffVsNecesario = totalMensual - ahorroNecesarioPorMes;
  const colorNecesario = diffVsNecesario >= 0 ? 'var(--green)' : 'var(--red)';
  const statusMsg = diffVsNecesario >= 0 
    ? `✅ ¡Llegas! Ahorras ${fmt(diffVsNecesario)} extra/mes`
    : `⚠️ Necesitas ${fmt(Math.abs(diffVsNecesario))} más/mes`;

  resultEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:7px;text-align:center">
        <div style="font-size:.6rem;color:var(--muted)">Ahorro actual/mes</div>
        <div style="font-size:.95rem;font-weight:700;color:var(--green)">${fmt(totalMensual)}</div>
      </div>
      <div style="background:#0d1117;border:1px solid #bc8cff;border-radius:6px;padding:7px;text-align:center">
        <div style="font-size:.6rem;color:var(--muted)">Necesitas/mes (en ${plazoDeseado} meses)</div>
        <div style="font-size:.95rem;font-weight:700;color:var(--purple)">${fmt(ahorroNecesarioPorMes)}</div>
      </div>
    </div>
    <div style="background:#1c2128;border:1px solid #30363d;border-radius:6px;padding:8px;margin-bottom:8px;font-size:.72rem;text-align:center;color:${colorNecesario};font-weight:600">${statusMsg}</div>
    <div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:.65rem;margin-bottom:3px">
        <span style="color:var(--muted)">Progreso hacia ${fmt(meta)}</span>
        <span style="color:var(--blue);font-weight:600">${pct}%</span>
      </div>
      <div style="background:#0d1117;border-radius:4px;height:6px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#58a6ff,#3fb950);border-radius:4px;transition:.5s"></div>
      </div>
    </div>
    <hr style="border-color:var(--border);margin:6px 0">
    <strong>Con tu ahorro actual llegarás en:</strong> <span class="highlight">${tiempoStr}</span><br>
    <strong>Fecha estimada:</strong> <span style="color:var(--blue)">${fechaStr}</span><br>
    <span style="font-size:.65rem;color:#484f58">Basado en ${activeMonths.length} mes${activeMonths.length!==1?'es':''} de datos reales</span>
  `;
}
async function saveGoal() {
  if (!currentUser) return;
  if (!navigator.onLine) { toast('📵 Sin internet', 'err'); return; }
  const cfg = {
    meta: parseFloat(document.getElementById('goal-meta')?.value) || 3000,
    actual: parseFloat(document.getElementById('goal-actual')?.value) || 0,
    extra: parseFloat(document.getElementById('goal-extra')?.value) || 0,
    plazo: parseInt(document.getElementById('goal-plazo')?.value) || 12
  };
  try {
    const hid2 = HOUSEHOLD_ID || currentUser.id;
    const { data: existing } = await sb.from('config_usuario').select('fire_config').eq('user_id', hid2).single();
    const merged = { ...(existing?.fire_config || {}), goal: cfg };
    await sb.from('config_usuario').upsert({ user_id: hid2, fire_config: merged }, { onConflict: 'user_id' });
    toast('🎯 Meta guardada ✅', 'ok');
  } catch(e) {
    // Fallback: guardar localmente si Supabase falla
    try { localStorage.setItem('fin_goal_cfg', JSON.stringify(cfg)); } catch(_){}
    toast('🎯 Meta guardada (sin internet se sincronizará después)', 'warn');
  }
}
async function loadGoal() {
  try {
    const { data } = await sb.from('config_usuario').select('fire_config').eq('user_id', HOUSEHOLD_ID || currentUser.id).single();
    const g = data?.fire_config?.goal;
    if (g) {
      if (g.meta !== undefined && document.getElementById('goal-meta')) document.getElementById('goal-meta').value = g.meta;
      if (g.actual !== undefined && document.getElementById('goal-actual')) document.getElementById('goal-actual').value = g.actual;
      if (g.extra !== undefined && document.getElementById('goal-extra')) document.getElementById('goal-extra').value = g.extra;
      if (g.plazo !== undefined && document.getElementById('goal-plazo')) document.getElementById('goal-plazo').value = g.plazo;
    }
  } catch(e) { console.log('loadGoal:', e); }
  calcGoal();
}

// ─── GUARDAR / CARGAR FIRE ───────────────────
async function saveFire() {
  if (!currentUser) return;
  if (!navigator.onLine) { toast('📵 Sin internet — no se puede guardar', 'err'); return; }
  const cfg = {
    meta: parseFloat(document.getElementById('fire-meta').value) || 200000,
    retorno: parseFloat(document.getElementById('fire-retorno').value) || 7,
    gastos: parseFloat(document.getElementById('fire-gastos-anuales').value) || 15000
  };
  try {
    const { error: fErr } = await sb.from('config_usuario')
      .upsert({ user_id: HOUSEHOLD_ID || currentUser.id, fire_config: cfg }, { onConflict: 'user_id' });
    if (fErr) throw fErr;
    toast('🔥 Simulador FIRE guardado ✅', 'ok');
  } catch(e) {
    try { localStorage.setItem('fin_fire_cfg', JSON.stringify(cfg)); } catch(_){}
    toast('🔥 FIRE guardado localmente ✅', 'ok');
    console.warn('[saveFire]', e.message);
  }
}
async function loadFire() {
  if (!currentUser) return;
  try {
    const { data } = await sb.from('config_usuario')
      .select('fire_config').eq('user_id', HOUSEHOLD_ID || currentUser.id).single();
    if (data?.fire_config && Object.keys(data.fire_config).length > 0) {
      const f = data.fire_config;
      if (f.meta) document.getElementById('fire-meta').value = f.meta;
      if (f.retorno) document.getElementById('fire-retorno').value = f.retorno;
      if (f.gastos) document.getElementById('fire-gastos-anuales').value = f.gastos;
    }
  } catch(e) { console.log('loadFire:', e.message); }
  calcFire();
  calcGoal();
}

// ─── MODAL MOVIMIENTO ─────────────────────────
function openModal(prefill) {
  if(window._pullJustHappened) { window._pullJustHappened=false; return; }
  try {
    const _bi = document.getElementById('rn-bcv-input');
    const _ei = document.getElementById('rn-eur-input');
    if (_bi) { _bi.value = rateBCV; _bi._userEdited = false; }
    if (_ei) { _ei.value = rateEUR; _ei._userEdited = false; }
    updateRateNote();
    if (CONFIG.closedMonths.includes(currentMonth) && !prefill?.edit) {
      toast('El mes está cerrado. Reabre primero.', 'err'); return;
    }
    // Poblar tipos dinámicamente desde CONFIG
    const tipoSel = document.getElementById('f-tipo');
    const tiposActuales = (CONFIG.tipos?.length > 0)
      ? CONFIG.tipos
      : ['Gasto','Ingreso Fijo','Ingreso Variable','Ahorro en efectivo','Prestamo recibido','Prestamo pagado','Ajuste'];
    tipoSel.innerHTML = '';
    tiposActuales.forEach(t => {
      const o = document.createElement('option'); o.value = t; o.textContent = t; tipoSel.appendChild(o);
    });
    document.getElementById('modal-mov-title').textContent = prefill?.edit ? 'Editar Movimiento' : 'Nuevo Movimiento';
    document.getElementById('edit-mov-id').value = prefill?.id || '';
    document.getElementById('f-desc').value = prefill?.desc || '';
    tipoSel.value = prefill?.tipo || 'Gasto';
    document.getElementById('f-date').value = prefill?.date || getLocalToday();
    document.getElementById('f-method').value = prefill?.method || 'Pago móvil';
    document.getElementById('f-amount-usd').value = prefill?.amount || '';
    document.getElementById('f-amount-bs').value = '';
    templateMode = false;
    document.getElementById('btn-template').classList.remove('active');
    document.getElementById('btn-template').textContent = '⭐ Guardar plantilla';
    onTipoChange();
    if (prefill?.cat) {
      setTimeout(() => {
        document.getElementById('f-cat').value = prefill.cat;
        onCatChange();
        if (prefill?.subcat) setTimeout(() => document.getElementById('f-subcat').value = prefill.subcat, 50);
      }, 50);
    }
    updateRateNote();
    renderTemplatePills();
    document.getElementById('modal-mov').classList.add('open');
    lockScroll();
    setTimeout(_injectCalcBtnInModal, 120);
  } catch(err) {
    console.error('openModal error:', err);
    toast('Error al abrir formulario. Recarga la app.', 'err');
  }
}

function closeModalMov(e) {
  unlockScroll(); document.getElementById('modal-mov').classList.remove('open');
}
function closeModalMovIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-mov')) closeModalMov();
}

function onTipoChange() {
  const tipoEl = document.getElementById('f-tipo');
  const catSel = document.getElementById('f-cat');
  const ajusteNote = document.getElementById('ajuste-note');
  const subcatGroup = document.getElementById('f-subcat') ? document.getElementById('f-subcat').closest('.form-group') : null;
  if (!tipoEl || !catSel) return;
  const tipo = tipoEl.value;
  catSel.innerHTML = '';
  // Transferencia Interna: opción especial
  if (tipo === 'Transferencia Interna') {
    const o = document.createElement('option'); o.value = 'Transferencia Interna'; o.textContent = '🔄 Transferencia Interna'; catSel.appendChild(o);
    if (catSel.closest('.form-group')) catSel.closest('.form-group').style.opacity = '0.4';
    if (subcatGroup) subcatGroup.style.opacity = '0.4';
  } else {
    const catsRaw = (CONFIG.categorias[tipo] && CONFIG.categorias[tipo].length > 0)
      ? CONFIG.categorias[tipo]
      : (CONFIG.categorias['Gasto'] || ['🛸Otros']);
    // FIX-SORT-ALPHA: orden alfabético ignorando emoji inicial
    const cats = [...catsRaw].sort((a,b) => {
      const cleanA = a.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u,'').toLowerCase();
      const cleanB = b.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u,'').toLowerCase();
      return cleanA.localeCompare(cleanB, 'es');
    });
    cats.forEach(c => {
      const o = document.createElement('option');
      // FIX-EMOJI-VALUE: value = nombre limpio sin emoji para que applyTemplate pueda seleccionarlo
      const cleanNameOpt = c.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '');
      const emoji = (typeof getCatDisplayIcon === 'function') ? getCatDisplayIcon(cleanNameOpt) : '';
      o.value = cleanNameOpt; // siempre el nombre limpio
      o.dataset.original = c; // guardar original para referencia
      o.textContent = emoji ? emoji + ' ' + cleanNameOpt : c;
      catSel.appendChild(o);
    });
    if (catSel.closest('.form-group')) catSel.closest('.form-group').style.opacity = '1';
    if (subcatGroup) subcatGroup.style.opacity = '1';
  }
  onCatChange();
  if (ajusteNote) ajusteNote.style.display = tipo === 'Ajuste' ? 'block' : 'none';
  // Ocultar subcategoría para tipos que no la necesitan
  if (subcatGroup) subcatGroup.style.display = ['Ajuste','Prestamo recibido','Prestamo pagado'].includes(tipo) ? 'none' : '';
}

function onCatChange() {
  const cat = document.getElementById('f-cat').value;
  const subcatSel = document.getElementById('f-subcat');
  subcatSel.innerHTML = '';
  const subsRaw = CONFIG.subcategorias[cat] || [];
  // FIX-SORT-ALPHA: orden alfabético en subcategorías
  const subs = [...subsRaw].sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'es'));
  if (subs.length === 0) {
    const o = document.createElement('option'); o.value = ''; o.textContent = '— Sin subcategoría —'; subcatSel.appendChild(o);
  } else {
    subs.forEach(s => {
      const o = document.createElement('option');
      o.value = s;
      // FIX-EMOJI-SUBCAT: usar getCatEmoji (app-core) + getCatDisplayIcon (app-features)
      const _se = (typeof getCatDisplayIcon==='function' ? getCatDisplayIcon(s) : '') || getCatEmoji(s);
      const cleanName = s.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim();
      o.textContent = _se ? _se + '  ' + cleanName : s;
      subcatSel.appendChild(o);
    });
  }
}

function onAmountUSD() {
  const usdEl = document.getElementById('f-amount-usd');
  const bsEl  = document.getElementById('f-amount-bs');
  if (!usdEl || !bsEl) return;
  const usd = parseFloat(usdEl.value);
  if (!isNaN(usd) && usd >= 0) bsEl.value = '';
}

function onAmountBS() {
  const bsEl  = document.getElementById('f-amount-bs');
  const usdEl = document.getElementById('f-amount-usd');
  if (!bsEl || !usdEl) return;
  const bs = parseFloat(bsEl.value);
  if (!isNaN(bs) && bs >= 0) usdEl.value = '';
}

function getAmountUSD() {
  const usdEl = document.getElementById('f-amount-usd');
  const bsEl  = document.getElementById('f-amount-bs');
  if (!usdEl || !bsEl) return null;
  const usd = parseFloat(usdEl.value);
  const bs  = parseFloat(bsEl.value);
  const tipo = document.getElementById('f-tipo')?.value || '';
  // FIX-NEG: todos los tipos permiten negativos
  if (!isNaN(usd) && usd !== 0) return usd;
  if (!isNaN(bs) && bs !== 0) {
    if (!rateBCV) { toast('Debes ingresar la tasa BCV para convertir Bs a USD','err'); return null; }
    return bs / rateBCV;
  }
  return null;
}

async function saveMovimiento() {
  // ── SANITIZAR inputs — prevenir XSS ──────────────────────
  const sanitize = s => (s||'').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])).trim();
  const desc   = sanitize(document.getElementById('f-desc').value);
  const tipo   = document.getElementById('f-tipo').value;
  const cat    = document.getElementById('f-cat').value;
  const subcat = document.getElementById('f-subcat').value;
  const method = document.getElementById('f-method').value;
  const date   = document.getElementById('f-date').value;
  const editId = document.getElementById('edit-mov-id').value;

  // Validate rates if BS amount entered
  const bsVal = parseFloat(document.getElementById('f-amount-bs').value);
  const usingBs = !isNaN(bsVal) && bsVal > 0;
  if (usingBs && (!rateBCV || rateBCV <= 0)) {
    toast('⚠️ Ingresa la tasa BCV (Bs/$) antes de registrar en bolívares.', 'err');
    return;
  }

  const amount = getAmountUSD();
  if (!desc || amount === null || amount === undefined || !date) {
    toast('Completa todos los campos y monto.', 'err'); return;
  }
  // FIX-NEG: validar solo que no sea exactamente 0
  const tipoVal = document.getElementById('f-tipo')?.value || '';
  if (amount === 0) { toast('⚠️ El monto no puede ser cero.', 'err'); return; }

  const amountBs = usingBs ? bsVal : amount * (rateBCV || 1);
  const movAuthor = currentUser ? getDisplayName(currentUser.email) : 'Anthony';
  const movRateType = 'bcv';
  const cuentaIdVal = (document.getElementById('f-cuenta')?.value)||null;
  const mov = { id: editId || ('n' + Date.now()), desc, tipo, cat, subcat: subcat||'', amount, amountBs, method, date, author: movAuthor, rate_type: movRateType, cuenta_id: cuentaIdVal||null };

  // ── DETECTAR DUPLICADOS (solo en creación nueva) ──────────
  if (!editId) {
    const txns = EXCEL_DATA[currentMonth]?.transactions || [];
    const possible = txns.filter(t =>
      t.desc.toLowerCase() === desc.toLowerCase() &&
      t.tipo === tipo &&
      t.date === date &&
      Math.abs(t.amount - amount) < 0.01
    );
    if (possible.length > 0) {
      const ok = await showConfirm(
        '⚠️ Posible duplicado',
        `Ya existe "${desc}" de ${fmt(amount)} el ${date}. ¿Registrar de todas formas?`,
        '⚠️'
      );
      if (!ok) return;
    }
  }

  // ── CONFIRMAR PRIMERO, antes de tocar los datos ──────────
  const isEdit = !!editId;
  const confirmMsg = isEdit
    ? `¿Confirmas la actualización de "${mov.desc}" por ${fmt(mov.amount)}?`
    : `¿Confirmas registrar "${mov.desc}" — ${mov.tipo} por ${fmt(mov.amount)}?`;
  const ok = await showConfirm(isEdit ? 'Actualizar movimiento' : 'Registrar movimiento', confirmMsg, isEdit ? '✏️' : '💾');
  if (!ok) return;

  // ── AHORA sí modificar los datos ─────────────────────────
  let movAnterior = null;
  if (isEdit) {
    const txns = EXCEL_DATA[currentMonth].transactions;
    const idx = txns.findIndex(t => t.id === editId);
    if (idx >= 0) {
      const prev = txns[idx];
      movAnterior = { ...prev }; // guardar snapshot antes de editar
      // FIX-EF-EDIT-RECALC: al editar, siempre recalcular EF desde CERO
      if (['Ingreso Fijo','Ingreso Variable'].includes(mov.tipo)) {
        mov.ef_contribution = mov.amount * 0.30;
      } else {
        mov.ef_contribution = null;
      }
      txns[idx] = mov;
      // Recalcular siempre — cubre: cambio de tipo, cambio de monto, cambio de fecha
      {
        const resetDate = CONFIG.efResetDate || null;
        let autoTotal = 0;
        Object.values(EXCEL_DATA).forEach(md => {
          (md.transactions || []).forEach(t => {
            if (['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)) {
              const contrib = t.ef_contribution ?? (parseFloat(t.amount||0) * 0.30);
              if (!resetDate || !t.date || t.date > resetDate) {
                autoTotal += contrib;
              }
            }
          });
        });
        CONFIG.efAutoContrib = autoTotal;
        CONFIG.emergencyFundBase = (CONFIG.efManualBase||0) + CONFIG.efAutoContrib;
        sbSaveConfig();
      }
    }
  } else {
    // FIX-X-1: guardar ef_contribution exacto en el movimiento
    if (['Ingreso Fijo','Ingreso Variable'].includes(mov.tipo)) {
      mov.ef_contribution = mov.amount * 0.30;
    }
    EXCEL_DATA[currentMonth].transactions.push(mov);
    if (mov.ef_contribution) {
      const resetDate = CONFIG.efResetDate || null;
      const movDate   = mov.date || getLocalToday();
      // FIX-EF-GATE: resetDate en el futuro no debe bloquear nuevos ingresos
      const efDateOk = !resetDate || movDate >= resetDate.slice(0,10);
      if (efDateOk) {
        // Recalcular desde CERO iterando todas las transacciones
        // NOTA: mov ya está en EXCEL_DATA (push arriba) → NO sumar ef_contribution de nuevo
        let autoTotal = 0;
        Object.values(EXCEL_DATA).forEach(md => {
          (md.transactions || []).forEach(t => {
            if (['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)) {
              if (!resetDate || !t.date || t.date > resetDate) {
                autoTotal += t.ef_contribution ?? (parseFloat(t.amount) * 0.30);
              }
            }
          });
        });
        // FIX-EF-DOUBLE: NO sumar mov.ef_contribution aquí — ya está incluido en el loop
        CONFIG.efAutoContrib = autoTotal;
        CONFIG.emergencyFundBase = (CONFIG.efManualBase||0) + CONFIG.efAutoContrib;
        // Persistir ef_auto_contrib directo en Supabase (sin depender del guard de categorias)
        if (sb && currentUser) {
          const hid = HOUSEHOLD_ID || currentUser.id;
          // FIX-EF-CATCH: async IIFE evita "catch is not a function" con Supabase builder
          (async () => {
            try {
              await sb.from('config_usuario').upsert({
                user_id: hid,
                ef_auto_contrib: CONFIG.efAutoContrib,
                emergency_fund_base: CONFIG.emergencyFundBase,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });
            } catch(e) { console.warn('[EF save]', e.message); }
          })();
        }
        localStorage.setItem('fin_ef_split', JSON.stringify({
          base: CONFIG.efManualBase || 0, auto: CONFIG.efAutoContrib,
          reset: CONFIG.efResetDate || null, goal: CONFIG.emergencyFundGoal || 3000
        }));
        setTimeout(() => toast(`🆘 +${fmt(mov.ef_contribution)} al fondo de emergencia (30%)`, 'ok'), 400);
      }
    }
  }
  userModifiedMonths.add(currentMonth);

  if (templateMode && !isEdit) {
    const newTpl = { desc, tipo, cat, subcat, method, amount: parseFloat(document.getElementById('f-amount-usd')?.value)||0 };
    templates.push(newTpl);
    await saveTemplateToSupabase(newTpl);
    renderTemplatePills();
    setTimeout(() => toast('Plantilla guardada ⭐', 'ok'), 800);
  }

  recalcMonth(currentMonth);
  // FIX-IX-2: syncEF ANTES de render() → KPI y panel EF muestran valor correcto inmediatamente
  syncEF();
  unlockScroll();
  document.getElementById('modal-mov').classList.remove('open');
  render();
  // FIX-WALLET-REALTIME: forzar recálculo inmediato de saldos de cuentas
  if (typeof renderWalletCards === 'function') renderWalletCards();
  if (typeof updateHeroBalance === 'function') updateHeroBalance();
  // FIX-XI-6: actualizar vista pareja si está activa
  if (typeof renderParejaContent === 'function') {
    const parejaSection = document.getElementById('section-pareja');
    if (parejaSection && parejaSection.style.display !== 'none') renderParejaContent();
  }
  haptic('success');
  toast(isEdit ? '✅ Movimiento actualizado con éxito' : '✅ Movimiento registrado con éxito', 'ok');

  // ── ALERTAS POST-GUARDAR ──────────────────────────────────
  // Alerta balance negativo
  const bal = EXCEL_DATA[currentMonth]?.balance || 0;
  if (bal < 0) {
    setTimeout(() => sendNotification('🔴 Balance mensual negativo', `Tu balance de ${currentMonth} es -$${Math.abs(bal).toFixed(2)}. Revisa tus gastos.`), 500);
  }
  // Alerta presupuesto categoría >= 80%
  if (tipo === 'Gasto' && cat && CONFIG.presupuestos?.[cat]) {
    const gastoCat = EXCEL_DATA[currentMonth]?.cat_totals?.[cat] || 0;
    const budgetCat = CONFIG.presupuestos[cat];
    const pct = budgetCat > 0 ? (gastoCat / budgetCat) * 100 : 0;
    if (pct >= 80 && pct < 100) {
      setTimeout(() => toast(`⚠️ ${cat} al ${pct.toFixed(0)}% del presupuesto`, 'err'), 600);
      sendNotification(`⚠️ Presupuesto ${cat} al ${pct.toFixed(0)}%`, `Llevas $${gastoCat.toFixed(0)} de $${budgetCat} presupuestados.`);
    } else if (pct >= 100) {
      setTimeout(() => toast(`🔴 ¡Superaste el presupuesto de ${cat}!`, 'err'), 600);
      sendNotification(`🔴 ${cat} excedido`, `Gastaste $${gastoCat.toFixed(0)} de $${budgetCat} presupuestados.`);
    }
  }

  // Sincronizar con Supabase en background (sin bloquear)
  if (navigator.onLine) {
    (window.sbSaveMov || sbSaveMov)(mov, currentMonth);
    sbSaveFondo(currentMonth);
    sbLogMovimiento(isEdit ? 'editar' : 'crear', mov, currentMonth, movAnterior);
  } else {
    pushOfflineQueue({ type: 'saveMov', mov, month: currentMonth });
    toast('📵 Guardado localmente — se sincronizará al reconectarte', 'ok');
  }
}

function editMov(id, month) {
  if (CONFIG.closedMonths.includes(month)) {
    toast(`🔒 ${month} está cerrado. Reabre el mes para editar.`, 'err'); return;
  }
  const txns = EXCEL_DATA[month].transactions;
  const t = txns.find(x => x.id === id);
  if (!t) return;
  openModal({ id, desc:t.desc, tipo:t.tipo, cat:t.cat, subcat:t.subcat, method:t.method, date:t.date, amount:t.amount, edit:true });
}

async function deleteMov(id, month) {
  if (CONFIG.closedMonths.includes(month)) {
    toast(`🔒 ${month} está cerrado. Reabre el mes para eliminar.`, 'err'); return;
  }
  if (!navigator.onLine) { toast('📵 Sin internet — no se puede eliminar ahora', 'err'); return; }
  const ok = await showConfirm('Eliminar movimiento', '¿Estás seguro? Esta acción no se puede deshacer.', '🗑️');
  if (!ok) return;
  const txns = EXCEL_DATA[month].transactions;
  const t = txns.find(x => x.id === id);
  // FIX-EF-v4: solo restar contribución si el movimiento es posterior al ef_reset_date
  if (t && ['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)) {
    const resetDate = CONFIG.efResetDate || null;
    const movDate   = t.date || '0000-00-00';
    if (!resetDate || movDate > resetDate) {
      const contrib = t.ef_contribution ?? (t.amount * 0.30);
      CONFIG.efAutoContrib = Math.max(0, (CONFIG.efAutoContrib||0) - contrib);
      CONFIG.emergencyFundBase = (CONFIG.efManualBase||0) + CONFIG.efAutoContrib;
      sbSaveConfig();
    }
  }
  EXCEL_DATA[month].transactions = txns.filter(x => x.id !== id);
  userModifiedMonths.add(month);
  recalcMonth(month);
  // FIX-IX-2: syncEF antes de render() para actualizar KPI inmediatamente
  syncEF();
  render();
  // FIX-WALLET-REALTIME: forzar recálculo inmediato de saldos de cuentas
  if (typeof renderWalletCards === 'function') renderWalletCards();
  if (typeof updateHeroBalance === 'function') updateHeroBalance();
  // FIX-XI-6: actualizar vista pareja si está activa
  if (typeof renderParejaContent === 'function') {
    const parejaSection = document.getElementById('section-pareja');
    if (parejaSection && parejaSection.style.display !== 'none') renderParejaContent();
  }
  haptic('medium');
  toast('Movimiento eliminado 🗑️', 'ok');
  sbDeleteMov(id);
  sbSaveFondo(month);
}

// Templates
function toggleTemplate() {
  templateMode = !templateMode;
  const btn = document.getElementById('btn-template');
  btn.classList.toggle('active', templateMode);
  btn.textContent = templateMode ? '⭐ Guardar como plantilla ✓' : '⭐ Guardar plantilla';
}

// ─── TEMPLATE PERSISTENCE ─────────────────────────────
// ═══════════════════════════════════════════════════════════
// PLANTILLAS — tabla dedicada: plantillas_usuario
// SQL a ejecutar UNA VEZ en Supabase SQL Editor:
//   CREATE TABLE IF NOT EXISTS plantillas_usuario (
//     id          text PRIMARY KEY,
//     user_id     text NOT NULL,
//     desc        text,
//     tipo        text,
//     cat         text,
//     subcat      text,
//     method      text,
//     amount      numeric DEFAULT 0,
//     cuenta_id   text,
//     position    integer DEFAULT 0,
//     created_at  timestamptz DEFAULT now(),
//     updated_at  timestamptz DEFAULT now()
//   );
//   ALTER TABLE plantillas_usuario ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "own" ON plantillas_usuario
//     USING (user_id = auth.uid())
//     WITH CHECK (user_id = auth.uid());
// ═══════════════════════════════════════════════════════════
const TMPL_STORE_KEY = 'fin_templates_v3';

function loadTemplatesLocal() {
  if (!templates || templates.length === 0) {
    try {
      const saved = localStorage.getItem(TMPL_STORE_KEY);
      if (saved) templates = JSON.parse(saved);
    } catch(e) {}
  }
}
loadTemplatesLocal();

async function loadTemplatesFromSupabase() {
  if (!sb || !currentUser) return;
  const uid = currentUser.id; // auth.uid() para RLS
  try {
    const { data, error } = await sb.from('plantillas_usuario')
      .select('*').eq('user_id', uid).order('position', { ascending: true });
    if (error) {
      console.warn('[plantillas] load error:', error.message);
      loadTemplatesLocal(); return;
    }
    if (data) {
      templates = data.map(r => ({
        _id: r.id,
        desc:      r.nombre  || '',   // columna es "nombre" en Supabase
        tipo:      r.tipo    || 'Gasto',
        cat:       r.cat     || '',
        subcat:    r.subcat  || '',
        method:    r.method  || '',
        amount:    parseFloat(r.amount) || 0,
        cuenta_id: r.cuenta_id || null
      }));
      try { localStorage.setItem(TMPL_STORE_KEY, JSON.stringify(templates)); } catch(_) {}
      console.log('[plantillas] cargadas desde Supabase:', templates.length);
    }
  } catch(e) {
    console.warn('[plantillas] exception:', e.message);
    loadTemplatesLocal();
  }
}

async function saveTemplateToSupabase(tpl) {
  if (!sb || !currentUser) {
    try { localStorage.setItem(TMPL_STORE_KEY, JSON.stringify(templates)); } catch(_) {}
    return;
  }
  const uid = currentUser.id; // auth.uid() para RLS
  const id  = tpl._id || ('tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2,7));
  tpl._id   = id;
  try {
    const { error } = await sb.from('plantillas_usuario').upsert({
      id,
      user_id:  uid,
      nombre:   tpl.desc    || '',   // columna es "nombre" — desc es reservada en SQL
      tipo:     tpl.tipo    || 'Gasto',
      cat:      tpl.cat     || '',
      subcat:   tpl.subcat  || '',
      method:   tpl.method  || '',
      amount:   parseFloat(tpl.amount) || 0,
      cuenta_id: tpl.cuenta_id || null,
      position: templates.findIndex(t => t._id === id),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) {
      console.error('[plantillas] save error:', error.message);
      toast('⚠️ Plantilla guardada solo localmente', 'warn');
    } else {
      console.log('[plantillas] guardada:', id);
    }
  } catch(e) { console.warn('[plantillas] save exception:', e.message); }
  try { localStorage.setItem(TMPL_STORE_KEY, JSON.stringify(templates)); } catch(_) {}
}

async function deleteTemplateFromSupabase(id) {
  if (!id || !sb || !currentUser) return;
  const uid = currentUser.id; // auth.uid() para RLS
  try {
    const { error } = await sb.from('plantillas_usuario')
      .delete().eq('id', id).eq('user_id', uid);
    if (error) console.error('[plantillas] delete error:', error.message);
    else console.log('[plantillas] eliminada:', id);
  } catch(e) { console.warn('[plantillas] delete exception:', e.message); }
  try { localStorage.setItem(TMPL_STORE_KEY, JSON.stringify(templates)); } catch(_) {}
}

// Compatibilidad legacy — saveTemplatesLocal ya no llama sbSaveConfig
async function saveTemplatesLocal() {
  try { localStorage.setItem(TMPL_STORE_KEY, JSON.stringify(templates)); } catch(_) {}
}

function renderTemplatePills() {
  const div = document.getElementById('template-list');
  if(!div) return;
  if (!templates.length) {
    div.innerHTML = "<button class=\"template-add-card\" onclick=\"toast('💡 Guarda un movimiento como plantilla con ⭐','info')\">+</button>";
    return;
  }
  const catIconMap = {'🍽':'comida','🏡':'casa','🚗':'transporte','💅':'personal','📺':'suscri','🏦':'banco','💼':'sueldo','🥑':'mercado','💰':'ahorro'};
  div.innerHTML = templates.map((t, i) => {
    let icon = '💳';
    const catL = (t.cat||'').toLowerCase();
    for(const [em,k] of Object.entries(catIconMap)) { if(catL.includes(k)){icon=em;break;} }
    return `
      <div class="template-card" onclick="applyTemplate(${i})" style="position:relative">
        <button class="template-card-del" onclick="event.stopPropagation();deleteTemplate(${i})" title="Eliminar plantilla">✕</button>
        <div class="template-card-icon">${icon}</div>
        <div class="template-card-name">${escHtml(t.desc)}</div>
        <div class="template-card-cat">${escHtml(t.cat||'—')}</div>
        ${t.amount ? `<div style="font-size:9px;color:#3fb950;margin-top:1px">$${parseFloat(t.amount).toFixed(2)}</div>` : ''}
      </div>`;
  }).join('') + "<button class=\"template-add-card\" onclick=\"toast('⭐ Rellena el formulario y toca Guardar plantilla','info')\">+</button>";
}
function deleteTemplate(i) {
  const tpl = templates[i];
  if (!tpl) return;
  showConfirm('Eliminar plantilla', `¿Eliminar la plantilla "${tpl.desc}"?`, '🗑️').then(ok => {
    if (!ok) return;
    const id = tpl._id;
    templates.splice(i, 1);
    renderTemplatePills();
    toast('Plantilla eliminada');
    // Eliminar de la tabla dedicada en Supabase
    deleteTemplateFromSupabase(id);
  });
}

function applyTemplate(i) {
  const t = templates[i];
  if(!t) return;
  document.getElementById('f-desc').value = t.desc || '';
  document.getElementById('f-tipo').value = t.tipo || 'Gasto';
  if(t.amount) document.getElementById('f-amount-usd').value = parseFloat(t.amount).toFixed(2);
  if(t.date) document.getElementById('f-date').value = t.date;
  onTipoChange();
  // FIX-TEMPLATE-FULL: timing escalonado — tipo→cat→subcat+method
  setTimeout(() => {
    if (t.cat) {
      const catSel = document.getElementById('f-cat');
      if (catSel) {
        const cleanCat = (t.cat || '').replace(/^[^\w\s]\s*/, '').trim();
        const matchOpt = Array.from(catSel.options).find(o =>
          o.value === t.cat || o.value === cleanCat ||
          (o.dataset.original && (o.dataset.original === t.cat || o.dataset.original === cleanCat))
        );
        if (matchOpt) catSel.value = matchOpt.value;
        else {
          const partialMatch = Array.from(catSel.options).find(o =>
            o.value.toLowerCase().includes(cleanCat.toLowerCase()) ||
            cleanCat.toLowerCase().includes(o.value.toLowerCase())
          );
          if (partialMatch) catSel.value = partialMatch.value;
        }
      }
      onCatChange();
    }
    // Método de pago — disponible en este punto
    if (t.method) {
      const mEl = document.getElementById('f-method');
      if (mEl) mEl.value = t.method;
    }
    // Subcategoría — esperar a que onCatChange construya las options
    setTimeout(() => {
      if (t.subcat) {
        const subcatSel = document.getElementById('f-subcat');
        if (subcatSel) {
          const matchSub = Array.from(subcatSel.options).find(o =>
            o.value === t.subcat || o.value.includes(t.subcat)
          );
          if (matchSub) subcatSel.value = matchSub.value;
        }
      }
      if (t.cuenta_id) {
        const cuEl = document.getElementById('f-cuenta');
        if (cuEl) cuEl.value = t.cuenta_id;
      }
    }, 100);
  }, 80);
  if (typeof closeRecurrentes === 'function') closeRecurrentes();
  toast('📋 Plantilla aplicada — revisa los campos');
}

// ─── SEARCH ─────────────────────────────────
function openSearch() {
  lockScroll();
  const movModal = document.getElementById('modal-mov');
  if (movModal && movModal.classList.contains('open')) movModal.classList.remove('open');
  // FIX-SEARCH-INSTANT: abrir modal inmediatamente sin ningún cómputo.
  // populateSearchFilters es rápido (sólo selectores). applySearch es lento cuando
  // hay muchas transacciones — se difiere 80ms para que la animación CSS del modal
  // complete su primer frame antes de bloquear el hilo.
  populateSearchFilters();
  addUserFilterToSearch();
  document.getElementById('modal-search').classList.add('open');
  // Mostrar estado vacío inmediatamente, resultados llegan 80ms después
  const tbody = document.getElementById('search-results');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="color:var(--muted);text-align:center;padding:20px;font-size:.75rem">Escribe para buscar...</td></tr>';
  const countEl = document.getElementById('search-count');
  if (countEl) countEl.textContent = '';
  setTimeout(() => {
    applySearch();
    // Focus en el campo de texto para que el teclado aparezca en móvil
    const searchInput = document.getElementById('search-text');
    if (searchInput) searchInput.focus();
  }, 80);
}
// FIX-IX-5: closeSearch siempre cierra (para botones ✕ internos y btn Cerrar).
// El backdrop onclick usa closeSearchIfOutside(e) para solo cerrar al hacer click fuera.
function closeSearch() {
  unlockScroll();
  document.getElementById('modal-search').classList.remove('open');
}
function closeSearchIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-search')) closeSearch();
}
function populateSearchFilters() {
  // Month
  const monthSel = document.getElementById('search-month');
  if (monthSel) {
    monthSel.innerHTML = '<option value="">Todos los meses</option>';
    activeMonths.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; monthSel.appendChild(o); });
  }
  // Reset cascade
  onSearchTipoChange(false);
}
function onSearchTipoChange(doSearch=true) {
  const tipo = document.getElementById('search-tipo').value;
  const catSel = document.getElementById('search-cat');
  catSel.innerHTML = '<option value="">Todas</option>';
  if (tipo && CONFIG.categorias[tipo]) {
    CONFIG.categorias[tipo].forEach(c => {
      const o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o);
    });
  } else {
    // Show all categories
    const allCats = [...new Set(Object.values(CONFIG.categorias).flat())].sort();
    allCats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o); });
  }
  onSearchCatChange(doSearch);
}
function onSearchCatChange(doSearch=true) {
  const cat = document.getElementById('search-cat').value;
  const subcatSel = document.getElementById('search-subcat');
  subcatSel.innerHTML = '<option value="">Todas</option>';
  if (cat) {
    const fromConfig = CONFIG.subcategorias[cat] || [];
    const fromTxn = [...new Set(
      Object.values(EXCEL_DATA).flatMap(d =>
        (d.transactions||[]).filter(t => t.cat === cat && t.subcat).map(t => t.subcat)
      )
    )];
    [...new Set([...fromConfig, ...fromTxn])].sort().forEach(s => {
      const o = document.createElement('option'); o.value = s; o.textContent = s; subcatSel.appendChild(o);
    });
  }
  if (doSearch) applySearch();
}
function applySearch() {
  const text = (document.getElementById('search-text').value||'').toLowerCase();
  const amountRaw = document.getElementById('search-amount')?.value;
  const amountTarget = amountRaw ? parseFloat(amountRaw) : null;
  const tipo = document.getElementById('search-tipo').value;
  const cat = document.getElementById('search-cat').value;
  const subcat = document.getElementById('search-subcat').value;
  const month = document.getElementById('search-month').value;
  const method = document.getElementById('search-method').value;
  const author = document.getElementById('search-author')?.value || '';
  const tbody = document.getElementById('search-results');
  let count = 0;
  const searchMonths = month ? [month] : activeMonths;
  // FIX-SEARCH-SPEED: recolectar HTML como string, un solo innerHTML = al final
  // Antes: innerHTML += en loop causaba un reflow por transacción → lento con muchas filas
  const rows = [];
  searchMonths.forEach(m => {
    EXCEL_DATA[m].transactions.filter(t =>
      (!text || t.desc.toLowerCase().includes(text) || t.cat.toLowerCase().includes(text) || (t.subcat||'').toLowerCase().includes(text)) &&
      (!amountTarget || Math.abs(t.amount - amountTarget) < 0.5) &&
      (!tipo || t.tipo === tipo) &&
      (!cat || t.cat === cat) &&
      (!subcat || t.subcat === subcat) &&
      (!method || t.method === method) &&
      (!author || (t.author||'').toLowerCase().includes(author.toLowerCase()))
    ).sort((a,b) => b.date.localeCompare(a.date)).forEach(t => {
      count++;
      const isPos = ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo);
      const badge = {'Gasto':'tipo-gasto','Ingreso Fijo':'tipo-ingreso','Ingreso Variable':'tipo-ingreso',
        'Ahorro en efectivo':'tipo-ahorro','Prestamo recibido':'tipo-prestamo','Prestamo pagado':'tipo-gasto','Ajuste':'tipo-ajuste'}[t.tipo]||'tipo-ajuste';
      const authorBadge = t.author ? `<span class="txn-author ${t.author.toLowerCase().includes('isabel')?'isabel':'anthony'}">${t.author}</span>` : '';
      rows.push(`<tr>
        <td style="color:var(--muted);font-size:.68rem">${m}</td>
        <td style="color:var(--muted);font-size:.68rem">${t.date.slice(5)}</td>
        <td>${t.desc}${authorBadge}</td>
        <td><span class="tipo-badge ${badge}" style="font-size:.6rem">${t.tipo.replace('en efectivo','').replace('pagado','').trim()}</span></td>
        <td style="font-size:.7rem;color:var(--muted)">${t.cat}${t.subcat?('<br><span style="font-size:.62rem;color:#8b949e">'+((typeof getCatDisplayIcon==='function'?getCatDisplayIcon(t.subcat):getCatEmoji(t.subcat))?(typeof getCatDisplayIcon==='function'?getCatDisplayIcon(t.subcat):getCatEmoji(t.subcat))+'  ':'')+t.subcat+'</span>'):''}</td>
        <td style="font-size:.68rem;color:var(--muted)">${t.method||'—'}</td>
        <td class="${isPos?'txn-amount-pos':'txn-amount-neg'}">${isPos?'+':'-'}${fmt(t.amount)}</td>
        <td>
          <button class="btn-icon btn-edit" onclick="editMovFromSearch('${t.id}','${m}')" title="Editar">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteMovFromSearch('${t.id}','${m}')" title="Eliminar">🗑️</button>
        </td>
      </tr>`);
    });
  });
  tbody.innerHTML = rows.join('');
  document.getElementById('search-count').textContent = `${count} resultado${count!==1?'s':''}`;
}
function editMovFromSearch(id, month) {
  if (CONFIG.closedMonths.includes(month)) {
    toast(`🔒 ${month} está cerrado. Reabre el mes para editar.`, 'err'); return;
  }
  document.getElementById('modal-search').classList.remove('open');
  switchMonth(month);
  setTimeout(() => editMov(id, month), 100);
}
async function deleteMovFromSearch(id, month) {
  if (CONFIG.closedMonths.includes(month)) {
    toast(`🔒 ${month} está cerrado. Reabre el mes para eliminar.`, 'err'); return;
  }
  if (!navigator.onLine) { toast('📵 Sin internet — no se puede eliminar ahora', 'err'); return; }
  const ok = await showConfirm('Eliminar movimiento', '¿Estás seguro? Esta acción no se puede deshacer.', '🗑️');
  if (!ok) return;
  const txns = EXCEL_DATA[month].transactions;
  const t = txns.find(x => x.id === id);
  if (t && ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo)) {
    if (!emergencyFundByMonth[month]) emergencyFundByMonth[month] = 0;
    emergencyFundByMonth[month] = Math.max(0, emergencyFundByMonth[month] - t.amount * 0.30);
  }
  EXCEL_DATA[month].transactions = txns.filter(x => x.id !== id);
  userModifiedMonths.add(month);
  recalcMonth(month);
  render();
  applySearch();
  toast('Eliminado 🗑️', 'ok');
  sbDeleteMov(id);
  sbSaveFondo(month);
}

// ─── SETTINGS ────────────────────────────────
let currentSettingsTab = 'tipos';
// ── SETTINGS NAVEGACIÓN ESTILO APP ────────────────────────
let _settCurrentTab = 'tipos';

// FIX-H8: Acceso rápido a presupuestos — Batch-G: redirige al modal Envelope
function openPresupuestosPanel() {
  if (typeof openEnvelopeBudget === 'function') { openEnvelopeBudget(); return; }
  openSettings();
  setTimeout(() => settNav('presupuestos'), 150);
}

function openSettings() {
  const savedName = currentUser ? getDisplayName(currentUser.email) : '';
  const nEl = document.getElementById('sett-nombre');
  if(nEl && savedName) nEl.value = savedName;
  const emailEl = document.getElementById('sett-correo-display');
  if(emailEl && currentUser) emailEl.value = currentUser.email;
  const pinLabel = document.getElementById('pin-status-label');
  if(pinLabel) pinLabel.textContent = (localStorage.getItem('fin_pin_v2') || localStorage.getItem('fin_pin_hash')) ? '✅ PIN configurado — toca para cambiar' : '⚠️ PIN no configurado';
  const alCb = document.getElementById('autolock-toggle-cb');
  if(alCb) alCb.checked = CONFIG?.autoLock !== false;
  const themeCb = document.getElementById('theme-toggle-cb');
  if(themeCb) themeCb.checked = document.body.classList.contains('light-theme');
  const travelLabel = document.getElementById('travel-mode-label');
  if(travelLabel) { try { const t=JSON.parse(localStorage.getItem('fin_travel_mode')||'null');
    travelLabel.textContent = t ? '✈️ Activo: '+t.currency+' @ '+t.rate : 'Inactivo — toca para configurar'; } catch(e){} }

  const movModal = document.getElementById('modal-mov');
  if (movModal && movModal.classList.contains('open')) movModal.classList.remove('open');
  // Refresh profile info
  if (currentUser) {
    const email = currentUser.email;
    const initials = email ? email[0].toUpperCase() : 'A';
    ['sett-avatar-main','sett-avatar-perfil'].forEach(id => {
      const el = document.getElementById(id); if(el) el.textContent = initials;
    });
    const savedName = localStorage.getItem('finanzas_nombre') || '';
    ['sett-name-display','sett-perfil-name'].forEach(id => {
      const el = document.getElementById(id); if(el) el.textContent = savedName || email.split('@')[0];
    });
    ['sett-email-display','sett-perfil-email'].forEach(id => {
      const el = document.getElementById(id); if(el) el.textContent = email;
    });
    const correoEl = document.getElementById('sett-correo-display');
    if (correoEl) correoEl.value = email;
    const nombreEl = document.getElementById('sett-nombre');
    if (nombreEl) {
      const displayName = getDisplayName(email);
      nombreEl.value    = displayName;
      nombreEl.readOnly = false;
      nombreEl.style.opacity = '';
      nombreEl.style.cursor  = '';
      nombreEl.style.background = '';
      nombreEl.title = '';
    }
  }
  settNav('main');
  lockScroll();
  document.getElementById('modal-settings').classList.add('open');
}
// FIX-IX-5: closeSettings siempre cierra (botones ✕ internos).
// No hay backdrop onclick en modal-settings — solo botones internos y filas de navegación.
function closeSettings() {
  unlockScroll();
  document.getElementById('modal-settings').classList.remove('open');
}
function closeSettingsIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-settings')) closeSettings();
}
function settNav(screen) {
  document.querySelectorAll('.sett-screen').forEach(s => s.classList.remove('active'));
  if (screen === 'main') {
    document.getElementById('sett-main').classList.add('active');
  } else if (screen === 'perfil') {
    document.getElementById('sett-perfil').classList.add('active');
  } else {
    // Lista screen (tipos, categorias, subcategorias, presupuestos)
    _settCurrentTab = screen;
    document.getElementById('sett-lista').classList.add('active');
    renderSettList(screen);
  }
}
function saveProfile() {
  const nombre = document.getElementById('sett-nombre')?.value?.trim();
  if(!nombre) { toast('Escribe tu nombre','err'); return; }
  if(currentUser?.email) saveUserDisplayName(currentUser.email, nombre);
  localStorage.setItem('finanzas_nombre', nombre);
  ['sett-name-display','sett-perfil-name'].forEach(id => {
    const el = document.getElementById(id); if(el) el.textContent = nombre;
  });
  const greetEl = document.getElementById('voice-greeting-name');
  if(greetEl) greetEl.textContent = 'Hola ' + nombre.split(' ')[0] + ',';
  toast('✅ Nombre guardado', 'ok');
}
function renderSettList(tab) {
  const titles = {tipos:'Tipos de movimiento',categorias:'Categorías',subcategorias:'Subcategorías',presupuestos:'Presupuestos'};
  const titleEl = document.getElementById('sett-lista-title');
  if (titleEl) titleEl.textContent = titles[tab] || tab;
  const addInput = document.getElementById('sett-add-input');
  if (addInput) addInput.value = '';
  renderSettingsTab(tab); // reuse existing render into sett-lista-content
}
function settAddItem() {
  const val = document.getElementById('sett-add-input')?.value?.trim();
  if (!val) return;
  if (_settCurrentTab === 'tipos') { CONFIG.tipos.push(val); sbSaveConfig(); renderSettList('tipos'); }
  else if (_settCurrentTab === 'categorias') { if(!CONFIG.categorias[val]) CONFIG.categorias[val]=[]; sbSaveConfig(); renderSettList('categorias'); }
  else if (_settCurrentTab === 'presupuestos') { /* handled by existing */ }
  document.getElementById('sett-add-input').value = '';
  toast('✅ Agregado', 'ok');
}
function setSettingsTab(tab) { _settCurrentTab = tab; renderSettingsTab(tab); }
function renderSettingsTab(tab, _forceTarget) {
  let c = _forceTarget || null;
  if (!c) {
    const cfgModal = document.getElementById('modal-cfg-list');
    if (cfgModal && cfgModal.classList.contains('open')) c = document.getElementById('cfg-list-body');
  }
  if (!c) c = document.getElementById('sett-lista-content');
  if (!c) c = document.getElementById('settings-content');
  if (!c) return;
  if (tab === 'tipos') {
    c.innerHTML = `
      <div style="font-size:.68rem;color:var(--muted);margin-bottom:6px">Toca ✏️ para editar · 🗑️ para eliminar.</div>
      <div class="settings-list" id="tipos-list">${CONFIG.tipos.filter(t=>t!=='Ajuste').map((t,i)=>`
        <div class="settings-item">
          <span style="flex:1;font-size:.78rem;color:var(--text)">${t}</span>
          <button class="btn-sm" onclick="openTipoEditModal(${i})" style="background:none;border:1px solid var(--border);color:var(--muted)">✏️</button>
          <button class="btn-sm red" onclick="removeTipoModal(${i})">🗑️</button>
        </div>`).join('')}</div>
      <div style="margin-top:10px"><button class="btn-sm green" style="width:100%;padding:9px;font-size:.78rem" onclick="openTipoEditModal(-1)">➕ Nuevo tipo</button></div>`;
  } else if (tab === 'categorias') {
    const allCats = [...new Set(Object.values(CONFIG.categorias).flat())].sort((a,b)=>a.localeCompare(b,'es'));
    // FIX-CAT-TIPOS-VISIBILITY: agrupar por tipo para que sea claro cuál es gasto vs ingreso
    const _catsByTipo = {};
    allCats.forEach(cat => {
      const tipos = Object.keys(CONFIG.categorias).filter(t => CONFIG.categorias[t].includes(cat));
      const hasIngreso = tipos.some(t => t.toLowerCase().includes('ingreso') || t === 'Ahorro en efectivo');
      const hasGasto   = tipos.some(t => t === 'Gasto' || t.toLowerCase().includes('prestamo'));
      const group = (hasIngreso && hasGasto) ? '⚠️ Ambos (revisar)' : hasIngreso ? '💚 Ingresos' : '🔴 Gastos';
      if (!_catsByTipo[group]) _catsByTipo[group] = [];
      _catsByTipo[group].push({ cat, tipos });
    });
    const _groupOrder = ['⚠️ Ambos (revisar)', '🔴 Gastos', '💚 Ingresos'];
    c.innerHTML = `
      <div style="font-size:.68rem;color:var(--muted);margin-bottom:8px;line-height:1.5">
        Toca ✏️ para editar nombre, emoji y tipos · 🗑️ para eliminar.<br>
        <span style="color:#e3b341">⚠️ Ambos</span> = categoría asignada a Gasto E Ingreso a la vez — toca ✏️ para corregir.
      </div>
      ${_groupOrder.filter(g => _catsByTipo[g]?.length).map(group => `
        <div style="font-size:.7rem;font-weight:700;color:${group.includes('Ambos')?'#e3b341':group.includes('Ingresos')?'#3fb950':'#f85149'};margin:10px 0 4px;text-transform:uppercase;letter-spacing:.05em">${group}</div>
        <div class="settings-list">${_catsByTipo[group].map(({cat, tipos}) => {
          const tiposBadges = tipos.map(t => {
            const isGasto   = t === 'Gasto' || t.toLowerCase().includes('prestamo');
            const isIngreso = t.toLowerCase().includes('ingreso') || t === 'Ahorro en efectivo';
            const bg    = isGasto ? '#3d1a1a' : isIngreso ? '#1a3d1a' : '#1a2a3d';
            const color = isGasto ? '#f85149'  : isIngreso ? '#3fb950' : '#58a6ff';
            const short = t.replace('Ingreso ','').replace('Prestamo ','P.').replace('en efectivo','').trim().slice(0,10);
            return `<span style="font-size:.65rem;padding:2px 6px;border-radius:5px;background:${bg};color:${color};font-weight:600">${short}</span>`;
          }).join(' ');
          return `
          <div class="settings-item" style="flex-wrap:wrap;gap:4px">
            <span class="cfg-cat-emoji">${getCatEmoji(cat)}</span>
            <span style="flex:1;font-size:.78rem;color:var(--text);min-width:80px">${escHtml(cat)}</span>
            <span style="display:flex;gap:3px;flex-wrap:wrap;align-items:center">${tiposBadges}</span>
            <button class="btn-sm" data-cat="${escHtml(cat)}" onclick="openCatEditModal(this.dataset.cat)" style="background:none;border:1px solid var(--border);color:var(--muted)">✏️</button>
            <button class="btn-sm red" data-cat="${escHtml(cat)}" onclick="removeCatModal(this.dataset.cat)">🗑️</button>
          </div>`;
        }).join('')}</div>`).join('')}
      <div style="margin-top:10px"><button class="btn-sm green" style="width:100%;padding:9px;font-size:.78rem" onclick="openCatEditModal(null)">➕ Nueva categoría</button></div>`;
  } else if (tab === 'subcategorias') {
    const allCats = Object.keys(CONFIG.subcategorias);
    c.innerHTML = `<select id="sel-cat-sub" onchange="renderSubcatList()" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:5px;font-size:.75rem;width:100%;margin-bottom:8px">
      ${allCats.map(cat=>`<option value="${cat}">${getCatEmoji(cat)} ${cat}</option>`).join('')}</select>
      <div id="subcat-list-content"></div>
      <div style="margin-top:8px"><button class="btn-sm green" style="width:100%;padding:9px;font-size:.78rem" onclick="openSubcatEditModal(document.getElementById('sel-cat-sub').value,-1)">➕ Nueva subcategoría</button></div>`;
    setTimeout(() => renderSubcatList(), 50);
  } else if (tab === 'presupuestos') {
    if(!CONFIG.presupuestosIngresos) CONFIG.presupuestosIngresos = {};
    if(!CONFIG.presupuestosSubcat) CONFIG.presupuestosSubcat = {};

    // ── Helpers para renderizar fila de categoría ──────────────────────
    function bRowPresup(k, v, mode) {
      const hasSubs = !!(CONFIG.subcategorias[k] && CONFIG.subcategorias[k].length > 0);
      const safeK   = escHtml(k);
      const totalSubcat = hasSubs
        ? Object.values(CONFIG.presupuestosSubcat[k] || {}).reduce((s,x)=>s+(x||0),0)
        : 0;
      const subcatInfo = hasSubs && totalSubcat > 0
        ? '<span style="font-size:.62rem;color:#e3b341;margin-right:4px">📋$'+totalSubcat.toFixed(0)+'</span>'
        : '';
      return '<div class="presup-row-wrap" data-cat="'+safeK+'" data-mode="'+mode+'">' +
        '<div class="settings-item">' +
          '<span style="flex:1;font-size:.74rem;color:var(--text)">'+safeK+'</span>' +
          subcatInfo +
          (hasSubs ? '<button class="btn-sm presup-subcat-open" data-cat="'+safeK+'" data-mode="'+mode+'" style="border-color:#e3b341;color:#e3b341;font-size:.65rem">📋</button>' : '') +
          '<input type="number" class="presup-val-input" data-cat="'+safeK+'" data-mode="'+mode+'" value="'+v+'" placeholder="0"' +
            ' style="width:76px;background:var(--surface3,#0d1117);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 6px;font-family:inherit">' +
          '<span style="font-size:.68rem;color:var(--muted)">USD</span>' +
          '<button class="btn-sm red presup-rm-btn" data-cat="'+safeK+'" data-mode="'+mode+'">✕</button>' +
        '</div>' +
      '</div>';
    }

    // ── Categorías a mostrar — TODAS (con y sin presupuesto asignado) ─
    // Gastos: todas las cats de tipo Gasto + las que ya tienen presupuesto
    const allGastoCatsSet = Array.from(new Set([
      ...(CONFIG.categorias['Gasto'] || []),
      ...Object.keys(CONFIG.presupuestos || {})
    ])).filter(Boolean).sort((a,b) => a.localeCompare(b,'es'));

    // Ingresos: todas las cats de tipos ingreso + las que ya tienen meta
    const allIngresoCatsSet = Array.from(new Set([
      ...(CONFIG.categorias['Ingreso Fijo']     || []),
      ...(CONFIG.categorias['Ingreso Variable'] || []),
      ...((CONFIG.tipos||[])
          .filter(t=>(t||'').toLowerCase().includes('ingreso')&&t!=='Ingreso Fijo'&&t!=='Ingreso Variable')
          .flatMap(t=>CONFIG.categorias[t]||[])),
      ...Object.keys(CONFIG.presupuestosIngresos || {})
    ])).filter(Boolean).sort((a,b) => a.localeCompare(b,'es'));

    // Mantener compatibilidad con código antiguo
    const gEntries = allGastoCatsSet.map(k => [k, CONFIG.presupuestos[k] || 0]);
    const iEntries = allIngresoCatsSet.map(k => [k, CONFIG.presupuestosIngresos[k] || 0]);
    const gExtra = []; // ya incluido en gEntries

    c.innerHTML =
      // ── TABS ──
      '<div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:12px">'+
        '<button id="presup-tab-gastos" onclick="switchPresupTab(\'gastos\')" style="flex:1;padding:9px;border:none;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;background:none;border-bottom:2px solid var(--red);color:var(--red)">💸 Gastos</button>'+
        '<button id="presup-tab-ingresos" onclick="switchPresupTab(\'ingresos\')" style="flex:1;padding:9px;border:none;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;background:none;border-bottom:2px solid transparent;color:var(--muted)">💵 Ingresos</button>'+
      '</div>'+

      // ── PANEL GASTOS ──
      '<div id="presup-panel-gastos">'+
        '<div style="font-size:.68rem;color:var(--muted);margin-bottom:10px;line-height:1.5">'+
          'Escribe el total de cada categoría, o toca <b style="color:#e3b341">📋</b> para asignar por subcategoría.'+
          '<br>La suma de subcategorías actualiza el total automáticamente.'+
        '</div>'+
        (gEntries.length
          ? '<div class="settings-list">'+gEntries.map(([k,v])=>bRowPresup(k,v,'gasto')).join('')+'</div>'
          : '<div style="color:var(--muted);font-size:.72rem;text-align:center;padding:8px">Sin categorías de gasto. Agrégalas en Ajustes → Categorías.</div>')+
        '<div class="add-item-row">'+
          '<input type="text" id="new-budget-key" placeholder="Categoría...">'+
          '<input type="number" id="new-budget-val" placeholder="USD">'+
          '<button class="btn-sm green" onclick="addBudget()">+ Total</button>'+
        '</div>'+
      '</div>'+

      // ── PANEL INGRESOS ──
      '<div id="presup-panel-ingresos" style="display:none">'+
        '<div style="font-size:.68rem;color:var(--muted);margin-bottom:10px;line-height:1.5">'+
          'Meta mensual de ingreso por tipo. Toca <b style="color:#3fb950">📋</b> para desglosar por subcategoría.'+
        '</div>'+
        (iEntries.length
          ? '<div class="settings-list" id="budget-ingresos-list">'+iEntries.map(([k,v])=>bRowPresup(k,v,'ingreso')).join('')+'</div>'
          : '<div class="settings-list" id="budget-ingresos-list"><div style="color:var(--muted);font-size:.72rem;text-align:center;padding:12px">Sin categorías de ingreso. Agrégalas en Ajustes → Categorías.</div></div>')+
        '<div class="add-item-row">'+
          '<select id="new-income-type" style="flex:2;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:5px;font-size:.75rem;font-family:inherit">'+
            '<option value="Ingreso Fijo">Ingreso Fijo</option>'+
            '<option value="Ingreso Variable">Ingreso Variable</option>'+
            ((CONFIG?.tipos||[]).filter(t=>(t||'').toLowerCase().includes('ingreso')&&t!=='Ingreso Fijo'&&t!=='Ingreso Variable').map(t=>'<option value="'+t+'">'+t+'</option>').join(''))+
          '</select>'+
          '<input type="number" id="new-income-val" placeholder="USD/mes">'+
          '<button class="btn-sm green" onclick="addIncomeBudget()">+ Meta</button>'+
        '</div>'+
        '<div style="font-size:.67rem;color:var(--muted);margin-top:6px;line-height:1.4">💡 Ej: Ingreso Fijo → meta $800/mes</div>'+
      '</div>';

    // ── Event delegation — busca en c directamente (contenedor real) ───
    setTimeout(() => {
      if (!c) return;

      // Botón 📋 → abrir modal de subcategorías
      c.querySelectorAll('.presup-subcat-open').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          openPresupSubcatModal(this.dataset.cat, this.dataset.mode || 'gasto');
        });
      });

      // Input monto → guardar al perder foco
      c.querySelectorAll('.presup-val-input').forEach(inp => {
        inp.addEventListener('change', function() {
          const cat  = this.dataset.cat;
          const mode = this.dataset.mode || 'gasto';
          const val  = parseFloat(this.value) || 0;
          if (mode === 'ingreso') updateIncomeBudget(cat, val);
          else updateBudget(cat, val);
        });
      });

      // Botón ✕ → eliminar
      c.querySelectorAll('.presup-rm-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const cat  = this.dataset.cat;
          const mode = this.dataset.mode || 'gasto';
          if (mode === 'ingreso') removeIncomeBudget(cat);
          else removeBudget(cat);
        });
      });
    }, 30);
  }
}
function renderSubcatList() {
  const cat = document.getElementById('sel-cat-sub').value;
  const subs = CONFIG.subcategorias[cat] || [];
  // FIX-BUG5: data-attributes evitan SyntaxError con nombres especiales en onclick
  document.getElementById('subcat-list-content').innerHTML = `
    <div style="font-size:.68rem;color:var(--muted);margin-bottom:4px">✏️ editar · 🗑️ eliminar.</div>
    <div class="settings-list">${subs.map((s,i)=>`
      <div class="settings-item">
        <span style="flex:1;font-size:.78rem;color:var(--text)">${escHtml(s)}</span>
        <button class="btn-sm" data-cat="${escHtml(cat)}" data-idx="${i}" onclick="openSubcatEditModal(this.dataset.cat,parseInt(this.dataset.idx))" style="background:none;border:1px solid var(--border);color:var(--muted)">✏️</button>
        <button class="btn-sm red" data-cat="${escHtml(cat)}" data-idx="${i}" onclick="removeSubcatModal(this.dataset.cat,parseInt(this.dataset.idx))">🗑️</button>
      </div>`).join('')}</div>`;
}
// ── Editar existentes ─────────────────────────
function editTipo(i, newVal) {
  if (!newVal.trim()) return;
  const realIdx = CONFIG.tipos.indexOf(CONFIG.tipos.filter(t=>t!=='Ajuste')[i]);
  if (realIdx >= 0) { CONFIG.tipos[realIdx] = newVal.trim(); sbSaveConfig(); toast('✏️ Tipo actualizado', 'ok'); }
}
function editCat(oldVal, newVal) {
  if (!newVal.trim() || oldVal === newVal.trim()) return;
  const nv = newVal.trim();
  Object.keys(CONFIG.categorias).forEach(k => {
    const idx = CONFIG.categorias[k].indexOf(oldVal);
    if (idx >= 0) CONFIG.categorias[k][idx] = nv;
  });
  if (CONFIG.subcategorias[oldVal] !== undefined) {
    CONFIG.subcategorias[nv] = CONFIG.subcategorias[oldVal];
    delete CONFIG.subcategorias[oldVal];
  }
  if (CONFIG.presupuestos[oldVal] !== undefined) {
    CONFIG.presupuestos[nv] = CONFIG.presupuestos[oldVal];
    delete CONFIG.presupuestos[oldVal];
  }
  sbSaveConfig();
  toast('✏️ Categoría actualizada', 'ok');
}
function editSubcat(cat, i, newVal) {
  if (!newVal.trim()) return;
  CONFIG.subcategorias[cat][i] = newVal.trim();
  sbSaveConfig();
  toast('✏️ Subcategoría actualizada', 'ok');
}
// ── Agregar nuevos ────────────────────────────
function addTipo() {
  const v = document.getElementById('new-tipo').value.trim();
  if (!v) return;
  CONFIG.tipos.push(v);
  if (!CONFIG.categorias[v]) CONFIG.categorias[v] = [];
  renderSettingsTab('tipos');
  // FIX-TIPO-REFRESH: actualizar dropdown del formulario si está abierto
  const tipoEl = document.getElementById('f-tipo');
  if (tipoEl) {
    const optExists = Array.from(tipoEl.options).some(o => o.value === v);
    if (!optExists) {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      tipoEl.appendChild(opt);
    }
  }
  toast('Tipo agregado ✅', 'ok');
  sbSaveConfig();
}
function addCat() {
  const v = document.getElementById('new-cat')?.value?.trim();
  if (!v) return;
  // FIX-CAT-TODOS-TIPOS: agregar a tipos base + personalizados del usuario
  const tiposBase = ['Gasto','Ingreso Fijo','Ingreso Variable','Prestamo recibido','Prestamo pagado'];
  const todosTipos = [...new Set([...tiposBase, ...(CONFIG.tipos || [])])];
  todosTipos.forEach(tipo => {
    if (!CONFIG.categorias[tipo]) CONFIG.categorias[tipo] = [];
    if (!CONFIG.categorias[tipo].includes(v)) CONFIG.categorias[tipo].push(v);
  });
  if (!CONFIG.subcategorias[v]) CONFIG.subcategorias[v] = [];
  if (CONFIG.presupuestos[v] === undefined) CONFIG.presupuestos[v] = 0;
  const nameEl = document.getElementById('new-cat');
  if (nameEl) nameEl.value = '';
  renderSettingsTab('categorias');
  // FIX-CAT-REFRESH: refrescar dropdown del formulario si está abierto
  if (typeof onTipoChange === 'function') {
    const tipoEl = document.getElementById('f-tipo');
    if (tipoEl) onTipoChange();
  }
  toast('✅ Categoría agregada a todos los tipos', 'ok');
  sbSaveConfig();
}
function addSubcat() {
  const cat = document.getElementById('sel-cat-sub').value;
  const v = document.getElementById('new-subcat').value.trim();
  if (!v || !cat) return;
  if (!CONFIG.subcategorias[cat]) CONFIG.subcategorias[cat] = [];
  CONFIG.subcategorias[cat].push(v);
  document.getElementById('new-subcat').value = '';
  renderSubcatList();
  toast('Subcategoría agregada ✅', 'ok');
  // FIX-SUBCAT-REFRESH: refrescar subcat dropdown si la cat está activa en form
  if (typeof onCatChange === 'function') {
    const catEl = document.getElementById('f-cat');
    if (catEl && catEl.value === cat) onCatChange();
  }
  sbSaveConfig();
}
function addBudget() {
  const k = document.getElementById('new-budget-key').value.trim();
  const v = parseFloat(document.getElementById('new-budget-val').value) || 0;
  if (!k) return;
  CONFIG.presupuestos[k] = v;
  renderSettingsTab('presupuestos');
  toast('Presupuesto agregado ✅', 'ok');
  sbSaveConfig();
}
// ── Eliminar ──────────────────────────────────
async function removeTipo(i) {
  const real = CONFIG.tipos.filter(t=>t!=='Ajuste');
  const ok = await showConfirm('Eliminar tipo', `¿Eliminar el tipo "${real[i]}"?`, '🗑️');
  if (!ok) return;
  const realIdx = CONFIG.tipos.indexOf(real[i]);
  if (realIdx >= 0) CONFIG.tipos.splice(realIdx, 1);
  renderSettingsTab('tipos');
  toast('Tipo eliminado', 'ok');
  sbSaveConfig();
}
function removeCat(cat) {
  Object.keys(CONFIG.categorias).forEach(k => {
    CONFIG.categorias[k] = CONFIG.categorias[k].filter(c => c !== cat);
  });
  delete CONFIG.subcategorias[cat];
  delete CONFIG.presupuestos[cat];
  renderSettingsTab('categorias');
  toast('Categoría eliminada', 'ok');
  sbSaveConfig();
}
function removeSubcat(cat, i) {
  CONFIG.subcategorias[cat].splice(i, 1);
  renderSubcatList();
  toast('Subcategoría eliminada', 'ok');
  sbSaveConfig();
}
async function removeBudget(k) {
  const ok = await showConfirm('Eliminar presupuesto', `¿Eliminar el presupuesto de "${k}"?`, '💰');
  if (!ok) return;
  delete CONFIG.presupuestos[k];
  renderSettingsTab('presupuestos');
  toast('Presupuesto eliminado', 'ok');
  sbSaveConfig();
}
function updateBudget(k, v) {
  CONFIG.presupuestos[k] = parseFloat(v) || 0;
  render();
  sbSaveConfig();
  toast(`📋 Presupuesto "${k}" actualizado`, 'ok');
}

// ─── PRESUPUESTO POR SUBCATEGORÍA ────────────────────────────
function updateSubcatBudget(cat, subcat, val) {
  if (!CONFIG.presupuestosSubcat) CONFIG.presupuestosSubcat = {};
  if (!CONFIG.presupuestosSubcat[cat]) CONFIG.presupuestosSubcat[cat] = {};
  CONFIG.presupuestosSubcat[cat][subcat] = parseFloat(val) || 0;
  const total = Object.values(CONFIG.presupuestosSubcat[cat]).reduce((s,v2)=>s+(v2||0),0);
  if (total > 0) CONFIG.presupuestos[cat] = total;
  render();
  sbSaveConfig();
}
// FIX-PRESUP-ING-SUBCAT: variante para metas de ingreso por subcategoría
function updateSubcatIncomeBudget(cat, subcat, val) {
  if (!CONFIG.presupuestosSubcat) CONFIG.presupuestosSubcat = {};
  if (!CONFIG.presupuestosSubcat[cat]) CONFIG.presupuestosSubcat[cat] = {};
  CONFIG.presupuestosSubcat[cat][subcat] = parseFloat(val) || 0;
  const total = Object.values(CONFIG.presupuestosSubcat[cat]).reduce((s,v2)=>s+(v2||0),0);
  if (total > 0) {
    if (!CONFIG.presupuestosIngresos) CONFIG.presupuestosIngresos = {};
    CONFIG.presupuestosIngresos[cat] = total;
  }
  render();
  sbSaveConfig();
}

function renderSubcatBudgetPanel(cat, mode) {
  mode = mode || 'gasto';
  const subs = CONFIG.subcategorias[cat] || [];
  if (!subs.length) return '<p style="color:var(--muted);font-size:.72rem">Esta categoría no tiene subcategorías. Agrégalas en Ajustes → Subcategorías.</p>';
  if (!CONFIG.presupuestosSubcat) CONFIG.presupuestosSubcat = {};
  if (!CONFIG.presupuestosSubcat[cat]) CONFIG.presupuestosSubcat[cat] = {};
  const totalSubcat = subs.reduce((s,sc)=>s+(CONFIG.presupuestosSubcat[cat][sc]||0),0);
  const accent = mode === 'ingreso' ? '#3fb950' : '#e3b341';
  const updateFn = mode === 'ingreso' ? 'updateSubcatIncomeBudget' : 'updateSubcatBudget';
  const modeLabel = mode === 'ingreso' ? 'Meta de ingreso' : 'Presupuesto';
  return `<div style="background:#0d1117;border-radius:8px;padding:10px;margin-top:8px">
    <div style="font-size:.7rem;color:${accent};margin-bottom:8px;font-weight:600">
      ✏️ ${modeLabel} por subcategoría de <b>${escHtml(cat)}</b>
      <span style="color:#8b949e;font-weight:400"> — Total: $${totalSubcat.toFixed(2)}</span>
    </div>
    ${subs.map(sc => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="flex:1;font-size:.74rem;color:#c9d1d9">${escHtml(sc)}</span>
        <input type="number" value="${CONFIG.presupuestosSubcat[cat][sc]||''}" placeholder="0"
          onchange="${updateFn}('${cat.replace(/'/g,"\'")}','${sc.replace(/'/g,"\'")}',this.value)"
          style="width:80px;background:#161b22;border:1px solid ${accent};color:${accent};padding:4px 7px;border-radius:6px;font-size:.75rem;outline:none;font-family:inherit">
        <span style="font-size:.67rem;color:#484f58">USD</span>
      </div>`).join('')}
    <div style="font-size:.65rem;color:#484f58;margin-top:6px">💡 La suma actualiza el total de la categoría automáticamente</div>
  </div>`;
}

// FIX-PRESUP-SUBCAT-TOGGLE: acepta mode param para IDs únicos y panel de ingresos
window._toggleSubcatBudget = function(cat, btn, mode) {
  mode = mode || 'gasto';
  const id = 'subcat-budget-panel-' + mode + '_' + cat.replace(/[^a-z0-9]/gi,'_');
  const panel = document.getElementById(id) ||
    document.getElementById('subcat-budget-panel-' + cat.replace(/[^a-z0-9]/gi,'_'));
  if (!panel) return;
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    panel.innerHTML = renderSubcatBudgetPanel(cat, mode);
    btn.style.background = 'rgba(227,179,65,.15)';
  } else {
    panel.style.display = 'none';
    btn.style.background = 'none';
  }
};

// ═══════════════════════════════════════════════════════════════════════
// MODAL DE PRESUPUESTO POR SUBCATEGORÍA
// Se abre al tocar 📋 en cualquier categoría (gastos o ingresos)
// Sin inline onclick — usa event listeners directos dentro del modal
// Guarda automáticamente al cambiar cada input (mismo patrón que la app)
// ═══════════════════════════════════════════════════════════════════════
function openPresupSubcatModal(cat, mode) {
  mode = mode || 'gasto';
  if (!CONFIG.presupuestosSubcat)      CONFIG.presupuestosSubcat = {};
  if (!CONFIG.presupuestosSubcat[cat]) CONFIG.presupuestosSubcat[cat] = {};

  const subs = CONFIG.subcategorias[cat] || [];
  if (!subs.length) {
    toast('Esta categoría no tiene subcategorías. Ve a Ajustes → Subcategorías para crearlas.', 'err');
    return;
  }

  // Remover modal anterior si existe
  document.getElementById('modal-presup-subcat')?.remove();

  const accent    = mode === 'ingreso' ? '#3fb950' : '#e3b341';
  const modeLabel = mode === 'ingreso' ? 'Meta de ingreso' : 'Presupuesto';
  const totalNow  = subs.reduce((s,sc) => s + (CONFIG.presupuestosSubcat[cat][sc] || 0), 0);

  const overlay = document.createElement('div');
  overlay.id    = 'modal-presup-subcat';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:15000;display:flex;align-items:flex-end;justify-content:center';

  overlay.innerHTML = `
  <div style="background:#161b22;border-radius:20px 20px 0 0;border-top:1px solid #30363d;
              width:100%;max-width:520px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden">
    <div style="display:flex;justify-content:center;padding:10px 0 2px">
      <div style="width:36px;height:4px;background:#30363d;border-radius:2px"></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 18px 8px;flex-shrink:0">
      <div>
        <div style="font-size:.65rem;color:#8b949e;text-transform:uppercase;letter-spacing:.06em">${modeLabel} por subcategoría</div>
        <div style="font-size:.92rem;font-weight:800;color:#e6edf3">${escHtml(cat)}</div>
      </div>
      <button id="presup-subcat-close" style="background:#21262d;border:none;color:#8b949e;width:32px;height:32px;border-radius:50%;font-size:1rem;cursor:pointer">✕</button>
    </div>

    <!-- Total dinámico -->
    <div style="margin:0 16px 10px;background:#0d1117;border:1px solid ${accent}28;border-radius:12px;padding:12px 16px;flex-shrink:0">
      <div style="font-size:.62rem;color:#8b949e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Total ${modeLabel}</div>
      <div id="presup-subcat-total" style="font-size:1.6rem;font-weight:900;color:${accent}">$${totalNow.toFixed(2)}</div>
      <div style="font-size:.67rem;color:#484f58;margin-top:2px">La suma actualiza automáticamente</div>
    </div>

    <!-- Lista de subcategorías -->
    <div style="overflow-y:auto;flex:1;padding:0 16px 8px">
      ${subs.map(sc => {
        const val = CONFIG.presupuestosSubcat[cat][sc] || '';
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #1c2128">
          <span style="flex:1;font-size:.82rem;color:#c9d1d9">${escHtml(sc)}</span>
          <div style="display:flex;align-items:center;gap:6px">
            <input type="number" class="presup-subcat-input" data-subcat="${escHtml(sc)}"
              value="${val}" placeholder="0" inputmode="decimal"
              style="width:90px;background:#0d1117;border:1px solid ${accent}60;color:${accent};
                     padding:7px 10px;border-radius:8px;font-size:.9rem;font-weight:700;
                     outline:none;font-family:inherit;text-align:right;box-sizing:border-box">
            <span style="font-size:.7rem;color:#484f58;width:28px">USD</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Botón listo -->
    <div style="padding:12px 16px;padding-bottom:max(14px,env(safe-area-inset-bottom,14px));flex-shrink:0;border-top:1px solid #21262d">
      <button id="presup-subcat-done" style="width:100%;background:linear-gradient(135deg,${accent}20,${accent}10);
        border:1px solid ${accent}60;color:${accent};padding:12px;border-radius:12px;
        font-weight:800;font-size:.9rem;cursor:pointer;font-family:inherit">
        ✅ Listo — Guardar presupuesto
      </button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  if (typeof lockScroll === 'function') lockScroll();

  // ── Event listeners directos — sin string escaping ──────────────────
  // Cerrar
  document.getElementById('presup-subcat-close').onclick = () => {
    overlay.remove();
    if (typeof unlockScroll === 'function') unlockScroll();
  };
  overlay.onclick = e => {
    if (e.target === overlay) {
      overlay.remove();
      if (typeof unlockScroll === 'function') unlockScroll();
    }
  };

  // Input: guardar automáticamente al cambiar + actualizar total
  overlay.querySelectorAll('.presup-subcat-input').forEach(inp => {
    inp.addEventListener('input', function() {
      const sc  = this.dataset.subcat;
      const val = parseFloat(this.value) || 0;
      if (!CONFIG.presupuestosSubcat[cat]) CONFIG.presupuestosSubcat[cat] = {};
      CONFIG.presupuestosSubcat[cat][sc] = val;
      // Actualizar total visual
      const newTotal = (CONFIG.subcategorias[cat] || [])
        .reduce((s,s2) => s + (CONFIG.presupuestosSubcat[cat][s2] || 0), 0);
      const totalEl = document.getElementById('presup-subcat-total');
      if (totalEl) totalEl.textContent = '$' + newTotal.toFixed(2);
    });
    inp.addEventListener('change', function() {
      const sc  = this.dataset.subcat;
      const val = parseFloat(this.value) || 0;
      // Guardar en CONFIG y Supabase
      if (mode === 'ingreso') updateSubcatIncomeBudget(cat, sc, val);
      else                    updateSubcatBudget(cat, sc, val);
    });
  });

  // Botón listo
  document.getElementById('presup-subcat-done').onclick = () => {
    // Guardar todos los valores de una vez
    overlay.querySelectorAll('.presup-subcat-input').forEach(inp => {
      const sc  = inp.dataset.subcat;
      const val = parseFloat(inp.value) || 0;
      if (!CONFIG.presupuestosSubcat[cat]) CONFIG.presupuestosSubcat[cat] = {};
      CONFIG.presupuestosSubcat[cat][sc] = val;
    });
    // Calcular total y actualizar presupuesto de la categoría padre
    const total = (CONFIG.subcategorias[cat] || [])
      .reduce((s,sc) => s + (CONFIG.presupuestosSubcat[cat][sc] || 0), 0);
    if (mode === 'ingreso') {
      if (!CONFIG.presupuestosIngresos) CONFIG.presupuestosIngresos = {};
      if (total > 0) CONFIG.presupuestosIngresos[cat] = total;
    } else {
      if (total > 0) CONFIG.presupuestos[cat] = total;
    }
    sbSaveConfig();
    overlay.remove();
    if (typeof unlockScroll === 'function') unlockScroll();
    toast('✅ Presupuesto de subcategorías guardado', 'ok');
    // Refrescar el panel
    if (typeof renderSettingsTab === 'function') renderSettingsTab('presupuestos');
    if (typeof renderBudgetBars === 'function') {
      const d = EXCEL_DATA[currentMonth];
      if (d) renderBudgetBars(d);
    }
  };

  // Focus en el primer input vacío
  setTimeout(() => {
    const firstEmpty = overlay.querySelector('.presup-subcat-input:not([value])') ||
                       overlay.querySelector('.presup-subcat-input');
    if (firstEmpty) firstEmpty.focus();
  }, 100);
}

// ─── CALCULATOR ──────────────────────────────
function openCalc() { lockScroll(); document.getElementById('modal-calc').classList.add('open'); }

// ─── CALCULADORA DESDE MODAL MOVIMIENTO ─────────────────────
// Abre la calc sin cerrar el formulario. z-index elevado para aparecer encima.
function openCalcFromModal() {
  const calcModal = document.getElementById('modal-calc');
  if (!calcModal) return;
  // Elevar sobre el modal de movimiento (z-index 10200)
  calcModal.style.zIndex = '11500';
  calcModal.classList.add('open');
  window._calcOpenedFromModal = true;
}

// Inyectar botón 🧮 en los botones del modal de movimiento
function _injectCalcBtnInModal() {
  if (document.getElementById('btn-calc-modal')) return;
  const btns = document.querySelector('#modal-mov .modal-btns');
  if (!btns) return;
  const btn = document.createElement('button');
  btn.id = 'btn-calc-modal';
  btn.type = 'button';
  btn.title = 'Calculadora — opera sin salir del formulario';
  btn.innerHTML = '🧮';
  btn.style.cssText = 'background:none;border:1px solid #e3b341;color:#e3b341;padding:6px 10px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;transition:.15s;';
  btn.onmouseenter = function(){ this.style.background='rgba(227,179,65,.1)'; };
  btn.onmouseleave = function(){ this.style.background='none'; };
  btn.onclick = openCalcFromModal;
  // Insertar antes del botón cancelar
  const cancelBtn = btns.querySelector('.btn-cancel');
  if (cancelBtn) btns.insertBefore(btn, cancelBtn);
  else btns.appendChild(btn);
}
function closeCalc(e) {
  const calcModal = document.getElementById('modal-calc');
  if (calcModal) {
    calcModal.classList.remove('open');
    calcModal.style.zIndex = ''; // restaurar z-index original
  }
  if (!window._calcOpenedFromModal) unlockScroll();
  window._calcOpenedFromModal = false;
}
function closeCalcIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-calc')) closeCalc();
}
function calcDisplay() {
  document.getElementById('calc-val').textContent = calcVal;
  document.getElementById('calc-history').textContent = calcHistory;
}
function calcNum(n) {
  if (calcNewNum) { calcVal = n === '.' ? '0.' : n; calcNewNum = false; }
  else if (n === '.' && calcVal.includes('.')) return;
  else calcVal += n;
  calcDisplay();
}
function calcDot() { calcNum('.'); }
function calcClear() { calcVal = '0'; calcOperator = null; calcPrev = null; calcNewNum = true; calcHistory = ''; calcDisplay(); }
function calcToggleSign() { calcVal = String(-parseFloat(calcVal)||0); calcDisplay(); }
function calcOp(op) {
  if (op === '%') { calcVal = String(parseFloat(calcVal)/100); calcDisplay(); return; }
  if (calcPrev !== null && !calcNewNum) calcEquals(true);
  calcPrev = parseFloat(calcVal);
  calcOperator = op;
  calcHistory = calcVal + ' ' + op;
  calcNewNum = true;
  calcDisplay();
}
function calcEquals(silent) {
  if (calcPrev === null || !calcOperator) return;
  const curr = parseFloat(calcVal);
  let result;
  if (calcOperator === '+') result = calcPrev + curr;
  else if (calcOperator === '-') result = calcPrev - curr;
  else if (calcOperator === '*') result = calcPrev * curr;
  else if (calcOperator === '/') result = curr ? calcPrev / curr : 0;
  calcHistory = `${calcPrev} ${calcOperator} ${curr} =`;
  calcVal = String(parseFloat(result.toFixed(10)));
  calcPrev = null; calcOperator = null; calcNewNum = true;
  calcDisplay();
}

// ─── REPORT ──────────────────────────────────
function buildReportText() {
  const d = EXCEL_DATA[currentMonth];
  const top5 = Object.entries(d.cat_totals).slice(0,5)
    .map(([k,v]) => `  · ${k.replace(/[🛸🏡🥑💅🚑🚓🏦📺📽️]/gu,'').trim()}: $${v.toFixed(2)}`).join('\n');
  const totalAhorros = activeMonths.reduce((s,m) => s + (EXCEL_DATA[m]?.ahorros||0), 0);
  const efTotal = ((CONFIG.efManualBase||0) + (CONFIG.efAutoContrib||0)).toFixed(2);
  return `📊 INFORME FINANCIERO — ${currentMonth.toUpperCase()} 2026
────────────────────────────────────
💰 Ingresos:         $${d.ingresos.toFixed(2)}
💸 Gastos:           $${d.gastos.toFixed(2)}
🐷 Ahorros (Del mes actual):  $${d.ahorros.toFixed(2)}
💸 Ahorros en total: $${totalAhorros.toFixed(2)}
📈 Balance (Saldo actual):    $${d.balance.toFixed(2)}
🆘 Fondo Emergencia: $${efTotal}

TOP GASTOS POR CATEGORÍA:
${top5 || '  Sin datos'}

Generado desde mi aplicación de Finanzas 2026 - Anthony e Isabel ♥️`;
}

function buildReportCard() {
  const d = EXCEL_DATA[currentMonth];
  const balance = d.balance || 0;
  const balColor = balance >= 0 ? '#3fb950' : '#f85149';
  const savings  = d.ahorros || 0;
  const savPct   = d.ingresos > 0 ? ((savings / d.ingresos) * 100).toFixed(0) : 0;
  const top5cats = Object.entries(d.cat_totals||{}).slice(0,5);
  const totalGastos = d.gastos || 0;
  const fondo = getEmergencyFund(currentMonth);
  const today = new Date().toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'});

  const catRows = top5cats.map(([k,v]) => {
    const pct = totalGastos > 0 ? ((v/totalGastos)*100).toFixed(0) : 0;
    const barW = Math.min(pct, 100);
    const label = k.replace(/[\u{1F300}-\u{1FFFF}]/gu,'').trim();
    return `<div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
        <span style="color:#c9d1d9">${label}</span>
        <span style="color:#e3b341;font-weight:600">$${v.toFixed(0)} <span style="color:#8b949e;font-weight:400">(${pct}%)</span></span>
      </div>
      <div style="background:#21262d;border-radius:3px;height:5px">
        <div style="background:#e3b341;width:${barW}%;height:5px;border-radius:3px"></div>
      </div>
    </div>`;
  }).join('');

  const card = document.createElement('div');
  card.id = 'report-card-render';
  card.style.cssText = 'position:fixed;left:-9999px;top:0;width:480px;background:#0d1117;padding:24px;font-family:system-ui,sans-serif;border-radius:12px';
  card.innerHTML = `
    <div style="border:1px solid #30363d;border-radius:12px;overflow:hidden;background:#0d1117">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#161b22,#1c2128);padding:18px 20px;border-bottom:1px solid #30363d">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="color:#8b949e;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Informe Financiero</div>
            <div style="color:#e6edf3;font-size:18px;font-weight:700">${currentMonth} 2026</div>
            <div style="color:#8b949e;font-size:10px;margin-top:2px">Anthony Marte · ${today}</div>
          </div>
          <div style="text-align:right">
            <div style="color:#8b949e;font-size:10px">Balance</div>
            <div style="color:${balColor};font-size:22px;font-weight:700">$${balance.toFixed(0)}</div>
          </div>
        </div>
      </div>
      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#30363d">
        <div style="background:#161b22;padding:12px 10px;text-align:center">
          <div style="color:#8b949e;font-size:9px;text-transform:uppercase">Ingresos</div>
          <div style="color:#3fb950;font-size:14px;font-weight:700;margin-top:2px">$${d.ingresos.toFixed(0)}</div>
        </div>
        <div style="background:#161b22;padding:12px 10px;text-align:center">
          <div style="color:#8b949e;font-size:9px;text-transform:uppercase">Gastos</div>
          <div style="color:#f85149;font-size:14px;font-weight:700;margin-top:2px">$${totalGastos.toFixed(0)}</div>
        </div>
        <div style="background:#161b22;padding:12px 10px;text-align:center">
          <div style="color:#8b949e;font-size:9px;text-transform:uppercase">Ahorros</div>
          <div style="color:#58a6ff;font-size:14px;font-weight:700;margin-top:2px">$${savings.toFixed(0)}</div>
        </div>
        <div style="background:#161b22;padding:12px 10px;text-align:center">
          <div style="color:#8b949e;font-size:9px;text-transform:uppercase">F. Emergencia</div>
          <div style="color:#bc8cff;font-size:14px;font-weight:700;margin-top:2px">$${fondo.toFixed(0)}</div>
        </div>
      </div>
      <!-- Barra ahorro -->
      <div style="padding:14px 20px;border-bottom:1px solid #21262d">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="color:#8b949e;font-size:10px">Tasa de ahorro</span>
          <span style="color:#58a6ff;font-size:10px;font-weight:600">${savPct}% del ingreso</span>
        </div>
        <div style="background:#21262d;border-radius:4px;height:6px">
          <div style="background:linear-gradient(90deg,#58a6ff,#bc8cff);width:${Math.min(savPct,100)}%;height:6px;border-radius:4px"></div>
        </div>
      </div>
      <!-- Top categorías -->
      <div style="padding:14px 20px;border-bottom:1px solid #21262d">
        <div style="color:#8b949e;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Top Gastos por Categoría</div>
        ${catRows}
      </div>
      <!-- Tasas + footer -->
      <div style="padding:12px 20px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:10px;color:#8b949e">
          💱 BCV: <span style="color:#e3b341">${rateBCV} Bs/$</span> · EUR: <span style="color:#e3b341">${rateEUR} Bs/€</span>
        </div>
        <div style="font-size:9px;color:#484f58">Mis Finanzas 2026</div>
      </div>
    </div>`;
  return card;
}

async function sendReport() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px';
  lockScroll(); // FIX-VIII-5: ocultar FAB al abrir overlay de informe
  overlay.innerHTML = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:22px;width:420px;max-width:100%">
      <h3 style="color:#e6edf3;margin-bottom:6px;font-size:.9rem">📊 Informe ${currentMonth} 2026</h3>
      <p style="color:#8b949e;font-size:.72rem;margin-bottom:14px">Genera el resumen financiero del mes.</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        <button id="btn-png-report" style="background:#238636;color:#fff;border:none;padding:10px;border-radius:7px;font-size:.8rem;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px">📸 Descargar tarjeta PNG</button>
        <button id="btn-pdf-report" onclick="exportPDF()" style="background:#1a0d2d;color:#bc8cff;border:1px solid #bc8cff;padding:9px;border-radius:7px;font-size:.78rem;cursor:pointer;font-weight:600">📄 Descargar PDF completo</button>
        <button id="btn-csv-report" style="background:#1a3626;color:#3fb950;border:1px solid #3fb950;padding:9px;border-radius:7px;font-size:.78rem;cursor:pointer;font-weight:600">📥 Exportar CSV completo</button>
        <button id="btn-copy-report" style="background:#1c2128;color:#58a6ff;border:1px solid #30363d;padding:9px;border-radius:7px;font-size:.78rem;cursor:pointer">📋 Copiar resumen texto</button>
        <button id="btn-mail-report" style="background:#1c2128;color:#e3b341;border:1px solid #30363d;padding:9px;border-radius:7px;font-size:.78rem;cursor:pointer">✉️ Enviar por correo</button>
      </div>
      <button id="btn-close-report" style="width:100%;background:transparent;color:#8b949e;border:1px solid #30363d;padding:7px;border-radius:6px;font-size:.72rem;cursor:pointer">Cerrar</button>
    </div>`;
  document.body.appendChild(overlay);

  // PNG nativo con Canvas API — reemplaza html2canvas
  document.getElementById('btn-png-report').onclick = async () => {
    const btn = document.getElementById('btn-png-report');
    btn.innerHTML = '⏳ Generando...'; btn.disabled = true;
    try {
      const d = EXCEL_DATA[currentMonth] || {};
      const canvas = document.createElement('canvas');
      canvas.width = 800; canvas.height = 500;
      const ctx = canvas.getContext('2d');
      // Background
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0,0,800,500);
      // Border
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1; ctx.strokeRect(1,1,798,498);
      // Header
      const grad = ctx.createLinearGradient(0,0,800,0);
      grad.addColorStop(0,'#0d2137'); grad.addColorStop(1,'#111827');
      ctx.fillStyle = grad; ctx.fillRect(0,0,800,80);
      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 22px Segoe UI,system-ui,sans-serif';
      ctx.fillText(`💳 Finanzas ${currentMonth} 2026`, 28, 38);
      const name = currentUser ? getDisplayName(currentUser.email) : 'Anthony Marte';
      ctx.fillStyle = '#8b949e'; ctx.font = '13px Segoe UI,system-ui,sans-serif';
      ctx.fillText(name + ' · ' + new Date().toLocaleDateString('es-VE'), 28, 62);
      // KPI boxes
      const kpis = [
        {label:'Ingresos', val: fmt(d.ingresos||0), color:'#3fb950'},
        {label:'Gastos',   val: fmt(d.gastos||0),   color:'#f85149'},
        {label:'Ahorros',  val: fmt(d.ahorros||0),  color:'#58a6ff'},
        {label:'Balance',  val: fmt(d.balance||0),  color:(d.balance||0)>=0?'#3fb950':'#f85149'},
      ];
      kpis.forEach((k,i) => {
        const x = 28 + i * 188; const y = 100;
        ctx.fillStyle = '#161b22'; ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(x,y,176,80,8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#8b949e'; ctx.font = '11px Segoe UI,sans-serif';
        ctx.fillText(k.label, x+12, y+22);
        ctx.fillStyle = k.color; ctx.font = 'bold 20px Segoe UI,sans-serif';
        ctx.fillText(k.val, x+12, y+54);
      });
      // Top gastos
      ctx.fillStyle = '#8b949e'; ctx.font = '12px Segoe UI,sans-serif';
      ctx.fillText('TOP GASTOS POR CATEGORÍA', 28, 220);
      const catEntries = Object.entries(d.cat_totals||{}).sort((a,b)=>b[1]-a[1]).slice(0,5);
      const maxVal = catEntries[0]?.[1] || 1;
      catEntries.forEach(([cat,val],i) => {
        const y2 = 235 + i*42;
        const label = cat.replace(/[^\w\s$]/gu,'').trim() || cat;
        ctx.fillStyle = '#c9d1d9'; ctx.font = '12px Segoe UI,sans-serif';
        ctx.fillText(label.slice(0,22), 28, y2+14);
        ctx.fillStyle = '#1c2128'; ctx.beginPath(); ctx.roundRect(160,y2,440,14,3); ctx.fill();
        const barW = (val/maxVal)*440;
        const colors = ['#f85149','#e3b341','#58a6ff','#3fb950','#bc8cff'];
        ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.roundRect(160,y2,barW,14,3); ctx.fill();
        ctx.fillStyle = '#8b949e'; ctx.font = '11px Segoe UI,sans-serif';
        ctx.fillText(fmt(val), 612, y2+12);
      });
      // Footer
      ctx.fillStyle = '#30363d'; ctx.fillRect(0,472,800,1);
      ctx.fillStyle = '#484f58'; ctx.font = '11px Segoe UI,sans-serif';
      ctx.fillText('Finanzas Anthony 2026 · Generado ' + new Date().toLocaleString('es-VE'), 28, 490);
      // Download
      const link = document.createElement('a');
      link.download = `Finanzas_${currentMonth}_2026.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast('📸 Tarjeta descargada', 'ok');
    } catch(e) { toast('Error: ' + e.message, 'err'); }
    btn.innerHTML = '📸 Descargar tarjeta PNG'; btn.disabled = false;
  };

  document.getElementById('btn-csv-report').onclick = () => { exportCSV(); unlockScroll(); overlay.remove(); };

  document.getElementById('btn-copy-report').onclick = () => {
    const text = buildReportText();
    navigator.clipboard?.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    });
    toast('📋 Copiado al portapapeles', 'ok');
  };
  document.getElementById('btn-mail-report').onclick = () => {
    const text = buildReportText();
    const subject = encodeURIComponent(`Informe Financiero ${currentMonth} 2026`);
    const body = encodeURIComponent(text);
    window.open(`mailto:dranthonymarte@gmail.com?subject=${subject}&body=${body}`, '_blank');
  };
  document.getElementById('btn-close-report').onclick = () => { unlockScroll(); overlay.remove(); };
  overlay.onclick = e => { if (e.target === overlay) { unlockScroll(); overlay.remove(); } };
}

// ─── TOAST ───────────────────────────────────
// ── TOAST SYSTEM — apilables, con ✕, sin superposición ──
// MOVED TO audit.js L224 — declarado allí (evita SyntaxError duplicado)
// let _toastContainer = null;
function _getToastContainer() {
  if (!_toastContainer || !document.body.contains(_toastContainer)) {
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    _toastContainer.style.cssText = 'position:fixed;bottom:20px;right:16px;z-index:200000;display:flex;flex-direction:column-reverse;gap:6px;pointer-events:none;max-width:calc(100vw - 32px)';
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}
function toast(msg, type) {
  const container = _getToastContainer();
  const el = document.createElement('div');
  el.className = `toast ${type||''}`;
  el.style.cssText = 'position:relative;pointer-events:auto;padding-right:28px;animation:toastIn .25s ease;';
  const txt = document.createElement('span');
  txt.textContent = msg;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'position:absolute;top:4px;right:6px;background:none;border:none;color:#f85149;cursor:pointer;font-size:.7rem;font-weight:700;padding:0;line-height:1';
  closeBtn.onclick = () => { el.remove(); };
  el.appendChild(txt);
  el.appendChild(closeBtn);
  container.appendChild(el);
  // Cap at 5 toasts
  const all = container.children;
  if (all.length > 5) all[0].remove();
  setTimeout(() => { el.style.transition='opacity .4s'; el.style.opacity='0'; setTimeout(()=>el.remove(),400); }, 3500);
}
// Mobile toast position
// const _toastMobileStyle = document.createElement('style'); // DUPLICADO — canonical: audit.js L254
// _toastMobileStyle.textContent = `
//   @media(max-width:820px){#toast-container{bottom:calc(70px + env(safe-area-inset-bottom,0px))!important;left:12px!important;right:12px!important;align-items:stretch;}}
//   body.is-mobile #toast-container{bottom:calc(70px + env(safe-area-inset-bottom,0px))!important;left:12px!important;right:12px!important;}
// `;
// document.head.appendChild(_toastMobileStyle);

// init() es llamado por loadFromSupabase() tras autenticación exitosa


// ═══════════════════════════════════════════════
// MODAL CONFIRMACIÓN REUTILIZABLE
// ═══════════════════════════════════════════════

// FIX-XII-3: helper para reemplazar prompt() nativo con modal consistente
function _promptModal(titulo, label, placeholder, tipo='text') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:19500;display:flex;align-items:center;justify-content:center;padding:16px';
    overlay.innerHTML = `
      <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:22px;width:100%;max-width:360px">
        <div style="font-size:.92rem;font-weight:700;color:#e6edf3;margin-bottom:10px">${titulo}</div>
        <label style="font-size:.72rem;color:#8b949e;text-transform:uppercase;letter-spacing:.05em">${label}</label>
        <input id="_prompt-input" type="${tipo}" placeholder="${placeholder}"
          style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;
          border-radius:10px;font-size:.85rem;font-family:inherit;margin-top:6px;outline:none;
          box-sizing:border-box">
        <div style="display:flex;gap:8px;margin-top:16px">
          <button id="_prompt-ok" style="flex:1;background:#238636;color:#fff;border:none;padding:10px;
            border-radius:9px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:inherit">✓ OK</button>
          <button id="_prompt-cancel" style="background:#1c2128;color:#8b949e;border:1px solid #30363d;
            padding:10px 18px;border-radius:9px;font-size:.82rem;cursor:pointer;font-family:inherit">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const inp = overlay.querySelector('#_prompt-input');
    inp.focus();
    const done = val => { overlay.remove(); resolve(val); };
    overlay.querySelector('#_prompt-ok').onclick = () => done(inp.value.trim() || null);
    overlay.querySelector('#_prompt-cancel').onclick = () => done(null);
    inp.addEventListener('keydown', e => { if(e.key==='Enter') done(inp.value.trim()||null); if(e.key==='Escape') done(null); });
  });
}

function showConfirm(title, msg, icon='⚠️') {
  return new Promise(resolve => {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').textContent = msg;
    document.getElementById('confirm-icon').textContent = icon;
    modal.style.display = 'flex';
    const yes = document.getElementById('confirm-yes');
    const no  = document.getElementById('confirm-no');
    const cleanup = (result) => {
      modal.style.display = 'none';
      yes.replaceWith(yes.cloneNode(true));
      no.replaceWith(no.cloneNode(true));
      resolve(result);
    };
    document.getElementById('confirm-yes').onclick = () => cleanup(true);
    document.getElementById('confirm-no').onclick  = () => cleanup(false);
  });
}

// ═══════════════════════════════════════════════
// REGISTRO DE CONEXIONES
// ═══════════════════════════════════════════════
async function logConnection() {
  if (!currentUser) return;
  try {
    const ua = navigator.userAgent;
    const device = /Mobile|Android|iPhone|iPad/.test(ua) ? '📱 Móvil' : '💻 Escritorio';
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Otro';
    await sb.from('registro_conexiones').insert({
      user_id: currentUser.id,
      email: currentUser.email,
      device_type: device,
      browser: browser,
      event_type: 'login',
      connected_at: new Date().toISOString()
    });
  } catch(e) { console.log('Log conexión:', e.message); }
}
async function openConexiones() {
  lockScroll();
  document.getElementById('modal-conexiones').classList.add('open');
  const el = document.getElementById('conexiones-list');
  el.innerHTML = '<p style="color:#8b949e;font-size:.75rem">Cargando...</p>';
  try {
    // Cargar todas las sesiones de correos de la whitelist (sin filtro por user)
    const { data } = await sb.from('registro_conexiones')
      .select('*')
      .order('connected_at', { ascending: false }).limit(100);
    if (!data || data.length === 0) {
      el.innerHTML = '<p style="color:#8b949e;font-size:.75rem;text-align:center;padding:20px">Sin registros aún.</p>';
      return;
    }
    el.innerHTML = data.map(r => {
      const dt = new Date(r.connected_at);
      const fecha = dt.toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric' });
      const hora  = dt.toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit' });
      const evType = r.event_type || 'login';
      const evColor = evType === 'logout' ? '#f85149' : '#3fb950';
      const evLabel = evType === 'logout' ? '🚪 Salida' : '✅ Entrada';
      return `<div class="conn-row">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="color:${evColor};font-size:.65rem;font-weight:600;border:1px solid ${evColor};padding:1px 5px;border-radius:4px">${evLabel}</span>
          <span style="color:#e6edf3">${r.email}</span>
          <span class="conn-badge">${r.device_type||'—'}</span>
          <span class="conn-badge">${r.browser||'—'}</span>
        </div>
        <div style="color:#8b949e;text-align:right;flex-shrink:0">
          <div>${fecha}</div>
          <div style="font-size:.65rem">${hora}</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<p style="color:#f85149;font-size:.75rem">Error al cargar. Asegúrate de crear la tabla registro_conexiones en Supabase.</p>';
  }
}
function closeConexiones(e) {
  unlockScroll(); document.getElementById('modal-conexiones').classList.remove('open');
}
function closeConexionesIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-conexiones')) closeConexiones();
}

// ═══════════════════════════════════════════════
// HISTORIAL DE MOVIMIENTOS (auditoría)
// ═══════════════════════════════════════════════
async function openAuditLog() {
  lockScroll();
  document.getElementById('modal-audit').classList.add('open');
  await loadAuditLog();
}
async function loadAuditLog() {
  const el = document.getElementById('audit-list');
  el.innerHTML = '<p style="color:#8b949e;font-size:.75rem;text-align:center;padding:20px">⏳ Cargando...</p>';
  try {
    const filterUser   = document.getElementById('audit-filter-user')?.value || '';
    const filterAccion = document.getElementById('audit-filter-accion')?.value || '';
    let query = sb.from('registro_movimientos').select('*')
      .order('created_at', { ascending: false }).limit(300);
    if (filterUser)   query = query.eq('email', filterUser);
    if (filterAccion) query = query.eq('accion', filterAccion);
    const { data, error } = await query;
    if (error) throw error;
    // Poblar filtro de usuarios dinámicamente
    if (data) {
      const emails = [...new Set(data.map(r => r.email).filter(Boolean))];
      const sel = document.getElementById('audit-filter-user');
      const cur = sel?.value;
      if (sel) sel.innerHTML = '<option value="">Todos los usuarios</option>' +
        emails.map(e => `<option value="${e}"${e===cur?' selected':''}>${e.split('@')[0]}</option>`).join('');
    }
    if (!data || data.length === 0) {
      el.innerHTML = '<p style="color:#8b949e;font-size:.75rem;text-align:center;padding:20px">Sin registros aún. Los movimientos se registrarán a partir de ahora.</p>';
      return;
    }
    const styles = {
      crear:    { bg:'#0d261a', bd:'#3fb950', cl:'#3fb950', lbl:'✅ Crear' },
      editar:   { bg:'#0d1e2d', bd:'#58a6ff', cl:'#58a6ff', lbl:'✏️ Editar' },
      eliminar: { bg:'#2d0f0f', bd:'#f85149', cl:'#f85149', lbl:'🗑️ Eliminar' }
    };
    el.innerHTML = data.map(r => {
      const st = styles[r.accion] || styles.crear;
      const dt = new Date(r.created_at);
      const fecha = dt.toLocaleDateString('es-VE', { day:'2-digit', month:'short', year:'numeric' });
      const hora  = dt.toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit' });
      const nombre = r.email ? r.email.split('@')[0] : '—';
      const amt = r.amount ? `$${parseFloat(r.amount).toFixed(2)}` : '';
      let prevInfo = '';
      if (r.valor_anterior) {
        try {
          const prev = JSON.parse(r.valor_anterior);
          if (prev?.amount && prev.amount !== r.amount)
            prevInfo = `<span style="color:#8b949e;font-size:.62rem"> (antes: $${parseFloat(prev.amount).toFixed(2)})</span>`;
        } catch(e) {}
      }
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 8px;border-left:3px solid ${st.bd};background:#0d1117;border-radius:0 6px 6px 0;margin-bottom:4px">
        <span style="background:${st.bg};color:${st.cl};border:1px solid ${st.bd};padding:1px 6px;border-radius:4px;font-size:.62rem;font-weight:700;flex-shrink:0">${st.lbl}</span>
        <span style="color:#e3b341;font-weight:600;font-size:.74rem;flex-shrink:0">${nombre}</span>
        <span style="color:#e6edf3;font-size:.73rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.descripcion||'—'}</span>
        ${r.tipo?`<span style="background:#1c2128;color:#8b949e;padding:1px 5px;border-radius:3px;font-size:.61rem;flex-shrink:0">${r.tipo}</span>`:''}
        ${amt?`<span style="color:#3fb950;font-weight:600;font-size:.72rem;flex-shrink:0">${amt}${prevInfo}</span>`:''}
        ${r.mes?`<span style="color:#8b949e;font-size:.61rem;flex-shrink:0">${r.mes}</span>`:''}
        <div style="color:#8b949e;text-align:right;flex-shrink:0;font-size:.65rem"><div>${fecha}</div><div>${hora}</div></div>
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = `<div style="color:#f85149;font-size:.75rem;text-align:center;padding:20px">
      ⚠️ Tabla no encontrada. Ejecuta el SQL de configuración en Supabase.<br>
      <code style="color:#8b949e;font-size:.65rem">CREATE TABLE registro_movimientos...</code>
    </div>`;
  }
}

// ═══════════════════════════════════════════════
// RESPALDOS — JSON + EMAIL
// ═══════════════════════════════════════════════
function openBackupPanel() {
  // Abrir mini menú de respaldo (toast con opciones)
  const el = document.createElement('div');
  el.className = 'toast ok';
  el.style.cssText += ';padding:14px 16px;display:flex;flex-direction:column;gap:10px;max-width:280px;z-index:200000';
  el.innerHTML = `
    <span style="font-weight:700;font-size:.85rem">💾 Respaldo de datos</span>
    <button onclick="exportBackupExcel();this.closest('.toast').remove()" style="background:#1a6b2a;border:none;color:#fff;padding:8px;border-radius:6px;font-size:.78rem;cursor:pointer;font-weight:600">📊 Exportar a Excel (.xlsx)</button>
    <button onclick="exportBackupJSON();this.closest('.toast').remove()" style="background:#238636;border:none;color:#fff;padding:8px;border-radius:6px;font-size:.78rem;cursor:pointer;font-weight:600">📥 Descargar JSON ahora</button>
    <button onclick="sendEmailBackup();this.closest('.toast').remove()" style="background:#1f4068;border:none;color:#58a6ff;padding:8px;border-radius:6px;font-size:.78rem;cursor:pointer">📧 Enviar resumen por correo</button>
    <button onclick="openBackupConfig();this.closest('.toast').remove()" style="background:#1c2128;border:1px solid #30363d;color:#8b949e;padding:6px;border-radius:6px;font-size:.72rem;cursor:pointer">⚙️ Configurar correo</button>
    <button onclick="this.closest('.toast').remove()" style="background:none;border:none;color:#8b949e;font-size:.7rem;cursor:pointer">Cerrar</button>`;
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 12000);
}

function exportBackupJSON() {
  try {
    const backup = {
      exported_at: new Date().toISOString(),
      exported_by: currentUser?.email || '—',
      version: 'v11',
      meses: {}
    };
    ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].forEach(m => {
      if (EXCEL_DATA[m]?.transactions?.length > 0) backup.meses[m] = EXCEL_DATA[m];
    });
    const totalMov = Object.values(backup.meses).reduce((s, d) => s + (d.transactions?.length || 0), 0);
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_finanzas_${getLocalToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`📥 Respaldo descargado — ${totalMov} movimientos`, 'ok');
  } catch(e) {
    toast('⚠️ Error al generar respaldo: ' + e.message, 'err');
  }
}

function exportBackupExcel() {
  if (typeof XLSX === 'undefined') {
    toast('⏳ Cargando librería Excel, intenta en 3 segundos...', 'warn');
    return;
  }
  try {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const wb = XLSX.utils.book_new();
    let totalMovGlobal = 0;
    const resumenRows = [];

    // ── Hoja por cada mes con movimientos ──────────────────
    meses.forEach(mes => {
      const d = EXCEL_DATA[mes];
      if (!d?.transactions?.length) return;
      totalMovGlobal += d.transactions.length;

      // Filas de transacciones
      const rows = d.transactions.map(t => ({
        'Fecha':        t.date || '',
        'Descripción':  t.desc || '',
        'Tipo':         t.tipo || '',
        'Categoría':    t.cat || '',
        'Subcategoría': t.subcat || '',
        'Método':       t.method || '',
        'Monto USD':    parseFloat(t.amount) || 0,
        'Monto Bs':     parseFloat(t.amountBs) || 0
      }));

      const ws = XLSX.utils.json_to_sheet(rows);

      // Ancho de columnas
      ws['!cols'] = [
        { wch: 12 }, { wch: 32 }, { wch: 20 }, { wch: 20 },
        { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }
      ];

      // Fila de totales al final
      const lastRow = rows.length + 2;
      XLSX.utils.sheet_add_aoa(ws, [[
        '', 'TOTALES DEL MES', '', '', '', '',
        d.ingresos - d.gastos + (d.ajustes || 0),
        ''
      ]], { origin: lastRow });

      // Fila resumen encima
      XLSX.utils.sheet_add_aoa(ws, [[
        `${mes} 2026`,
        `Ingresos: $${d.ingresos.toFixed(2)}`,
        `Gastos: $${d.gastos.toFixed(2)}`,
        `Ahorros: $${d.ahorros.toFixed(2)}`,
        `Balance: $${d.balance.toFixed(2)}`,
        '', '', ''
      ]], { origin: -1 });

      XLSX.utils.book_append_sheet(wb, ws, mes);

      // Acumular para hoja resumen
      resumenRows.push({
        'Mes':           mes,
        'Ingresos $':    d.ingresos,
        'Gastos $':      d.gastos,
        'Ahorros $':     d.ahorros,
        'Ajustes $':     d.ajustes || 0,
        'Balance $':     d.balance,
        'Movimientos':   d.transactions.length,
        'Top Categoría': Object.keys(d.cat_totals || {})[0] || '—'
      });
    });

    // ── Hoja RESUMEN ANUAL ─────────────────────────────────
    if (resumenRows.length > 0) {
      const wsSummary = XLSX.utils.json_to_sheet(resumenRows);
      wsSummary['!cols'] = [
        { wch: 14 }, { wch: 13 }, { wch: 13 }, { wch: 13 },
        { wch: 13 }, { wch: 13 }, { wch: 14 }, { wch: 22 }
      ];
      // Fila de totales globales
      XLSX.utils.sheet_add_aoa(wsSummary, [[
        'TOTAL ANUAL',
        resumenRows.reduce((s,r) => s + r['Ingresos $'], 0),
        resumenRows.reduce((s,r) => s + r['Gastos $'], 0),
        resumenRows.reduce((s,r) => s + r['Ahorros $'], 0),
        resumenRows.reduce((s,r) => s + r['Ajustes $'], 0),
        resumenRows.reduce((s,r) => s + r['Balance $'], 0),
        totalMovGlobal,
        ''
      ]], { origin: -1 });
      XLSX.utils.book_append_sheet(wb, wsSummary, '📊 Resumen Anual');
    }

    // ── Descargar ──────────────────────────────────────────
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `finanzas_anthony_isabel_${fecha}.xlsx`);
    toast(`📊 Excel descargado — ${totalMovGlobal} movimientos en ${resumenRows.length} meses`, 'ok');
  } catch(e) {
    toast('⚠️ Error al generar Excel: ' + e.message, 'err');
  }
}

async function sendEmailBackup() {
  const cfg = getEmailjsConfig();
  if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId || !cfg.toEmail) {
    toast('⚠️ Configura el correo de respaldo primero (Configuración → Correo de respaldo)', 'warn');
    openBackupConfig();
    return;
  }
  try {
    if (typeof emailjs === 'undefined') {
      toast('⚠️ EmailJS no disponible. Recarga la app.', 'err'); return;
    }
    toast('📧 Enviando resumen + descargando JSON...', 'ok');
    emailjs.init(cfg.publicKey);

    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const mesesActivos = meses.filter(m => EXCEL_DATA[m]?.transactions?.length > 0);
    const totalMov = mesesActivos.reduce((s, m) => s + (EXCEL_DATA[m].transactions?.length || 0), 0);

    // ── Resumen detallado por mes (texto plano, liviano) ──
    const resumenLineas = mesesActivos.map(m => {
      const d = EXCEL_DATA[m];
      const top3 = Object.entries(d.cat_totals || {}).slice(0,3)
        .map(([k,v]) => `  • ${k.replace(/[^\w\s]/gu,'').trim()}: $${v.toFixed(0)}`).join('\n');
      return `📅 ${m} 2026\n` +
        `   Ingresos:  $${d.ingresos.toFixed(2)}\n` +
        `   Gastos:    $${d.gastos.toFixed(2)}\n` +
        `   Ahorros:   $${d.ahorros.toFixed(2)}\n` +
        `   Balance:   $${d.balance.toFixed(2)}\n` +
        `   Transacciones: ${d.transactions.length}\n` +
        `   Top gastos:\n${top3}`;
    }).join('\n\n');

    // ── Totales globales ──
    const totIngresos = mesesActivos.reduce((s,m) => s + EXCEL_DATA[m].ingresos, 0);
    const totGastos   = mesesActivos.reduce((s,m) => s + EXCEL_DATA[m].gastos, 0);
    const totAhorros  = mesesActivos.reduce((s,m) => s + EXCEL_DATA[m].ahorros, 0);
    const totBalance  = mesesActivos.reduce((s,m) => s + EXCEL_DATA[m].balance, 0);

    const resumenGlobal =
      `TOTALES ${new Date().getFullYear()}\n` +
      `Total ingresos:  $${totIngresos.toFixed(2)}\n` +
      `Total gastos:    $${totGastos.toFixed(2)}\n` +
      `Total ahorros:   $${totAhorros.toFixed(2)}\n` +
      `Balance acumulado: $${totBalance.toFixed(2)}\n` +
      `Movimientos registrados: ${totalMov}`;

    // ── Enviar correo solo con resumen (< 5KB) ──
    await emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email:            cfg.toEmail,
      fecha:               new Date().toLocaleDateString('es-VE', { day:'2-digit', month:'long', year:'numeric' }),
      total_movimientos:   totalMov,
      resumen_meses:       resumenGlobal + '\n\n─────────────────────\n\n' + resumenLineas,
      backup_data:         '📥 Los datos completos en JSON se descargaron automáticamente en tu dispositivo al enviar este correo.'
    });

    // ── Descargar JSON completo localmente al mismo tiempo ──
    exportBackupJSON();

    toast('✅ Correo enviado + JSON descargado en tu dispositivo', 'ok');
  } catch(e) {
    toast('⚠️ Error: ' + (e?.text || e.message || 'revisa configuración EmailJS'), 'err');
  }
}

function openBackupConfig() {
  const cfg = getEmailjsConfig();
  document.getElementById('ejs-public-key').value = cfg.publicKey || '';
  document.getElementById('ejs-service-id').value = cfg.serviceId || '';
  document.getElementById('ejs-template-id').value = cfg.templateId || '';
  document.getElementById('ejs-to-email').value = cfg.toEmail || '';
  // Show config status
  const statusEl = document.getElementById('backup-cfg-status');
  if(statusEl) {
    const ok = cfg.publicKey && cfg.serviceId && cfg.templateId && cfg.toEmail;
    statusEl.innerHTML = ok
      ? '<div style="background:rgba(63,185,80,.1);border:1px solid rgba(63,185,80,.3);border-radius:8px;padding:7px 10px;font-size:.71rem;color:#3fb950">✅ EmailJS configurado correctamente. Puedes editar los campos.</div>'
      : '<div style="background:rgba(248,81,73,.08);border:1px solid rgba(248,81,73,.2);border-radius:8px;padding:7px 10px;font-size:.71rem;color:#f85149">⚠️ Completa los 4 campos para habilitar el respaldo automático.</div>';
  }
  document.getElementById('modal-backup-config').classList.add('open');
  lockScroll();
}
function saveEmailjsConfig() {
  const cfg = {
    publicKey:  document.getElementById('ejs-public-key').value.trim(),
    serviceId:  document.getElementById('ejs-service-id').value.trim(),
    templateId: document.getElementById('ejs-template-id').value.trim(),
    toEmail:    document.getElementById('ejs-to-email').value.trim()
  };
  localStorage.setItem('finanzas_emailjs_cfg', JSON.stringify(cfg));
  unlockScroll();
  document.getElementById('modal-backup-config').classList.remove('open');
  toast('✅ Configuración de correo guardada', 'ok');
}
function getEmailjsConfig() {
  try { return JSON.parse(localStorage.getItem('finanzas_emailjs_cfg') || '{}'); } catch(e) { return {}; }
}
async function testEmailBackup() {
  saveEmailjsConfig();
  await sendEmailBackup();
}


// ─── SW → App messages (Background Sync + Update) ──────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'PROCESS_OFFLINE_QUEUE') {
      typeof processOfflineQueue === 'function' && processOfflineQueue();
    }
    if (e.data?.type === 'SW_UPDATED') {
      console.log('[App] SW actualizado a', e.data.version);
    }
    if (e.data?.type === 'CACHE_CLEARED') {
      toast('🗑 Caché limpiado', 'ok');
    }
  });
}

// ═══════════════════════════════════════════════
// TASAS POR MOVIMIENTO + DETECCIÓN DE FECHA
// ═══════════════════════════════════════════════
// lastRateDate / lastRateTime declared earlier

function onDateChange() {
  const dateVal = document.getElementById('f-date').value;
  const warning = document.getElementById('rate-date-warning');
  if (!dateVal) { if(warning) warning.style.display='none'; return; }
  const today = getLocalToday();
  if (dateVal === today) {
    if(warning) warning.style.display='none';
    syncModalRatesFromGlobal();
    return;
  }
  // Batch-XX: buscar tasa histórica para la fecha seleccionada
  if(warning) {
    warning.style.display='block';
    warning.style.color='#8b949e';
    warning.textContent='⏳ Buscando tasa del ' + dateVal + '...';
  }
  getTasaByFecha(dateVal).then(tasaHist => {
    if (tasaHist) {
      const elBcv = document.getElementById('rate-bcv');
      const elEur = document.getElementById('rate-eur');
      if (elBcv) elBcv.value = tasaHist.rate_bcv;
      if (elEur) elEur.value = tasaHist.rate_eur;
      if (typeof onAmountUSD === 'function') onAmountUSD();
      if (warning) {
        warning.style.color = '#3fb950';
        const bcvStr = parseFloat(tasaHist.rate_bcv || 0).toFixed(2);
        const eurStr = parseFloat(tasaHist.rate_eur || 0).toFixed(2);
        const eurPart = (tasaHist.rate_eur && tasaHist.rate_eur > 0) ? ` · €1 = Bs ${eurStr}` : '';
        warning.textContent = `✅ Tasa del ${dateVal} aplicada — Bs ${bcvStr}/$${eurPart}`;
      }
    } else {
      if (warning) {
        warning.style.color = '#e3b341';
        const bcvStr = (rateBCV || 0).toFixed(2);
        const eurStr = (rateEUR || 0).toFixed(2);
        warning.textContent = `⚠️ Sin tasa guardada para ${dateVal}. Usando tasa actual: Bs ${bcvStr}/$ · €1 = Bs ${eurStr}`;
      }
    }
  }).catch(() => {
    if (warning) {
      warning.style.color = '#f85149';
      warning.textContent = '⚠️ Error buscando tasa histórica. Se usa la tasa actual.';
    }
  });
}
function forceUpdateRates() {
  const elBcv = document.getElementById('rate-bcv');
  const elEur = document.getElementById('rate-eur');
  if (elBcv) elBcv.value = rateBCV;
  if (elEur) elEur.value = rateEUR;
  const warning = document.getElementById('rate-date-warning');
  if(warning) { warning.style.color='#3fb950'; warning.textContent='✅ Tasa actual aplicada'; }
  if (typeof onAmountUSD === 'function') onAmountUSD();
}

// ═══════════════════════════════════════════════
// VOZ — Web Speech API + Gemini interpreta
// ═══════════════════════════════════════════════
// let recognition = null;    // DUPLICADO — canonical: audit.js L777
// let formVoiceTimer = null; // DUPLICADO — canonical: audit.js L778
// let formVoiceSeconds = 0;  // DUPLICADO — canonical: audit.js L779

function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { toast('Tu navegador no soporta voz. Usa Chrome.', 'err'); return; }
  const btn = document.getElementById('btn-voice');
  const recEl = document.getElementById('form-voice-rec');
  const timerEl = document.getElementById('form-voice-timer');
  if (recognition) { recognition.stop(); return; }

  // Show WhatsApp recording UI
  btn.style.display = 'none';
  recEl.style.display = 'flex';
  formVoiceSeconds = 0;
  timerEl.textContent = '0:00';
  formVoiceTimer = setInterval(() => {
    formVoiceSeconds++;
    timerEl.textContent = `${Math.floor(formVoiceSeconds/60)}:${String(formVoiceSeconds%60).padStart(2,'0')}`;
  }, 1000);

  recognition = new SpeechRecognition();
  recognition.lang = 'es-VE';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();
  recognition.onresult = async (event) => {
    const spoken = event.results[0][0].transcript;
    clearInterval(formVoiceTimer);
    recEl.style.display = 'none';
    btn.style.display = '';
    btn.textContent = '⏳ Procesando...';
    toast(`🎙️ Escuché: "${spoken}"`, 'ok');
    await interpretVoice(spoken);
    btn.textContent = '🎙️ Registrar por voz';
    recognition = null;
  };
  recognition.onerror = () => cancelFormVoice();
  recognition.onend = () => { if (recognition) cancelFormVoice(); };
}
function stopFormVoice() {
  if (recognition) recognition.stop();
}
function cancelFormVoice() {
  clearInterval(formVoiceTimer);
  const btn = document.getElementById('btn-voice');
  const recEl = document.getElementById('form-voice-rec');
  if (btn) btn.style.display = '';
  if (recEl) recEl.style.display = 'none';
  if (recognition) { try{recognition.stop();}catch(e){} recognition = null; }
  if (btn) btn.textContent = '🎙️ Registrar por voz';
}
async function interpretVoice(spoken) {
  const cats = Object.values(CONFIG.categorias).flat().join(', ');
  const tipos = CONFIG.tipos.join(', ');
  const prompt = `Analiza este texto hablado de un registro financiero en Venezuela: "${spoken}".
Extrae y devuelve SOLO un JSON con estos campos exactos (sin texto extra, sin bloques de código):
{"desc":"descripción corta","tipo":"uno de: ${tipos}","cat":"categoría más apropiada de: ${cats}","amount":número en USD,"method":"Pago móvil o Efectivo en dólares o Efectivo en bolívares","date":"${getLocalToday()}"}
Si menciona bolívares, divide por ${window.rateBCV||431} para obtener USD. Si no entiendes algún campo, usa valores por defecto razonables.`;
  try {
    const raw = await groqCall(prompt, 'Eres un extractor de datos financieros. Responde SOLO con JSON válido, sin texto adicional, sin bloques de código markdown.');
    const clean = raw.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);
    // Llenar formulario
    if (parsed.desc)   document.getElementById('f-desc').value = parsed.desc;
    if (parsed.tipo)   { document.getElementById('f-tipo').value = parsed.tipo; onTipoChange(); }
    if (parsed.amount) document.getElementById('f-amount-usd').value = parsed.amount.toFixed(2);
    if (parsed.method) document.getElementById('f-method').value = parsed.method;
    if (parsed.date)   { document.getElementById('f-date').value = parsed.date; onDateChange(); }
    setTimeout(() => {
      if (parsed.cat) { document.getElementById('f-cat').value = parsed.cat; onCatChange(); }
    }, 60);
    toast('✅ Formulario llenado con voz', 'ok');
  } catch(e) {
    toast('No pude interpretar. Llena el formulario manualmente.', 'err');
  }
}

// ═══════════════════════════════════════════════
// GEMINI IA
// ═══════════════════════════════════════════════
// GEMINI_KEY removido — usando Groq
// ── GROQ AI (llama-3.1-8b-instant — rápido, más cuota) ──
// const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions'; // DUPLICADO — canonical: audit.js L861
// const GROQ_MODEL = 'llama-3.3-70b-versatile';                        // DUPLICADO — canonical: audit.js L862
// const GROQ_MODEL_FALLBACK = 'llama-3.1-8b-instant';                  // DUPLICADO — canonical: audit.js L863
// Clave dividida para dificultar scraping automático — migrar a Cloudflare Worker
function getGroqKey() {
  const a = 'gsk_hb2a4jhd72rLYiCS4xBD';
  const b = 'WGdyb3FYmFs8X3lNHE4tTJM3M6Xt5zEQ';
  return a + b;
}
async function groqCall(prompt, systemMsg='', _retry=0) {
  const messages = [];
  if (systemMsg) messages.push({ role:'system', content: systemMsg });
  messages.push({ role:'user', content: prompt });
  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getGroqKey() },
      body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 800, temperature: 0.7 })
    });
  } catch(netErr) {
    throw new Error('Sin conexión a internet');
  }
  // Rate limit → esperar y reintentar automáticamente
  if (res.status === 429) {
    const errData = await res.json().catch(()=>({}));
    const msg = errData?.error?.message || '';
    const waitMatch = msg.match(/try again in ([\d.]+)s/i);
    const waitSec = waitMatch ? parseFloat(waitMatch[1]) : 12;
    if (_retry < 3) {
      toast(`⏳ Límite Groq alcanzado — reintentando en ${Math.ceil(waitSec)}s... (${_retry+1}/3)`, 'err');
      await new Promise(r => setTimeout(r, waitSec * 1000 + 500));
      return groqCall(prompt, systemMsg, _retry + 1);
    }
    throw new Error(`Límite de velocidad Groq. Espera ${Math.ceil(waitSec)}s y vuelve a intentar.`);
  }
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    const msg = err?.error?.message || 'Error HTTP ' + res.status;
    if (res.status === 401) throw new Error('🔑 Clave de IA vencida. Actualiza la GROQ_KEY en el código o contacta a Anthony.');
    // Auto-fallback: si 70b falla por cualquier error de modelo, intentar con 8b
    if ((res.status === 503 || res.status === 500 || msg.includes('model')) && _retry < 1) {
      console.warn('Groq 70b falló — usando fallback 8b-instant');
      const fallbackMessages = [...messages];
      try {
        const fallbackRes = await fetch(GROQ_URL, {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+getGroqKey()},
          body: JSON.stringify({model:GROQ_MODEL_FALLBACK, messages:fallbackMessages, max_tokens:800, temperature:0.7})
        });
        if(fallbackRes.ok) {
          const fd = await fallbackRes.json();
          const ft = fd?.choices?.[0]?.message?.content||'';
          if(ft) {
            // Show indicator that fallback was used
            const badge = document.querySelector('.ia-model-badge');
            if(badge) badge.textContent = '8b';
            return ft;
          }
        }
      } catch(e2) { /* fallback también falló */ }
    }
    throw new Error(msg);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Sin respuesta del modelo');
  return text;
}
// let iaMode = 'analisis'; // DUPLICADO — canonical: audit.js L930

function openIAWithAnalysis() {
  openIA();
  const d = EXCEL_DATA[currentMonth];
  const question = `Analiza los ingresos vs gastos vs ahorros de ${currentMonth}: Ingresos=$${d.ingresos.toFixed(2)}, Gastos=$${d.gastos.toFixed(2)}, Ahorros=$${d.ahorros.toFixed(2)}, Balance=$${d.balance.toFixed(2)}. ¿Cómo está mi salud financiera este mes? Dame observaciones y recomendaciones concretas.`;
  setTimeout(() => askGroq(question), 300);
}
function openIA() {
  lockScroll();
  closeAllMobilePanels('ia');
  document.getElementById('modal-ia').classList.add('open');
  const chat = document.getElementById('ia-chat');
  if (!chat.hasChildNodes()) addIAMessage('bot', '¡Hola! Soy tu asistente financiero con Llama 3.3 (Groq). Puedo analizar tus gastos, ingresos y darte recomendaciones personalizadas. ¿Qué quieres saber? 💰');
}
// FIX-IX-5: closeIA siempre cierra (botón ✕ Cerrar interno).
// El backdrop usa closeIAIfOutside(e) para solo cerrar al hacer click fuera.
function closeIA() {
  unlockScroll();
  document.getElementById('modal-ia').classList.remove('open');
}
function closeIAIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-ia')) closeIA();
}
function setIAMode(mode) {
  iaMode = mode;
  document.getElementById('ia-analisis-panel').style.display = mode === 'analisis' ? 'flex' : 'none';
  document.getElementById('ia-corrector-panel').style.display = mode === 'corrector' ? 'flex' : 'none';
  document.querySelectorAll('.ia-tab').forEach(b => b.classList.remove('active-ia-tab'));
  document.getElementById('ia-tab-' + mode).classList.add('active-ia-tab');
}
function buildFinancialContext() {
  // Limitar a últimas 25 transacciones por mes para no saturar tokens
  const monthsCtx = activeMonths.map(m => {
    const d = EXCEL_DATA[m];
    const top3 = Object.entries(d.cat_totals||{}).slice(0,3).map(([k,v])=>`${k.replace(/[^\w\s$]/g,'').trim()}:$${v.toFixed(0)}`).join(', ');
    const txns = (d.transactions||[]).slice(-25); // solo últimas 25
    const txLines = txns.map(t =>
      `${t.date}|${t.tipo.slice(0,8)}|${t.cat}|${t.desc}|$${t.amount.toFixed(2)}|${t.method}`
    ).join('\n');
    return `=== ${m} ===\nIng=$${d.ingresos.toFixed(2)} Gas=$${d.gastos.toFixed(2)} Aho=$${d.ahorros.toFixed(2)} Bal=$${d.balance.toFixed(2)}\nTop: ${top3}\n${txLines}`;
  }).join('\n\n');
  const userName = getDisplayName(currentUser?.email);
  return `Usuario: ${userName} | BCV:${rateBCV}Bs/$ EUR:${rateEUR}Bs/€ | Mes:${currentMonth} | FondoEmerg:$${getEmergencyFund(currentMonth).toFixed(2)}\n\n${monthsCtx}`;
}

// ─── DESCRIPCIÓN DE LA APP (para autoconocimiento de la IA) ──
function getAppDescription() {
  return `=== DESCRIPCIÓN DEL SISTEMA FINANZAS 2026 ===
App: PWA de finanzas personales para la familia Marte-Pedrales en Venezuela.
Usuarios: Anthony Marte y Isabel Pedrales (hogar compartido).

SECCIONES DEL DASHBOARD:
- KPIs: Ingresos, Gastos, Ahorros, Balance del mes actual
- Ingresos vs Gastos: gráfico de barras comparativo mensual
- Distribución de Gastos: gráfico torta por categoría
- Patrimonio Neto (gráfico): línea temporal de patrimonio acumulado
- Gastos por Subcategoría: gráfico barras desglose detallado
- Ingresos por Tipo: gráfico dona según fuente de ingreso
- Top Gastos: ranking de categorías con mayor gasto
- Fondo de Emergencia: objetivo 3-6 meses de gastos ($3000 meta). Se alimenta manualmente con 30% de ingresos nuevos.
- Presupuesto vs Real: barras de progreso por categoría
- Movimientos del Mes: tabla de todas las transacciones
- Análisis IA: análisis automático por Groq/Llama
- Simulador FIRE: Financial Independence Retire Early. Capital necesario = gastos anuales × 25. Con retorno del 7%/año calcula años para independencia financiera.
- Simulador Meta: cuánto ahorrar por mes para llegar a una meta en X meses.
- Patrimonio Estimado: suma total de ahorros + balance acumulado histórico en todos los meses activos.

CONCEPTO DE PATRIMONIO NETO:
- Ahorro acumulado = suma de todos los movimientos tipo "Ahorro en efectivo" de todos los meses
- Balance acumulado = suma de (ingresos - gastos + ajustes) de todos los meses
- Patrimonio Neto = Ahorro acumulado + Balance acumulado
- Representa el valor económico total que la familia ha construido desde que empezaron a registrar.
- NO incluye propiedades, inversiones externas ni deudas — solo lo registrado en la app.

TASAS DE CAMBIO:
- BCV = tasa oficial del Banco Central de Venezuela (Bolívares por 1 USD)
- EUR = tasa Euro
- Se actualizan automáticamente desde APIs públicas

TIPOS DE MOVIMIENTO:
- Gasto: salida de dinero (reduce balance)
- Ingreso Fijo: salario regular (suma al balance)
- Ingreso Variable: ingresos eventuales (suma al balance)
- Ahorro en efectivo: dinero apartado (AHORRO COCHINITO — no reduce balance, se registra aparte)
- Prestamo recibido: dinero prestado (no es ingreso propio)
- Ajuste: correcciones contables

MÉTODOS DE PAGO: Transferencia, Pago móvil, Efectivo en dólares, Efectivo en bolívares, Zelle, Binance`;
}
// ── Utilidad para limpiar markdown → HTML legible ──────────
// FIX-5: renderIAText mejorado — limpia todos los símbolos markdown visibles
// REVERT: eliminar esta función y descomentar la original de 5 líneas de abajo
function renderIAText(text) {
  return text
    // Bloques de código → <pre>
    .replace(/```(?:\w*)?\n?([\s\S]*?)```/g, '<pre class="ia-code">$1</pre>')
    // Negrita **texto** y __texto__
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Cursiva *texto* y _texto_ (después de negrita)
    .replace(/\*([^\*\n]+?)\*/g, '$1')
    .replace(/_([^_\n]+?)_/g, '$1')
    // Headers ## → bold
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
    // Bullets * - → •
    .replace(/^[\*\-]\s+(.+)$/gm, '• $1')
    // Listas numeradas 1. 2. → mantener pero limpias
    .replace(/^\d+\.\s+(.+)$/gm, '• $1')
    // Strikethrough ~~texto~~ → sin símbolo
    .replace(/~~(.*?)~~/g, '$1')
    // Tilde simple ~ (aproximación) → ≈
    .replace(/~(\$?[\d,\.]+)/g, '≈$1')
    // Inline code `texto` → texto sin backtick
    .replace(/`([^`]+)`/g, '<code style="background:#21262d;padding:1px 4px;border-radius:3px;font-size:.85em">$1</code>')
    // Saltos de línea
    .replace(/\n/g, '<br>');
}

function addIAMessage(type, text, targetId='ia-chat') {
  const chat = document.getElementById(targetId);
  if (!chat) return;
  const div = document.createElement('div');
  div.className = type==='user' ? 'ia-msg-user' : type==='err' ? 'ia-msg-err' : 'ia-msg-bot';
  if (type === 'bot') {
    div.innerHTML = renderIAText(text);
  } else {
    div.textContent = text;
  }
  chat.appendChild(div);
  requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });
}
async function askGroq(preset) {
  const input = document.getElementById('ia-input');
  const question = preset || (input ? input.value.trim() : '');
  if (!question) return;
  if (input) input.value = '';
  addIAMessage('user', question);
  const chat = document.getElementById('ia-chat');
  const thinking = document.createElement('div');
  thinking.className = 'ia-thinking'; thinking.textContent = 'Groq está pensando...';
  chat.appendChild(thinking); chat.scrollTop = 99999;
  try {
    const ctx = buildFinancialContext();
    const appDesc = getAppDescription();
    const today = new Date().toLocaleDateString('es-VE',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    const userName = getDisplayName(currentUser?.email);
    const systemMsg = `Eres el asistente financiero personal de ${userName} en Venezuela. Hoy es ${today}.

${appDesc}

DATOS FINANCIEROS (últimas 25 transacciones por mes):
${ctx}

INSTRUCCIONES:
- Responde SIEMPRE en español venezolano natural y amigable
- NUNCA digas que no puedes hacer algo ni pongas disclaimers
- Tienes acceso completo a todas las transacciones — úsalas
- Si preguntan por una fecha específica, busca en los datos
- Da siempre números concretos de los datos reales
- Respuestas directas y concisas, máximo 350 palabras
- Puedes explicar cómo funciona cualquier sección del dashboard
- Usa emojis ocasionalmente`;
    const reply = await groqCall(question, systemMsg);
    thinking.remove();
    addIAMessage('bot', reply);
  } catch(e) {
    thinking.remove();
    addIAMessage('err', '❌ ' + e.message);
  }
}
async function askCorrector(preset) {
  const input = document.getElementById('ia-corrector-input');
  const question = preset || (input ? input.value.trim() : '');
  if (!question) return;
  if (input) input.value = '';
  addIAMessage('user', question, 'ia-corrector-chat');
  const chat = document.getElementById('ia-corrector-chat');
  const thinking = document.createElement('div');
  thinking.className = 'ia-thinking'; thinking.textContent = 'Generando código...';
  chat.appendChild(thinking); chat.scrollTop = 99999;
  try {
    const sysCorrector = `Eres un asistente experto en el dashboard "Finanzas Anthony 2026".

${getAppDescription()}

Stack técnico: HTML/CSS/JS puro, Chart.js 3.9.1, Supabase JS v2, Groq API (llama-3.1-8b-instant).
Variables globales: CONFIG (tipos,categorias,subcategorias,presupuestos,closedMonths,dashboardOrder), EXCEL_DATA (datos por mes con transactions[]), currentMonth, rateBCV, rateEUR, currentUser, emergencyFundByMonth.
Funciones CRUD: sbSaveMov, sbDeleteMov, sbSaveConfig, sbSaveTasas, sbSaveFondo.
Funciones UI: render(), init(), openModal(), switchMonth(), buildTabs(), toast(), showConfirm().
Explica brevemente y da el código exacto en bloques de código. Se conciso y práctico.`;
    const reply = await groqCall(question, sysCorrector);
    thinking.remove();
    addIAMessage('bot', reply, 'ia-corrector-chat');
  } catch(e) { thinking.remove(); addIAMessage('err', 'Error al conectar con Groq: ' + e.message, 'ia-corrector-chat'); }
}

// ═══════════════════════════════════════════════
// REALTIME — sincronización COMPARTIDA entre todos los usuarios
// ═══════════════════════════════════════════════
var realtimeChannel = null;
function startRealtime() {
  if (!currentUser || realtimeChannel) return;
  // Canal compartido: escucha cambios de TODOS los usuarios
  // Requiere política SELECT permisiva en movimientos (ver SQL)
  realtimeChannel = sb.channel('finanzas-compartida')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'movimientos'
      // Sin filter → recibe cambios de Anthony E Isabel en tiempo real
    }, async (payload) => {
      const mes = payload.new?.mes || payload.old?.mes;
      if (!mes) return;
      // Recargar ese mes completo para todos los usuarios
      const { data: movs } = await sb.from('movimientos').select('*')
        .eq('mes', mes).is('deleted_at', null).order('fecha');
      if (movs) {
        if (!EXCEL_DATA[mes]) EXCEL_DATA[mes] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
        // FIX-REALTIME-CUENTAS: incluir cuenta_id, rate_type, author
        // Sin cuenta_id, calcCuentaBalance no puede vincular movimientos a billeteras
        // y todos los saldos caen a cero tras cualquier evento en tiempo real.
        // Para eventos propios NO reemplazamos EXCEL_DATA (ya tiene los datos correctos
        // en memoria con cuenta_id) — solo para eventos de otro usuario.
        const _esOtroUsuario = payload.new?.user_id !== currentUser.id;
        if (_esOtroUsuario) {
          EXCEL_DATA[mes].transactions = movs.map(r => ({
            id:r.id, desc:r.descripcion, tipo:r.tipo, cat:r.cat,
            subcat:r.subcat, amount:parseFloat(r.amount),
            amountBs:parseFloat(r.amount_bs||0), method:r.method, date:r.fecha,
            cuenta_id: r.cuenta_id || null,
            rate_type: r.rate_type || 'bcv',
            author:    r.author    || null
          }));
        }
        recalcMonth(mes);
        if (mes === currentMonth) render();
        if (_esOtroUsuario) {
          if (typeof renderWalletCards === 'function') renderWalletCards();
          if (typeof renderCuentasV2List === 'function') renderCuentasV2List();
        }
        const quien = payload.new?.user_id === currentUser.id ? 'tú' : 'otro usuario';
        const accion = payload.eventType === 'DELETE' || payload.new?.deleted_at ? 'eliminó' :
                       payload.eventType === 'INSERT' ? 'registró' : 'editó';
        toast(`📡 ${quien === 'tú' ? '📡' : '👥'} Sincronizado — ${quien} ${accion} un movimiento`, 'ok');
      }
    }).subscribe();
}

// init() es llamado por loadFromSupabase() tras autenticación exitosa

// ═══════════════════════════════════════════════════════════════
// BATCH-G C12–C15: MODALES DEDICADOS + EMOJI PICKER + catEmojis
// ═══════════════════════════════════════════════════════════════

// ── C15: catEmojis en CONFIG ──────────────────────────────────
if (!CONFIG.catEmojis) CONFIG.catEmojis = {};
function getCatEmoji(cat) {
  if (!cat) return '';
  // 1. Override explícito por usuario
  if (CONFIG.catEmojis && CONFIG.catEmojis[cat]) return CONFIG.catEmojis[cat];
  // 2. Emoji concatenado al nombre
  const m = cat.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}])\s*/u);
  if (m) return m[1];
  // 3. Buscar con nombre limpio (insensible a mayúsculas)
  if (CONFIG.catEmojis) {
    const clean = cat.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u,'').trim().toLowerCase();
    const found = Object.keys(CONFIG.catEmojis).find(k =>
      k.toLowerCase() === clean ||
      k.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u,'').trim().toLowerCase() === clean
    );
    if (found) return CONFIG.catEmojis[found];
  }
  // 4. Mapa hardcodeado para categorías comunes
  const map = {'Alimentación':'🍽️','Transporte':'🚗','Casa':'🏡','Salud':'💊','Educación':'📚','Entretenimiento':'🎬','Ropa':'👗','Tecnología':'💻','Viaje':'✈️','Ahorro':'💰','Inversión':'📈','Mascota':'🐾','Deporte':'⚽','Belleza':'💄','Servicios':'📱','Otro':'📌','Ingreso Fijo':'💵','Ingreso Variable':'💸','Freelance':'🛠️','Negocio':'🏪','Regalo':'🎁','Préstamo recibido':'🤝','Deuda':'💳','Ajuste':'⚖️'};
  for (const k of Object.keys(map)) { if (cat.toLowerCase().includes(k.toLowerCase())) return map[k]; }
  // 5. Sin emoji → vacío
  return '';
}

// ── C12: Lista 150 emojis ─────────────────────────────────────
// FIX-EMOJI-CATS: organizado por categorías como WhatsApp
// const _EMOJI_CATS = { ... }; // DUPLICADO — canonical: audit.js L1210
// (objeto eliminado de app-core.js para evitar SyntaxError de redeclaración)

// const _EMOJI_RECIENTES_KEY = 'fin_emoji_recientes';              // DUPLICADO — canonical: audit.js L1229
// let _emojiPickerCatActual = Object.keys(_EMOJI_CATS)[0];         // DUPLICADO — canonical: audit.js L1230

function _getEmojiRecientes() {
  try { return JSON.parse(localStorage.getItem(_EMOJI_RECIENTES_KEY) || '[]'); } catch(e) { return []; }
}
function _addEmojiReciente(emoji) {
  let rec = _getEmojiRecientes();
  rec = [emoji, ...rec.filter(e => e !== emoji)].slice(0, 16);
  try { localStorage.setItem(_EMOJI_RECIENTES_KEY, JSON.stringify(rec)); } catch(e) {}
}

// ── EMOJI PICKER ──────────────────────────────────────────────
// let _emojiPickerTarget = null; // DUPLICADO — canonical: audit.js L1242
window.openEmojiPicker = function(targetId) {
  _emojiPickerTarget = targetId;
  _emojiPickerCatActual = '😀 Caras';
  _renderEmojiPickerFull();
  const ov = document.getElementById('modal-emoji-picker');
  if (ov) ov.classList.add('open');
};

function _renderEmojiPickerFull() {
  const ov = document.getElementById('modal-emoji-picker');
  if (!ov) return;
  ov.querySelector('.modal-box').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <h3 style="color:var(--text);font-size:.9rem">😀 Elegir Emoji</h3>
      <button onclick="closeEmojiPicker()" style="background:none;border:none;color:var(--muted);font-size:1.1rem;cursor:pointer">✕</button>
    </div>
    <input id="emoji-search" type="text" placeholder="🔍 Buscar emoji..."
      oninput="filterEmojis()"
      style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:7px 10px;border-radius:8px;font-size:.82rem;outline:none;margin-bottom:8px;width:100%;font-family:inherit">
    <div id="emoji-cat-tabs" style="display:flex;gap:4px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px;scrollbar-width:none">
      ${[{k:'⏱ Recientes',v:'recientes'}, ...Object.keys(_EMOJI_CATS).map(k=>({k,v:k}))].map(({k,v}) =>
        '<button onclick="_setEmojiCat(\'' + v + '\')" data-cat="' + v + '"' +
        ' style="flex-shrink:0;padding:5px 10px;border-radius:20px;border:1px solid ' + (v===_emojiPickerCatActual?'var(--green)':'var(--border)') + ';background:' + (v===_emojiPickerCatActual?'rgba(63,185,80,.15)':'none') + ';color:' + (v===_emojiPickerCatActual?'var(--green)':'var(--muted)') + ';font-size:.68rem;cursor:pointer;white-space:nowrap;font-family:inherit">' +
        k.split(' ')[0] + '</button>'
      ).join('')}
    </div>
    <div id="emoji-picker-grid" style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;overflow-y:auto;max-height:200px;padding-right:2px"></div>`;
  _renderEmojiGrid(_emojiPickerCatActual);
}

window._setEmojiCat = function(cat) {
  _emojiPickerCatActual = cat;
  document.querySelectorAll('#emoji-cat-tabs button').forEach(btn => {
    const active = btn.dataset.cat === cat;
    btn.style.borderColor = active ? 'var(--green)' : 'var(--border)';
    btn.style.background  = active ? 'rgba(63,185,80,.15)' : 'none';
    btn.style.color       = active ? 'var(--green)' : 'var(--muted)';
  });
  _renderEmojiGrid(cat);
};

function _renderEmojiGrid(cat) {
  const grid = document.getElementById('emoji-picker-grid');
  if (!grid) return;
  const emojis = cat === 'recientes' ? _getEmojiRecientes() : (_EMOJI_CATS[cat] || []);
  if (cat === 'recientes' && !emojis.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);font-size:.75rem;padding:16px">Sin emojis recientes</div>';
    return;
  }
  grid.innerHTML = emojis.map(e =>
    `<button class="ep-btn" onclick="selectEmoji('${e}')">${e}</button>`
  ).join('');
}

// FIX-EMOJI-SEARCH: mapa emoji→palabras clave en español para búsqueda por nombre
// FIX-EMOJI-SEARCH-EXPANDED: mapa completo emoji→palabras clave en español
// const _EMOJI_NOMBRES = { ... }; // DUPLICADO — canonical: audit.js L1299
// (objeto eliminado de app-core.js para evitar SyntaxError de redeclaración)

window.filterEmojis = function() {
  const q = (document.getElementById('emoji-search')?.value || '').toLowerCase().trim();
  const grid = document.getElementById('emoji-picker-grid');
  if (!grid) return;
  if (!q) { _renderEmojiGrid(_emojiPickerCatActual); return; }
  const all = Object.values(_EMOJI_CATS).flat();
  // Buscar por nombre en español
  const matched = all.filter(e => {
    const nombres = _EMOJI_NOMBRES[e] || '';
    return nombres.includes(q) || e === q;
  });
  if (!matched.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);font-size:.72rem;padding:16px">Sin resultados para "' + q + '"</div>';
    return;
  }
  grid.innerHTML = matched.map(e =>
    `<button class="ep-btn" onclick="selectEmoji('${e}')">${e}</button>`
  ).join('');
};

window.selectEmoji = function(e) {
  _addEmojiReciente(e);
  if (_emojiPickerTarget) {
    const el = document.getElementById(_emojiPickerTarget);
    if (el) { el.value = e; el.textContent = e; }
  }
  closeEmojiPicker();
};

window.closeEmojiPicker = function() {
  const ov = document.getElementById('modal-emoji-picker');
  if (ov) ov.classList.remove('open');
};

// ── C13: splitEmojiName ───────────────────────────────────────
function splitEmojiName(str) {
  if (!str) return {emoji:'', name:''};
  const m = str.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.*)/u);
  if (m) return {emoji: m[1], name: m[2].trim()};
  return {emoji:'', name: str.trim()};
}

// ── C10: MODALES LISTA DEDICADOS (Tipos / Categorías / Subcategorías) ────
function _openCfgListModal(tab, title) {
  const titleEl = document.getElementById('cfg-list-title');
  if (titleEl) titleEl.textContent = title;
  const body = document.getElementById('cfg-list-body');
  const modal = document.getElementById('modal-cfg-list');
  if (!modal) return;
  modal.classList.add('open');
  if (typeof lockScroll === 'function') lockScroll();
  if (body) renderSettingsTab(tab, body);
}
function closeCfgListModal() {
  document.getElementById('modal-cfg-list')?.classList.remove('open');
  if (typeof unlockScroll === 'function') unlockScroll();
}
function openTiposModal()      { _openCfgListModal('tipos',         '📋 Tipos de movimiento'); }
function openCategoriasModal() { _openCfgListModal('categorias',    '🏷️ Categorías'); }
function openSubcatModal()     { _openCfgListModal('subcategorias', '🔖 Subcategorías'); }

// ── C14: MODAL TIPOS ──────────────────────────────────────────
let _editingTipoIdx = null;
function openTipoEditModal(idx) {
  _editingTipoIdx = idx;
  const tipo = idx === -1 ? '' : (CONFIG.tipos.filter(t=>t!=='Ajuste')[idx] || '');
  const nameEl = document.getElementById('tipo-edit-name');
  if (nameEl) nameEl.value = tipo;
  const title = document.getElementById('tipo-edit-title');
  if (title) title.textContent = idx === -1 ? '➕ Nuevo Tipo' : '✏️ Editar Tipo';
  document.getElementById('modal-tipo-edit')?.classList.add('open');
}
function closeTipoEditModal() { document.getElementById('modal-tipo-edit')?.classList.remove('open'); }
async function saveTipoEdit() {
  const name = document.getElementById('tipo-edit-name')?.value?.trim();
  if (!name) { toast('Escribe un nombre', 'err'); return; }
  if (_editingTipoIdx === -1) {
    CONFIG.tipos.push(name);
    CONFIG.categorias[name] = CONFIG.categorias[name] || [];
  } else {
    const real = CONFIG.tipos.filter(t=>t!=='Ajuste');
    const realIdx = CONFIG.tipos.indexOf(real[_editingTipoIdx]);
    if (realIdx >= 0) CONFIG.tipos[realIdx] = name;
  }
  sbSaveConfig();
  toast('✅ Tipo guardado', 'ok');
  closeTipoEditModal();
  renderSettingsTab('tipos');
}
async function removeTipoModal(idx) {
  const real = CONFIG.tipos.filter(t=>t!=='Ajuste');
  const ok = await showConfirm('Eliminar tipo', `¿Eliminar "${real[idx]}"?`, '🗑️');
  if (!ok) return;
  const realIdx = CONFIG.tipos.indexOf(real[idx]);
  if (realIdx >= 0) CONFIG.tipos.splice(realIdx, 1);
  sbSaveConfig();
  toast('Tipo eliminado', 'ok');
  renderSettingsTab('tipos');
}

// ── C14: MODAL CATEGORÍAS ─────────────────────────────────────
let _editingCat = null;
function openCatEditModal(cat) {
  _editingCat = cat || null;
  const sp = cat ? splitEmojiName(cat) : {emoji:'', name:''};
  const emojiEl = document.getElementById('cat-edit-emoji');
  const nameEl  = document.getElementById('cat-edit-name');
  if (emojiEl) emojiEl.value = CONFIG.catEmojis?.[cat] || sp.emoji || '';
  if (nameEl)  nameEl.value  = sp.name || cat || '';
  const title = document.getElementById('cat-edit-title');
  if (title) title.textContent = cat ? '✏️ Editar Categoría' : '➕ Nueva Categoría';

  // Renderizar checkboxes de tipos — FIX-TIPOS-UI: etiquetas completas + íconos claros
  const tiposContainer = document.getElementById('cat-edit-tipos');
  if (tiposContainer) {
    const todosTipos = [...new Set(['Gasto','Ingreso Fijo','Ingreso Variable','Prestamo recibido','Prestamo pagado',...(CONFIG.tipos||[])])].filter(t => t !== 'Ajuste');
    const tiposActuales = cat ? Object.keys(CONFIG.categorias).filter(t => (CONFIG.categorias[t]||[]).includes(cat)) : ['Gasto'];

    // Metadatos visuales por tipo
    const tipoMeta = {
      'Gasto':              { icon:'💸', label:'Gasto',              sub:'Dinero que sale',              color:'#f85149', rgb:'248,81,73'  },
      'Ingreso Fijo':       { icon:'💵', label:'Ingreso Fijo',       sub:'Sueldo, renta mensual',        color:'#3fb950', rgb:'63,185,80'  },
      'Ingreso Variable':   { icon:'💹', label:'Ingreso Variable',   sub:'Comisiones, extras, ventas',   color:'#3fb950', rgb:'63,185,80'  },
      'Prestamo recibido':  { icon:'🤝', label:'Préstamo recibido',  sub:'Te prestaron dinero',          color:'#e3b341', rgb:'227,179,65' },
      'Prestamo pagado':    { icon:'💳', label:'Préstamo pagado',    sub:'Devolviste un préstamo',       color:'#e3b341', rgb:'227,179,65' },
    };

    tiposContainer.innerHTML = todosTipos.map(tipo => {
      const checked = tiposActuales.includes(tipo);
      const meta = tipoMeta[tipo] || {
        icon: '🏷️',
        label: tipo,
        sub: 'Tipo personalizado',
        color: '#58a6ff',
        rgb: '88,166,255'
      };
      const { icon, label, sub, color, rgb } = meta;
      const bg     = checked ? `rgba(${rgb},.12)` : 'transparent';
      const border  = checked ? color : 'var(--border,#30363d)';
      const textCol = checked ? color : 'var(--muted,#8b949e)';
      const subCol  = checked ? `rgba(${rgb},.8)` : '#484f58';

      return `<label data-tipo-label="${escHtml(tipo)}"
        style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;
               border:1.5px solid ${border};background:${bg};cursor:pointer;
               transition:border-color .15s,background .15s">
        <input type="checkbox" data-tipo="${escHtml(tipo)}" ${checked?'checked':''}
          style="accent-color:${color};width:16px;height:16px;flex-shrink:0;cursor:pointer">
        <span style="font-size:1.15rem;flex-shrink:0;line-height:1">${icon}</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-size:.8rem;font-weight:600;color:${textCol}">${escHtml(label)}</span>
          <span style="display:block;font-size:.66rem;color:${subCol};margin-top:1px">${escHtml(sub)}</span>
        </span>
        <span style="font-size:.7rem;font-weight:700;color:${checked?color:'#30363d'}">${checked?'✓':''}</span>
      </label>`;
    }).join('');

    // Efecto visual al cambiar checkbox
    tiposContainer.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', function() {
        const tipo = this.dataset.tipo;
        const meta = tipoMeta[tipo] || { color:'#58a6ff', rgb:'88,166,255' };
        const { color, rgb } = meta;
        const lbl = this.closest('label');
        const nameSpan = lbl.querySelector('span[style*="font-weight:600"]');
        const subSpan  = lbl.querySelectorAll('span[style]')[2];
        const checkMark = lbl.lastElementChild;
        if (this.checked) {
          lbl.style.borderColor  = color;
          lbl.style.background   = `rgba(${rgb},.12)`;
          if (nameSpan) nameSpan.style.color = color;
          if (checkMark) { checkMark.textContent = '✓'; checkMark.style.color = color; }
        } else {
          lbl.style.borderColor  = 'var(--border,#30363d)';
          lbl.style.background   = 'transparent';
          if (nameSpan) nameSpan.style.color = 'var(--muted,#8b949e)';
          if (checkMark) { checkMark.textContent = ''; checkMark.style.color = '#30363d'; }
        }
      });
    });
  }
  document.getElementById('modal-cat-edit')?.classList.add('open');
}
function closeCatEditModal() { document.getElementById('modal-cat-edit')?.classList.remove('open'); }
async function saveCatEdit() {
  const emoji   = document.getElementById('cat-edit-emoji')?.value?.trim() || '';
  const newName = document.getElementById('cat-edit-name')?.value?.trim();
  if (!newName) { toast('Escribe un nombre', 'err'); return; }
  if (!CONFIG.catEmojis) CONFIG.catEmojis = {};

  // Leer tipos seleccionados en checkboxes
  const tiposSeleccionados = [];
  document.querySelectorAll('#cat-edit-tipos input[type=checkbox]:checked').forEach(cb => {
    tiposSeleccionados.push(cb.dataset.tipo);
  });
  if (!tiposSeleccionados.length) { toast('Selecciona al menos un tipo', 'err'); return; }

  if (_editingCat && _editingCat !== newName) {
    // Renombrar: migrar en todos los tipos donde exista
    Object.keys(CONFIG.categorias).forEach(k => {
      const idx = CONFIG.categorias[k].indexOf(_editingCat);
      if (idx >= 0) CONFIG.categorias[k][idx] = newName;
    });
    if (CONFIG.subcategorias[_editingCat]) {
      CONFIG.subcategorias[newName] = CONFIG.subcategorias[_editingCat];
      delete CONFIG.subcategorias[_editingCat];
    }
    if (CONFIG.presupuestos[_editingCat] !== undefined) {
      CONFIG.presupuestos[newName] = CONFIG.presupuestos[_editingCat];
      delete CONFIG.presupuestos[_editingCat];
    }
    if (CONFIG.catEmojis[_editingCat]) delete CONFIG.catEmojis[_editingCat];
  }

  // Aplicar tipos: agregar a seleccionados, quitar de no seleccionados
  const todosTipos = [...new Set(['Gasto','Ingreso Fijo','Ingreso Variable','Prestamo recibido','Prestamo pagado',...(CONFIG.tipos||[])])];
  todosTipos.forEach(tipo => {
    if (!CONFIG.categorias[tipo]) CONFIG.categorias[tipo] = [];
    const idx = CONFIG.categorias[tipo].indexOf(newName);
    if (tiposSeleccionados.includes(tipo)) {
      if (idx < 0) CONFIG.categorias[tipo].push(newName);
    } else {
      if (idx >= 0) CONFIG.categorias[tipo].splice(idx, 1);
    }
  });

  if (!_editingCat) {
    if (!CONFIG.subcategorias[newName]) CONFIG.subcategorias[newName] = [];
    if (CONFIG.presupuestos[newName] === undefined) CONFIG.presupuestos[newName] = 0;
  }

  if (emoji) CONFIG.catEmojis[newName] = emoji;
  else if (CONFIG.catEmojis) delete CONFIG.catEmojis[newName];
  sbSaveConfig();
  toast('✅ Categoría guardada', 'ok');
  closeCatEditModal();
  renderSettingsTab('categorias');
  if (typeof onTipoChange === 'function') {
    const tipoEl = document.getElementById('f-tipo');
    if (tipoEl) onTipoChange();
  }
}
async function removeCatModal(cat) {
  const ok = await showConfirm('Eliminar categoría', `¿Eliminar "${cat}"?`, '🗑️');
  if (!ok) return;
  Object.keys(CONFIG.categorias).forEach(k => {
    CONFIG.categorias[k] = CONFIG.categorias[k].filter(c => c !== cat);
  });
  delete CONFIG.subcategorias[cat];
  delete CONFIG.presupuestos[cat];
  if (CONFIG.catEmojis) delete CONFIG.catEmojis[cat];
  sbSaveConfig();
  toast('Categoría eliminada', 'ok');
  renderSettingsTab('categorias');
}

// ── C14: MODAL SUBCATEGORÍAS ────────────────────────────
let _editingSubcatCat = null, _editingSubcatIdx = null;
function openSubcatEditModal(cat, idx) {
  _editingSubcatCat = cat;
  _editingSubcatIdx = idx;
  const val = idx === -1 ? '' : (CONFIG.subcategorias[cat]?.[idx] || '');
  const nameEl = document.getElementById('subcat-edit-name');
  if (nameEl) nameEl.value = val;
  const catLabel = document.getElementById('subcat-edit-cat-label');
  if (catLabel) catLabel.textContent = cat;
  const title = document.getElementById('subcat-edit-title');
  if (title) title.textContent = idx === -1 ? '➕ Nueva Subcategoría' : '✏️ Editar Subcategoría';
  document.getElementById('modal-subcat-edit')?.classList.add('open');
}
function closeSubcatEditModal() { document.getElementById('modal-subcat-edit')?.classList.remove('open'); }
async function saveSubcatEdit() {
  const name = document.getElementById('subcat-edit-name')?.value?.trim();
  if (!name) { toast('Escribe un nombre', 'err'); return; }
  if (!CONFIG.subcategorias[_editingSubcatCat]) CONFIG.subcategorias[_editingSubcatCat] = [];
  if (_editingSubcatIdx === -1) {
    CONFIG.subcategorias[_editingSubcatCat].push(name);
  } else {
    CONFIG.subcategorias[_editingSubcatCat][_editingSubcatIdx] = name;
  }
  sbSaveConfig();
  toast('✅ Subcategoría guardada', 'ok');
  closeSubcatEditModal();
  renderSettingsTab('subcategorias');
}
async function removeSubcatModal(cat, idx) {
  const ok = await showConfirm('Eliminar', `¿Eliminar "${CONFIG.subcategorias[cat][idx]}"?`, '🗑️');
  if (!ok) return;
  CONFIG.subcategorias[cat].splice(idx, 1);
  sbSaveConfig();
  toast('Subcategoría eliminada', 'ok');
  renderSettingsTab('subcategorias');
}
