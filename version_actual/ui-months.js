
// ── ui-months.js ─────────────────────────────────────────────────────────────
// Extraído de app-core.js (bytes ~90k-120k) — Sesión 12
// Contiene: convertAmt, fmt, haptic, ocultar cifras, gestión de meses,
//           buildTabs, buildMobileMonthSelect, switchMonth, toggleCloseMonth,
//           recalcMonth, getEmergencyFund, syncEF, render/renderKPIs/renderAlertas
// Globals necesarios: sb, currentUser, HOUSEHOLD_ID, CONFIG, EXCEL_DATA,
//   activeMonths, months, currentMonth, currentCurrency, rateBCV, rateEUR,
//   charts, userModifiedMonths, emergencyFundByMonth, lastRateDate
// ─────────────────────────────────────────────────────────────────────────────

function convertAmt(usd) {
  if (currentCurrency === 'BS') return usd * rateBCV;
  if (currentCurrency === 'EUR') return usd * rateBCV / rateEUR;
  return usd;
}

function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  const patterns = { light: [30], medium: [60], success: [30,50,30], error: [100,50,100] };
  navigator.vibrate(patterns[type] || [30]);
}

function fmt(n) {
  if (window._hideAmounts) return '••••••';
  const val = convertAmt(Math.abs(n || 0));
  const prefix = currentCurrency === 'BS' ? 'Bs ' : currentCurrency === 'EUR' ? '€' : '$';
  return prefix + val.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtSigned(n) {
  if (window._hideAmounts) return '••••••';
  return (n < 0 ? '-' : '') + fmt(n);
}

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

const _MES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function checkActivarMesBtn() {
  const hoy           = new Date();
  const mesRealNombre = _MES_NOMBRES[hoy.getMonth()];
  const mesRealIdx    = hoy.getMonth();
  const currentIdx    = _MES_NOMBRES.indexOf(currentMonth);
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
    } else {
      btn.style.cssText = [
        'display:none','position:fixed','top:64px','right:12px','z-index:9000',
        'padding:8px 16px','border-radius:10px',
        'border:1.5px solid var(--blue,#58a6ff)','background:var(--bg-card,#161b22)',
        'color:var(--blue,#58a6ff)','font-size:.8rem','font-weight:700',
        'cursor:pointer','box-shadow:0 4px 16px rgba(0,0,0,.4)'
      ].join(';');
      document.body.appendChild(btn);
    }
  }
  if (mesRealIdx > currentIdx && !activeMonths.includes(mesRealNombre)) {
    btn.textContent = '📅 Abrir ' + mesRealNombre;
    btn.style.display = '';
  } else {
    btn.style.display = 'none';
  }
}

async function activarMesActual() {
  const hoy        = new Date();
  const mesReal    = _MES_NOMBRES[hoy.getMonth()];
  const mesRealIdx = hoy.getMonth();
  const currentIdx = _MES_NOMBRES.indexOf(currentMonth);
  if (activeMonths.includes(mesReal)) { switchMonth(mesReal); return; }
  const mesesPendientes = _MES_NOMBRES.slice(currentIdx + 1, mesRealIdx + 1)
    .filter(m => !activeMonths.includes(m));
  const detalle = mesesPendientes.length > 1
    ? 'Los meses <b>' + mesesPendientes.join(', ') + '</b> no tienen movimientos registrados.'
    : '';
  const ok = await showConfirm(
    '📅 Abrir ' + mesReal,
    '¿Deseas activar <b>' + mesReal + '</b> como mes actual?<br>' + detalle + '<br><br>Podrás registrar movimientos desde hoy.',
    '📅'
  );
  if (!ok) return;
  if (!EXCEL_DATA[mesReal]) EXCEL_DATA[mesReal] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
  mesesPendientes.forEach(m => {
    if (!activeMonths.includes(m)) activeMonths.push(m);
    if (!EXCEL_DATA[m]) EXCEL_DATA[m] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
  });
  currentMonth = mesReal;
  buildTabs();
  if (typeof buildMobileMonthSelect === 'function') buildMobileMonthSelect();
  render();
  const _btnMes = document.getElementById('btn-activar-mes');
  if (_btnMes) _btnMes.style.display = 'none';
  toast('✅ ' + mesReal + ' abierto — ya puedes registrar movimientos', 'ok');
}

