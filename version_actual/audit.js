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
let _toastContainer = null;
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
const _toastMobileStyle = document.createElement('style');
_toastMobileStyle.textContent = `
  @media(max-width:820px){#toast-container{bottom:calc(70px + env(safe-area-inset-bottom,0px))!important;left:12px!important;right:12px!important;align-items:stretch;}}
  body.is-mobile #toast-container{bottom:calc(70px + env(safe-area-inset-bottom,0px))!important;left:12px!important;right:12px!important;}
`;
document.head.appendChild(_toastMobileStyle);

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
let recognition = null;
let formVoiceTimer = null;
let formVoiceSeconds = 0;

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
const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_MODEL_FALLBACK = 'llama-3.1-8b-instant'; // fallback si 70b falla
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
let iaMode = 'analisis';

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
// let realtimeChannel = null; // DUPLICADO — canonical: var realtimeChannel en app-core.js (window-scoped)
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
const _EMOJI_CATS = {
  '😀 Caras': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😍','🥰','😘','😎','🤩','😏','😒','😔','😢','😭','😤','😠','🤔','🤗','😴','🥳','😷','🤒','🤑','😬','🙄','😐','😶'],
  '👋 Gestos': ['👍','👎','👏','🙌','🤝','🤜','💪','🫶','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💯','✅','❌','⚠️','🔥','⭐','🎯','💡','🔑','🔒','🔓','📌','📍'],
  '💰 Dinero': ['💰','💵','💴','💶','💷','💸','💳','🏦','📈','📉','📊','💹','🤑','💎','🏅','🥇','🏆','🎖️','🪙','💱','🧾','📋','📝','📑','🗂️','📁','📂','🗃️'],
  '🏠 Hogar': ['🏠','🏡','🏗️','🏢','🏬','🏪','🏩','🏨','🏦','🏥','🏤','🏫','⛪','🕌','🛖','🏕️','🏔️','🛋️','🛏️','🚿','🛁','🪟','🚪','🔑','🪴','🧹','🧺','🛒','🪑'],
  '🍔 Comida': ['🍕','🍔','🌮','🌯','🥗','🍜','🍝','🍣','🍱','🥘','🍲','🥩','🍗','🥚','🧀','🥑','🥦','🍎','🍌','🍓','🥝','🍇','☕','🧃','🍺','🍷','🥤','🧁','🍰','🍩','🍪','🌽'],
  '🚗 Transporte': ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🛻','🚚','✈️','🚢','🚂','🛵','🚲','🛴','⛽','🅿️','🚦','🛣️','🗺️','🧭','⚓','🚁','🛸'],
  '💊 Salud': ['💊','💉','🩺','🩻','🏥','🧬','🦷','👓','🦯','🩹','🧘','🏋️','🚴','🛌','🧪','🩸','🫁','🫀','🧠','👁️','💪','🏃','🤸'],
  '📚 Educación': ['📚','📖','📝','✏️','🖊️','📐','📏','🔬','🔭','🎓','🏫','📓','📒','📔','📕','📗','📘','📙','🗒️','📄','📃','📑','📊','📈','🖥️','💻','📱'],
  '🎬 Entrete.': ['🎬','🎮','🕹️','🎯','🎲','🎪','🎭','🎨','🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤','🎧','📺','📻','🎥','🎞️','📸','🎠','🎡','🎢','🎟️'],
  '✈️ Viajes': ['✈️','🌍','🌎','🌏','🗺️','🧳','🏖️','🏔️','🏝️','🏕️','⛺','🌅','🌄','🗼','🗽','🎡','🚀','🛸','🌠','🌌','🏟️','🎠','🚢','⛵','🛥️'],
  '💅 Personal': ['💅','💄','👗','👠','👟','👒','🧥','👜','💍','💎','🪞','🧴','🧹','🪒','🧼','🪥','💈','🛍️','👒','🎩','🕶️','⌚','💼'],
  '📱 Tecno.': ['📱','💻','🖥️','⌨️','🖱️','🖨️','📷','📸','🎥','📹','📡','🔌','🔋','💡','🔦','🧲','📡','🛰️','🤖','⚙️','🔧','🔨','🛠️','🪛'],
  '🐾 Mascotas': ['🐶','🐱','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🦆','🦋','🐝','🐛','🦎','🐟','🐠','🐡','🦈','🦭'],
  '🌿 Naturaleza': ['🌸','🌺','🌻','🌼','🌷','🌱','🌿','🍀','🍃','🌲','🌳','🌴','🍄','🌾','🌊','🏔️','⛰️','🌋','🏜️','🌅','⭐','🌙','☀️','⛅','🌈','❄️','⛄'],
  '🔧 Servicios': ['🔧','🔨','🪛','⚙️','🔩','🧰','🏗️','🚿','💡','🔌','📡','🛜','📞','☎️','📠','📬','📦','🚚','📮','✉️','📧','🖨️','⌨️','🖱️'],
  '🎁 Regalos': ['🎁','🎀','🎊','🎉','🪅','🧨','🎈','🪆','🎭','🎪','🤹','🎗️','🏆','🥇','🎖️','🏅','🎯','🎲','🃏','🀄','♟️'],
};

const _EMOJI_RECIENTES_KEY = 'fin_emoji_recientes';
let _emojiPickerCatActual = Object.keys(_EMOJI_CATS)[0];

