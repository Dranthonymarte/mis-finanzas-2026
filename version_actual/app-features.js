
// ══════════════════════════════════════════════════════════
//  V4 FEATURES — 14 implementations
// ══════════════════════════════════════════════════════════

// ─── THEME TOGGLE ────────────────────────────────────────
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('fin_theme', isLight ? 'light' : 'dark');
  const cb = document.getElementById('theme-toggle-cb');
  if(cb) cb.checked = isLight;
  toast(isLight ? '☀️ Tema claro activado' : '🌙 Tema oscuro activado');
}
function initTheme() {
  const saved = localStorage.getItem('fin_theme');
  if(saved === 'light') {
    document.body.classList.add('light-theme');
    const cb = document.getElementById('theme-toggle-cb');
    if(cb) cb.checked = true;
  }
}
initTheme();

// ─── PIN LOCK SYSTEM ─────────────────────────────────────
const PIN_KEY_STORE = 'fin_pin_v2';
let _pinBuffer = '';
let _pinMode   = 'unlock'; // 'unlock' | 'setup1' | 'setup2'
let _pinFirst  = '';
let _autoLockTimer = null;

function getStoredPIN() {
  const local = localStorage.getItem(PIN_KEY_STORE);
  if (local) return local;
  // Fallback: check CONFIG (loaded from Supabase)
  const fromConfig = (typeof CONFIG !== 'undefined') ? CONFIG._pinHash : null;
  if (fromConfig) {
    // Restore to localStorage for next time
    localStorage.setItem(PIN_KEY_STORE, fromConfig);
    return fromConfig;
  }
  return '';
}
function hasPIN()         { return !!getStoredPIN(); }
function initPINStatus()  {
  const lbl = document.getElementById('pin-status-label');
  if(lbl) lbl.textContent = hasPIN() ? '✅ PIN configurado — toca para cambiar' : 'PIN no configurado';
  const delBtn = document.getElementById('btn-delete-pin');
  if(delBtn) delBtn.style.display = hasPIN() ? 'block' : 'none';
}

function showPINLock(mode='unlock') {
  _pinMode = mode;
  _pinBuffer = '';
  updatePINDots('pin-dots', 0);
  const sub = document.getElementById('pin-lock-sub');
  if(sub) sub.textContent = 'Ingresa tu PIN para continuar';
  document.getElementById('pin-lock-screen').classList.add('active');
}
function hidePINLock() {
  document.getElementById('pin-lock-screen').classList.remove('active');
  _pinBuffer = '';
}

function pinKey(k) {
  if(_pinBuffer.length >= 6) return;
  _pinBuffer += k;
  haptic && haptic('light');
  updatePINDots('pin-dots', _pinBuffer.length);
  if(_pinBuffer.length === 6) setTimeout(()=> validatePIN(_pinBuffer), 80);
}
function pinDel() {
  _pinBuffer = _pinBuffer.slice(0,-1);
  updatePINDots('pin-dots', _pinBuffer.length);
}
function updatePINDots(prefix, count, error=false) {
  for(let i=0;i<6;i++){
    const d = document.getElementById((prefix==='pin-dots'?'pd':'psd')+i);
    if(!d) continue;
    d.classList.toggle('filled', i < count);
    d.classList.toggle('error', error && i < count);
  }
}
function validatePIN(entered) {
  const stored = getStoredPIN();
  if(entered === stored) {
    hidePINLock();
    resetAutoLock();
    haptic && haptic('success');
  } else {
    updatePINDots('pin-dots', 6, true);
    const sub = document.getElementById('pin-lock-sub');
    if(sub) sub.textContent = '❌ PIN incorrecto — intenta de nuevo';
    haptic && haptic('error');
    setTimeout(()=>{ _pinBuffer=''; updatePINDots('pin-dots',0); if(sub) sub.textContent='Ingresa tu PIN para continuar'; }, 1000);
  }
}
async function pinBiometric() {
  try {
    await doBiometricLogin();
    hidePINLock();
  } catch(e) {
    toast('Biométrico no disponible, usa PIN','err');
  }
}
function pinForgot() {
  hidePINLock();
  // Show login screen
  localStorage.removeItem(PIN_KEY_STORE);
  if(typeof logoutUser === 'function') logoutUser();
}

// PIN Setup
function openPINSetup() {
  _pinFirst = '';
  _pinBuffer = '';
  updatePINDots('pin-setup', 0);
  document.getElementById('modal-pin-setup').classList.add('open');
  document.getElementById('pin-setup-sub').textContent = 'Elige un PIN de 6 dígitos';
  lockScroll();
  initPINStatus();
}
function closePINSetup() {
  document.getElementById('modal-pin-setup').classList.remove('open');
  _pinFirst = '';
  _pinBuffer = '';
  unlockScroll();
}
function closePINSetupIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-pin-setup')) closePINSetup();
}
function pinSetupKey(k) {
  if(_pinBuffer.length >= 6) return;
  _pinBuffer += k;
  haptic && haptic('light');
  updatePINDots('pin-setup', _pinBuffer.length);
  if(_pinBuffer.length === 6) setTimeout(()=>confirmPINSetup(), 80);
}
function pinSetupDel() {
  _pinBuffer = _pinBuffer.slice(0,-1);
  updatePINDots('pin-setup', _pinBuffer.length);
}
function confirmPINSetup() {
  if(!_pinFirst) {
    _pinFirst = _pinBuffer;
    _pinBuffer = '';
    updatePINDots('pin-setup', 0);
    document.getElementById('pin-setup-sub').textContent = 'Confirma tu PIN';
  } else {
    if(_pinBuffer === _pinFirst) {
      localStorage.setItem(PIN_KEY_STORE, _pinBuffer);
      // Backup en CONFIG para persistir vía Supabase
      if (typeof CONFIG !== 'undefined') CONFIG._pinHash = _pinBuffer;
      if (typeof sbSaveConfig === 'function') sbSaveConfig().catch(() => {});
      toast('🔐 PIN configurado correctamente');
      initPINStatus();
      closePINSetup();
      haptic && haptic('success');
    } else {
      updatePINDots('pin-setup', 6, true);
      document.getElementById('pin-setup-sub').textContent = '❌ Los PINs no coinciden — empieza de nuevo';
      setTimeout(()=>{ _pinFirst=''; _pinBuffer=''; updatePINDots('pin-setup',0); document.getElementById('pin-setup-sub').textContent='Elige un PIN de 6 dígitos'; }, 1200);
    }
  }
}
function deletePIN() {
  localStorage.removeItem(PIN_KEY_STORE);
  if (typeof CONFIG !== 'undefined') delete CONFIG._pinHash;
  if (typeof sbSaveConfig === 'function') sbSaveConfig().catch(() => {});
  toast('🗑 PIN eliminado');
  initPINStatus();
  closePINSetup();
}

// ─── AUTO-LOCK ────────────────────────────────────────────
const AUTOLOCK_KEY = 'fin_autolock';
const AUTOLOCK_MS  = 5 * 60 * 1000; // 5 min

function toggleAutoLock() {
  const cb = document.getElementById('autolock-toggle-cb');
  const enabled = cb ? cb.checked : false;
  localStorage.setItem(AUTOLOCK_KEY, enabled ? '1' : '0');
  toast(enabled ? '⏱ Auto-bloqueo activado (5 min)' : '⏱ Auto-bloqueo desactivado');
  if(enabled) resetAutoLock();
  else clearTimeout(_autoLockTimer);
}
function initAutoLock() {
  const enabled = localStorage.getItem(AUTOLOCK_KEY) === '1';
  const cb = document.getElementById('autolock-toggle-cb');
  if(cb) cb.checked = enabled;
  if(enabled) resetAutoLock();
  // Lock on visibility change
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden) { /* store timestamp */ localStorage.setItem('fin_last_active', Date.now()); }
    else {
      if(localStorage.getItem(AUTOLOCK_KEY) !== '1') return;
      const last = parseInt(localStorage.getItem('fin_last_active')||'0');
      if(Date.now() - last > AUTOLOCK_MS && hasPIN() && currentUser) showPINLock();
    }
  });
  // User activity resets timer
  ['click','keydown','touchstart','scroll'].forEach(ev=>{
    document.addEventListener(ev, resetAutoLock, {passive:true});
  });
}
function resetAutoLock() {
  if(localStorage.getItem(AUTOLOCK_KEY) !== '1') return;
  clearTimeout(_autoLockTimer);
  _autoLockTimer = setTimeout(()=>{
    if(hasPIN() && currentUser) showPINLock();
  }, AUTOLOCK_MS);
}

// Show PIN lock on app load if PIN exists and user is logged in
function checkPINOnLoad() {
  if(hasPIN() && currentUser) {
    const last = parseInt(localStorage.getItem('fin_last_active')||'0');
    const autolock = localStorage.getItem(AUTOLOCK_KEY) === '1';
    // If autolock and > 5 min since last active, show PIN
    if(autolock && Date.now()-last > AUTOLOCK_MS) showPINLock();
  }
  initAutoLock();
  initPINStatus();
}
setTimeout(checkPINOnLoad, 1500);

// ─── PUSH NOTIFICATIONS — SISTEMA COMPLETO ───────────────────────────
// Soporta: notificaciones locales (sin servidor) Y push remotas (con VAPID).
// Para activar push remotas: generar VAPID keys y configurar Cloudflare Worker.
// Instrucciones en: window.PUSH_SETUP_INFO
// ─────────────────────────────────────────────────────────────────────
const PUSH_DISMISSED_KEY = 'fin_push_dismissed';

// VAPID public key — generar en: https://vapidkeys.com/
// Pegar aquí la clave pública (empieza con BN...)
const VAPID_PUBLIC = 'BEVtdZtv-deqIPmc8QDJk3zCUKN4mrF8U0zNip_x2A5_KvvcdGoJgsEHppxrya26x6oPiHfV8vdOfkPxZqcC9DY';

// URL del Cloudflare Worker que envía las notificaciones
// Instrucciones de setup en window.PUSH_SETUP_INFO
const PUSH_WORKER_URL = 'https://finanzas-push.anthonymarte12.workers.dev';

window.PUSH_SETUP_INFO = `
╔══════════════════════════════════════════════════════╗
║  ACTIVAR PUSH NOTIFICATIONS SIN LA APP ABIERTA       ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  PASO 1 — Generar VAPID keys                         ║
║  Ir a: https://vapidkeys.com/                        ║
║  Guardar: publicKey y privateKey                     ║
║                                                      ║
║  PASO 2 — Crear tabla en Supabase                    ║
║  (SQL incluido en MisFinanzas2026_ESTADO_ACTUAL.txt) ║
║                                                      ║
║  PASO 3 — Crear Cloudflare Worker                    ║
║  (Código incluido en ESTADO_ACTUAL.txt)              ║
║                                                      ║
║  PASO 4 — Configurar en app-features.js              ║
║  VAPID_PUBLIC = 'tu-clave-publica'                   ║
║  PUSH_WORKER_URL = 'https://tu-worker.workers.dev'   ║
║                                                      ║
╚══════════════════════════════════════════════════════╝`;
setTimeout(() => console.info('%c🔔 Push Setup Info: window.PUSH_SETUP_INFO','color:#3fb950'), 2000);

async function initPushNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  // FIX-PUSH-UI: sincronizar el botón con el estado real del permiso al cargar
  const isGranted = Notification.permission === 'granted';
  setTimeout(() => _updatePushToggleUI(isGranted), 1500);
  if (isGranted) {
    setupPushSubscription();
    return;
  }
  if (Notification.permission === 'denied') {
    setTimeout(() => _updatePushToggleUI(false), 1500);
    return;
  }
  if (localStorage.getItem(PUSH_DISMISSED_KEY)) return;
  // Mostrar banner después de 10s (solo si el usuario está logueado)
  setTimeout(() => {
    const banner = document.getElementById('push-notif-banner');
    if (banner && currentUser) banner.style.display = 'flex';
  }, 10000);
}

function dismissPushBanner() {
  localStorage.setItem(PUSH_DISMISSED_KEY, '1');
  const banner = document.getElementById('push-notif-banner');
  if (banner) banner.style.display = 'none';
}

async function requestPushPermission() {
  const banner = document.getElementById('push-notif-banner');
  const result = await Notification.requestPermission();
  if (banner) banner.style.display = 'none';
  if (result === 'granted') {
    toast('🔔 Notificaciones activadas ✅', 'ok');
    setupPushSubscription();
    localStorage.setItem(PUSH_DISMISSED_KEY, '1');
  } else {
    toast('Notificaciones denegadas. Actívalas en Ajustes del navegador.', 'err');
    localStorage.setItem(PUSH_DISMISSED_KEY, '1');
  }
}