function checkNuevoMesAlLogin() {
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
    setTimeout(() => toast('📅 ' + mesReal + ' abierto automáticamente', 'ok'), 1800);
  }
}

function init() {
  applyStoredOrder();
  buildTabs();
  initHideBtn();
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
  if (deferredPrompt) _showInstallBanner();
  if (typeof runSmartNotifications === 'function') runSmartNotifications();
  if (typeof renderTemplatePills === 'function') renderTemplatePills();
  const hoy = getLocalToday();
  if (!lastRateDate || lastRateDate !== hoy) setTimeout(() => fetchTasaBCV(false), 1800);
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
    opt.value = m; opt.textContent = m;
    opt.disabled = !activeMonths.includes(m);
    if (m === currentMonth) opt.selected = true;
    sel.appendChild(opt);
  });
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
  {
    const resetDate = CONFIG.efResetDate || null;
    let autoTotal = 0;
    Object.values(EXCEL_DATA).forEach(md => {
      (md.transactions || []).forEach(t => {
        if (['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)) {
          if (!resetDate || !t.date || t.date > resetDate)
            autoTotal += t.ef_contribution ?? (parseFloat(t.amount) * 0.30);
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
  const msg = isClosed
    ? '¿Reabrir ' + currentMonth + '? Podrás registrar movimientos nuevamente.'
    : '¿Cerrar ' + currentMonth + '? No podrás registrar movimientos hasta reabrirlo.';
  const ok = await showConfirm(action, msg, isClosed ? '🔓' : '🔒');
  if (!ok) return;
  const idx = CONFIG.closedMonths.indexOf(currentMonth);
  if (idx >= 0) CONFIG.closedMonths.splice(idx, 1);
  else CONFIG.closedMonths.push(currentMonth);
  buildTabs();
  toast(CONFIG.closedMonths.includes(currentMonth) ? 'Mes ' + currentMonth + ' cerrado 🔒' : 'Mes ' + currentMonth + ' reabierto 🔓', 'ok');
  sbSaveConfig();
}

function recalcMonth(m) {
  const txns = EXCEL_DATA[m].transactions;
  const ingresos = txns.filter(t =>
    ['Ingreso Fijo','Ingreso Variable'].includes(t.tipo) && t.cat !== 'Transferencia Interna'
  ).reduce((s,t) => s+t.amount, 0);
  const gastos = txns.filter(t =>
    ['Gasto','Prestamo pagado'].includes(t.tipo) && t.cat !== 'Transferencia Interna'
  ).reduce((s,t) => s+t.amount, 0);
  const prestamos = txns.filter(t => t.tipo === 'Prestamo recibido').reduce((s,t) => s+t.amount, 0);
  const ahorros   = txns.filter(t => t.tipo === 'Ahorro en efectivo').reduce((s,t) => s+t.amount, 0);
  const ajustes   = txns.filter(t => t.tipo === 'Ajuste').reduce((s,t) => s+t.amount, 0);
  EXCEL_DATA[m].ingresos  = ingresos;
  EXCEL_DATA[m].gastos    = gastos;
  EXCEL_DATA[m].prestamos = prestamos;
  EXCEL_DATA[m].ahorros   = ahorros;
  EXCEL_DATA[m].ajustes   = ajustes;
  EXCEL_DATA[m].balance   = ingresos - gastos + ajustes;
  const cats = {};
  txns.filter(t => ['Gasto','Prestamo pagado'].includes(t.tipo))
    .forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.amount; });
  EXCEL_DATA[m].cat_totals = Object.fromEntries(Object.entries(cats).sort((a,b) => b[1]-a[1]));
  if (typeof window._walletNeedsUpdate !== 'undefined') window._walletNeedsUpdate = true;
}

function getEmergencyFund(month) {
  const m = month || currentMonth;
  if (window._efLoadedFromSupabase && emergencyFundByMonth[m] !== undefined) return emergencyFundByMonth[m] || 0;
  const d = EXCEL_DATA[m];
  if (!d) return 0;
  return (d.transactions||[])
    .filter(t => ['Ingreso Fijo','Ingreso Variable'].includes(t.tipo))
    .reduce((s,t) => s+t.amount, 0) * 0.30;
}

function syncEF() {
  const efManual = CONFIG.efManualBase  || 0;
  const efAuto   = CONFIG.efAutoContrib || 0;
  const efTotal  = efManual + efAuto;
  CONFIG.emergencyFundBase = efTotal;
  const efGoal = CONFIG.emergencyFundGoal || 3000;
  const pct    = Math.min(efTotal / efGoal * 100, 100);
  const kEl  = document.getElementById('k-emergency');
  const kSub = document.getElementById('k-emergency-sub');
  if (kEl)  kEl.textContent  = fmt(efTotal);
  if (kSub) kSub.textContent = pct.toFixed(0) + '% de meta';
  const efDisp = document.getElementById('emergency-fund-display');
  if (efDisp) {
    efDisp.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;font-size:.75rem;margin-bottom:4px">' +
        '<span style="color:var(--orange);font-weight:700">' + fmt(efTotal) + '</span>' +
        '<div style="display:flex;align-items:center;gap:5px">' +
          '<span style="color:var(--muted);font-size:.65rem">Meta $</span>' +
          '<input type="number" id="ef-goal-input" value="' + efGoal + '"' +
          ' style="background:#0d1117;border:1px solid #e3b341;color:#e3b341;padding:2px 5px;border-radius:4px;font-size:.7rem;width:72px;outline:none;font-weight:600"' +
          ' onkeydown="if(event.key===\'Enter\')saveEFGoal()" title="Edita tu meta">' +
          '<button onclick="saveEFGoal()" style="background:#1a3626;border:1px solid #3fb950;color:#3fb950;padding:2px 8px;border-radius:4px;font-size:.65rem;cursor:pointer;font-weight:600">Guardar</button>' +
        '</div></div>' +
      '<div class="ef-bar-track"><div class="ef-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div style="font-size:.68rem;color:var(--muted);margin-top:4px">' + pct.toFixed(1) + '% de la meta · +30% de cada ingreso</div>' +
      '<div class="ef-stats">' +
        '<div class="ef-stat"><div class="ef-stat-val">' + fmt(efTotal) + '</div><div class="ef-stat-label">Total</div></div>' +
        '<div class="ef-stat"><div class="ef-stat-val" style="color:#f0a83a">' + fmt(efAuto) + '</div><div class="ef-stat-label">Auto 30%</div></div>' +
        '<div class="ef-stat"><div class="ef-stat-val">' + fmt(efGoal-efTotal>0?efGoal-efTotal:0) + '</div><div class="ef-stat-label">Faltante</div></div>' +
      '</div>';
  }
  return { efTotal, efManual, efAuto, pct, efGoal };
}

function renderDashboard() { render(); }
function render() {
  userModifiedMonths.add(currentMonth);
  recalcMonth(currentMonth);
  const d = EXCEL_DATA[currentMonth];
  renderKPIs(d);
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
  typeof renderIncomeBudgetBars === 'function' && renderIncomeBudgetBars(d);
  renderWeeklyBreakdown();
  renderAnomalias(d);
  renderTransactions(d);
  renderPatrimonio();
  if (typeof renderWalletCards === 'function') { window._walletNeedsUpdate = false; renderWalletCards(); }
  calcFire();
  if (typeof renderForecast === 'function') renderForecast();
}

function renderKPIs(d) {
  document.getElementById('k-ingresos').textContent = fmt(d.ingresos);
  document.getElementById('k-gastos').textContent   = fmt(d.gastos);
  const totalAhorros = activeMonths.reduce((s,m) => s + (EXCEL_DATA[m]?.ahorros||0), 0);
  document.getElementById('k-ahorros').textContent = fmt(d.ahorros);
  const kAhorrosSub = document.getElementById('k-ahorros-sub');
  if (kAhorrosSub) kAhorrosSub.textContent = 'Total: ' + fmt(totalAhorros);
  const bal   = d.balance;
  const balEl = document.getElementById('k-balance');
  balEl.textContent = (bal >= 0 ? '+' : '') + fmtSigned(bal);
  balEl.style.color = bal >= 0 ? 'var(--green)' : 'var(--red)';
  const score = calcScore(d);
  const [slabel, scolor] = scoreLabel(score);
  document.getElementById('k-score').textContent       = score + '/100';
  document.getElementById('k-score').style.color       = scolor;
  document.getElementById('k-score-label').textContent = slabel;
  document.getElementById('k-score-bar').style.width   = score + '%';
  syncEF();
  const avgSaving = activeMonths.reduce((s,m) => s + EXCEL_DATA[m].ahorros, 0) / activeMonths.length;
  document.getElementById('k-forecast').textContent = fmt(avgSaving * 12);
}

function calcScore(d) {
  if (!d.ingresos) return 0;
  let score = Math.min(d.ahorros/d.ingresos*200, 50) + Math.max(0, 50 - d.gastos/d.ingresos*50);
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
  const ratioAhorro = d.ingresos ? d.ahorros/d.ingresos : 0;
  const ratioGasto  = d.ingresos ? d.gastos/d.ingresos  : 0;
  if (d.balance < 0) alerts.push(['bad','🚨','Déficit de ' + fmt(Math.abs(d.balance)) + ' este mes. Gastos superaron ingresos + ajustes.']);
  else if (d.balance > 0) alerts.push(['ok','✅','Superávit de ' + fmt(d.balance) + ' — excelente gestión financiera este mes.']);
  if (ratioAhorro >= 0.20) alerts.push(['ok','🐷','Tasa de ahorro: ' + Math.round(ratioAhorro*100) + '% — sobre meta 20%. ¡Excelente disciplina!']);
  else if (ratioAhorro > 0) alerts.push(['warn','⚠️','Tasa de ahorro: ' + Math.round(ratioAhorro*100) + '%. Meta recomendada: 20%.']);
  if (ratioGasto > 1) alerts.push(['bad','🔴','Gastos = ' + Math.round(ratioGasto*100) + '% de ingresos. Estás gastando más de lo que entra.']);
  else if (ratioGasto > 0.8) alerts.push(['warn','🟡','Gastos = ' + Math.round(ratioGasto*100) + '% de ingresos. Margen financiero ajustado.']);
  const catExcedidas = Object.entries(d.cat_totals)
    .filter(([cat,amt]) => CONFIG.presupuestos[cat] > 0 && amt > CONFIG.presupuestos[cat]);
  if (catExcedidas.length) alerts.push(['bad','📊','Presupuesto excedido en: ' + catExcedidas.map(([c]) => c.replace(/[🛸🏡🥑💅🚑🚓🏦📺📽️]/gu,'')).join(', ')]);
  const ef    = (CONFIG.efManualBase||0) + (CONFIG.efAutoContrib||0);
  const efPct = ef / (CONFIG.emergencyFundGoal||3000);
  if (efPct < 0.20) alerts.push(['warn','🆘','Fondo de emergencia al ' + Math.round(efPct*100) + '%. Meta: ' + fmt(CONFIG.emergencyFundGoal) + '. Considera reforzarlo.']);
  else if (efPct >= 1) alerts.push(['ok','🆘','¡Fondo de emergencia completo! ' + fmt(ef) + ' acumulados.']);
  if (CONFIG.closedMonths.includes(currentMonth)) alerts.push(['info','🔒','El mes ' + currentMonth + ' está cerrado. Reabre para registrar movimientos.']);
  const topCat = Object.entries(d.cat_totals)[0];
  if (topCat) alerts.push(['info','📊','Top gasto: "' + topCat[0].replace(/[🛸🏡🥑💅🚑🚓🏦📺📽️]/gu,'') + '" — ' + fmt(topCat[1]) + ' (' + Math.round(topCat[1]/d.gastos*100) + '% del total).']);
  alerts.forEach(([type,icon,msg]) => {
    const div = document.createElement('div');
    div.className = 'alerta alerta-' + type;
    div.innerHTML = '<span class="alerta-icon">' + icon + '</span><span>' + msg + '</span>';
    c.appendChild(div);
  });
}
