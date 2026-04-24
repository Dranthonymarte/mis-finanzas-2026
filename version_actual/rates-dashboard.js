// ── rates-dashboard.js ── extraído de 2app-core.js pos 85696→136927 ──
// Variables/globals declaradas en globals-init.js

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
// _MES_NOMBRES ya declarado en ui-months.js
// const _MES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  // 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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