async function setupPushSubscription() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) { schedulePushReminders(); return; }

    // Intentar subscripción VAPID si hay clave configurada
    if (VAPID_PUBLIC) {
      try {
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const appServerKey = _urlBase64ToUint8Array(VAPID_PUBLIC);
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });
        }
        // Guardar subscripción en Supabase para envíos remotos
        if (sub && currentUser && window.sb) {
          const subJSON = sub.toJSON();
          await sb.from('push_subscriptions').upsert({
            user_id:   currentUser.id,
            email:     currentUser.email,
            endpoint:  subJSON.endpoint,
            p256dh:    subJSON.keys?.p256dh || '',
            auth:      subJSON.keys?.auth   || '',
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
          console.log('[Push] ✅ Subscripción guardada en Supabase');
        }
      } catch(vapidErr) {
        console.warn('[Push] VAPID subscription failed, using local only:', vapidErr.message);
      }
    }
    // Siempre programar recordatorios locales
    schedulePushReminders();
  } catch(e) { console.warn('[Push] Setup error:', e.message); }
}

// Helper: convertir VAPID key de base64url a Uint8Array
function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function schedulePushReminders() {
  checkRecurrentesToday(true);
}

// Enviar notificación local (sin servidor, funciona con app abierta/segundo plano)
function sendLocalNotification(title, body, tag='fin-notif', url='/') {
  if (Notification.permission !== 'granted') return;
  navigator.serviceWorker?.ready.then(reg => {
    reg.showNotification(title, {
      body, icon: '/icon-192.png', badge: '/icon-192.png',
      tag, data: { url }, vibrate: [100, 50, 100]
    });
  }).catch(() => {
    try { new Notification(title, { body, icon: '/icon-192.png', tag }); } catch(e) {}
  });
}

// Alias usado por código existente
window.sendNotification = sendLocalNotification;

// Activar/desactivar notificaciones desde Settings
window.togglePushFromSettings = async function() {
  if (!('Notification' in window)) { toast('Tu navegador no soporta notificaciones', 'err'); return; }
  if (Notification.permission === 'granted') {
    // Desactivar: cancelar subscripción
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    localStorage.setItem(PUSH_DISMISSED_KEY, '1');
    toast('🔕 Notificaciones desactivadas', 'ok');
    _updatePushToggleUI(false);
  } else {
    localStorage.removeItem(PUSH_DISMISSED_KEY);
    await requestPushPermission();
    // requestPushPermission ya muestra toast — solo actualizar UI
    const nowGranted = Notification.permission === 'granted';
    _updatePushToggleUI(nowGranted);
    if (nowGranted) setupPushSubscription();
  }
};

function _updatePushToggleUI(active) {
  const btn = document.getElementById('push-toggle-btn');
  if (btn) {
    btn.textContent = active ? '🔔 Activadas' : '🔕 Desactivadas';
    btn.style.color = active ? 'var(--green)' : 'var(--muted)';
  }
}

// ─── REALTIME SYNC ────────────────────────────────────────
let _realtimeChannel = null;
function initRealtimeSync() {
  if(!window.sb || !currentUser) return;
  try {
    _realtimeChannel = sb.channel('finanzas-pareja')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'movimientos'
      }, payload => {
        handleRealtimeChange(payload);
      })
      .subscribe((status) => {
        const dot = document.getElementById('realtime-dot');
        if(dot) {
          dot.classList.toggle('offline', status !== 'SUBSCRIBED');
          dot.title = status === 'SUBSCRIBED' ? 'Sincronizado en tiempo real' : 'Desconectado';
        }
      });
  } catch(e) { console.warn('Realtime:', e); }
}
function handleRealtimeChange(payload) {
  if(!payload?.new) return;
  const mov = payload.new;
  // Only process if it's from the other user
  if(mov.user_id === currentUser?.id) return;
  // Add to local data
  const month = mov.mes;
  if(month && EXCEL_DATA[month]) {
    const exists = EXCEL_DATA[month].transactions.find(t=>t.id===mov.id);
    if(!exists && !mov.deleted_at) {
      EXCEL_DATA[month].transactions.push({
        id: mov.id, desc: mov.descripcion, tipo: mov.tipo,
        cat: mov.cat, subcat: mov.subcat||'',
        amount: parseFloat(mov.amount)||0,
        amountBs: parseFloat(mov.amount_bs)||0,
        method: mov.method, date: mov.fecha,
        autor: mov.author || 'Otro usuario',
        cuenta_id: mov.cuenta_id
      });
      recalcMonth(month);
      if(month === currentMonth) {
        renderDashboard();
        updateHeroBalance();
      }
      // Notification
      const autor = mov.author || 'Tu pareja';
      sendLocalNotification(
        `💰 ${autor} registró un movimiento`,
        `${mov.descripcion} — $${parseFloat(mov.amount||0).toFixed(2)}`,
        'realtime-mov'
      );
      toast(`🔄 ${autor}: ${mov.descripcion} $${parseFloat(mov.amount||0).toFixed(2)}`, 'ok');
    }
  }
}
// recalcMonth definida arriba (línea ~4359) — NO duplicar aquí
// Init realtime after login
const _origOnAuthState = window.onAuthStateChange;
setTimeout(()=>{ if(currentUser) { initRealtimeSync(); initPushNotifications(); } }, 3000);

// ─── RECURRING TRANSACTIONS ───────────────────────────────
// RECURRENTES declarada como var global en globals-init.js — NO redeclarar aquí
const REC_KEY = 'fin_recurrentes_v2';

function loadRecurrentes() {
  // Batch-XX: cargadas desde Supabase en loadFromSupabase() via config_usuario.recurrentes
  // Fallback a localStorage si no hay datos de Supabase aún
  if (!RECURRENTES || RECURRENTES.length === 0) {
    try { RECURRENTES = JSON.parse(localStorage.getItem(REC_KEY)||'[]'); } catch(e){ RECURRENTES=[]; }
  }
}
function saveRecurrentes() {
  // Batch-XX: persistir en Supabase (dentro de config_usuario) Y en localStorage como fallback
  try { localStorage.setItem(REC_KEY, JSON.stringify(RECURRENTES)); } catch(e){}
  sbSaveConfig(); // persiste recurrentes[] en config_usuario.recurrentes
}
loadRecurrentes();

