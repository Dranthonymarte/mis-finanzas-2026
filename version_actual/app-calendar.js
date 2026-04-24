// ╔══════════════════════════════════════════════════════════════════════╗
// ║  app-calendar.js · Mis Finanzas 2026  v1.0                           ║
// ║  Integración Google Calendar — OAuth propio (sin depender de         ║
// ║  Supabase Additional Scopes). Flujo popup + postMessage.             ║
// ║  Sincroniza: cobros, deudas, pagos recurrentes, metas.               ║
// ╚══════════════════════════════════════════════════════════════════════╝
(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────
  // El GOOGLE_CLIENT_ID debe estar definido en config.js como:
  //   window.GOOGLE_CLIENT_ID = 'xxxx.apps.googleusercontent.com';
  const GCAL_CLIENT_ID = (typeof window.GOOGLE_CLIENT_ID !== 'undefined')
    ? window.GOOGLE_CLIENT_ID : '';

  const GCAL_SCOPE   = 'https://www.googleapis.com/auth/calendar.events';
  const EDGE_URL     = 'https://jcgoccaisemrfsuwwrrl.supabase.co/functions/v1/calendar-sync';
  const REDIRECT_URI = 'https://finanzasprueba.pages.dev/gcal-callback.html';

  // ── Obtener JWT ─────────────────────────────────────────────────────
  async function _jwt() {
    try {
      const { data: { session } } = await window._supabase.auth.getSession();
      return session?.access_token ?? null;
    } catch (_) { return null; }
  }

  // ══════════════════════════════════════════════════════════════════
  //  OAUTH POPUP — no necesita Supabase Additional Scopes
  // ══════════════════════════════════════════════════════════════════
  function connectGoogleCalendar() {
    if (!GCAL_CLIENT_ID) {
      toast('⚠️ Falta GOOGLE_CLIENT_ID en config.js', 'err');
      return;
    }
    const state = Math.random().toString(36).slice(2);
    sessionStorage.setItem('gcal_state', state);
    const q = new URLSearchParams({
      client_id:     GCAL_CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope:         GCAL_SCOPE,
      access_type:   'offline',
      prompt:        'consent',
      state,
    });
    const popup = window.open(
      'https://accounts.google.com/o/oauth2/v2/auth?' + q,
      'gcal_oauth', 'width=500,height=640,top=80,left=160'
    );
    function onMsg(e) {
      if (e.origin !== 'https://finanzasprueba.pages.dev') return;
      if (!e.data?.gcal_code) return;
      window.removeEventListener('message', onMsg);
      if (popup && !popup.closed) popup.close();
      _exchangeCode(e.data.gcal_code, e.data.state);
    }
    window.addEventListener('message', onMsg);
  }

  async function _exchangeCode(code, state) {
    if (state !== sessionStorage.getItem('gcal_state')) {
      toast('❌ Error OAuth (state mismatch)', 'err'); return;
    }
    sessionStorage.removeItem('gcal_state');
    const jwt = await _jwt();
    if (!jwt) { toast('❌ Inicia sesión primero', 'err'); return; }
    toast('🔄 Conectando Google Calendar…', 'ok');
    try {
      const res  = await fetch(EDGE_URL, {
        method:  'POST',
        headers: { Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'oauth_exchange', code, redirect_uri: REDIRECT_URI }),
      });
      const data = await res.json();
      if (data.ok) {
        window._calendarConnected = true;
        toast('✅ Google Calendar conectado', 'ok');
        const btn = document.getElementById('btn-connect-gcal');
        if (btn) { btn.textContent = '✅ Conectado'; btn.disabled = true; btn.style.background = '#238636'; }
      } else {
        toast('❌ ' + (data.message || data.error || 'Error desconocido'), 'err');
      }
    } catch (e) { toast('❌ Error de red', 'err'); }
  }

  // ── Llamada a Edge Function ─────────────────────────────────────────
  async function _sync(payload) {
    const jwt = await _jwt();
    if (!jwt) return { error: 'no_session' };
    try {
      const res  = await fetch(EDGE_URL, {
        method:  'POST',
        headers: { Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      return await res.json();
    } catch (_) { return { error: 'network' }; }
  }

  // ── API pública ─────────────────────────────────────────────────────
  async function syncCobro({ nombre, monto, fecha, moneda = 'USD', nota }) {
    const r = await _sync({ action:'create', event_type:'cobro', title:'Cobro: '+nombre, amount:monto, currency:moneda, date:fecha, description:nota });
    return r?.event_id ?? null;
  }
  async function syncDeudaPago({ nombre, monto, fecha, moneda = 'USD', nota }) {
    const r = await _sync({ action:'create', event_type:'deuda_pago', title:'Pago: '+nombre, amount:monto, currency:moneda, date:fecha, description:nota });
    return r?.event_id ?? null;
  }
  async function syncRecurrente({ nombre, monto, fecha, frecuencia = 'MONTHLY', moneda = 'USD' }) {
    const r = await _sync({ action:'create', event_type:'recurrente', title:nombre, amount:monto, currency:moneda, date:fecha, recurrence:frecuencia });
    return r?.event_id ?? null;
  }
  async function syncMeta({ nombre, monto, fecha, moneda = 'USD' }) {
    const r = await _sync({ action:'create', event_type:'meta', title:'Meta: '+nombre, amount:monto, currency:moneda, date:fecha });
    return r?.event_id ?? null;
  }
  async function deleteCalendarEvent(id) {
    if (!id) return { ok: true };
    return _sync({ action: 'delete', event_id: id });
  }

  async function isCalendarConnected() {
    try {
      const { data: { user } } = await window._supabase.auth.getUser();
      if (!user) return false;
      const { data } = await window._supabase.from('config_usuario')
        .select('google_calendar_token').eq('user_id', user.id).single();
      return !!data?.google_calendar_token?.refresh_token;
    } catch (_) { return false; }
  }

  // ── UI botón para Settings ──────────────────────────────────────────
  async function renderCalendarSettingsBtn(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const ok = await isCalendarConnected();
    el.innerHTML = `
      <div style="background:#161b22;border:1px solid #30363d;border-radius:10px;padding:14px 16px;margin-top:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span>📅</span>
          <span style="font-size:.9rem;font-weight:600;color:#e6edf3">Google Calendar</span>
          <span style="margin-left:auto;font-size:.72rem;padding:2px 8px;border-radius:12px;
            background:${ok?'#1a4731':'#2d1a00'};color:${ok?'#3fb950':'#e3b341'};
            border:1px solid ${ok?'#3fb950':'#e3b341'}">${ok?'✅ Conectado':'⚪ No conectado'}</span>
        </div>
        <p style="font-size:.78rem;color:#8b949e;margin:0 0 10px">
          Sincroniza cobros, deudas y pagos recurrentes con tu calendario.</p>
        <button id="btn-connect-gcal" onclick="AppCalendar.connectGoogleCalendar()" ${ok?'disabled':''} style="
          width:100%;padding:9px;border-radius:7px;font-size:.83rem;cursor:${ok?'default':'pointer'};font-weight:600;
          border:1px solid ${ok?'#3fb950':'#58a6ff'};
          background:${ok?'#1a4731':'#1c2850'};
          color:${ok?'#3fb950':'#58a6ff'}">
          ${ok?'✅ Google Calendar conectado':'🔗 Conectar Google Calendar'}
        </button>
      </div>`;
  }

  window.AppCalendar = {
    connectGoogleCalendar, isCalendarConnected,
    syncCobro, syncDeudaPago, syncRecurrente, syncMeta,
    deleteCalendarEvent, renderCalendarSettingsBtn,
  };
  console.log('[Calendar] app-calendar.js v1.0 ✅');
})();