function _getEmojiRecientes() {
  try { return JSON.parse(localStorage.getItem(_EMOJI_RECIENTES_KEY) || '[]'); } catch(e) { return []; }
}
function _addEmojiReciente(emoji) {
  let rec = _getEmojiRecientes();
  rec = [emoji, ...rec.filter(e => e !== emoji)].slice(0, 16);
  try { localStorage.setItem(_EMOJI_RECIENTES_KEY, JSON.stringify(rec)); } catch(e) {}
}

// ── EMOJI PICKER ──────────────────────────────────────────────
let _emojiPickerTarget = null;
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
const _EMOJI_NOMBRES = {
  // Finanzas
  '💰':'dinero plata efectivo','💵':'billete dolar usd','💴':'yen japones','💶':'euro europeo',
  '💷':'libra inglesa','💳':'tarjeta credito debito pago','💸':'gasto pago salida dinero',
  '🏦':'banco financiero','📈':'subida alza ingreso ganancia','📉':'bajada caida gasto perdida',
  '📊':'grafica estadistica reporte','💹':'bolsa mercado financiero','🤑':'dinero rico plata ganancia',
  '🎯':'meta objetivo ahorro','🪙':'moneda coin','🧾':'recibo factura comprobante',
  '🏧':'cajero atm retiro','💱':'cambio divisa tasa moneda',
  // Hogar y servicios
  '🏠':'casa hogar vivienda','🏡':'casa hogar jardín','🔌':'electricidad luz corriente servicio',
  '💡':'luz electricidad bombilla idea','💧':'agua servicio consumo','🔧':'reparacion arreglo mantenimiento',
  '🧹':'limpieza barrer aseo','🧺':'lavanderia ropa lavar','🛒':'mercado compras supermercado',
  '🪑':'mueble silla decoracion','🛋️':'sofa mueble sala','🛏️':'cama dormitorio','🚿':'ducha baño',
  // Transporte
  '🚗':'carro auto vehiculo transporte','🚕':'taxi transporte','🚌':'bus transporte publico',
  '✈️':'avion viaje vuelo','⛽':'gasolina combustible gasoil','🔑':'llave carro seguro',
  '🛵':'moto motocicleta','🚲':'bicicleta cicla',
  // Comida
  '🍔':'hamburguesa comida rapida','🍕':'pizza comida','🥗':'ensalada saludable',
  '☕':'cafe desayuno','🍺':'cerveza bebida alcohol','🥤':'refresco bebida jugo',
  '🍽️':'restaurante comida cena almuerzo','🥩':'carne carniceria res','🥛':'leche lacteo',
  '🍞':'pan panaderia','🥦':'verdura vegetal','🍎':'fruta manzana','🌽':'maiz vegetal',
  '🧃':'jugo bebida','🍗':'pollo ave comida','🥚':'huevo desayuno','🧀':'queso lacteo',
  '🧄':'ajo condimento','🧅':'cebolla vegetal','🍅':'tomate vegetal','🥑':'aguacate palta',
  // Salud
  '💊':'medicina medicamento pastilla','🏥':'hospital clinica emergencia','💉':'vacuna inyeccion',
  '🩺':'doctor medico consulta','🦷':'dentista diente','👓':'lentes optica','🏃':'correr ejercicio gym',
  '🧘':'yoga meditacion relajacion','💪':'gym ejercicio fuerza','🧬':'laboratorio examen',
  // Educacion
  '📚':'libro educacion estudio','🎓':'graduacion universidad colegio','📝':'apunte tarea',
  '✏️':'lapiz escribir','💻':'computadora laptop trabajo','📐':'geometria matematica',
  // Entretenimiento
  '🎬':'cine pelicula entretenimiento','🎮':'juego videojuego consola','🎵':'musica cancion',
  '📺':'television tv streaming','🎤':'cantante concierto','🎸':'guitarra instrumento',
  '🎲':'juego mesa entretenimiento',
  // Tecnologia
  '📱':'telefono celular movil','🖥️':'computadora escritorio pc','⌨️':'teclado computadora',
  '🖨️':'impresora oficina','📷':'camara foto','🔋':'bateria energia carga','📡':'internet señal',
  // Ropa y personal
  '👗':'ropa vestimenta moda mujer','👟':'zapatos tenis calzado','💍':'joya anillo',
  '💄':'maquillaje cosmetico','🧴':'crema locion higiene','💅':'manicure uñas',
  '👜':'bolso cartera accesorio','🕶️':'gafas sol lentes','⌚':'reloj accesorio',
  // Familia y personas
  '👶':'bebe hijo familia niño','👪':'familia hogar','❤️':'amor corazon',
  '🤝':'acuerdo negocio colaboracion amigo','👍':'aprobado bien ok',
  // Trabajo y negocio
  '💼':'trabajo negocio oficina','📋':'lista tarea planificacion','📁':'archivo documento',
  '📞':'llamada telefono contacto','🖊️':'boligrafo escribir firma','📆':'calendario fecha',
  // Mascotas
  '🐶':'perro mascota animal','🐱':'gato mascota animal','🐠':'pez acuario',
  // Naturaleza y clima
  '🌿':'naturaleza planta verde','🌊':'agua mar playa','⛅':'clima nublado tiempo',
  '☀️':'sol calor verano','🌧️':'lluvia agua','❄️':'frio invierno nieve',
  // Misc
  '⭐':'estrella favorito especial','✅':'completado hecho listo ok','❌':'cancelado error no',
  '⚠️':'alerta advertencia cuidado','🔥':'urgente importante caliente','📌':'recordatorio nota',
  '🎁':'regalo presente especial','🏆':'trofeo logro exito','🔐':'seguridad clave password',
  '🔒':'cerrado bloqueado seguro','💬':'mensaje chat comunicacion',
};

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
