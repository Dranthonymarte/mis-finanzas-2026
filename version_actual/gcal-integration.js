
// gcal-integration.js v2 — sync selectivo + fix auth timing + email reports
window.GCal = (() => {
  const EF = 'https://jcgoccaisemrfsuwwrrl.supabase.co/functions/v1';
  let _ok=false, _email=null;

  // Auth: usa sb.auth.getSession() directamente — no depende de window.currentUser
  const tok = async () => {
    try {
      const sb = window.sb;
      if (!sb) return null;
      const { data: { session } } = await sb.auth.getSession();
      return session?.access_token ?? null;
    } catch(_){ return null; }
  };

  const checkStatus = async () => {
    const t = await tok(); if (!t) return false;
    try {
      const r = await fetch(`${EF}/google-calendar-sync`, {
        method:'POST',
        headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},
        body:JSON.stringify({action:'check_status'})
      });
      const d = await r.json();
      _ok = d.connected; _email = d.email; return _ok;
    } catch(_){ return false; }
  };

  // Conectar — abre popup OAuth
  const connect = async () => {
    const t = await tok();
    if (!t) { if(typeof toast==='function') toast('Inicia sesión primero','err'); return; }
    // Obtener user_id desde sesión
    const { data: { session } } = await window.sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;
    const url = `${EF}/google-oauth?user_id=${uid}`;
    const p = window.open(url, 'gcal-oauth', 'width=520,height=620,left=200,top=100');
    window.addEventListener('message', async function h(e){
      if (e.data?.type !== 'gcal-oauth-success') return;
      window.removeEventListener('message', h); p?.close();
      _ok=true; _email=e.data.email;
      if(typeof toast==='function') toast(`✅ Google Calendar: ${_email}`, 'ok');
      renderGCalStatus();
    });
  };

  const disconnect = async () => {
    const t = await tok(); if (!t) return;
    await fetch(`${EF}/google-calendar-sync`, {
      method:'POST',
      headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},
      body:JSON.stringify({action:'disconnect'})
    });
    _ok=false; _email=null;
    if(typeof toast==='function') toast('Google Calendar desvinculado','ok');
    renderGCalStatus();
  };

  // Sync manual de un movimiento específico (llamado desde botón 📅 en el movimiento)
  const syncMov = async (mov) => {
    if (!_ok) { if(typeof toast==='function') toast('Conecta Google Calendar primero','err'); return; }
    const t = await tok(); if (!t) return;
    try {
      const r = await fetch(`${EF}/google-calendar-sync`, {
        method:'POST',
        headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},
        body:JSON.stringify({action:'sync_mov', mov})
      });
      const d = await r.json();
      if (d.ok) {
        if(typeof toast==='function') toast('📅 Guardado en Google Calendar','ok');
        // Guardar event_id en el movimiento para poder editarlo/borrarlo después
        if (d.event_id && mov.id && window.sb) {
          await window.sb.from('movimientos').update({ gcal_event_id: d.event_id }).eq('id', mov.id);
        }
      }
    } catch(e){ console.warn('[GCal]', e.message); }
  };

  // Eliminar evento de Calendar cuando se borra un movimiento
  const deleteMov = async (gcalEventId) => {
    if (!_ok || !gcalEventId) return;
    const t = await tok(); if (!t) return;
    try {
      await fetch(`${EF}/google-calendar-sync`, {
        method:'POST',
        headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},
        body:JSON.stringify({action:'delete_event', event_id: gcalEventId})
      });
    } catch(e){ console.warn('[GCal delete]', e.message); }
  };

  // Enviar reporte por Gmail
  const sendReport = async (tipo='mensual', mes=null) => {
    if (!_ok) { if(typeof toast==='function') toast('Conecta Google Calendar primero','err'); return; }
    const t = await tok(); if (!t) return;
    try {
      const r = await fetch(`${EF}/gmail-reports`, {
        method:'POST',
        headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},
        body:JSON.stringify({tipo, mes})
      });
      const d = await r.json();
      if (d.ok) { if(typeof toast==='function') toast('📧 Reporte enviado a tu Gmail','ok'); }
      else { if(typeof toast==='function') toast('Error: '+d.error,'err'); }
    } catch(e){ console.warn('[GCal report]', e.message); }
  };

  const renderGCalStatus = () => {
    const el = document.getElementById('gcal-status-container'); if (!el) return;
    el.innerHTML = _ok
      ? `<div style="display:flex;align-items:center;gap:10px;padding:12px;background:#0d1117;border:1px solid #238636;border-radius:10px;margin-bottom:8px">
           <span style="font-size:1.3rem">📅</span>
           <div style="flex:1">
             <div style="font-size:.85rem;font-weight:700;color:#3fb950">Google Calendar conectado</div>
             <div style="font-size:.75rem;color:#8b949e">${_email||''}</div>
           </div>
           <button onclick="GCal.disconnect()" style="padding:6px 10px;border-radius:6px;border:1px solid #30363d;background:transparent;color:#f85149;font-size:.75rem;cursor:pointer">Desvincular</button>
         </div>
         <div style="display:flex;gap:8px;padding:0 0 8px">
           <button onclick="GCal.sendReport('mensual')" style="flex:1;padding:8px;border-radius:8px;border:1px solid #30363d;background:#161b22;color:#e6edf3;font-size:.78rem;cursor:pointer">📧 Reporte mensual</button>
           <button onclick="GCal.sendReport('semanal')" style="flex:1;padding:8px;border-radius:8px;border:1px solid #30363d;background:#161b22;color:#e6edf3;font-size:.78rem;cursor:pointer">📊 Reporte semanal</button>
         </div>`
      : `<div style="display:flex;align-items:center;gap:10px;padding:12px;background:#0d1117;border:1px solid #30363d;border-radius:10px;margin-bottom:8px">
           <span style="font-size:1.3rem">📅</span>
           <div style="flex:1">
             <div style="font-size:.85rem;font-weight:600;color:#e6edf3">Google Calendar + Gmail</div>
             <div style="font-size:.75rem;color:#8b949e">Guarda movimientos y recibe reportes</div>
           </div>
           <button onclick="GCal.connect()" style="padding:6px 14px;border-radius:6px;border:none;background:#1a7f37;color:#fff;font-size:.78rem;cursor:pointer;font-weight:600">Conectar</button>
         </div>`;
  };

  const init = async () => {
    await checkStatus();
    renderGCalStatus();
  };

  // Esperar sb-ready (emitido por init.js cuando supabase está listo)
  document.addEventListener('sb-ready', init);

  return { connect, disconnect, syncMov, deleteMov, sendReport, checkStatus, init, renderGCalStatus,
    get connected(){ return _ok; }, get email(){ return _email; } };
})();