function openRecurrentes() {
  lockScroll();
  populateRecCatSelect();
  renderRecurrentesList();
  document.getElementById('modal-recurrentes').classList.add('open');
}
function closeRecurrentes() {
  unlockScroll();
  document.getElementById('modal-recurrentes').classList.remove('open');
}
function populateRecCatSelect() {
  const sel = document.getElementById('rec-cat');
  if(!sel) return;
  const tipo = document.getElementById('rec-tipo')?.value || 'Gasto';
  const cats = CONFIG?.categorias?.[tipo] || CONFIG?.categorias?.Gasto || [];
  sel.innerHTML = cats.map(c=>`<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
}
document.getElementById('rec-tipo')?.addEventListener('change', populateRecCatSelect);


function updateRecCats() {
  var tipo = (document.getElementById('rec-tipo')||{}).value || 'Gasto';
  var sel = document.getElementById('rec-cat');
  if(!sel) return;
  var cats = Object.keys((CONFIG&&CONFIG.categorias)||{});
  if(!cats.length) cats = ['Alimentación','Transporte','Salud','Educación','Entretenimiento','Hogar','Otros'];
  sel.innerHTML = cats.map(function(cat){ return '<option value="'+cat+'">'+cat+'</option>'; }).join('');
  updateRecSubcats();
}
function updateRecSubcats() {
  var cat = (document.getElementById('rec-cat')||{}).value || '';
  var sel = document.getElementById('rec-subcat');
  if(!sel) return;
  var subs = (CONFIG&&CONFIG.subcategorias&&CONFIG.subcategorias[cat])
           || (CONFIG&&CONFIG.categorias&&CONFIG.categorias[cat]) || [];
  sel.innerHTML = '<option value="">— opcional —</option>' +
    subs.map(function(s){ return '<option value="'+s+'">'+s+'</option>'; }).join('');
}
function saveRecurrente(editId=null) {
  const desc   = document.getElementById('rec-desc')?.value?.trim();
  const tipo   = document.getElementById('rec-tipo')?.value;
  const amount = parseFloat(document.getElementById('rec-amount')?.value)||0;
  const cat    = document.getElementById('rec-cat')?.value;
  const subcat = document.getElementById('rec-subcat')?.value || '';
  const method = document.getElementById('rec-method')?.value || 'Transferencia';
  const dia    = parseInt(document.getElementById('rec-dia')?.value)||1;
  const auto   = document.getElementById('rec-auto')?.value;
  if(!desc) { toast('Escribe una descripción','err'); return; }
  if(!amount || amount<=0) { toast('Monto debe ser mayor a 0','err'); return; }
  if(editId) {
    const idx = RECURRENTES.findIndex(r=>r.id===editId);
    if(idx>=0) {
      RECURRENTES[idx] = {...RECURRENTES[idx], desc, tipo, amount, cat, subcat, method, dia, auto};
      toast('✅ Recurrente actualizada');
    }
    document.getElementById('rec-save-btn').textContent='🔁 Guardar recurrente';
    document.getElementById('rec-save-btn').onclick = ()=>saveRecurrente();
    document.getElementById('rec-edit-id').value = '';
  } else {
    const rec = { id:'r'+Date.now(), desc, tipo, amount, cat, subcat, method, dia, auto, activa:true, created_at:new Date().toISOString() };
    RECURRENTES.push(rec);
    toast('✅ Recurrente guardada');
  }
  saveRecurrentes();
  // PASO 4 — Sugerir recordatorio automático al guardar recurrente
  if (!editId && window.NotifPanel) {
    const _dia = parseInt(document.getElementById('rec-dia')?.value)||1;
    const _nextDate = new Date();
    _nextDate.setDate(_dia);
    if (_dia < new Date().getDate()) _nextDate.setMonth(_nextDate.getMonth() + 1);
    NotifPanel.sugerirNotificacion({
      titulo: desc,
      descripcion: '$' + amount.toFixed(2) + ' · ' + cat,
      fechaInicio: _nextDate.toISOString(),
      diasRecurrencia: 30,
      referenciaId: 'r' + Date.now(),
      referenciaTipo: 'gasto_recurrente'
    });
  }
  ['rec-desc','rec-amount'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  renderRecurrentesList();
}

function editRecurrente(i) {
  const r = RECURRENTES[i];
  if(!r) return;
  document.getElementById('rec-desc').value = r.desc||'';
  document.getElementById('rec-tipo').value = r.tipo||'Gasto';
  document.getElementById('rec-amount').value = r.amount||'';
  document.getElementById('rec-dia').value = r.dia||1;
  document.getElementById('rec-auto').value = r.auto||'remind';
  if(r.method) { const m=document.getElementById('rec-method'); if(m) m.value=r.method; }
  populateRecCatSelect();
  setTimeout(()=>{
    if(r.cat) { document.getElementById('rec-cat').value=r.cat;
      // populate subcat
      const subSel=document.getElementById('rec-subcat');
      if(subSel && CONFIG?.subcategorias?.[r.cat]) {
        subSel.innerHTML=CONFIG.subcategorias[r.cat].map(s=>`<option value="${escHtml(s)}" ${s===r.subcat?'selected':''}>${escHtml(s)}</option>`).join('');
      }
    }
  }, 60);
  document.getElementById('rec-edit-id').value = r.id;
  document.getElementById('rec-save-btn').textContent = '✏️ Actualizar recurrente';
  document.getElementById('rec-save-btn').onclick = ()=>saveRecurrente(r.id);
  // Scroll to form
  document.getElementById('rec-desc').focus();
}

function renderRecurrentesList() {
  const container = document.getElementById('recurrentes-list');
  if(!container) return;
  if(!RECURRENTES.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.78rem;padding:20px">No hay transacciones recurrentes. Agrega una arriba.</div>';
    return;
  }
  const today = new Date().getDate();
  container.innerHTML = RECURRENTES.map((r,i)=>{
    const daysUntil = r.dia >= today ? r.dia - today : (28 - today + r.dia);
    const badgeCls  = daysUntil === 0 ? 'due' : daysUntil <= 3 ? 'soon' : 'ok';
    const badgeTxt  = daysUntil === 0 ? '¡Hoy!' : daysUntil === 1 ? 'Mañana' : `En ${daysUntil}d`;
    const isIncome  = r.tipo?.includes('Ingreso');
    const nextDate = (() => {
      const d = new Date(); d.setDate(r.dia);
      if(r.dia < new Date().getDate()) d.setMonth(d.getMonth()+1);
      return fmtDate(d.toISOString().slice(0,10));
    })();
    return `
      <div class="rec-item" style="flex-wrap:wrap">
        <div class="rec-item-icon">${(typeof getCatDisplayIcon==='function' ? getCatDisplayIcon(r.cat) : ([...(r.cat||'')][0]||'💳'))}</div>
        <div class="rec-item-info">
          <div class="rec-item-name">${escHtml(r.desc)}</div>
          <div class="rec-item-meta">
            📅 Día ${r.dia} (${nextDate}) · ${r.tipo}
            ${r.subcat?'· '+escHtml(r.subcat):''}
            ${r.method?'· '+escHtml(r.method):''}
            <span class="rec-badge ${badgeCls}" style="margin-left:4px">${badgeTxt}</span>
          </div>
          <div style="font-size:9px;color:var(--muted);margin-top:2px">${r.auto==='auto'?'🤖 Auto-registra el día '+r.dia:'🔔 Recordatorio el día '+r.dia}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <div class="rec-item-amount" style="color:${isIncome?'var(--green)':'var(--red)'}">
            ${isIncome?'+':'-'}$${r.amount.toFixed(2)}
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">
            ${daysUntil===0?`<button onclick="registerRecurrente(${i})" style="font-size:10px;background:var(--green);color:#000;border:none;border-radius:5px;padding:2px 7px;cursor:pointer;font-family:inherit">✓ Hoy</button>`:''}
            <button onclick="editRecurrente(${i})" style="font-size:10px;background:none;border:1px solid var(--blue);color:var(--blue);border-radius:5px;padding:2px 7px;cursor:pointer">✏️</button>
            <button onclick="deleteRecurrente(${i})" style="font-size:10px;background:none;border:1px solid var(--border);color:var(--muted);border-radius:5px;padding:2px 7px;cursor:pointer">🗑</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function deleteRecurrente(i) {
  RECURRENTES.splice(i,1);
  saveRecurrentes();
  renderRecurrentesList();
  toast('Recurrente eliminada');
}

function registerRecurrente(i) {
  const r = RECURRENTES[i];
  if(!r) return;
  openModal();
  setTimeout(()=>{
    document.getElementById('f-desc').value = r.desc;
    document.getElementById('f-tipo').value = r.tipo;
    document.getElementById('f-amount-usd').value = r.amount.toFixed(2);
    document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
    if(typeof onTipoChange==='function') onTipoChange();
    setTimeout(()=>{ if(r.cat) document.getElementById('f-cat').value=r.cat; }, 80);
    closeRecurrentes();
    toast(`🔁 "${r.desc}" cargado — revisa y guarda`);
  }, 300);
}

function checkRecurrentesToday(notify=false) {
  const today = new Date().getDate();
  RECURRENTES.filter(r=>r.dia===today && r.activa).forEach(r=>{
    if(r.auto==='auto') {
      // Auto-register silently
      const mov = {
        id:'n'+Date.now()+'_rec',
        desc: r.desc+' (auto)', tipo:r.tipo, cat:r.cat, subcat:'',
        amount: r.amount, amountBs: r.amount*(rateBCV||1),
        method:'Transferencia', date:new Date().toISOString().slice(0,10),
        author: getDisplayName(currentUser?.email)
      };
      if(EXCEL_DATA[currentMonth]) {
        const exists = EXCEL_DATA[currentMonth].transactions.find(t=>t.desc===mov.desc&&t.date===mov.date);
        if(!exists) {
          EXCEL_DATA[currentMonth].transactions.push(mov);
          recalcMonth(currentMonth);
          if(typeof sbSaveMovOrig==='function') sbSaveMovOrig(mov, currentMonth, 0);
          if(notify) sendLocalNotification('🔁 Auto-registrado',`${r.desc} — $${r.amount.toFixed(2)}`,'rec-auto');
        }
      }
    } else if(notify) {
      sendLocalNotification('🔔 Recurrente pendiente',`${r.desc} — $${r.amount.toFixed(2)} vence hoy`,'rec-remind');
    }
  });
}
// Check recurrentes on load
setTimeout(()=>{ if(currentUser) checkRecurrentesToday(true); }, 4000);

// ─── PAREJA VIEW ─────────────────────────────────────────
function openPareja() {
  lockScroll();
  setParejaTab('all');
  document.getElementById('modal-pareja').classList.add('open');
}
function closePareja() { unlockScroll(); document.getElementById('modal-pareja').classList.remove('open'); }
function setParejaTab(tab) {
  ['all','anthony','isabel','stats'].forEach(t=>{
    document.getElementById('ptab-'+t)?.classList.toggle('active',t===tab);
  });
  renderParejaContent(tab);
}
function renderParejaContent(tab) {
  const content = document.getElementById('pareja-content');
  if(!content) return;
  // FIX-IX-3: Usa isAnthonyAuthor() / isIsabelAuthor() flexibles (definidos en USER_EMAILS_WHITELIST).
  // Reconocen: displayName ("Anthony Marte"), email crudo, y alias parciales.
  // t.author sin valor → 'general' (datos Excel sin autor registrado).
  // 'general' solo aparece en tab ALL, nunca en tabs personales.
  const allTxns = [];
  Object.values(EXCEL_DATA).forEach(md=>{
    (md.transactions||[]).forEach(t=>{
      const rawAuthor = (t.author||t.autor||t.user_email||'').trim();
      const isAnthony = isAnthonyAuthor(rawAuthor);
      const isIsabel  = isIsabelAuthor(rawAuthor);
      const isGeneral = !isAnthony && !isIsabel;
      allTxns.push({...t, _isAnthony: isAnthony, _isIsabel: isIsabel, _isGeneral: isGeneral, _authorResolved: rawAuthor||'general'});
    });
  });
  allTxns.sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  if(tab==='stats') {
    const anthonyTxns = allTxns.filter(t=>t._isAnthony);
    const isabelTxns  = allTxns.filter(t=>t._isIsabel);
    const aGastos = anthonyTxns.filter(t=>t.tipo==='Gasto').reduce((s,t)=>s+t.amount,0);
    const iGastos = isabelTxns.filter(t=>t.tipo==='Gasto').reduce((s,t)=>s+t.amount,0);
    const aIngs   = anthonyTxns.filter(t=>['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)).reduce((s,t)=>s+t.amount,0);
    const iIngs   = isabelTxns.filter(t=>['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)).reduce((s,t)=>s+t.amount,0);
    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:var(--surface2);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:700">👨 ANTHONY</div>
          <div style="font-size:12px;color:var(--green);margin-bottom:2px">Ingresos: ${fmt(aIngs)}</div>
          <div style="font-size:12px;color:var(--red);margin-bottom:2px">Gastos: ${fmt(aGastos)}</div>
          <div style="font-size:11px;color:var(--muted)">${anthonyTxns.length} movimientos</div>
        </div>
        <div style="background:var(--surface2);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:700">👩 ISABEL</div>
          <div style="font-size:12px;color:var(--green);margin-bottom:2px">Ingresos: ${fmt(iIngs)}</div>
          <div style="font-size:12px;color:var(--red);margin-bottom:2px">Gastos: ${fmt(iGastos)}</div>
          <div style="font-size:11px;color:var(--muted)">${isabelTxns.length} movimientos</div>
        </div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:14px;margin-top:10px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-weight:700">💑 TOTAL PAREJA</div>
        <div style="font-size:18px;font-weight:800;color:var(--green)">${fmt(aIngs+iIngs)} ingresos combinados</div>
        <div style="font-size:14px;color:var(--red);margin-top:4px">${fmt(aGastos+iGastos)} gastos combinados</div>
      </div>`;
    return;
  }
  // Tab anthony → solo sus movimientos; isabel → solo los suyos; all → todos
  const filtered = tab==='anthony' ? allTxns.filter(t=>t._isAnthony)
                 : tab==='isabel'  ? allTxns.filter(t=>t._isIsabel)
                 : allTxns; // "todo" incluye general + ambos
  const recent = filtered.slice(0,50);
  if(!recent.length) {
    const name = tab==='anthony' ? 'Anthony' : tab==='isabel' ? 'Isabel' : null;
    content.innerHTML = name
      ? `<div style="color:var(--muted);text-align:center;padding:24px 16px;font-size:.78rem;line-height:1.6">
           <div style="font-size:1.4rem;margin-bottom:8px">📋</div>
           <div style="font-weight:700;color:var(--text);margin-bottom:6px">Sin movimientos de ${name}</div>
           <div>Los movimientos registrados con la cuenta de ${name} aparecerán aquí automáticamente.</div>
           <div style="margin-top:8px;font-size:.72rem;color:#58a6ff">Registra un movimiento con tu sesión activa para verlo aquí.</div>
         </div>`
      : '<div style="color:var(--muted);text-align:center;padding:20px;font-size:.78rem">Sin movimientos registrados aún</div>';
    return;
  }
  content.innerHTML = recent.map(t=>{
    const isPos = ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo);
    const authorColor = t._isGeneral ? '#8b949e' : t._isAnthony ? '#58a6ff' : '#bc8cff';
    const authorName  = t._isGeneral ? 'General' : t._isAnthony ? 'Anthony' : 'Isabel';
    return `
      <div class="pareja-txn">
        <div class="pareja-author-dot" style="background:${authorColor}"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.desc)}</div>
          <div style="font-size:10px;color:var(--muted);display:flex;gap:6px">
            <span class="pareja-author-label" style="background:${authorColor}22;color:${authorColor}">${authorName}</span>
            <span>${t.date||''} · ${t.cat||''}</span>
          </div>
        </div>
        <div style="font-size:13px;font-weight:700;color:${isPos?'var(--green)':'var(--red)'};flex-shrink:0">${isPos?'+':'-'}${window._hideAmounts ? '••••' : '$'+(t.amount?.toFixed(2)||'0.00')}</div>
      </div>`;
  }).join('');
}

// ─── BCV HISTORY ─────────────────────────────────────────
const BCV_HISTORY_KEY = 'fin_bcv_history';
function logBCVRate() {
  if(!rateBCV || rateBCV <= 0) return;
  const today = new Date().toISOString().slice(0, 10);
  // localStorage (historial visual local)
  try {
    const hist = JSON.parse(localStorage.getItem(BCV_HISTORY_KEY)||'[]');
    const last = hist[hist.length-1];
    if(!last || last.date !== today) {
      hist.push({ date: today, rate: rateBCV });
      if(hist.length > 90) hist.shift();
      localStorage.setItem(BCV_HISTORY_KEY, JSON.stringify(hist));
    }
  } catch(e) {}
  // Batch-XX: guardar en Supabase para tasas históricas compartidas
  if (sb && currentUser) sbSaveTasaHistorica(today);
}
setTimeout(logBCVRate, 2500);
function openBCVHistory() {
  lockScroll();
  document.getElementById('modal-bcv-history').classList.add('open');
  renderBCVMovimientos('all');
}
function closeBCVHistory() { unlockScroll(); document.getElementById('modal-bcv-history').classList.remove('open'); }

// Batch-XX: Historial en Bolívares — todos los movimientos convertidos a Bs
function renderBCVMovimientos(filtro) {
  // Actualizar botones filtro
  ['all','ing','gas'].forEach(f => {
    const btn = document.getElementById('bcv-filter-' + f);
    if(btn) {
      const active = f === filtro;
      btn.style.borderColor = active ? '#e3b341' : '#30363d';
      btn.style.color = active ? '#e3b341' : '#8b949e';
    }
  });
  const list = document.getElementById('bcv-history-list');
  const statsRow = document.getElementById('bcv-stats-row');
  // Recopilar todos los movimientos de todos los meses
  let allTxns = [];
  activeMonths.forEach(m => {
    (EXCEL_DATA[m]?.transactions || []).forEach(t => {
      allTxns.push({ ...t, mes: m });
    });
  });
  // Filtrar
  if (filtro === 'ing') allTxns = allTxns.filter(t => ['Ingreso Fijo','Ingreso Variable'].includes(t.tipo));
  if (filtro === 'gas') allTxns = allTxns.filter(t => t.tipo === 'Gasto');
  // Ordenar por fecha descendente
  allTxns.sort((a,b) => (b.date||'').localeCompare(a.date||''));
  // Totales para stats row
  const totalBsIng = allTxns.filter(t=>['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)).reduce((s,t)=>s+(t.amountBs||t.amount*(rateBCV||1)),0);
  const totalBsGas = allTxns.filter(t=>t.tipo==='Gasto').reduce((s,t)=>s+(t.amountBs||t.amount*(rateBCV||1)),0);
  if(statsRow) statsRow.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <div style="background:#0d2137;border-radius:8px;padding:8px 12px;flex:1;min-width:110px">
        <div style="font-size:.6rem;color:#484f58">Total Ingresos Bs</div>
        <div style="font-size:.85rem;font-weight:700;color:#3fb950">${window._hideAmounts ? 'Bs ••••••' : 'Bs '+totalBsIng.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      </div>
      <div style="background:#1a0d0d;border-radius:8px;padding:8px 12px;flex:1;min-width:110px">
        <div style="font-size:.6rem;color:#484f58">Total Gastos Bs</div>
        <div style="font-size:.85rem;font-weight:700;color:#f85149">${window._hideAmounts ? 'Bs ••••••' : 'Bs '+totalBsGas.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      </div>
    </div>`;
  if (!allTxns.length) {
    list.innerHTML = '<div style="color:var(--muted);font-size:.75rem;text-align:center;padding:20px">Sin movimientos registrados aún.</div>';
    return;
  }
  // Agrupar por mes
  const byMes = {};
  allTxns.forEach(t => { if(!byMes[t.mes]) byMes[t.mes] = []; byMes[t.mes].push(t); });
  list.innerHTML = Object.entries(byMes).map(([mes, txns]) => {
    const totalMesBs = txns.reduce((s,t)=>s+(t.amountBs||t.amount*(rateBCV||1)),0);
    const rows = txns.map(t => {
      const bs = t.amountBs || (t.amount * (rateBCV||1));
      const isIng = ['Ingreso Fijo','Ingreso Variable'].includes(t.tipo);
      const color = isIng ? '#3fb950' : (t.tipo==='Gasto' ? '#f85149' : '#8b949e');
      const sign  = isIng ? '+' : '-';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #21262d;font-size:.72rem">
        <div>
          <div style="color:#e6edf3">${t.desc || t.tipo}</div>
          <div style="color:#484f58;font-size:.6rem">${t.date||''} · ${t.tipo} · ${window._hideAmounts ? '••••' : '$'+(t.amount||0).toFixed(2)}</div>
        </div>
        <div style="color:${color};font-weight:700;flex-shrink:0">${sign}${window._hideAmounts ? 'Bs ••••••' : 'Bs '+bs.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:14px">
      <div style="font-size:.72rem;font-weight:700;color:#e3b341;padding:6px 0;border-bottom:1px solid #30363d;display:flex;justify-content:space-between">
        <span>📅 ${mes}</span>
        <span>Bs ${window._hideAmounts ? '••••••' : totalMesBs.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
      </div>
      ${rows}
    </div>`;
  }).join('');
}

// renderBCVChart alias para compatibilidad
function renderBCVChart() { renderBCVMovimientos('all'); }

// ─── RECEIPT SCANNER ─────────────────────────────────────
let _receiptData = null;
function openReceiptScanner() { lockScroll(); document.getElementById('modal-receipt-scanner').classList.add('open'); }
function closeReceiptScanner() {
  unlockScroll();
  document.getElementById('modal-receipt-scanner').classList.remove('open');
  const img=document.getElementById('receipt-preview-img');
  if(img){img.style.display='none';img.src='';}
  document.getElementById('receipt-status').textContent='';
  document.getElementById('receipt-result').style.display='none';
  document.getElementById('receipt-use-btn').style.display='none';
  _receiptData=null;
}

async function processReceipt(event) {
  const file = event.target.files?.[0];
  if(!file) return;
  const img = document.getElementById('receipt-preview-img');
  const status = document.getElementById('receipt-status');
  const result = document.getElementById('receipt-result');
  const useBtn = document.getElementById('receipt-use-btn');
  // Show preview
  const reader = new FileReader();
  reader.onload = async (e) => {
    img.src = e.target.result;
    img.style.display='block';
    document.getElementById('receipt-upload-zone').style.display='none';
    if(status) status.textContent='🤖 Analizando imagen con IA...';
    // Send to Groq (vision — base64 image)
    try {
      const base64 = e.target.result.split(',')[1];
      const mediaType = file.type || 'image/jpeg';
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+getGroqKey()},
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages:[{
            role:'user',
            content:[
              {type:'image_url',image_url:{url:`data:${mediaType};base64,${base64}`}},
              {type:'text',text:`Eres un extractor experto de recibos y facturas venezolanas y latinoamericanas. Analiza con MÁXIMA precisión.

REGLAS:
1. MONEDA: Si el monto está en Bs/BsF/VES/Bolívares, divide entre ${rateBCV||431} para obtener USD. Si hay ambas monedas, usa el monto USD directamente.
2. MONTO: Extrae el TOTAL FINAL (busca "Total", "Total a pagar", "Monto total", "Gran total"). IGNORA subtotales. Si hay varios, toma el que diga "total".
3. FECHA: Convierte siempre a YYYY-MM-DD. Si no hay fecha, usa ${new Date().toISOString().slice(0,10)}.
4. COMERCIO: Nombre real del negocio. Si hay RIF/NIF venezolano (J-XXXXXXX o V-XXXXXXX), inclúyelo en desc entre paréntesis.
5. MÉTODO: Detecta pago móvil, transferencia, efectivo, tarjeta, Zelle. Mapea a: "Pago móvil","Transferencia","Efectivo $","Tarjeta","Zelle".
6. CATEGORÍA (elige UNA): Antojos=restaurante/café/comida rápida, ComidaMercado=supermercado/abasto, Transporte=gasolina/taxi/uber, CuidadoPersonal=peluquería/farmacia/cosméticos, Casa=ferretería/condominio/internet, Suscripciones=streaming/apps, Salud=clínica/médico/laboratorio, Educacion=colegio/cursos, Otros=resto.
7. SUBCATEGORÍA: Tipo de producto/servicio específico (ej: "Almuerzo ejecutivo", "Gasolina 95 oct", "Consulta médica").

Responde ÚNICAMENTE con JSON válido sin backticks: {"desc":"Nombre Comercio","amount":número_USD,"date":"YYYY-MM-DD","tipo":"Gasto","cat":"categoría","subcat":"subcategoría","method":"método","currency_detected":"BS|USD","original_amount":número_original}`}
            ]
          }],
          max_tokens:350
        })
      });
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content||'';
      const clean = text.split('```json').join('').split('```').join('').trim();
      _receiptData = JSON.parse(clean);
      if(status) status.textContent='✅ Datos extraídos del recibo';
      result.style.display='block';
      result.innerHTML = `
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Datos detectados:</div>
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">${escHtml(_receiptData.desc||'—')}</div>
        <div style="font-size:13px;color:var(--red);margin-bottom:2px">$${parseFloat(_receiptData.amount||0).toFixed(2)} USD ${_receiptData.original_amount && _receiptData.currency_detected==='BS' ? '<span style="color:#8b949e;font-size:11px">(Bs '+parseFloat(_receiptData.original_amount).toFixed(2)+')</span>' : ''}</div>
        <div style="font-size:11px;color:var(--muted)">${_receiptData.date?fmtDate(_receiptData.date):''} · ${_receiptData.tipo||'Gasto'} · ${_receiptData.cat||''} ${_receiptData.subcat?'› '+_receiptData.subcat:''}</div>`;
      useBtn.style.display='block';
    } catch(err) {
      console.warn('Receipt scanner error:', err);
      if(status) status.textContent='⚠️ No se pudieron extraer datos automáticamente.';
      toast('📸 No detecté datos en la imagen. Llena el formulario manualmente.', 'warn');
      result.style.display='none';
      useBtn.style.display='none';
    }
  };
  reader.readAsDataURL(file);
  event.target.value='';
}

function applyReceiptData() {
  if(!_receiptData) return;
  closeReceiptScanner();
  openModal();
  setTimeout(()=>{
    if(_receiptData.desc)   document.getElementById('f-desc').value=_receiptData.desc;
    if(_receiptData.amount) document.getElementById('f-amount-usd').value=parseFloat(_receiptData.amount).toFixed(2);
    if(_receiptData.date)   document.getElementById('f-date').value=_receiptData.date;
    const tipo = _receiptData.tipo || 'Gasto';
    document.getElementById('f-tipo').value = tipo;
    if(_receiptData.method) { const m=document.getElementById('f-method'); if(m) m.value=_receiptData.method; }
    if(typeof onTipoChange==='function') onTipoChange();
    setTimeout(()=>{
      if(_receiptData.cat) { document.getElementById('f-cat').value=_receiptData.cat; onCatChange(); }
      setTimeout(()=>{
        if(_receiptData.subcat) { const s=document.getElementById('f-subcat'); if(s) s.value=_receiptData.subcat; }
      }, 80);
    }, 80);
    toast('📸 Recibo cargado — revisa y guarda');
    haptic && haptic('success');
  },300);
}

// ─── TRAVEL MODE ─────────────────────────────────────────
const TRAVEL_KEY='fin_travel_mode';
let _travelMode = null;

function initTravelMode() {
  try {
    const saved = localStorage.getItem(TRAVEL_KEY);
    if(saved) { _travelMode = JSON.parse(saved); applyTravelMode(); }
  } catch(e){}
}
function openTravelMode() {
  document.getElementById('modal-travel-mode').classList.add('open');
  lockScroll();
  const saved = _travelMode;
  if(saved) {
    document.getElementById('travel-currency-select').value = saved.currency;
    document.getElementById('travel-rate-input').value = saved.rate;
  }
}
function closeTravelMode() {
  document.getElementById('modal-travel-mode').classList.remove('open');
  unlockScroll();
}
function closeTravelModeIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-travel-mode')) closeTravelMode();
}
document.getElementById('travel-currency-select')?.addEventListener('change',()=>{
  const sel = document.getElementById('travel-currency-select').value;
  const lbl = document.getElementById('travel-cur-label');
  if(lbl) lbl.textContent = sel||'moneda';
});
function activateTravelMode() {
  const currency = document.getElementById('travel-currency-select').value;
  const rate     = parseFloat(document.getElementById('travel-rate-input').value)||0;
  if(!currency) { toast('Selecciona una moneda','err'); return; }
  if(!rate || rate<=0) { toast('Ingresa una tasa de cambio válida','err'); return; }
  _travelMode = { currency, rate };
  localStorage.setItem(TRAVEL_KEY, JSON.stringify(_travelMode));
  applyTravelMode();
  closeTravelMode();
  toast(`✈️ Modo viaje activado: 1 USD = ${rate} ${currency}`, 'ok');
}

function updateTravelConversion() {
  const row = document.getElementById('travel-conv-row');
  const lbl = document.getElementById('travel-conv-label');
  if (!row || !lbl) return;
  if (!_travelMode || !_travelMode.rate || !_travelMode.currency) { row.style.display = 'none'; return; }
  const usd = parseFloat(document.getElementById('f-amount-usd')?.value) || 0;
  if (usd <= 0) { row.style.display = 'none'; return; }
  const converted = (usd * _travelMode.rate).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2});
  lbl.textContent = `$${usd.toFixed(2)} USD = ${converted} ${_travelMode.currency} (tasa: ${_travelMode.rate})`;
  row.style.display = 'block';
}
function disableTravelMode() {
  _travelMode = null;
  localStorage.removeItem(TRAVEL_KEY);
  const banner = document.getElementById('travel-mode-banner');
  if(banner) banner.classList.remove('active');
  const lbl = document.getElementById('travel-mode-label');
  if(lbl) lbl.textContent = 'Inactivo — toca para configurar';
  closeTravelMode();
  toast('✈️ Modo viaje desactivado');
}
function applyTravelMode() {
  if(!_travelMode) return;
  const banner = document.getElementById('travel-mode-banner');
  if(banner) banner.classList.add('active');
  const nameEl = document.getElementById('travel-currency-name');
  const rateEl = document.getElementById('travel-rate-display');
  if(nameEl) nameEl.textContent = _travelMode.currency;
  if(rateEl) rateEl.textContent = `1 USD = ${_travelMode.rate} ${_travelMode.currency}`;
  const lbl = document.getElementById('travel-mode-label');
  if(lbl) lbl.textContent = `✅ Activo: ${_travelMode.currency} @ ${_travelMode.rate}`;
}
initTravelMode();

// ─── CATEGORY ICON EDITOR ─────────────────────────────────
// Legacy stubs — sin eliminar para no romper referencias externas
const CAT_ICONS_KEY = 'fin_cat_icons_v2';
let _catIconOverrides = {};
function loadCatIconOverrides() { /* legacy no-op */ }
function saveCatIconOverrides() { /* legacy no-op */ }

// Fuente de verdad: CONFIG.catEmojis (sincronizado a Supabase)
function getCatDisplayIcon(cat) {
  if (!cat) return '';
  // 1. Override explícito guardado por usuario — nombre exacto
  if (CONFIG?.catEmojis?.[cat]) return CONFIG.catEmojis[cat];
  // 2. Emoji concatenado al nombre (ej: "🏠Casa" o "🏠 Casa")
  if (typeof splitEmojiName === 'function') {
    const { emoji } = splitEmojiName(cat);
    if (emoji) return emoji;
  }
  // 3. Buscar en catEmojis con nombre limpio (sin emoji prefijado)
  if (CONFIG?.catEmojis) {
    const cleanCat = cat.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim();
    if (cleanCat && CONFIG.catEmojis[cleanCat]) return CONFIG.catEmojis[cleanCat];
    // 4. Buscar insensible a mayúsculas
    const lowerCat = cleanCat.toLowerCase();
    const found = Object.keys(CONFIG.catEmojis).find(k =>
      k.toLowerCase() === lowerCat ||
      k.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u,'').trim().toLowerCase() === lowerCat
    );
    if (found) return CONFIG.catEmojis[found];
  }
  // 5. Sin emoji → retornar vacío (no mostrar primera letra)
  return '';
}

let _catIconActiveTab = 'categorias'; // 'categorias' | 'tipos' | 'subcategorias'
let _catIconEditingItem = null;

function openCatIcons() {
  _catIconActiveTab = 'categorias';
  renderCatIconsList();
  document.getElementById('modal-cat-icons').classList.add('open');
  lockScroll();
}
function closeCatIcons() {
  document.getElementById('modal-cat-icons').classList.remove('open');
  unlockScroll();
}
function closeCatIconsIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-cat-icons')) closeCatIcons();
}

function setCatIconTab(tab) {
  _catIconActiveTab = tab;
  ['categorias','tipos','subcategorias'].forEach(t => {
    const btn = document.getElementById('ci-tab-' + t);
    if (!btn) return;
    const active = t === tab;
    btn.style.background    = active ? 'var(--green,#238636)' : 'var(--surface2,#21262d)';
    btn.style.color         = active ? '#fff' : 'var(--muted,#8b949e)';
    btn.style.borderColor   = active ? 'var(--green,#238636)' : 'var(--border,#30363d)';
  });
  _renderCatIconItems();
}

function renderCatIconsList() {
  const list = document.getElementById('cat-icons-list');
  if (!list) return;
  list.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:14px">
      <button id="ci-tab-categorias" onclick="setCatIconTab('categorias')"
        style="flex:1;padding:7px 4px;border:1px solid var(--green,#238636);border-radius:8px;background:var(--green,#238636);color:#fff;font-size:.72rem;cursor:pointer;font-family:inherit;font-weight:600">
        📂 Categorías
      </button>
      <button id="ci-tab-tipos" onclick="setCatIconTab('tipos')"
        style="flex:1;padding:7px 4px;border:1px solid var(--border,#30363d);border-radius:8px;background:var(--surface2,#21262d);color:var(--muted,#8b949e);font-size:.72rem;cursor:pointer;font-family:inherit;font-weight:600">
        🏷️ Tipos
      </button>
      <button id="ci-tab-subcategorias" onclick="setCatIconTab('subcategorias')"
        style="flex:1;padding:7px 4px;border:1px solid var(--border,#30363d);border-radius:8px;background:var(--surface2,#21262d);color:var(--muted,#8b949e);font-size:.72rem;cursor:pointer;font-family:inherit;font-weight:600">
        🔖 Subcats
      </button>
    </div>
    <div id="ci-items-container"></div>`;
  _renderCatIconItems();
}

function _renderCatIconItems() {
  const container = document.getElementById('ci-items-container');
  if (!container || !CONFIG) return;

  let items = [];
  if (_catIconActiveTab === 'categorias') {
    items = [...new Set(Object.values(CONFIG.categorias || {}).flat())];
  } else if (_catIconActiveTab === 'tipos') {
    items = CONFIG.tipos || [];
  } else {
    items = [...new Set(Object.values(CONFIG.subcategorias || {}).flat())];
  }

  if (!items.length) {
    container.innerHTML = '<div style="color:var(--muted);font-size:.75rem;text-align:center;padding:20px">Sin elementos en esta sección</div>';
    return;
  }

  container.innerHTML = items.map(item => {
    // Separar emoji concatenado del nombre si aplica
    const split = typeof splitEmojiName === 'function' ? splitEmojiName(item) : { emoji: '', name: item };
    const displayName = split.name || item;
    const displayEmoji = getCatDisplayIcon(item);
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 6px;border-bottom:1px solid var(--border,#21262d)">
        <div style="font-size:1.6rem;width:36px;text-align:center;flex-shrink:0;line-height:1.2">${displayEmoji}</div>
        <div style="flex:1;font-size:.82rem;color:var(--text,#e6edf3);font-weight:500">${escHtml(displayName)}</div>
        <button data-ci-item="${escHtml(item)}" onclick="editCatIcon(this.dataset.ciItem)"
          style="background:var(--surface2,#21262d);border:1px solid var(--border,#30363d);color:var(--blue,#58a6ff);border-radius:7px;padding:5px 12px;font-size:.72rem;cursor:pointer;flex-shrink:0;font-family:inherit">
          ✏️ Editar
        </button>
      </div>`;
  }).join('');
}

function editCatIcon(item) {
  _catIconEditingItem = item;
  // Interceptar selectEmoji UNA vez para capturar la selección
  const _origSelect = window.selectEmoji;
  window.selectEmoji = function(emoji) {
    _origSelect.call(this, emoji); // cierra picker, escribe en input tmp
    if (_catIconEditingItem) {
      _applyIconEdit(_catIconEditingItem, emoji);
      _catIconEditingItem = null;
    }
    window.selectEmoji = _origSelect; // restaurar inmediatamente
  };
  openEmojiPicker('__cat-icon-tmp');
}

function _applyIconEdit(item, emoji) {
  if (!CONFIG.catEmojis) CONFIG.catEmojis = {};
  CONFIG.catEmojis[item] = emoji;
  // FIX-EMOJI-PERSIST: backup local para que al recargar no se pierda el emoji
  // (cubre el caso partner/Isabel cuyo sbSaveConfig escribe en su user_id
  //  pero loadFromSupabase lee del household owner)
  try { localStorage.setItem('fin_cat_emojis_local', JSON.stringify(CONFIG.catEmojis)); } catch(e) {}
  if (typeof sbSaveConfig === 'function') sbSaveConfig();
  _renderCatIconItems();
  toast('✅ Icono actualizado');
}

function resetCatIcons() {
  if (CONFIG.catEmojis) CONFIG.catEmojis = {};
  // FIX-EMOJI-PERSIST: limpiar también el backup local
  try { localStorage.removeItem('fin_cat_emojis_local'); } catch(e) {}
  if (typeof sbSaveConfig === 'function') sbSaveConfig();
  renderCatIconsList();
  toast('🔄 Iconos restablecidos');
}

// ─── CSV IMPORT ───────────────────────────────────────────
let _csvParsed = [];
let _csvMapped = [];

function openCSVImport()  { lockScroll(); document.getElementById('modal-csv-import').classList.add('open'); }
function closeCSVImport() { unlockScroll(); document.getElementById('modal-csv-import').classList.remove('open'); _csvParsed=[]; _csvMapped=[]; }

// Drag/drop
const dropZone = document.getElementById('csv-drop-zone');
dropZone?.addEventListener('dragover', e=>{ e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone?.addEventListener('dragleave', ()=>dropZone.classList.remove('dragover'));
dropZone?.addEventListener('drop', e=>{ e.preventDefault(); dropZone.classList.remove('dragover'); const f=e.dataTransfer.files[0]; if(f) loadCSVFileObj(f); });

function loadCSVFile(event) { const f=event.target.files?.[0]; if(f) loadCSVFileObj(f); }
function loadCSVFileObj(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    const lines = text.trim().split('\n').slice(0,100);
    _csvParsed = lines.map(l=>l.split(/[,;\t]/).map(c=>c.trim().replace(/^"|"$/g,'')));
    showCSVPreview();
    await mapCSVWithAI();
  };
  reader.readAsText(file, 'UTF-8');
}
function showCSVPreview() {
  const preview = document.getElementById('csv-preview');
  if(!preview || !_csvParsed.length) return;
  const rows = _csvParsed.slice(0,5);
  preview.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px">${_csvParsed.length} filas detectadas — primeras 5:</div>
    <div style="overflow-x:auto">
      <table class="csv-preview-table">
        ${rows.map((r,i)=>`<tr>${r.map(c=>`<${i===0?'th':'td'}>${escHtml(c)}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}
      </table>
    </div>`;
}
async function mapCSVWithAI() {
  const statusEl = document.getElementById('csv-ai-status');
  const actionsEl = document.getElementById('csv-actions');
  actionsEl.style.display = 'block';
  if(statusEl) statusEl.textContent='🤖 La IA está mapeando columnas...';
  try {
    const sample = _csvParsed.slice(0,5).map(r=>r.join(' | ')).join('\n');
    const cats = Object.values(CONFIG?.categorias||{}).flat().slice(0,20).join(', ');
    const headers = _csvParsed[0]||[];
    const isBancoVzla = headers.some(h=>/referencia/i.test(h)) && headers.some(h=>/debito|credito/i.test(h));
    const prompt = `Extracto bancario venezolano.\nColumnas: ${headers.join(' | ')}\nMuestra:\n${sample}\n\n${isBancoVzla?'FORMATO BANCO VZ: D/Débito=Gasto, C/Crédito=Ingreso. Fecha puede ser DD/MM/YYYY.':''}\n- Convierte DD/MM/YYYY → YYYY-MM-DD\n- Si Bs, divide entre ${rateBCV||431}\n- Categorías disponibles: ${cats}\n\nDevuelve SOLO JSON array (máx 50 items):\n[{\"desc\":\"nombre comercio\",\"amount\":monto_USD,\"date\":\"YYYY-MM-DD\",\"tipo\":\"Gasto|Ingreso Variable|Ingreso Fijo\",\"cat\":\"categoria\",\"subcat\":\"\",\"method\":\"Pago movil|Transferencia|Efectivo $|Tarjeta\"}]`;
    const raw = await groqCall(prompt, 'Eres un asistente de importación financiera. Devuelve SOLO JSON array válido.');
    const clean = raw.split('```json').join('').split('```').join('').trim();
    _csvMapped = JSON.parse(clean);
    if(statusEl) statusEl.textContent=`✅ ${_csvMapped.length} movimientos listos para importar`;
  } catch(e) {
    if(statusEl) statusEl.textContent='⚠️ Mapeo manual — la IA no pudo procesar. Importa con datos básicos.';
    _csvMapped = _csvParsed.slice(1).map((r,i)=>({
      desc: r[1]||r[0]||`Importado ${i+1}`,
      amount: parseFloat(r[2]||r[3]||'0')||0,
      date: new Date().toISOString().slice(0,10),
      tipo:'Gasto', cat:'🛸Otros'
    })).filter(m=>m.amount>0);
    if(statusEl) statusEl.textContent=`⚠️ ${_csvMapped.length} movimientos (mapeo básico)`;
  }
}
async function importCSV() {
  if(!_csvMapped.length) { toast('Nada que importar','err'); return; }
  const btn = document.getElementById('csv-import-btn');
  if(btn) btn.disabled=true;
  let count=0;
  for(const m of _csvMapped) {
    if(!m.amount||m.amount<=0) continue;
    const mov = {
      id:'n'+Date.now()+'_csv'+count,
      desc:m.desc||'Importado', tipo:m.tipo||'Gasto',
      cat:m.cat||'🛸Otros', subcat:'',
      amount:parseFloat(m.amount)||0,
      amountBs:(parseFloat(m.amount)||0)*(rateBCV||1),
      method:'Importado CSV',
      date:m.date||new Date().toISOString().slice(0,10),
      author:getDisplayName(currentUser?.email)
    };
    // Determine month
    const mArr=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const d=new Date(mov.date+'T12:00:00');
    const monthName=mArr[d.getMonth()];
    if(!EXCEL_DATA[monthName]) EXCEL_DATA[monthName]={transactions:[],ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{}};
    EXCEL_DATA[monthName].transactions.push(mov);
    recalcMonth(monthName);
    if(typeof sbSaveMovOrig==='function') await sbSaveMovOrig(mov, monthName, 0);
    count++;
  }
  renderDashboard();
  updateHeroBalance();
  toast(`📂 ${count} movimientos importados`);
  closeCSVImport();
  if(btn) btn.disabled=false;
}

// ─── HOOK onAuthChange to init all new features ──────────
const _veryFinalOnLogin = window.onUserLogin;
window.onUserLogin = function(...args) {
  if(_veryFinalOnLogin) _veryFinalOnLogin.apply(this,args);
  setTimeout(()=>{
    initRealtimeSync();
    initPushNotifications();
    checkRecurrentesToday(false);
    logBCVRate();
    checkPINOnLoad();
  }, 2000);

  // Precargar notificaciones programadas una vez que currentUser está listo
  setTimeout(async function() {
    var list = await loadNotificaciones();
    window._notifList = list;
    list.forEach(scheduleLocalNotif);
  }, 3000);
};


// ─── PULL-TO-REFRESH FIX ────────────────────────────────
// Prevent page reload / modal open when user pulls down to refresh
(function() {
  let _touchStartY = 0;
  let _touchStartTime = 0;
  document.addEventListener('touchstart', function(e) {
    _touchStartY = e.touches[0].clientY;
    _touchStartTime = Date.now();
  }, { passive: true });
  // Override any pull-to-refresh that triggers openModal
  const _origPullHandler = window._pullToRefreshHandler;
  window._isPullToRefresh = function(e) {
    const dy = e.changedTouches[0].clientY - _touchStartY;
    const dt = Date.now() - _touchStartTime;
    return dy > 60 && dt < 500 && window.scrollY <= 0;
  };
})();


// ─── DATE FORMAT DD/MM/YYYY ──────────────────────────────
function fmtDate(iso) {
  if(!iso) return '';
  try {
    const parts = iso.split('T')[0].split('-');
    if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch(e){}
  return iso;
}
function todayISO() { return new Date().toISOString().slice(0,10); }
function todayDisplay() { return fmtDate(todayISO()); }


// ─── OFFLINE DETECTION ──────────────────────────────────
(function initOffline() {
  function updateOnlineStatus() {
    const banner = document.getElementById('offline-banner');
    if(!banner) return;
    if(!navigator.onLine) {
      banner.classList.add('visible');
    } else {
      banner.classList.remove('visible');
      // Try to flush offline queue
      if(typeof processOfflineQueue === 'function') processOfflineQueue();
    }
  }
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  // Check on load
  setTimeout(updateOnlineStatus, 1000);
})();


// ─── VOICE MANUAL SEND ──────────────────────────────────
// FIX-VOZ-SCOPE: variable compartida entre módulos
window._voicePendingData = window._voicePendingData || null;
async function processVoiceLanding(spoken) {
  // FIX-VOZ-STATUS: statusEl declarado al inicio — accesible en try Y catch
  const statusEl = document.getElementById('voice-status-text');
  if (statusEl) statusEl.textContent = '🤖 Interpretando con IA...';
  const d = EXCEL_DATA[currentMonth];
  const recentDesc = d ? (d.transactions||[]).slice(-20).map(t=>`${t.tipo}:${t.desc}:${t.cat}:${t.subcat||''}:$${t.amount}:${t.method||''}`).join('; ') : '';
  const cuentas = (CUENTAS||[]).map(c=>`${c.id}:${c.nombre}`).join(',') || '';
  const catsList = Object.entries(CONFIG?.categorias||{}).map(([tipo,cats])=>`${tipo}:[${cats.slice(0,5).join(',')}]`).join('; ');
  const today = new Date().toISOString().slice(0,10);
  const prompt = `El usuario dijo: "${spoken}"\nContexto de movimientos recientes: ${recentDesc.slice(0,400)}\nCuentas disponibles: ${cuentas}\nCategorías: ${catsList}\nFecha de hoy: ${today}\nExtrae el movimiento financiero. Responde SOLO con JSON:\n{"desc":"descripción","tipo":"Gasto|Ingreso Fijo|Ingreso Variable|Ahorro en efectivo","cat":"categoría","subcat":"subcategoría","amount":número_USD,"method":"Pago móvil|Transferencia|Efectivo $|Tarjeta|Otro","cuenta_id":"id o vacío","date":"${today}"}`;
  try {
    const raw = await groqCall(prompt, 'Eres asistente financiero. Responde SOLO JSON válido.');
    const clean = raw.split('```json').join('').split('```').join('').trim();
    window._voicePendingData = JSON.parse(clean);
    showVoicePreview(window._voicePendingData, spoken);
    if (statusEl) statusEl.textContent = '✅ Revisa y confirma';
    const preview = document.getElementById('voice-result-preview');
    const sendBtn = document.getElementById('voice-send-btn');
    const pd = window._voicePendingData;
    const isPos = pd.tipo?.includes('Ingreso');
    const cuentaNombre = pd.cuenta_id ? (CUENTAS||[]).find(c=>c.id===pd.cuenta_id)?.nombre||'' : '';
    if(preview) {
      preview.style.display = 'block';
      preview.innerHTML = `
        <div style="font-size:14px;font-weight:700;margin-bottom:4px">${escHtml(pd.desc||'—')}</div>
        <div style="font-size:12px;color:${isPos?'#3fb950':'#f85149'};margin-bottom:4px">${escHtml(pd.tipo)} · <strong>$${parseFloat(pd.amount||0).toFixed(2)}</strong></div>
        <div style="font-size:10px;color:#8b949e;display:flex;flex-wrap:wrap;gap:4px">
          <span>📂 ${escHtml(pd.cat||'')}${pd.subcat?' › '+escHtml(pd.subcat):''}</span>
          ${pd.method?`<span>• ${escHtml(pd.method)}</span>`:''}
          ${cuentaNombre?`<span>• 💳 ${escHtml(cuentaNombre)}</span>`:''}
        </div>`;
    }
    if(sendBtn) sendBtn.classList.add('visible');
    loadVoiceIAChips();
  } catch (e) {
    // FIX-VOZ-ERR: fallback claro — statusEl ya declarado, sin ReferenceError
    if (statusEl) statusEl.textContent = '⚠️ No pude interpretar. Toca "Escribir" para llenar manualmente.';
    ['voice-greeting-area','voice-examples-area'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'flex';
    });
    const waveEl = document.getElementById('voice-wave-anim');
    if (waveEl) waveEl.style.display = 'none';
    const previewArea = document.getElementById('voice-preview-area');
    if (previewArea) {
      const card = document.getElementById('voice-preview-card');
      if (card) card.innerHTML = '<div style="color:#e3b341;font-size:.8rem;text-align:center">⚠️ Error de IA: ' + (e.message||'sin conexión').slice(0,80) + '<br><span style="color:#8b949e;font-size:.72rem">Puedes escribir el movimiento manualmente</span></div>';
      previewArea.style.display = 'block';
    }
    console.warn('[processVoiceLanding]', e);
  }
}
function sendVoiceManual() {
  // FIX-VOZ-SCOPE: usar window._voicePendingData
  const s = window._voicePendingData;
  if(!s) { toast('No hay datos de voz para registrar', 'err'); return; }
  closeVoiceLanding();
  openModal();
  setTimeout(()=>{
    if(s.desc)   document.getElementById('f-desc').value = s.desc;
    if(s.tipo)   { document.getElementById('f-tipo').value = s.tipo; onTipoChange(); }
    if(s.amount) document.getElementById('f-amount-usd').value = parseFloat(s.amount).toFixed(2);
    if(s.method) { const mEl=document.getElementById('f-method'); if(mEl) mEl.value=s.method; }
    if(s.date)   document.getElementById('f-date').value = s.date;
    setTimeout(()=>{
      if(s.cat) { document.getElementById('f-cat').value = s.cat; onCatChange(); }
      setTimeout(()=>{
        if(s.subcat) { const scEl=document.getElementById('f-subcat'); if(scEl) scEl.value=s.subcat; }
        if(s.cuenta_id){ const cuEl=document.getElementById('f-cuenta'); if(cuEl) cuEl.value=s.cuenta_id; }
      }, 80);
    }, 80);
    toast('🎙️ Movimiento listo para guardar');
    haptic && haptic('success');
    window._voicePendingData = null;
  }, 300);
}
async function loadVoiceIAChips() {
  const container = document.getElementById('voice-ia-chips');
  if(!container || !EXCEL_DATA[currentMonth]) return;
  // Get most frequent recent transactions
  const txns = (EXCEL_DATA[currentMonth].transactions||[]).slice(-20);
  const freq = {};
  txns.forEach(t=>{ freq[t.desc] = (freq[t.desc]||0)+1; });
  const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,4).map(e=>e[0]);
  container.innerHTML = top.map(d=>`<button class="voice-chip" onclick="voiceLandingChip('${escHtml(d).replace(/'/g,"\'")}')" style="font-size:10px">${escHtml(d.slice(0,20))}</button>`).join('');
}


// ─── INFO CARDS — balance and gastos (#1) ───────────────
// FIX-4: showCardInfo duplicada renombrada a _showCardInfoV2 para evitar override
// REVERT: cambiar _showCardInfoV2 de vuelta a showCardInfo
function _showCardInfoV2(type) {
  const d = EXCEL_DATA[currentMonth];
  let title, body;
  if(type === 'balance') {
    const ing = d?.ingresos||0; const gst = d?.gastos||0; const adj = d?.ajustes||0;
    title = '📊 Balance Total';
    body = `El balance muestra el resultado neto de ${currentMonth}:
    
• <strong>Ingresos</strong>: $${ing.toFixed(2)} (sueldos, pagos recibidos)
• <strong>Gastos</strong>: -$${gst.toFixed(2)} (compras, servicios)
• <strong>Ajustes</strong>: ${adj>=0?'+':''}$${adj.toFixed(2)} (correcciones manuales)
<hr style="border-color:#21262d;margin:8px 0">
<strong>Balance = Ingresos - Gastos + Ajustes</strong>
= $${ing.toFixed(2)} - $${gst.toFixed(2)} + $${adj.toFixed(2)} = <span style="color:${(ing-gst+adj)>=0?'#3fb950':'#f85149'}">$${(ing-gst+adj).toFixed(2)}</span>

⚠️ Este balance refleja <strong>solo los movimientos registrados</strong> (ingresos, gastos y ajustes). <strong>No incluye</strong> el saldo inicial de cuentas/billeteras — eso se muestra separado en "Mis Saldos". Así el balance histórico se mantiene intacto independientemente de qué billeteras crees o edites.`;
  } else if(type === 'gastos') {
    const topCats = Object.entries(d?.cat_totals||{}).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const totalGastos=d?.gastos||0, totalIngs=d?.ingresos||0;
    const ratio=totalIngs>0?Math.round((totalGastos/totalIngs)*100):0;
    title = '💸 Gastos — '+currentMonth;
    body = '<strong style="color:#f85149">$'+totalGastos.toFixed(2)+'</strong> gastados en '+currentMonth+' — el <strong>'+ratio+'%</strong> de tus ingresos ($'+totalIngs.toFixed(2)+').<br><br><strong style="font-size:10px;color:#8b949e">TOP CATEGORÍAS</strong><br>'+topCats.map(([cat,amt])=>{const pct=totalGastos>0?Math.round((parseFloat(amt)/totalGastos)*100):0;return '• '+cat+': <span style="color:#f85149">$'+parseFloat(amt).toFixed(2)+'</span> <span style="color:#8b949e">('+pct+'%)</span>';}).join('<br>')+'<br><br><span style="font-size:11px;color:#8b949e">⚠️ Solo tipo <strong>Gasto</strong>. Ahorros, Ajustes y Préstamos no se incluyen. El saldo de billeteras tampoco afecta este número.</span>';
  } else if(type === 'ingresos') {
    const ahorros=d?.ahorros||0, ajustes=d?.ajustes||0;
    title = '💵 Ingresos — '+currentMonth;
    body = 'Ingresaste <strong style="color:#3fb950">$'+(d?.ingresos||0).toFixed(2)+'</strong> en '+currentMonth+'.<br><br>Incluye tipo <strong>Ingreso Fijo</strong> (ej: sueldo $400) e <strong>Ingreso Variable</strong> (ej: consulta extra $50).<br><br><span style="color:#8b949e;font-size:11px">Ahorros cochinito: $'+ahorros.toFixed(2)+' · Ajustes: '+(ajustes>=0?'+':'')+'$'+ajustes.toFixed(2)+'<br>Se contabilizan por separado y no afectan el total de ingresos.</span>';
  }
  // FIX-4+FIX-7: usar modal existente + renderIAText para limpiar tildes
  // REVERT: quitar renderIAText(), dejar _bodyEl.innerHTML = body
  const _modal = document.getElementById('modal-card-info');
  if (_modal) {
    const _titleEl = document.getElementById('card-info-title');
    const _bodyEl  = document.getElementById('card-info-body');
    if (_titleEl) _titleEl.textContent = title || '📊 Información';
    if (_bodyEl)  _bodyEl.innerHTML = typeof renderIAText === 'function' ? renderIAText(body || '') : (body || '');
    _modal.style.display = 'flex';
  } else {
    showConfirm(title, body, '📊');
  }
}


// ─── NAV ORDER PERSISTENCE FIX (#15) ───────────────────
// Apply saved nav order on every page load, not just on drag
const _origBuildNavBar = window.buildNavBar;
function ensureNavOrderApplied() {
  const savedOrder = CONFIG?.navOrder;
  if(!savedOrder || !savedOrder.length) return;
  const nav = document.getElementById('pwa-nav');
  if(!nav) return;
  // Reorder buttons per saved order
  savedOrder.forEach(id => {
    const btn = document.getElementById(id);
    if(btn && btn.parentElement === nav) nav.appendChild(btn);
  });
}
// Hook into renderDashboard
const _buildNavOrig2 = window.buildNavBar;
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(ensureNavOrderApplied, 500);
});


// ─── DELETE CUENTA FROM DASHBOARD (#8) ─────────────────
async function deleteCuentaFromDash(id) {
  const c = (CUENTAS||[]).find(x=>x.id===id);
  if(!c) return;
  const ok = await showConfirm('Eliminar cuenta', `¿Eliminar "${c.nombre}"? Los movimientos vinculados perderán la referencia a esta cuenta.`, '🗑️');
  if(!ok) return;
  if(typeof deleteCuenta === 'function') {
    await deleteCuenta(id);
  } else {
    CUENTAS = CUENTAS.filter(x=>x.id!==id);
    if(window.sb && currentUser) {
      await sb.from('cuentas').delete().eq('id',id);
    }
    renderWalletCards();
    toast('🗑 Cuenta eliminada', 'ok');
  }
}


// ─── INTELIGENCIA FINANCIERA — fix questions (#25) ──────
function openFinQuestion(questionKey) {
  const answers = {
    'que-es': {
      title: '🧠 ¿Qué es la Inteligencia Financiera?',
      body: `La inteligencia financiera es la capacidad de tomar decisiones informadas sobre tu dinero.

<strong>Ejemplo práctico:</strong> En lugar de gastar los $245 del mes en impulsos, la IA detecta que gastas $184 en transporte Yummy y te sugiere consolidar viajes para ahorrar ~$40/mes.

Esta sección analiza tus patrones de los últimos 3 meses para darte recomendaciones personalizadas.`
    },
    'como-funciona': {
      title: '⚙️ ¿Cómo funciona?',
      body: `El sistema usa tus últimos 217 movimientos para:

1. <strong>Detectar patrones</strong>: qué gastas, cuándo, y cuánto.
2. <strong>Calcular tendencias</strong>: si estás gastando más este mes vs el anterior.
3. <strong>Generar alertas</strong>: cuando una categoría supera tu presupuesto.
4. <strong>Sugerir acciones</strong>: basadas en hábitos frecuentes.

Ejemplo: Detectó que pagas Netflix $4/mes, Cashea $56/mes y Google One $2/mes. Total suscripciones: $62/mes.`
    },
    'score': {
      title: '📊 ¿Cómo se calcula el Score?',
      body: 'El Score va de 0-100:<br><br>• <strong>Ahorro/Ingreso</strong> (30pts): % que ahorras<br>• <strong>Control gastos</strong> (25pts): gastas vs ingresas<br>• <strong>Consistencia</strong> (20pts): registras regularmente<br>• <strong>Presupuesto</strong> (25pts): respetas límites<br><br><strong>Ejemplo real:</strong> Ingresaste $644, gastaste $503, ahorraste $120 → ratio 18.6% → score ~70/100.'
    },
    'presupuesto': {
      title: '💰 ¿Cómo funcionan los Presupuestos?',
      body: 'Límites mensuales por categoría.<br><br><strong>Ejemplo:</strong> Defines $200 para Comida y llevas $180 → barra al 90% con alerta.<br>Se configuran en Configuración → Presupuestos.'
    },
    'distribgastos': {
      title: '🍩 Distribución de Gastos',
      body: 'Muestra qué % de gastos va a cada categoría.<br><br><strong>Ejemplo Marzo:</strong> Otros 51.5%, Casa 15.7%, Cashea 11.1%...<br>Ayuda a ver de un vistazo dónde se va tu dinero.'
    },
    'patrimoniochart': {
      title: '📈 Patrimonio Neto',
      body: 'Suma el saldo de todas tus billeteras.<br><br><strong>Ejemplo:</strong> Zinli $1.57 + Venezuela $119.20 + Bancamiga $4.51 + Efectivo $104.46 = <strong>$229.74</strong>.<br>⚠️ Independiente del balance mensual.'
    },
    'semanal': {
      title: '📅 Análisis Semanal',
      body: 'Gastos e ingresos divididos por semana.<br><br><strong>Ejemplo:</strong> Semana 1: $120 (viaje Mochima), Semana 2: $45 (normal).<br>Detecta semanas caras y ayuda a planificar.'
    },
    'fondoemerg': {
      title: '🛡 Fondo de Emergencia',
      body: 'Recomendado: 3-6 meses de gastos.<br><br><strong>Ejemplo:</strong> Gastos promedio ~$514/mes → deberías tener $1,542 - $3,084 reservados como colchón ante imprevistos.'
    },
    'subcategastos': {
      title: '🔖 Gastos por Subcategoría',
      body: 'Desglose interno de cada categoría.<br><br><strong>Ejemplo:</strong> Transporte $184 → Yummy $160 + otros $24.<br>Identifica exactamente qué hábito dentro de cada categoría te cuesta más.'
    },
    'ingxtipo': {
      title: '💵 Ingresos por Tipo',
      body: 'Separa Ingreso Fijo (predecible) vs Variable (esporádico).<br><br><strong>Ejemplo:</strong> Fijo: sueldo Isabel $400/mes. Variable: consultas Anthony $50-150.<br>El fijo te permite planificar gastos obligatorios con certeza.'
    },
    'topgastos': {
      title: '📊 Top Gastos del Mes',
      body: 'Los 5 movimientos individuales más costosos.<br><br><strong>Ejemplo Marzo:</strong> 1) Compra dólares $130 · 2) Laptop $65 · 3) Cashea $55...<br>Identifica gastos extraordinarios que distorsionan el mes.'
    },
    'topingresos': {
      title: '💚 Top Ingresos del Mes',
      body: 'Los 5 ingresos individuales más altos.<br><br><strong>Ejemplo:</strong> 1) Sueldo ahorro $400 · 2) Sueldo Isabel $80 · 3) Sueldo Anthony $93...<br>Muestra cuáles fuentes aportan más.'
    }
  };
  const data = answers[questionKey];
  if(!data) return;
  // Create inline modal
  lockScroll(); // FIX-VIII-5: ocultar FAB al abrir info card
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:20000;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = (e) => { if(e.target===overlay) { unlockScroll(); overlay.remove(); } };
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border2);border-radius:18px;padding:22px 20px;max-width:400px;width:100%;max-height:80vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h3 style="font-size:.9rem;color:var(--text)">${data.title}</h3>
        <button onclick="unlockScroll();this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer">✕</button>
      </div>
      <div style="font-size:13px;color:var(--muted);line-height:1.7">${data.body.replace(/\n/g,'<br>')}</div>
    </div>`;
  document.body.appendChild(overlay);
}


// ─── FAVICON FETCH FROM URL (#12) ───────────────────────
function getAccountLogo(account) {
  if(account.logo_url) return account.logo_url;
  if(account.website_url) {
    // Use Google S2 favicon service (free, no API key)
    const domain = account.website_url.replace(/^https?:\/\//,'').replace(/\/.*/,'');
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;
  }
  // Try to guess from name
  const nameMap = {
    'zinli':'zinli.com','paypal':'paypal.com','bancamiga':'bancamiga.com',
    'banesco':'banesco.com','mercantil':'mercantilbanco.com','provincial':'bbva.es',
    'exterior':'bancoexterior.com','venezuela':'bancovenezuela.com.ve',
    'zelle':'zellepay.com','binance':'binance.com','reserve':'reserve.org'
  };
  const nameL = account.nombre?.toLowerCase()||'';
  for(const [k,domain] of Object.entries(nameMap)) {
    if(nameL.includes(k)) return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  }
  return null;
}


// ─── USERNAME PERSISTENCE (#24) ─────────────────────────
// Names are stored per-user-group, not per email
const USER_GROUPS = {
  anthony: ['dranthonymarte@gmail.com','anthonymarte12@gmail.com','insumosodontomm@gmail.com'],
  isabel:  ['isabelcristinapedrales@gmail.com','pedralesisabel@gmail.com']
};
function getUserGroup(email) {
  const el = email?.toLowerCase();
  if(USER_GROUPS.anthony.includes(el)) return 'anthony';
  if(USER_GROUPS.isabel.includes(el)) return 'isabel';
  return el;
}
function saveUserDisplayName(email, name) {
  const group = getUserGroup(email);
  localStorage.setItem('fin_username_'+group, name);
  // Also sync to Supabase config if available
  if(window.sb && currentUser) {
    sb.from('config_usuario').upsert({ user_id: HOUSEHOLD_ID || currentUser.id, display_name: name }, { onConflict:'user_id' }).then(()=>{});
  }
}
function loadUserDisplayName(email) {
  const group = getUserGroup(email);
  return localStorage.getItem('fin_username_'+group) || null;
}
// Override getDisplayName to check saved name first
const _origGetDisplayName = window.getDisplayName;
function getDisplayName(email) {
  // USER_NAMES siempre tiene prioridad absoluta (nombres fijos por correo)
  const fixed = USER_NAMES[email?.toLowerCase()];
  if (fixed) return fixed;
  const saved = loadUserDisplayName(email);
  if (saved) return saved;
  return email?.split('@')[0] || 'Usuario';
}


// ─── OPEN RECEIPT FROM MODAL (#20) ──────────────────────
function openReceiptFromModal() {
  // Close movement modal temporarily, open scanner, then re-open
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    toast('📸 Analizando recibo...', 'ok');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target.result.split(',')[1];
        const mediaType = file.type || 'image/jpeg';
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+getGroqKey()},
          body:JSON.stringify({
            model:'meta-llama/llama-4-scout-17b-16e-instruct',
            messages:[{role:'user',content:[
              {type:'image_url',image_url:{url:`data:${mediaType};base64,${base64}`}},
              {type:'text',text:`Analiza este recibo venezolano. Si el monto está en Bs, divídelo entre ${rateBCV||431} para convertir a USD. Devuelve SOLO JSON sin markdown: {"desc":"nombre negocio","amount":número_USD,"date":"YYYY-MM-DD","tipo":"Gasto","cat":"categoría de: 🥑ComidaMercado|🚓Transporte|🏡Casa|🚑Salud|💅CuidadoPersonal|📺Suscripciones|🛸Otros|Antojos","subcat":"subcategoría","method":"Efectivo $|Pago móvil|Transferencia|Tarjeta"}`}
            ]}],
            max_tokens:300
          })
        });
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content||'';
        const clean = text.split('```json').join('').split('```').join('').trim();
        const parsed = JSON.parse(clean);
        // Fill form
        if(parsed.desc)   document.getElementById('f-desc').value=parsed.desc;
        if(parsed.amount) document.getElementById('f-amount-usd').value=parseFloat(parsed.amount).toFixed(2);
        if(parsed.date)   document.getElementById('f-date').value=parsed.date;
        if(parsed.tipo)   { document.getElementById('f-tipo').value=parsed.tipo; onTipoChange(); }
        if(parsed.method) { const mEl=document.getElementById('f-method'); if(mEl) mEl.value=parsed.method; }
        setTimeout(()=>{
          if(parsed.cat) { document.getElementById('f-cat').value=parsed.cat; onCatChange(); }
          setTimeout(()=>{ if(parsed.subcat){ const sc=document.getElementById('f-subcat'); if(sc) sc.value=parsed.subcat; } },80);
        },80);
        toast('📸 Recibo procesado con éxito');
      } catch(err) {
        toast('No pude leer el recibo. Llena manualmente.','err');
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}



// ════════════════════════════════════════════════════════════════
//  SISTEMA DE INVITACIÓN DE PAREJA — v1
//  Permite que cualquier usuario invite a su pareja por email.
//  No requiere hardcodear emails — completamente dinámico.
// ════════════════════════════════════════════════════════════════

// ── Generar token único ──────────────────────────────────────────
function _generateInviteToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2,'0')).join('');
}

// ── Abrir modal de invitación ────────────────────────────────────
async function openInvitePartner() {
  if (!currentUser || !sb) { toast('Debes iniciar sesión', 'err'); return; }

  // Check if already has a partner
  const { data: rel } = await sb.from('user_relationships')
    .select('*').eq('owner_user_id', HOUSEHOLD_ID || currentUser.id).maybeSingle();

  lockScroll();
  const overlay = document.createElement('div');
  overlay.id = 'invite-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10500;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = e => { if (e.target === overlay) closeInviteOverlay(); };

  const hasPartner = rel?.partner_email && rel?.invite_status === 'accepted';
  const pendingInvite = rel?.partner_email && rel?.invite_status === 'pending';
  const inviteUrl = rel?.invite_token
    ? `${location.origin}/?invite=${rel.invite_token}`
    : null;

  overlay.innerHTML = `
  <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;width:420px;max-width:100%;max-height:90vh;overflow-y:auto">
    <div style="padding:16px 20px;border-bottom:1px solid #21262d;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:.95rem;font-weight:700;color:#e6edf3">👥 Invitar Pareja</span>
      <button onclick="closeInviteOverlay()" style="background:none;border:none;color:#8b949e;font-size:1.1rem;cursor:pointer">✕</button>
    </div>
    <div style="padding:20px">

      ${hasPartner ? `
      <div style="background:#0d2137;border:1px solid #1a3a5c;border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="font-size:.78rem;color:#3fb950;font-weight:700;margin-bottom:4px">✅ Pareja conectada</div>
        <div style="font-size:.85rem;color:#e6edf3">${rel.partner_email}</div>
        <div style="font-size:.68rem;color:#8b949e;margin-top:2px">Comparte todos tus datos financieros</div>
      </div>
      <button onclick="confirmRemovePartner()" style="width:100%;background:#3d1a1a;border:1px solid #f85149;color:#f85149;padding:9px;border-radius:8px;cursor:pointer;font-size:.78rem;font-weight:600">
        🔗 Desconectar pareja
      </button>
      ` : pendingInvite ? `
      <div style="background:#2d2207;border:1px solid #e3b341;border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="font-size:.78rem;color:#e3b341;font-weight:700;margin-bottom:4px">⏳ Invitación pendiente</div>
        <div style="font-size:.85rem;color:#e6edf3">${rel.partner_email}</div>
        <div style="font-size:.68rem;color:#8b949e;margin-top:4px">Esperando que acepte la invitación</div>
      </div>
      <div style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:10px;margin-bottom:12px">
        <div style="font-size:.68rem;color:#8b949e;margin-bottom:6px">🔗 Enlace de invitación (compartir)</div>
        <div style="font-size:.7rem;color:#58a6ff;word-break:break-all">${inviteUrl}</div>
        <button onclick="copyInviteLink('${inviteUrl}')"
          style="margin-top:8px;background:#0d1e2d;border:1px solid #58a6ff;color:#58a6ff;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:.72rem;font-weight:600">
          📋 Copiar enlace
        </button>
      </div>
      <button onclick="cancelPendingInvite()" style="width:100%;background:#2d2207;border:1px solid #e3b341;color:#e3b341;padding:9px;border-radius:8px;cursor:pointer;font-size:.78rem">
        ↩ Cancelar invitación
      </button>
      ` : `
      <p style="font-size:.78rem;color:#8b949e;margin-bottom:16px;line-height:1.6">
        Invita a tu pareja para compartir el control financiero en tiempo real. Recibirá un enlace para unirse a tu hogar.
      </p>
      <div style="margin-bottom:12px">
        <label style="font-size:.72rem;color:#8b949e;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">
          Email de tu pareja
        </label>
        <input id="invite-email-input" type="email" placeholder="email@ejemplo.com"
          style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:8px;font-size:.88rem;outline:none"
          onfocus="this.style.borderColor='#58a6ff'" onblur="this.style.borderColor='#30363d'">
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:.72rem;color:#8b949e;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">
          Nombre de tu hogar (opcional)
        </label>
        <input id="invite-household-name" type="text" placeholder="Ej: Anthony & Isabel"
          value="${getDisplayName(currentUser?.email)} &amp; ..."
          style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:8px;font-size:.88rem;outline:none"
          onfocus="this.style.borderColor='#58a6ff'" onblur="this.style.borderColor='#30363d'">
      </div>
      <button onclick="sendPartnerInvite()"
        style="width:100%;background:#238636;border:1px solid #3fb950;color:#fff;padding:11px;border-radius:8px;cursor:pointer;font-size:.88rem;font-weight:700">
        📨 Enviar invitación
      </button>
      `}

    </div>
  </div>`;

  document.body.appendChild(overlay);
}

function closeInviteOverlay() {
  unlockScroll();
  document.getElementById('invite-overlay')?.remove();
}

// ── Enviar invitación ─────────────────────────────────────────────
async function sendPartnerInvite() {
  const emailInput = document.getElementById('invite-email-input');
  const nameInput  = document.getElementById('invite-household-name');
  const partnerEmail = emailInput?.value?.trim().toLowerCase();
  const householdName = nameInput?.value?.trim() || 'Mi Hogar';

  if (!partnerEmail || !partnerEmail.includes('@')) {
    toast('Ingresa un email válido', 'err'); return;
  }
  if (partnerEmail === currentUser.email.toLowerCase()) {
    toast('No puedes invitarte a ti mismo', 'err'); return;
  }

  const btn = document.querySelector('#invite-overlay button[onclick="sendPartnerInvite()"]');
  if (btn) { btn.textContent = '⏳ Enviando...'; btn.disabled = true; }

  try {
    const token = _generateInviteToken();
    const ownerId = HOUSEHOLD_ID || currentUser.id;

    // Guardar en user_relationships
    const { error } = await sb.from('user_relationships').upsert({
      owner_user_id:  ownerId,
      partner_email:  partnerEmail,
      invite_token:   token,
      invite_status:  'pending',
      household_name: householdName,
    }, { onConflict: 'owner_user_id' });

    if (error) throw error;

    const inviteUrl = `${location.origin}/?invite=${token}`;

    // Intentar enviar email via EmailJS si está disponible
    if (typeof emailjs !== 'undefined' && window.EMAILJS_PUBLIC_KEY) {
      await emailjs.send('default_service', 'invite_template', {
        to_email:       partnerEmail,
        from_name:      getDisplayName(currentUser.email),
        household_name: householdName,
        invite_url:     inviteUrl,
      }).catch(() => {}); // no bloquear si falla
    }

    closeInviteOverlay();
    toast(`✅ Invitación lista para ${partnerEmail}`, 'ok');

    // Mostrar el enlace para copiar
    setTimeout(() => openInvitePartner(), 300);

  } catch(e) {
    toast('Error enviando invitación: ' + e.message, 'err');
    if (btn) { btn.textContent = '📨 Enviar invitación'; btn.disabled = false; }
  }
}

// ── Copiar enlace ─────────────────────────────────────────────────
async function copyInviteLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    toast('📋 Enlace copiado', 'ok');
  } catch(_) {
    toast('Copia manualmente: ' + url, 'info');
  }
}

// ── Cancelar invitación pendiente ────────────────────────────────
async function cancelPendingInvite() {
  const ok = await showConfirm('Cancelar invitación', '¿Cancelar la invitación pendiente?', '↩');
  if (!ok) return;
  await sb.from('user_relationships')
    .update({ partner_email: null, invite_token: null, invite_status: 'accepted' })
    .eq('owner_user_id', HOUSEHOLD_ID || currentUser.id);
  closeInviteOverlay();
  toast('Invitación cancelada', 'ok');
}

// ── Desconectar pareja ────────────────────────────────────────────
async function confirmRemovePartner() {
  const ok = await showConfirm('Desconectar pareja',
    'Tu pareja perderá acceso a los datos compartidos. ¿Confirmar?', '🔗');
  if (!ok) return;
  await sb.from('user_relationships')
    .update({ partner_user_id: null, partner_email: null,
              invite_token: null, invite_status: 'accepted' })
    .eq('owner_user_id', HOUSEHOLD_ID || currentUser.id);
  closeInviteOverlay();
  toast('Pareja desconectada', 'ok');
}

// ── Aceptar invitación (al entrar con link /?invite=TOKEN) ────────
async function handleInviteToken(token) {
  if (!token || !sb || !currentUser) return;
  try {
    // Buscar la relación con ese token
    const { data: rel, error } = await sb.from('user_relationships')
      .select('*').eq('invite_token', token).single();
    if (error || !rel) { toast('Enlace de invitación inválido o expirado', 'err'); return; }
    if (rel.invite_status === 'accepted' && rel.partner_user_id) {
      toast('Esta invitación ya fue aceptada', 'info'); return; }

    const ok = await showConfirm('🎉 Invitación al hogar',
      `"${rel.household_name}" te invita a compartir el control financiero. ¿Aceptar?`, '🏠');
    if (!ok) return;

    // Aceptar: vincular el user actual como partner
    const { error: updErr } = await sb.from('user_relationships').update({
      partner_user_id: currentUser.id,
      partner_email:   currentUser.email,
      invite_status:   'accepted',
      accepted_at:     new Date().toISOString(),
    }).eq('id', rel.id);

    if (updErr) throw updErr;

    // Registrar uso del token
    await sb.from('invite_usage').insert({
      token, used_by: currentUser.id }).catch(() => {});

    // Re-resolver household con la nueva relación
    await resolveHouseholdId();
    await loadFromSupabase();
    toast('🎉 ¡Bienvenido al hogar! Ya ves los datos compartidos.', 'ok');

  } catch(e) { toast('Error aceptando invitación: ' + e.message, 'err'); }
}

// escHtml local fallback
var escHtml = window.escHtml || function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};


// ═══════════════════════════════════════════════════════════════════════
//  NOTIFICACIONES PROGRAMABLES — delegado a NotifPanel (notificaciones-panel.js)
//  saveNotificacion mantiene compatibilidad con código existente
// ═══════════════════════════════════════════════════════════════════════

window._notifList = [];

async function loadNotificaciones() {
  if (!window.sb || !window.currentUser) return [];
  try {
    const { data, error } = await sb.from('scheduled_notifications')
      .select('*').eq('user_id', window.currentUser.id)
      .eq('activo', true).order('send_at', { ascending: true });
    if (!error && data) {
      const mapped = data.map(function(r) {
        return Object.assign({}, r, { cuerpo: r.mensaje||'', fecha_hora: r.send_at, activa: r.activo });
      });
      window._notifList = mapped;
      return mapped;
    }
  } catch(e) { console.warn('[notif] load:', e.message); }
  return [];
}

async function saveNotificacion(notif) {
  if (!window.sb || !window.currentUser) return;
  try {
    var payload = {
      user_id:          window.currentUser.id,
      user_email:       window.currentUser.email || '',
      titulo:           notif.titulo,
      mensaje:          notif.cuerpo || notif.mensaje || '',
      tipo:             notif.tipo || 'personalizado',   // ← valor válido por constraint
      send_at:          notif.fecha_hora || notif.send_at,
      recurrencia_dias: notif.recurrencia_dias || null,
      recurrente:       (notif.recurrencia_dias || 0) > 0,
      canal_telegram:   notif.canal_telegram || false,
      canal_push:       notif.canal_push || false,
      activo:           notif.activa !== false && notif.activo !== false,
      origen:           notif.origen || 'manual'
    };
    var result;
    if (notif.id && String(notif.id).indexOf('notif_') !== 0) {
      var upd = await sb.from('scheduled_notifications')
        .update(Object.assign({}, payload, { enviado_telegram: false, enviado_push: false }))
        .eq('id', notif.id).select().single();
      result = upd.data;
    } else {
      var ins = await sb.from('scheduled_notifications')
        .insert(payload).select().single();
      if (ins.error) { console.error('[notif] insert error:', ins.error.message); toast('Error guardando notificación: '+ins.error.message,'err'); return null; }
      result = ins.data;
    }
    if (result) { result.cuerpo = result.mensaje||''; result.fecha_hora = result.send_at; result.activa = result.activo; }
    return result;
  } catch(e) { console.warn('[notif] save:', e.message); toast('Error guardando: '+e.message,'err'); }
}

async function deleteNotificacion(id) {
  window._notifList = (window._notifList||[]).filter(function(n) { return n.id !== id; });
  if (!window.sb || !window.currentUser) return;
  try { await sb.from('scheduled_notifications').update({ activo: false }).eq('id', id); } catch(e) {}
}

function scheduleLocalNotif(n) {
  if (!n.fecha_hora || !n.activa) return;
  const ms = new Date(n.fecha_hora).getTime() - Date.now();
  if (ms <= 0 || ms > 7 * 24 * 60 * 60 * 1000) return;
  setTimeout(function() {
    if (typeof sendLocalNotification === 'function') {
      sendLocalNotification('🔔 ' + n.titulo, n.cuerpo || '', 'sched-' + n.id);
    }
  }, ms);
}

// ── Panel de notificaciones — delega a NotifPanel (notificaciones-panel.js) ──
// openNotifPanel: llamado por el botón de la campanita en la app
window.openNotifPanel = function() {
  if (window.NotifPanel && typeof window.NotifPanel.abrir === 'function') {
    window.NotifPanel.abrir();
  } else {
    toast('Panel de notificaciones cargando...', 'info');
  }
};

// openNotificaciones: llamado por el ítem del menú "Notificaciones"
function openNotificaciones() {
  window.openNotifPanel();
}
function closeNotificaciones() {
  if (window.NotifPanel && typeof window.NotifPanel.cerrar === 'function') {
    window.NotifPanel.cerrar();
  }
}

// Telegram connect UI (se mantiene para compatibilidad)
window.openTelegramConnect = async function() {
  document.getElementById('tg-connect-overlay')?.remove();
  var email = (window.currentUser && window.currentUser.email) ? window.currentUser.email : '';
  var statusTxt = '⏳ Verificando...';
  try {
    var tgData = window.NotifPanel ? await window.NotifPanel.verificarTelegram() : null;
    if (tgData) {
      statusTxt = '✅ Conectado' + (tgData.telegram_username ? ' (@' + tgData.telegram_username + ')' : '');
    } else {
      statusTxt = '❌ No conectado aún';
    }
  } catch(e) { statusTxt = '⚠️ No se pudo verificar'; }

  var overlay = document.createElement('div');
  overlay.id = 'tg-connect-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10800;display:flex;align-items:flex-end;justify-content:center';
  overlay.onclick = function(e){ if(e.target===overlay){ overlay.remove(); if(typeof unlockScroll==='function')unlockScroll(); } };
  overlay.innerHTML = '<div style="background:#161b22;border-radius:20px 20px 0 0;border-top:1px solid #30363d;width:100%;max-width:540px;padding:22px 18px;padding-bottom:max(24px,env(safe-area-inset-bottom,24px))">'
    + '<div style="font-size:.95rem;font-weight:800;color:#e6edf3;margin-bottom:4px">✈️ Conectar Telegram</div>'
    + '<div style="font-size:.72rem;color:#8b949e;margin-bottom:16px">Para recibir recordatorios por Telegram</div>'
    + '<div style="background:#1c2128;border:1px solid #30363d;border-radius:10px;padding:14px;margin-bottom:14px">'
    + '<div style="font-size:.7rem;color:#8b949e;margin-bottom:6px;text-transform:uppercase;font-weight:700">Estado actual</div>'
    + '<div style="font-size:.82rem;color:#c9d1d9">' + statusTxt + '</div>'
    + '</div>'
    + '<div style="background:#0d1117;border:1px solid #3fb950;border-radius:10px;padding:14px;margin-bottom:16px">'
    + '<div style="font-size:.72rem;color:#3fb950;font-weight:700;margin-bottom:8px">📋 PASOS PARA CONECTAR</div>'
    + '<div style="font-size:.78rem;color:#c9d1d9;line-height:1.7">'
    + '1️⃣ Abre Telegram<br>2️⃣ Busca <b style="color:#58a6ff">@AnthonyFinanzasBot</b><br>'
    + '3️⃣ Envía este comando:<br>'
    + '<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:8px 12px;margin-top:6px;font-family:monospace;font-size:.82rem;color:#e6edf3;word-break:break-all">/conectar ' + email + '</div>'
    + '</div></div>'
    + '<div style="display:flex;gap:8px">'
    + '<button onclick="document.getElementById(\'tg-connect-overlay\').remove();if(typeof unlockScroll===\'function\')unlockScroll();" style="flex:1;background:#1c2128;border:1px solid #30363d;color:#8b949e;padding:12px;border-radius:10px;cursor:pointer;font-family:inherit">Cerrar</button>'
    + '<button onclick="(async function(){try{await navigator.clipboard.writeText(\'/conectar ' + email + '\');if(typeof toast===\'function\')toast(\'📋 Copiado — pégalo en @AnthonyFinanzasBot\',\'ok\');}catch(e){if(typeof toast===\'function\')toast(\'/conectar ' + email + '\',\'info\');}})();" style="flex:1;background:#3fb950;border:none;color:#000;padding:12px;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit">📋 Copiar comando</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  if (typeof lockScroll === 'function') lockScroll();
};

// [Ses6: bloque duplicado eliminado — loadNotificaciones ya se ejecuta en el hook principal]
