/**
 * notificaciones-panel.js  — v4 (Ses6: fix auth uid)
 * Panel completo de gestión de notificaciones — Mis Finanzas 2026
 *
 * CAMBIO Ses6: db()/uid()/email() resuelven desde Supabase auth
 *   porque app-core.js usa "let currentUser" (no window.currentUser)
 *
 * CÓMO USAR DESDE LA APP:
 *   window.NotifPanel.abrir()          → abre el panel (bottom-sheet)
 *   window.NotifPanel.sugerirNotificacion({...}) → crea auto desde préstamo/recurrente
 */

(function () {
  'use strict';

  const TABLA = 'scheduled_notifications';

  // ─── Helpers DB ────────────────────────────────────────────────────────────
  // Ses6-FIX: app-core.js usa "let currentUser" (no window.currentUser).
  // Resolvemos uid/email directamente desde client.auth.getUser() como fallback.

  function db() { return window._supabase || window.sb; }

  let _resolvedUid   = null;
  let _resolvedEmail = '';

  async function _resolveAuth() {
    if (window.currentUser?.id) {
      _resolvedUid   = window.currentUser.id;
      _resolvedEmail = window.currentUser.email || '';
      return;
    }
    const client = db();
    if (!client) return;
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user?.id) {
        _resolvedUid   = user.id;
        _resolvedEmail = user.email || '';
      }
    } catch(e) { console.warn('[NotifPanel] resolveAuth:', e.message); }
  }

  function uid()   { return _resolvedUid; }
  function email() { return _resolvedEmail; }

  async function cargar() {
    if (!db()) return [];
    if (!uid()) await _resolveAuth();
    if (!uid()) return [];
    const { data, error } = await db()
      .from(TABLA)
      .select('*')
      .eq('user_id', uid())
      .eq('activo', true)
      .order('send_at', { ascending: true });
    if (error) { console.error('[NotifPanel] cargar:', error.message); return []; }
    return data || [];
  }

  async function crear(payload) {
    if (!db()) throw new Error('No autenticado');
    if (!uid()) await _resolveAuth();
    if (!uid()) throw new Error('No autenticado — inicia sesión');
    const rec = {
      user_id:          uid(),
      user_email:       email(),
      tipo:             payload.tipo || 'personalizado',
      titulo:           payload.titulo,
      mensaje:          payload.mensaje || '',
      send_at:          payload.send_at,
      canal_telegram:   payload.canal_telegram ?? true,
      canal_push:       payload.canal_push ?? false,
      canal_email:      false,
      enviado_telegram: false,
      enviado_push:     false,
      enviado_email:    false,
      recurrente:       (payload.recurrencia_dias || 0) > 0,
      recurrencia_dias: (payload.recurrencia_dias || 0) > 0 ? payload.recurrencia_dias : null,
      activo:           true,
      origen:           payload.origen || 'manual',
      referencia_id:    payload.referencia_id || null,
      referencia_tipo:  payload.referencia_tipo || null,
    };
    const { data, error } = await db().from(TABLA).insert(rec).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async function editar(id, payload) {
    if (!db()) throw new Error('No autenticado');
    const cambios = {
      titulo:           payload.titulo,
      mensaje:          payload.mensaje || '',
      send_at:          payload.send_at,
      canal_telegram:   payload.canal_telegram ?? true,
      canal_push:       payload.canal_push ?? false,
      recurrente:       (payload.recurrencia_dias || 0) > 0,
      recurrencia_dias: (payload.recurrencia_dias || 0) > 0 ? payload.recurrencia_dias : null,
      enviado_telegram: false,
      enviado_push:     false,
    };
    const { data, error } = await db().from(TABLA).update(cambios).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async function eliminar(id) {
    if (!db()) throw new Error('No autenticado');
    const { error } = await db().from(TABLA).update({ activo: false }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async function estadoTelegram() {
    if (!db()) return null;
    if (!uid()) await _resolveAuth();
    if (!uid()) return null;
    const { data } = await db()
      .from('telegram_connections')
      .select('is_active, email, telegram_username, connected_at, chat_id')
      .eq('user_id', uid())
      .eq('is_active', true)
      .maybeSingle();
    return data || null;
  }

  async function sugerirNotificacion({ titulo, descripcion, fechaInicio, diasRecurrencia, referenciaId, referenciaTipo }) {
    try {
      if (!db()) return;
      if (!uid()) await _resolveAuth();
      if (!uid()) return;
      if (referenciaId) {
        const { data: existe } = await db().from(TABLA)
          .select('id').eq('user_id', uid()).eq('referencia_id', referenciaId).eq('activo', true).single();
        if (existe) return;
      }
      await crear({
        titulo: `Recordatorio: ${titulo}`, mensaje: descripcion || '',
        send_at: fechaInicio, canal_telegram: true, canal_push: false,
        recurrencia_dias: diasRecurrencia || 0, origen: 'gasto_recurrente',
        referencia_id: referenciaId, referencia_tipo: referenciaTipo,
      });
    } catch (e) { console.warn('[NotifPanel] sugerir:', e.message); }
  }

  function fmtFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-VE', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  function fmtRec(dias) {
    if (!dias) return 'Una sola vez';
    if (dias === 1) return 'Diario';
    if (dias === 7) return 'Semanal';
    if (dias === 15) return 'Quincenal';
    if (dias === 30) return 'Mensual';
    return `Cada ${dias} días`;
  }

  function inyectarCSS() {
    if (document.getElementById('np-styles')) return;
    const s = document.createElement('style');
    s.id = 'np-styles';
    s.textContent = `
      #np-overlay {
        position:fixed;inset:0;z-index:9990;
        background:rgba(0,0,0,.6);
        display:flex;align-items:flex-end;justify-content:center;
        animation:npFadeIn .15s ease;
      }
      @keyframes npFadeIn { from{opacity:0} to{opacity:1} }
      #np-sheet {
        width:100%;max-width:560px;max-height:88vh;
        display:flex;flex-direction:column;
        background:#161b22;
        border-radius:20px 20px 0 0;
        border-top:1px solid #30363d;
        animation:npSlideUp .2s ease;
        overflow:hidden;
      }
      @keyframes npSlideUp { from{transform:translateY(50px)} to{transform:translateY(0)} }
      #np-header {
        display:flex;align-items:center;justify-content:space-between;
        padding:14px 18px 10px;
        border-bottom:1px solid #21262d;
        flex-shrink:0;
      }
      #np-title { font-size:.95rem;font-weight:800;color:#e6edf3; }
      #np-btn-nueva {
        background:#238636;border:none;color:#fff;
        padding:6px 14px;border-radius:10px;
        font-size:.75rem;font-weight:700;cursor:pointer;font-family:inherit;
      }
      #np-btn-close {
        background:#21262d;border:none;color:#8b949e;
        width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem;
      }
      #np-tg-status {
        margin:10px 16px 0;border-radius:10px;padding:10px 12px;
        font-size:.75rem;display:flex;align-items:center;gap:8px;flex-shrink:0;
      }
      #np-tg-status.ok  { background:rgba(63,185,80,.1);border:1px solid rgba(63,185,80,.25);color:#3fb950; }
      #np-tg-status.nok { background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);color:#e3b341; }
      #np-tg-status .np-tg-info { display:flex;flex-direction:column;gap:1px;flex:1; }
      #np-tg-status .np-tg-sub  { font-size:.65rem;opacity:.7; }
      #np-tg-btn-connect {
        background:rgba(88,166,255,.15);border:1px solid rgba(88,166,255,.3);
        color:#58a6ff;border-radius:7px;padding:4px 10px;font-size:.65rem;
        cursor:pointer;font-family:inherit;white-space:nowrap;
      }
      #np-list {
        overflow-y:auto;flex:1;padding:10px 12px;
        display:flex;flex-direction:column;gap:8px;
      }
      .np-empty { text-align:center;padding:32px 16px;color:#8b949e;font-size:.82rem;line-height:1.6; }
      .np-card { background:#1c2128;border:1px solid #30363d;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px; }
      .np-card-top { display:flex;align-items:flex-start;gap:10px; }
      .np-card-icon { font-size:1.3rem;flex-shrink:0;line-height:1.3; }
      .np-card-body { flex:1;min-width:0; }
      .np-card-titulo { font-size:.85rem;font-weight:700;color:#e6edf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .np-card-msg { font-size:.72rem;color:#8b949e;margin-top:1px; }
      .np-card-actions { display:flex;gap:6px;flex-shrink:0; }
      .np-btn-edit, .np-btn-del { border-radius:7px;padding:4px 9px;font-size:.7rem;cursor:pointer;font-family:inherit;border:1px solid; }
      .np-btn-edit { background:#0d1e30;border-color:#30363d;color:#58a6ff; }
      .np-btn-del  { background:#2d1111;border-color:#6e1a1a;color:#f85149; }
      .np-card-meta { display:flex;flex-wrap:wrap;gap:6px;font-size:.68rem;color:#8b949e; }
      .np-tag { background:#21262d;border-radius:5px;padding:2px 7px; }
      .np-tag.tg  { background:rgba(88,166,255,.12);color:#58a6ff; }
      .np-tag.rec { background:rgba(63,185,80,.10);color:#3fb950; }
      .np-tag.late{ background:rgba(248,81,73,.12);color:#f85149; }
      #np-modal-overlay { position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.7);display:flex;align-items:flex-end;justify-content:center;animation:npFadeIn .1s ease; }
      #np-modal { width:100%;max-width:560px;max-height:92vh;display:flex;flex-direction:column;background:#161b22;border-radius:20px 20px 0 0;border-top:1px solid #30363d;animation:npSlideUp .15s ease;overflow:hidden; }
      #np-modal-hdr { display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px;border-bottom:1px solid #21262d;flex-shrink:0; }
      #np-modal-hdr h3 { margin:0;font-size:.9rem;font-weight:800;color:#e6edf3; }
      #np-modal-close { background:#21262d;border:none;color:#8b949e;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:.9rem; }
      #np-modal-body { overflow-y:auto;flex:1;padding:16px 18px;display:flex;flex-direction:column;gap:12px; }
      .np-field { display:flex;flex-direction:column;gap:5px; }
      .np-label { font-size:.65rem;font-weight:700;color:#8b949e;text-transform:uppercase;letter-spacing:.05em; }
      .np-input, .np-textarea, .np-select { background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.85rem;outline:none;font-family:inherit;box-sizing:border-box;width:100%;transition:border-color .15s; }
      .np-input:focus,.np-textarea:focus,.np-select:focus { border-color:#58a6ff; }
      .np-textarea { resize:vertical;min-height:56px; }
      .np-rec-presets { display:flex;gap:6px;flex-wrap:wrap; }
      .np-preset { background:#1c2128;border:1px solid #30363d;color:#8b949e;border-radius:7px;padding:5px 10px;font-size:.65rem;cursor:pointer;font-family:inherit;transition:all .12s; }
      .np-preset.active { background:rgba(63,185,80,.15);border-color:#3fb950;color:#3fb950; }
      .np-canales { display:flex;gap:10px;flex-wrap:wrap; }
      .np-canal-toggle { display:flex;align-items:center;gap:7px;cursor:pointer;background:#1c2128;border:1px solid #30363d;border-radius:9px;padding:9px 13px;flex:1;transition:all .12s; }
      .np-canal-toggle input { width:16px;height:16px;cursor:pointer; }
      .np-canal-toggle span { font-size:.78rem;color:#c9d1d9; }
      #np-modal-footer { display:flex;gap:8px;padding:12px 18px 16px;border-top:1px solid #21262d;flex-shrink:0; }
      #np-btn-cancel { flex:1;padding:12px;border-radius:11px;background:#21262d;border:none;color:#8b949e;font-size:.85rem;cursor:pointer;font-family:inherit; }
      #np-btn-save { flex:2;padding:12px;border-radius:11px;background:#238636;border:none;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit; }
      #np-btn-save:disabled { opacity:.5;cursor:not-allowed; }
    `;
    document.head.appendChild(s);
  }

  let _panelData = [];
  let _tgData    = null;

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _renderTarjeta(n) {
    const ahora = Date.now();
    const sendMs = new Date(n.send_at).getTime();
    const tarde = sendMs < ahora && !n.enviado_telegram && !n.enviado_push;
    const recTag = n.recurrencia_dias ? `<span class="np-tag rec">↻ ${fmtRec(n.recurrencia_dias)}</span>` : '';
    const tgTag  = n.canal_telegram   ? `<span class="np-tag tg">✈️ Telegram</span>` : '';
    const pushTag= n.canal_push       ? `<span class="np-tag">📱 Push</span>` : '';
    const lateTag= tarde              ? `<span class="np-tag late">⚠️ Pendiente</span>` : '';
    const icon = { manual:'🔔', prestamo:'🏦', gasto_recurrente:'🔄', meta:'🎯', diagnostico:'🧪' }[n.origen] || '🔔';
    return `<div class="np-card" data-id="${_esc(n.id)}">
      <div class="np-card-top">
        <div class="np-card-icon">${icon}</div>
        <div class="np-card-body">
          <div class="np-card-titulo">${_esc(n.titulo)}</div>
          ${n.mensaje ? `<div class="np-card-msg">${_esc(n.mensaje)}</div>` : ''}
        </div>
        <div class="np-card-actions">
          <button class="np-btn-edit" data-id="${_esc(n.id)}">✏️ Editar</button>
          <button class="np-btn-del"  data-id="${_esc(n.id)}">🗑</button>
        </div>
      </div>
      <div class="np-card-meta">
        <span class="np-tag">📅 ${fmtFecha(n.send_at)}</span>
        ${recTag}${tgTag}${pushTag}${lateTag}
      </div>
    </div>`;
  }

  async function _refrescarPanel() {
    const list = document.getElementById('np-list');
    const tgEl = document.getElementById('np-tg-status');
    if (!list) return;
    list.innerHTML = '<div class="np-empty">Cargando...</div>';
    [_panelData, _tgData] = await Promise.all([cargar(), estadoTelegram()]);
    if (tgEl) {
      if (_tgData) {
        tgEl.className = 'ok';
        tgEl.innerHTML = `<div class="np-tg-info">
          <span>✅ Telegram conectado</span>
          <span class="np-tg-sub">${_esc(_tgData.email || '')}${_tgData.telegram_username ? ' · @' + _tgData.telegram_username : ''}</span>
        </div>`;
      } else {
        tgEl.className = 'nok';
        tgEl.innerHTML = `<div class="np-tg-info">
          <span>⚠️ Telegram no conectado</span>
          <span class="np-tg-sub">Escribe /conectar ${_esc(email())} en @AnthonyFinanzasBot</span>
        </div>
        <button class="np-tg-btn-connect" onclick="window.openTelegramConnect && window.openTelegramConnect()">Conectar</button>`;
      }
    }
    if (!_panelData.length) {
      list.innerHTML = '<div class="np-empty">📭 Sin notificaciones activas.<br>Pulsa <b>+ Nueva</b> para crear una.</div>';
      return;
    }
    list.innerHTML = _panelData.map(_renderTarjeta).join('');
    list.querySelectorAll('.np-btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = _panelData.find(x => x.id === btn.dataset.id);
        if (n) _abrirModal(n);
      });
    });
    list.querySelectorAll('.np-btn-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const n = _panelData.find(x => x.id === btn.dataset.id);
        if (!n) return;
        const ok = typeof showConfirm === 'function'
          ? await showConfirm('Eliminar notificación', `¿Eliminar "${n.titulo}"?`, '🗑')
          : confirm(`¿Eliminar "${n.titulo}"?`);
        if (!ok) return;
        try {
          await eliminar(btn.dataset.id);
          _refrescarPanel();
          if (typeof toast === 'function') toast('Notificación eliminada', 'ok');
        } catch (e) {
          if (typeof toast === 'function') toast('Error: ' + e.message, 'err');
        }
      });
    });
  }

  async function abrir() {
    await _resolveAuth();
    inyectarCSS();
    document.getElementById('np-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'np-overlay';
    overlay.innerHTML = `
      <div id="np-sheet">
        <div id="np-header">
          <span id="np-title">🔔 Notificaciones</span>
          <div style="display:flex;gap:8px;align-items:center">
            <button id="np-btn-nueva">+ Nueva</button>
            <button id="np-btn-close">✕</button>
          </div>
        </div>
        <div id="np-tg-status" class="nok"><span>⏳ Verificando Telegram...</span></div>
        <div id="np-list"><div class="np-empty">Cargando...</div></div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });
    overlay.querySelector('#np-btn-close').addEventListener('click', cerrar);
    overlay.querySelector('#np-btn-nueva').addEventListener('click', () => _abrirModal(null));
    document.body.appendChild(overlay);
    if (typeof lockScroll === 'function') lockScroll();
    _refrescarPanel();
  }

  function cerrar() {
    document.getElementById('np-overlay')?.remove();
    if (typeof unlockScroll === 'function') unlockScroll();
  }

  function _abrirModal(notif) {
    document.getElementById('np-modal-overlay')?.remove();
    const toLocal = iso => {
      if (!iso) { const d = new Date(); d.setMinutes(d.getMinutes() + 30); return d.toISOString().slice(0, 16); }
      const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };
    const esEdicion = !!notif;
    const presets = [{ val:0,label:'1 vez'},{val:1,label:'Diario'},{val:7,label:'Semanal'},{val:15,label:'Quincenal'},{val:30,label:'Mensual'}];
    const diasActual = notif?.recurrencia_dias || 0;
    const presetKnown = presets.some(p => p.val === diasActual);
    const mo = document.createElement('div');
    mo.id = 'np-modal-overlay';
    mo.innerHTML = `
      <div id="np-modal">
        <div id="np-modal-hdr">
          <h3>${esEdicion ? '✏️ Editar notificación' : '🔔 Nueva notificación'}</h3>
          <button id="np-modal-close">✕</button>
        </div>
        <div id="np-modal-body">
          <div class="np-field">
            <div class="np-label">Título *</div>
            <input class="np-input" id="npm-titulo" type="text" maxlength="100" placeholder="Ej: Pagar Cashea, Recordar mercado..." value="${_esc(notif?.titulo || '')}">
          </div>
          <div class="np-field">
            <div class="np-label">Nota (opcional)</div>
            <textarea class="np-textarea" id="npm-mensaje" placeholder="Detalle adicional...">${_esc(notif?.mensaje || '')}</textarea>
          </div>
          <div class="np-field">
            <div class="np-label">Fecha y hora *</div>
            <input class="np-input" id="npm-fecha" type="datetime-local" value="${toLocal(notif?.send_at)}">
          </div>
          <div class="np-field">
            <div class="np-label">Repetición</div>
            <div class="np-rec-presets" id="npm-presets">
              ${presets.map(p => `<button class="np-preset${diasActual===p.val?' active':''}" data-dias="${p.val}">${p.label}</button>`).join('')}
            </div>
            <div id="npm-custom-row" style="display:${presetKnown?'none':'flex'};gap:8px;align-items:center;margin-top:8px">
              <input class="np-input" id="npm-dias-custom" type="number" min="1" max="365" placeholder="días" style="width:90px" value="${!presetKnown&&diasActual?diasActual:''}">
              <span style="font-size:.75rem;color:#8b949e">días personalizados</span>
            </div>
          </div>
          <div class="np-field">
            <div class="np-label">Canales de envío</div>
            <div class="np-canales">
              <label class="np-canal-toggle"><input type="checkbox" id="npm-telegram" ${(notif?.canal_telegram??true)?'checked':''}><span>✈️ Telegram</span></label>
              <label class="np-canal-toggle"><input type="checkbox" id="npm-push" ${notif?.canal_push?'checked':''}><span>📱 Push local</span></label>
            </div>
          </div>
        </div>
        <div id="np-modal-footer">
          <button id="np-btn-cancel">Cancelar</button>
          <button id="np-btn-save">💾 Guardar</button>
        </div>
      </div>`;
    let diasSeleccionados = diasActual;
    mo.querySelectorAll('.np-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        diasSeleccionados = parseInt(btn.dataset.dias, 10);
        mo.querySelectorAll('.np-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mo.querySelector('#npm-custom-row').style.display = 'none';
        mo.querySelector('#npm-dias-custom').value = '';
      });
    });
    const customInput = mo.querySelector('#npm-dias-custom');
    customInput.addEventListener('input', () => {
      diasSeleccionados = parseInt(customInput.value, 10) || 0;
      mo.querySelectorAll('.np-preset').forEach(b => b.classList.remove('active'));
      mo.querySelector('#npm-custom-row').style.display = 'flex';
    });
    const cerrarModal = () => { mo.remove(); };
    mo.addEventListener('click', e => { if (e.target === mo) cerrarModal(); });
    mo.querySelector('#np-modal-close').addEventListener('click', cerrarModal);
    mo.querySelector('#np-btn-cancel').addEventListener('click', cerrarModal);
    mo.querySelector('#np-btn-save').addEventListener('click', async () => {
      const titulo   = mo.querySelector('#npm-titulo').value.trim();
      const fechaVal = mo.querySelector('#npm-fecha').value;
      if (!titulo) { if (typeof toast === 'function') toast('Escribe un título', 'err'); return; }
      if (!fechaVal) { if (typeof toast === 'function') toast('Elige fecha y hora', 'err'); return; }
      const btnSave = mo.querySelector('#np-btn-save');
      btnSave.disabled = true; btnSave.textContent = 'Guardando...';
      const payload = {
        titulo,
        mensaje:          mo.querySelector('#npm-mensaje').value.trim(),
        send_at:          new Date(fechaVal).toISOString(),
        canal_telegram:   mo.querySelector('#npm-telegram').checked,
        canal_push:       mo.querySelector('#npm-push').checked,
        recurrencia_dias: diasSeleccionados || 0,
        origen:           notif?.origen || 'manual',
        referencia_id:    notif?.referencia_id || null,
        referencia_tipo:  notif?.referencia_tipo || null,
      };
      try {
        if (esEdicion) { await editar(notif.id, payload); } else { await crear(payload); }
        cerrarModal();
        _refrescarPanel();
        if (typeof toast === 'function') toast('✅ Notificación guardada', 'ok');
        if (payload.canal_push) {
          const ms = new Date(payload.send_at).getTime() - Date.now();
          if (ms > 0 && ms < 7 * 86400000 && typeof sendLocalNotification === 'function') {
            setTimeout(() => sendLocalNotification('🔔 ' + payload.titulo, payload.mensaje || '', 'sched'), ms);
          }
        }
      } catch (e) {
        if (typeof toast === 'function') toast('Error: ' + e.message, 'err');
        btnSave.disabled = false; btnSave.textContent = '💾 Guardar';
      }
    });
    document.body.appendChild(mo);
    setTimeout(() => mo.querySelector('#npm-titulo')?.focus(), 80);
  }

  window.NotifPanel = {
    abrir,
    cerrar,
    sugerirNotificacion,
    verificarTelegram: estadoTelegram,
    renderPanel:      () => { abrir(); },
    abrirModalNueva:  () => { abrir(); setTimeout(() => _abrirModal(null), 150); },
    cargar,
  };

  // Aliases para onclick= en index.html
  window.openNotifPanel  = () => window.NotifPanel.abrir();
  window.closeNotifPanel = () => window.NotifPanel.cerrar();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inyectarCSS);
  } else {
    inyectarCSS();
  }

})();
