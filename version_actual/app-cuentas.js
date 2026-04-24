

// ══════════════════════════════════════════════════════════
//  SISTEMA DE CUENTAS / BILLETERAS — v1
// ══════════════════════════════════════════════════════════
let CUENTAS = [];
const CUENTA_COLORS = [
  '#8b949e','#f85149','#ff8c42','#e3b341',
  '#3fb950','#58a6ff','#bc8cff','#7C3AED',
  '#009CDE','#E8A020','#39d353','#ff6b9d'
];
let ncColorSelected = '#3fb950';
let ncUsdOn = true;
let cuentaEditId = null;

// ── LOAD from Supabase ────────────────────────────────────
async function loadCuentas() {
  if (!currentUser) return;
  const hid = HOUSEHOLD_ID || currentUser.id;
  try {
    const { data, error } = await sb.from('cuentas')
      .select('*')
      .eq('user_id', hid)
      .order('created_at', { ascending: true });
    if (!error && data) {
      CUENTAS = data;
      // FIX-BATCH-XXVII: aplicar orden guardado (CONFIG o localStorage)
      _applyWalletOrder();
      renderWalletCards();
      updateHeroBalance();
      updateCuentaSelectInModal();
    }
  } catch(e) { console.warn('loadCuentas:', e); }
}

// ── RENDER WALLET CARDS (mobile scroll) ──────────────────
// FIX-FAVICON: extraer favicon de URL de sitio web de la cuenta
function getCuentaLogoHtml(c, size='card') {
  const fallback = escHtml(c.nombre.charAt(0).toUpperCase());
  // Usar _getCuentaFaviconUrl si está disponible (definida en app-voice.js)
  const faviconUrl = typeof _getCuentaFaviconUrl === 'function'
    ? _getCuentaFaviconUrl(c)
    : (c.logo_url || null);
  if (!faviconUrl) return fallback;
  const imgStyle = size === 'card'
    ? 'width:100%;height:100%;object-fit:cover;border-radius:50%'
    : 'width:100%;height:100%;object-fit:contain;border-radius:12px';
  return `<img src="${faviconUrl}" onerror="this.style.display='none';this.insertAdjacentText('afterend','${fallback}')" alt="${escHtml(c.nombre)}" style="${imgStyle}">`;
}

// Movimientos de una cuenta en un mes específico (cero si mes sin transacciones)
function calcCuentaBalanceMes(cuenta, mes) {
  const md = EXCEL_DATA[mes];
  if (!md) return 0;
  let delta = 0;
  (md.transactions || []).forEach(t => {
    if (t.cuenta_id !== cuenta.id) return;
    if (['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo)) delta += parseFloat(t.amount||0);
    else if (['Gasto','Ahorro en efectivo','Prestamo pagado'].includes(t.tipo)) delta -= parseFloat(t.amount||0);
    else if (t.tipo === 'Ajuste') delta += parseFloat(t.amount||0);
    else if (t.tipo === 'Transferencia Interna') {
      const isCredit = t.subcat==='credit'||(!t.subcat&&t.desc&&t.desc.includes('desde'));
      delta += isCredit ? parseFloat(t.amount||0) : -parseFloat(t.amount||0);
    }
  });
  return delta;
}

function renderWalletCards() {
  const container = document.getElementById('wallet-cards-container');
  if (!container) return;
  if (!CUENTAS.length) {
    container.innerHTML = '<div style="display:flex;align-items:center;padding:16px;color:#8b949e;font-size:.75rem;gap:8px"><span>💳</span> Agrega tu primera cuenta →</div>';
    return;
  }
  container.innerHTML = CUENTAS.map(c => {
    const bal = calcCuentaBalanceMes(c, currentMonth);
    const logoHtml = getCuentaLogoHtml(c, 'card'); // FIX-FAVICON
    return `
      <div class="wallet-card" style="background:${hexDim(c.color)};border:1px solid ${c.color}28"
           onclick="openCuentaDetail('${escHtml(c.id)}')">
        <div class="wallet-card-top">
          <div class="wallet-logo" style="background:${c.color}">${logoHtml}</div>
          <div>
            <div class="wallet-name">${escHtml(c.nombre)}</div>
            <div class="wallet-owner">${escHtml(c.owner||'')}</div>
          </div>
        </div>
        <div class="wallet-amount" style="color:${c.color}">${window._hideAmounts ? '••••' : '$'+bal.toFixed(2)}</div>
        <div style="font-size:.62rem;color:#8b949e;margin-top:1px">${window._hideAmounts ? '' : 'Bs '+(bal*(typeof rateBCV!=='undefined'?rateBCV:451.51)).toLocaleString('es-VE',{maximumFractionDigits:0})}</div>
      </div>`;
  }).join('');
}

// ── BALANCE OVERRIDE per account — Batch-XX ──────────────
async function saveCuentaOverride(cuentaId) {
  const input = document.getElementById('cdet-override-input');
  const val   = parseFloat(input?.value);
  if (isNaN(val)) { toast('Monto inválido', 'err'); return; }
  const c = (CUENTAS||[]).find(x => x.id === cuentaId);
  if (!c) return;
  const ok = await showConfirm('✏️ Ajustar saldo',
    `¿Establecer el saldo de "${c.nombre}" en $${val.toFixed(2)}? Los movimientos nuevos se sumarán encima de este valor.`, '💰');
  if (!ok) return;
  c.balance_override      = val;
  c.balance_override_date = new Date().toISOString().slice(0, 10);
  // Guardar en Supabase
  const hid = HOUSEHOLD_ID || currentUser?.id;
  try {
    const { error: overErr } = await sb.from('cuentas').update({
      balance_override: val,
      balance_override_date: c.balance_override_date
    }).eq('id', cuentaId).eq('user_id', hid);
    if (overErr) {
      // Columna no existe aún → ejecutar setup SQL en Supabase
      console.warn('[override] Supabase error:', overErr.message);
      toast('⚠️ Ejecuta el setup.sql en Supabase para habilitar ajuste de saldo.', 'err');
    } else {
      toast(`✅ Saldo de ${c.nombre} ajustado a $${val.toFixed(2)}`, 'ok');
      haptic('success');
    }
  } catch(e) {
    console.warn('[override] exception:', e.message);
    toast('Error guardando saldo: ' + e.message, 'err');
  }
  // Siempre re-renderizar (el override ya está en memoria)
  if (typeof renderWalletCards === 'function') renderWalletCards();
  if (typeof renderCuentasModalList === 'function') renderCuentasModalList();
  if (typeof renderCuentasV2List === 'function') renderCuentasV2List();
}

async function resetCuentaOverride(cuentaId) {
  const c = (CUENTAS||[]).find(x => x.id === cuentaId);
  if (!c) return;
  const ok = await showConfirm('Quitar ajuste manual', `¿Quitar el ajuste manual de "${c.nombre}"? El saldo volverá a calcularse desde el saldo inicial.`, '↩️');
  if (!ok) return;
  c.balance_override      = null;
  c.balance_override_date = null;
  const hid = HOUSEHOLD_ID || currentUser?.id;
  try {
    await sb.from('cuentas').update({ balance_override: null, balance_override_date: null }).eq('id', cuentaId).eq('user_id', hid);
    toast('Ajuste eliminado — saldo calculado automáticamente', 'ok');
    openCuentaDetail(cuentaId);
    if (typeof renderWalletCards === 'function') renderWalletCards();
    if (typeof renderCuentasModalList === 'function') renderCuentasModalList();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ── CALC BALANCE per account ──────────────────────────────
function calcCuentaBalance(cuenta) {
  // Batch-XX: si hay un override manual, usarlo como base y solo sumar movimientos POSTERIORES
  const overrideVal  = cuenta.balance_override != null ? parseFloat(cuenta.balance_override) : null;
  const overrideDate = cuenta.balance_override_date || null; // YYYY-MM-DD
  const baseBalance  = overrideVal != null ? overrideVal : parseFloat(cuenta.saldo_inicial || 0);
  let delta = 0;
  Object.values(EXCEL_DATA).forEach(monthData => {
    (monthData.transactions || []).forEach(t => {
      if (t.cuenta_id !== cuenta.id) return;
      // FIX-BATCH-XXVII: excluir txns sin fecha Y del mismo día del override
      if (overrideDate && (!t.date || t.date <= overrideDate)) return;
      if (['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo)) {
        delta += parseFloat(t.amount || 0);
      } else if (['Gasto','Ahorro en efectivo','Prestamo pagado'].includes(t.tipo)) {
        delta -= parseFloat(t.amount || 0);
      } else if (t.tipo === 'Ajuste') {
        delta += parseFloat(t.amount || 0);
      } else if (t.tipo === 'Transferencia Interna') {
        const isCredit = t.subcat === 'credit' ||
          (!t.subcat && t.desc && t.desc.includes('desde'));
        delta += isCredit ? parseFloat(t.amount || 0) : -parseFloat(t.amount || 0);
      }
    });
  });
  return baseBalance + delta;
}

// ── UPDATE HERO BALANCE ───────────────────────────────────
// FIX-HERO: Siempre muestra ingresos-gastos+ajustes del mes actual (nunca suma de cuentas)
function updateHeroBalance() {
  const hidden = !!window._hideAmounts;
  let totalUSD = 0;
  const d = EXCEL_DATA[currentMonth];
  if (d) totalUSD = d.balance || 0;
  const heroInt  = document.getElementById('hero-int');
  const heroDec  = document.getElementById('hero-dec');
  const heroBS   = document.getElementById('hero-bs');
  const heroSign = document.getElementById('hero-sign');
  if (hidden) {
    if (heroSign) heroSign.textContent = '';
    if (heroInt)  heroInt.textContent  = '••••';
    if (heroDec)  heroDec.textContent  = '';
    if (heroBS)   heroBS.textContent   = 'Bs ••••';
  } else {
    if (heroSign) heroSign.textContent = totalUSD < 0 ? '-' : '';
    if (heroInt)  heroInt.textContent  = Math.floor(Math.abs(totalUSD));
    if (heroDec)  heroDec.textContent  = '.' + (Math.abs(totalUSD) % 1).toFixed(2).slice(2);
    if (heroBS)   heroBS.textContent   = 'Bs ' + (Math.abs(totalUSD) * (rateBCV||1)).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2});
  }
  // Mobile income/expense
  if (d) {
    const mobInc = document.getElementById('mob-inc-val');
    const mobExp = document.getElementById('mob-exp-val');
    if (mobInc) mobInc.textContent = hidden ? '••••••' : fmt(d.ingresos||0);
    if (mobExp) mobExp.textContent = hidden ? '••••••' : fmt(d.gastos||0);
  }
  // Badge total on cuentas modal
  const badge = document.getElementById('cuentas-total-badge');
  if (badge) badge.textContent = CUENTAS.length + ' cuenta' + (CUENTAS.length!==1?'s':'');
}

// ── RENDER RECENT TXN on mobile ────────────────────────────
function renderMobileRecentTxn() {
  const container = document.getElementById('mobile-recent-list');
  if (!container) return;

  // Header ℹ️🤖 — inyectar una sola vez
  const hdr = document.querySelector('#mobile-recent-txn .wallet-section-header');
  if (hdr && !document.getElementById('recent-hdr-btns')) {
    const b = document.createElement('div');
    b.id = 'recent-hdr-btns';
    b.style.cssText = 'display:flex;gap:3px;align-items:center;margin-left:5px';
    b.innerHTML = '<button onclick="showCardInfo(\'transacciones\')" style="background:none;border:none;cursor:pointer;font-size:.8rem;padding:1px">&#x2139;&#xFE0F;</button>'
      + '<button onclick="askCardIA(\'transacciones\')" style="background:none;border:none;cursor:pointer;font-size:.8rem;padding:1px">&#x1F916;</button>';
    const title = hdr.querySelector('.wallet-section-title');
    if (title && title.parentNode === hdr) hdr.insertBefore(b, title.nextSibling);
  }

  // FIX-MES: mostrar solo movimientos del mes seleccionado
  var allTxns = [];
  var mesData = EXCEL_DATA[currentMonth];
  if (mesData) (mesData.transactions||[]).forEach(function(t){ if(t.tipo!=='Transferencia Interna') allTxns.push(t); });
  if (!allTxns.length) {
    container.innerHTML = '<div style="color:#8b949e;font-size:.75rem;padding:12px 0">No hay movimientos registrados.</div>';
    return;
  }
  const recent = allTxns.sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0,20);
  container.style.maxHeight = '350px';
  container.style.overflowY = 'auto';
  container.style.webkitOverflowScrolling = 'touch';

  function findMonthOf(id) {
    for (var m in EXCEL_DATA) {
      if ((EXCEL_DATA[m].transactions||[]).find(function(x){return x.id===id;})) return m;
    }
    return currentMonth;
  }

  var tipoBadge = { 'Gasto':'#f85149','Ingreso Fijo':'#3fb950','Ingreso Variable':'#3fb950','Ahorro en efectivo':'#58a6ff','Transferencia Interna':'#8b949e','Prestamo recibido':'#e3b341','Prestamo pagado':'#ff8c42' };

  container.innerHTML = recent.map(function(t) {
    var isPos = ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].indexOf(t.tipo) >= 0;
    var amtColor = isPos ? '#3fb950' : (t.tipo==='Ahorro en efectivo'?'#58a6ff':'#f85149');
    var bColor = tipoBadge[t.tipo] || '#8b949e';
    var icon = getCatIcon(t.cat);
    var cuenta = (CUENTAS||[]).find(function(cc){ return cc.id === t.cuenta_id; });
    var meta = [t.cat, cuenta && cuenta.nombre, formatDateShort(t.date)].filter(Boolean).join(' \xB7 ');
    var tipoShort = (t.tipo||'').replace('Ingreso Fijo','Ingreso').replace('Ingreso Variable','Ingr.Var').replace('Ahorro en efectivo','Ahorro').replace('Transferencia Interna','Transfer.');
    var month = findMonthOf(t.id);
    var tid = escHtml(t.id);
    return '<div class="mobile-txn-item" style="flex-direction:column;gap:0;align-items:stretch;padding:8px 10px">'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<div class="mobile-txn-icon" style="flex-shrink:0">' + icon + '</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div class="mobile-txn-title" style="font-size:.79rem">' + escHtml(t.desc||'—') + '</div>'
      + '<div class="mobile-txn-sub" style="font-size:.63rem">' + escHtml(meta) + '</div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">'
      + '<div class="mobile-txn-amount" style="color:' + amtColor + ';font-size:.84rem">' + (isPos?'+':'') + fmt(t.amount) + '</div>'
      + '<span style="font-size:.56rem;padding:1px 5px;border-radius:4px;background:' + bColor + '22;color:' + bColor + ';font-weight:600">' + escHtml(tipoShort) + '</span>'
      + '</div></div>'
      + '<div style="display:flex;justify-content:flex-end;gap:5px;margin-top:5px">'
      + '<button onclick="editMov(\'' + tid + '\',\'' + month + '\')" style="background:none;border:1px solid #30363d;color:#58a6ff;border-radius:5px;padding:2px 8px;font-size:.62rem;cursor:pointer">\u270F\uFE0F Editar</button>'
      + '<button onclick="deleteMov(\'' + tid + '\',\'' + month + '\')" style="background:none;border:1px solid #30363d;color:#f85149;border-radius:5px;padding:2px 8px;font-size:.62rem;cursor:pointer">\uD83D\uDDD1 Eliminar</button>'
      + '</div></div>';
  }).join('');
}
function getCatIcon(cat) {
  const icons = {
    '🍽':['antojo','comida'],'🏡':['casa','condominio','internet'],'🚗':['transporte','yummy'],
    '💅':['personal','cabello','manos','cejas'],'🛸':['otros'],'🥑':['mercado','comida'],
    '📺':['suscri','netflix'],'🏦':['cashea','banco'],'💼':['sueldo','salario','ingreso'],
    '✈️':['viaje'],'🚑':['salud'],'💰':['ahorro'],'🎓':['educaci']
  };
  const catL = (cat||'').toLowerCase();
  for(const [icon,keys] of Object.entries(icons)) {
    if(keys.some(k=>catL.includes(k))) return icon;
  }
  return '💳';
}

function formatDateShort(d) {
  if(!d) return '';
  const parts = d.split('-');
  return parts[2]+'/'+parts[1];
}

// ── SCROLL LOCK — evita interacción con dashboard detrás de paneles ──────
let _lockScrollY = 0;
function lockScroll() {
  // FIX-XI-7: preservar scroll position (evita salto al desbloquear en iOS)
  _lockScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.top = `-${_lockScrollY}px`;
  document.body.classList.add('modal-open');
  // FIX-SCROLL-HTML: también bloquear en <html> para Android Chrome
  document.documentElement.classList.add('modal-open');
  // body.modal-open ya aplica overflow:hidden + touch-action:none — eso es suficiente.
  // NO se aplica pointer-events:none en app-shell: causaba que modal-confirm y otros
  // elementos dentro del shell quedaran bloqueados (race condition con numpad 320ms).
  const fab = document.getElementById('fab-nuevo');
  if (fab) { fab.style.opacity='0'; fab.style.pointerEvents='none'; fab.style.transform='scale(0.7)'; fab.style.transition='opacity .2s,transform .2s'; }
}
function unlockScroll() {
  document.body.classList.remove('modal-open');
  document.documentElement.classList.remove('modal-open');
  // FIX-XI-7: restaurar scroll position
  const savedY = _lockScrollY || 0;
  document.body.style.top = '';
  window.scrollTo(0, savedY);
  // FIX-FAB-v4: solo bloquear FAB si hay un .modal-overlay.open o numpad
  // Nada más. Dinero-fuera usa overlay que se remueve del DOM — no bloquea.
  requestAnimationFrame(() => {
    const anyModalOpen = document.querySelector('.modal-overlay.open, .modal.open');
    const numpadOpen   = document.getElementById('numpad-overlay')?.classList.contains('open');
    if (!anyModalOpen && !numpadOpen) {
      const fab = document.getElementById('fab-nuevo');
      if (fab) {
        // FIX-FAB-v5: limpiar inline styles Y forzar display explícito
        fab.style.opacity       = '1';
        fab.style.pointerEvents = 'auto';
        fab.style.transform     = 'scale(1)';
        fab.style.display       = 'flex';
        // Limpiar después del transition para dejar que CSS tome control
        setTimeout(() => {
          if (!document.querySelector('.modal-overlay.open, .modal.open')) {
            fab.style.opacity       = '';
            fab.style.pointerEvents = '';
            fab.style.transform     = '';
            fab.style.display       = '';
          }
        }, 250);
      }
    }
  });
}

// FAB forzado — llamar cuando un panel cierra y se sabe que no hay nada más abierto
function forceShowFab() {
  requestAnimationFrame(() => {
    const fab = document.getElementById('fab-nuevo');
    if (fab) {
      fab.style.opacity = '';
      fab.style.pointerEvents = '';
      fab.style.transform = '';
    }
  });
}
// Alias para modales que abren sin lockScroll/unlockScroll propio
function openModalLock(id) {
  lockScroll();
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModalLock(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  unlockScroll();
}

// ── MODAL CUENTAS ─────────────────────────────────────────
function openModalCuentas() {
  lockScroll();
  document.getElementById('modal-cuentas').classList.add('open');
  renderCuentasModalList();
  const totalUSD = CUENTAS.reduce((s,c) => s+calcCuentaBalance(c), 0);
  const el = document.getElementById('cuentas-modal-total');
  const elBs = document.getElementById('cuentas-modal-total-bs');
  if(el) el.textContent = '$'+totalUSD.toFixed(2);
  if(elBs) elBs.textContent = 'Bs '+(totalUSD*(rateBCV||1)).toFixed(2);
}
function closeModalCuentas() {
  unlockScroll();
  document.getElementById('modal-cuentas').classList.remove('open');
}
function renderCuentasModalList() {
  const container = document.getElementById('cuentas-lista-modal');
  if(!container) return;
  if(!CUENTAS.length) {
    container.innerHTML = '<div style="color:#8b949e;font-size:.78rem;text-align:center;padding:20px">No tienes cuentas. Agrega una →</div>';
    return;
  }
  container.innerHTML = CUENTAS.map(c => {
    const bal = calcCuentaBalance(c);
    const logoHtml = getCuentaLogoHtml(c, 'detail'); // FIX-FAVICON
    return `
      <div class="cuenta-list-item">
        <div class="cuenta-logo-wrap" style="background:${c.color}">${logoHtml}</div>
        <div class="cuenta-info">
          <div class="cuenta-name">${escHtml(c.nombre)}</div>
          <div class="cuenta-balance" style="color:${c.color}">$${bal.toFixed(2)}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="editCuenta('${escHtml(c.id)}')" style="background:#13181f;border:1px solid #30363d;color:#58a6ff;border-radius:8px;padding:5px 10px;font-size:.7rem;cursor:pointer">✏️</button>
          <button onclick="deleteCuenta('${escHtml(c.id)}')" style="background:#13181f;border:1px solid #3d1a1a;color:#f85149;border-radius:8px;padding:5px 10px;font-size:.7rem;cursor:pointer">🗑</button>
        </div>
      </div>`;
  }).join('');
}

// ── NUEVA CUENTA MODAL ────────────────────────────────────
function openNuevaCuenta() {
  // FIX-VII-11: null checks en todos los elementos antes de acceder
  const parentPanels = ['modal-cuentas','modal-cuentas-v2-view'];
  parentPanels.forEach(id => { const el = document.getElementById(id); if(el) el.classList.remove('open'); });
  cuentaEditId = null;
  const titleEl = document.getElementById('nueva-cuenta-title');
  if(titleEl) titleEl.textContent = '💳 Nueva Cuenta';
  const editIdEl   = document.getElementById('nc-edit-id');    if(editIdEl)   editIdEl.value   = '';
  const nombreEl   = document.getElementById('nc-nombre');     if(nombreEl)   nombreEl.value   = '';
  const logoEl     = document.getElementById('nc-logo-url');   if(logoEl)     logoEl.value     = '';
  const saldoEl    = document.getElementById('nc-saldo');      if(saldoEl)    saldoEl.value    = '';
  ncColorSelected = '#3fb950';
  ncUsdOn = false;
  renderColorPicker();
  updateLogoPreview();
  const usdDot = document.getElementById('nc-usd-dot');
  if(usdDot) { usdDot.style.left = '2px'; usdDot.style.background = '#8b949e'; }
  const usdToggle = document.getElementById('nc-usd-toggle');
  if(usdToggle) usdToggle.style.background = '#21262d';
  window._ncTipo = 'nacional';
  const intlField   = document.getElementById('nc-intl-field');   if(intlField)   intlField.style.display   = 'none';
  const bancoPaisEl = document.getElementById('nc-banco-pais');   if(bancoPaisEl) bancoPaisEl.value          = '';
  setCuentaTipo('nacional');
  lockScroll();
  document.getElementById('modal-nueva-cuenta').classList.add('open');
}
function closeNuevaCuenta() {
  unlockScroll();
  document.getElementById('modal-nueva-cuenta').classList.remove('open');
}
function setCuentaTipo(tipo) {
  window._ncTipo = tipo;
  document.getElementById('ct-nacional').style.background    = tipo==='nacional'?'#1a3d26':'#13181f';
  document.getElementById('ct-nacional').style.color         = tipo==='nacional'?'#3fb950':'#8b949e';
  document.getElementById('ct-nacional').style.borderColor   = tipo==='nacional'?'#3fb950':'#21262d';
  document.getElementById('ct-internacional').style.background  = tipo==='internacional'?'#0d1e35':'#13181f';
  document.getElementById('ct-internacional').style.color        = tipo==='internacional'?'#58a6ff':'#8b949e';
  document.getElementById('ct-internacional').style.borderColor  = tipo==='internacional'?'#58a6ff':'#21262d';
  // Mostrar/ocultar campo banco/país
  const intlField = document.getElementById('nc-intl-field');
  if (intlField) intlField.style.display = tipo==='internacional' ? 'block' : 'none';
}
function renderColorPicker() {
  const row = document.getElementById('nc-color-row');
  if(!row) return;
  row.innerHTML = CUENTA_COLORS.map(c =>
    `<div class="color-swatch${c===ncColorSelected?' selected':''}" 
      style="background:${c}" 
      onclick="selectCuentaColor('${c}')"></div>`
  ).join('');
}
function selectCuentaColor(color) {
  ncColorSelected = color;
  renderColorPicker();
  updateLogoPreview();
}
function updateLogoPreview() {
  const preview = document.getElementById('nc-logo-preview');
  if(!preview) return;
  const nombre = document.getElementById('nc-nombre').value || '';
  const url = document.getElementById('nc-logo-url').value || '';
  preview.style.background = ncColorSelected;
  if(url) {
    preview.innerHTML = `<img src="${escHtml(url)}" style="width:100%;height:100%;object-fit:cover;border-radius:9px" onerror="this.parentElement.textContent='${escHtml(nombre.charAt(0)||'?')}'">`;
  } else {
    preview.textContent = nombre.charAt(0).toUpperCase() || '💳';
  }
}
function toggleUSDToggle() {
  ncUsdOn = !ncUsdOn;
  const dot = document.getElementById('nc-usd-dot');
  const tog = document.getElementById('nc-usd-toggle');
  dot.style.left = ncUsdOn ? '22px' : '2px';
  dot.style.background = ncUsdOn ? '#3fb950' : '#8b949e';
  tog.style.background = ncUsdOn ? '#1a3d26' : '#21262d';
  tog.style.borderColor = ncUsdOn ? '#3fb950' : '#30363d';
}
async function saveCuenta() {
  const nombre = document.getElementById('nc-nombre').value.trim();
  const logoUrl = document.getElementById('nc-logo-url').value.trim();
  const saldoInicial = parseFloat(document.getElementById('nc-saldo').value) || 0;
  if(!nombre) { toast('Escribe el nombre de la cuenta','err'); return; }
  if(!currentUser) { toast('No autenticado','err'); return; }
  const hid = HOUSEHOLD_ID || currentUser.id;
  const esInternacional = window._ncTipo === 'internacional';
  const bancoPais = esInternacional ? (document.getElementById('nc-banco-pais')?.value.trim() || '') : '';
  const payload = {
    user_id: hid,
    household_id: hid,   // FIX-RLS: requerido por política cuentas_household
    nombre,
    logo_url: logoUrl || null,
    color: ncColorSelected,
    saldo_inicial: saldoInicial,
    moneda: 'USD',   // Internacional siempre USD; nacional respeta el toggle
    owner: getDisplayName(currentUser.email),
    internacional: esInternacional,
    banco_pais: bancoPais || null
  };
  if (!esInternacional) payload.moneda = ncUsdOn ? 'USD' : 'BS';

  // FIX-IX-1: retry escalonado 3 niveles para schema cache de Supabase/PostgREST.
  // PostgREST cachea el schema hasta 5 min tras un ALTER TABLE — puede rechazar
  // columnas nuevas (banco_pais, internacional, moneda) durante ese periodo.
  // Nivel 1: payload completo
  // Nivel 2: sin banco_pais (campo más reciente)
  // Nivel 3: solo campos base garantizados (user_id, nombre, logo_url, color, saldo_inicial, owner)
  // Si se cae a nivel 2 o 3, se muestra toast de advertencia al usuario.
  async function tryUpsert(p) {
    if (cuentaEditId) {
      return await sb.from('cuentas').update(p).eq('id', cuentaEditId);
    } else {
      return await sb.from('cuentas').insert(p);
    }
  }
  function isSchemaError(err) {
    if (!err?.message) return false;
    return err.message.includes('banco_pais') ||
           err.message.includes('internacional') ||
           err.message.includes('moneda') ||
           err.message.includes('schema cache') ||
           err.message.includes('column') ||
           err.message.includes('does not exist');
  }

  let { error } = await tryUpsert(payload);

  if (error && isSchemaError(error)) {
    // Nivel 2: sin banco_pais
    const p2 = {...payload}; delete p2.banco_pais;
    const r2 = await tryUpsert(p2);
    error = r2.error;
    if (!error) {
      if (bancoPais) toast('⚠️ Banco/país no guardado (schema cache). Edita la cuenta en 5 min.', 'ok');
    }
  }
  if (error && isSchemaError(error)) {
    // Nivel 3: solo campos base
    const p3 = {
      user_id: payload.user_id,
      nombre: payload.nombre,
      logo_url: payload.logo_url,
      color: payload.color,
      saldo_inicial: payload.saldo_inicial,
      owner: payload.owner
    };
    const r3 = await tryUpsert(p3);
    error = r3.error;
    if (!error) toast('⚠️ Cuenta guardada sin moneda/tipo (schema cache). Edita en 5 min.', 'ok');
  }

  if (error) { toast('Error al guardar: '+error.message,'err'); return; }
  toast(cuentaEditId ? '✅ Cuenta actualizada' : '✅ Cuenta creada', 'ok');
  closeNuevaCuenta();
  await loadCuentas();
  renderCuentasModalList();
}
async function editCuenta(id) {
  const c = CUENTAS.find(x=>x.id===id);
  if(!c) return;
  cuentaEditId = id;
  const titleEl  = document.getElementById('nueva-cuenta-title'); if(titleEl)  titleEl.textContent       = '✏️ Editar Cuenta';
  const editIdEl = document.getElementById('nc-edit-id');          if(editIdEl) editIdEl.value            = id;
  const nombreEl = document.getElementById('nc-nombre');           if(nombreEl) nombreEl.value            = c.nombre;
  const logoEl   = document.getElementById('nc-logo-url');         if(logoEl)   logoEl.value              = c.logo_url || '';
  const saldoEl  = document.getElementById('nc-saldo');            if(saldoEl)  saldoEl.value             = c.saldo_inicial;
  ncColorSelected = c.color || '#3fb950';
  ncUsdOn = c.moneda === 'USD';
  renderColorPicker();
  updateLogoPreview();
  const dot = document.getElementById('nc-usd-dot');
  const tog = document.getElementById('nc-usd-toggle');
  if(dot) { dot.style.left = ncUsdOn ? '22px' : '2px'; dot.style.background = ncUsdOn ? '#3fb950' : '#8b949e'; }
  if(tog) tog.style.background = ncUsdOn ? '#1a3d26' : '#21262d';
  // FIX-ZINDEX: cerrar detail antes de abrir formulario edición
  ['modal-cuenta-detail','modal-cuentas','modal-cuentas-v2-view'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
  lockScroll();
  document.getElementById('modal-nueva-cuenta').classList.add('open');
}
async function deleteCuenta(id) {
  const c = CUENTAS.find(x=>x.id===id);
  if(!c) return;
  const ok = await showConfirm('Eliminar cuenta', `¿Eliminar "${c.nombre}"? Los movimientos vinculados perderán la referencia.`, '🗑');
  if(!ok) return;
  const { error } = await sb.from('cuentas').delete().eq('id', id);
  if(error) { toast('Error: '+error.message,'err'); return; }
  toast('🗑 Cuenta eliminada');
  await loadCuentas();
  renderCuentasModalList();
}
function openCuentaDetail(id) {
  if(!id) { toast('ID de cuenta inválido','err'); return; }
  const c = (CUENTAS||[]).find(x=>x.id===id);
  if(!c) { toast('Cuenta no encontrada','err'); return; }
  // FIX-XVIII-3: cerrar TODOS los modales de lista de cuentas antes de abrir detail
  // Esto evita que el detail quede detrás de modal-cuentas o modal-cuentas-v2-view
  ['modal-cuentas','modal-cuentas-v2-view'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
  // Ensure modal HTML elements exist
  const requiredIds = ['cdet-hero','cdet-title','cdet-owner','cdet-balance','cdet-balance-bs','cdet-stats','cdet-meta-bar','cdet-txn-list'];
  for(const rid of requiredIds) {
    if(!document.getElementById(rid)) { toast('Error: Modal de cuenta no cargado','err'); console.error('Missing element: '+rid); return; }
  }
  _cdetCuentaId = id;
  // Set hero
  const bal = calcCuentaBalance(c);
  document.getElementById('cdet-title').innerHTML = 
    `<div style="width:28px;height:28px;border-radius:8px;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;overflow:hidden">${c.logo_url?`<img src="${escHtml(c.logo_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.parentElement.textContent='${escHtml(c.nombre.charAt(0))}'">`:escHtml(c.nombre.charAt(0).toUpperCase())}</div> ${escHtml(c.nombre)}`;
  const hero = document.getElementById('cdet-hero');
  hero.style.background = `linear-gradient(140deg,${hexDim(c.color)},${hexDim(c.color)}cc)`;
  hero.style.border = `1px solid ${c.color}30`;
  document.getElementById('cdet-owner').textContent = c.owner || '';
  // FIX-HIDE-DETAIL: respetar _hideAmounts en detalle de cuenta
  document.getElementById('cdet-balance').textContent = window._hideAmounts
    ? '••••••'
    : '$' + bal.toFixed(2);
  document.getElementById('cdet-balance-bs').innerHTML = window._hideAmounts
    ? '<span style="color:' + c.color + '">Bs ••••••</span>'
    : '<span style="color:' + c.color + '">Bs ' + (bal * (rateBCV || 1)).toFixed(2) + '</span>';
  // Stats
  const allTxns = [];
  Object.values(EXCEL_DATA).forEach(md => {
    (md.transactions||[]).forEach(t => { if(t.cuenta_id===id) allTxns.push(t); });
  });
  const ingresos = allTxns.filter(t=>['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo)).reduce((s,t)=>s+t.amount,0);
  const gastos   = allTxns.filter(t=>t.tipo==='Gasto').reduce((s,t)=>s+t.amount,0);
  const statGrid = document.getElementById('cdet-stats');
  const ajustes  = allTxns.filter(t=>t.tipo==='Ajuste').reduce((s,t)=>s+t.amount,0);
  // FIX-HIDE-STATS: respetar _hideAmounts en todas las cifras del detalle
  const _h = !!window._hideAmounts;
  const fmt = (v, prefix='$') => _h ? '••••••' : prefix + v.toFixed(2);
  const fmtN = (v) => _h ? '••••' : String(v);
  const overrideInfo = c.balance_override != null
    ? `<div class="cuenta-stat" style="grid-column:1/-1;background:#1a160d;border-radius:6px;padding:6px 10px;margin-top:4px">
        <div style="font-size:.6rem;color:#e3b341">✏️ Saldo ajustado manualmente el ${c.balance_override_date||'—'}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          <span style="font-size:.7rem;color:#8b949e">Base override: ${fmt(parseFloat(c.balance_override))} + nuevos movimientos</span>
          <button onclick="resetCuentaOverride('${escHtml(c.id)}')" style="background:none;border:1px solid #484f58;color:#484f58;border-radius:4px;font-size:.6rem;padding:2px 6px;cursor:pointer">Quitar ajuste</button>
        </div>
      </div>` : '';
  statGrid.innerHTML = `
    <div class="cuenta-stat">
      <div class="cuenta-stat-label">Total ingresos</div>
      <div class="cuenta-stat-val" style="color:#3fb950">${fmt(ingresos)}</div>
    </div>
    <div class="cuenta-stat">
      <div class="cuenta-stat-label">Total gastos</div>
      <div class="cuenta-stat-val" style="color:#f85149">${fmt(gastos)}</div>
    </div>
    <div class="cuenta-stat">
      <div class="cuenta-stat-label">Ajustes</div>
      <div class="cuenta-stat-val" style="color:#bc8cff">${fmt(ajustes)}</div>
    </div>
    <div class="cuenta-stat">
      <div class="cuenta-stat-label">Movimientos</div>
      <div class="cuenta-stat-val" style="color:#58a6ff">${fmtN(allTxns.length)}</div>
    </div>
    <div class="cuenta-stat" style="grid-column:1/-1">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:.68rem;color:#8b949e">✏️ Ajustar saldo actual (override)<br><span style="font-size:.6rem;color:#484f58">Solo movimientos posteriores a este ajuste se sumarán/restarán</span></span>
        <div style="display:flex;gap:6px;align-items:center">
          <input id="cdet-override-input" type="number" value="${bal.toFixed(2)}" step="0.01"
            style="width:90px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:3px 7px;border-radius:5px;font-size:.75rem;outline:none">
          <button onclick="saveCuentaOverride('${escHtml(c.id)}')" style="background:#21262d;border:1px solid #3fb950;color:#3fb950;padding:3px 10px;border-radius:5px;font-size:.68rem;cursor:pointer">Guardar</button>
        </div>
      </div>
    </div>
    ${overrideInfo}`;
  // Meta bar
  const metaBar = document.getElementById('cdet-meta-bar');
  const meta = (CUENTAS_METAS||{})[id];
  if(meta && meta.objetivo > 0) {
    const pct = Math.min(100, Math.round((bal / meta.objetivo)*100));
    metaBar.style.display = 'block';
    metaBar.innerHTML = `
      <div class="meta-progress-wrap" style="border-color:${c.color}40">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:12px;color:#e6edf3;font-weight:600">🎯 ${escHtml(meta.nombre||'Meta')}</span>
          <span style="font-size:11px;color:${c.color}">${_h ? '••%' : pct+'%'}</span>
        </div>
        <div class="meta-bar-track">
          <div class="meta-bar-fill" style="width:${_h ? 0 : pct}%;background:${c.color}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px">
          <span style="font-size:11px;color:#3fb950">${_h ? '••••••' : '$'+bal.toFixed(2)}</span>
          <span style="font-size:11px;color:#8b949e">${_h ? 'de ••••••' : 'de $'+meta.objetivo.toFixed(2)}</span>
        </div>
      </div>`;
  } else {
    metaBar.style.display = 'none';
  }
  // Transactions
  const txnList = document.getElementById('cdet-txn-list');
  const sorted = [...allTxns].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
  if(!sorted.length) {
    txnList.innerHTML = '<div style="color:#8b949e;font-size:.75rem;padding:12px 0;text-align:center">Sin movimientos aún. Vincula esta cuenta al registrar un movimiento.</div>';
  } else {
    txnList.innerHTML = sorted.map(t => {
      const isPos = ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo);
      const color = isPos ? '#3fb950' : '#f85149';
      return `
        <div class="cuenta-txn-row">
          <div class="cuenta-txn-icon">${getCatIcon(t.cat)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:#e6edf3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.desc)}</div>
            <div style="font-size:10px;color:#8b949e">${typeof fmtDate==='function'?fmtDate(t.date||''):t.date||''} · ${t.cat||''}</div>
          </div>
          <div style="font-size:13px;font-weight:700;color:${color};flex-shrink:0">${_h ? '••••' : (isPos?'+':'')+'$'+t.amount.toFixed(2)}</div>
        </div>`;
    }).join('');
  }
  lockScroll();
  document.getElementById('modal-cuenta-detail').classList.add('open');
}
let _cdetCuentaId = null;
function closeModalCuentaDetail() {
  document.getElementById('modal-cuenta-detail').classList.remove('open');
  _cdetCuentaId = null;
  unlockScroll();
}
function editCuentaFromDetail() {
  if(_cdetCuentaId) { var _sid=_cdetCuentaId; closeModalCuentaDetail(); setTimeout(function(){ editCuenta(_sid); },120); }
}
function openMetaCuentaFromDetail() {
  if(_cdetCuentaId) openMetaCuenta(_cdetCuentaId);
}

// ── UPDATE CUENTA SELECT IN MOVEMENT MODAL ────────────────
function updateCuentaSelectInModal() {
  const sel = document.getElementById('f-cuenta');
  if(!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Sin cuenta —</option>';
  CUENTAS.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nombre;
    sel.appendChild(opt);
  });
  if(current) sel.value = current;
}

// ── FAB SUBMENU ───────────────────────────────────────────
function toggleFabMenu() {
  const submenu = document.getElementById('fab-submenu');
  const fab = document.getElementById('fab-nuevo');
  if(!submenu || !fab) { openModal(); return; }
  const isOpen = submenu.classList.contains('open');
  if(isOpen) {
    submenu.classList.remove('open');
    fab.classList.remove('fab-open');
    fab.textContent = '＋';
  } else {
    submenu.classList.add('open');
    fab.classList.add('fab-open');
    fab.textContent = '✕';
  }
}
function closeFabMenu() {
  const submenu = document.getElementById('fab-submenu');
  const fab = document.getElementById('fab-nuevo');
  if(submenu) submenu.classList.remove('open');
  if(fab) { fab.classList.remove('fab-open'); fab.textContent = '＋'; }
}
function openTemplateQuick() {
  // Open movement modal with template selector pre-focused
  openModal();
  setTimeout(()=>{
    const tList = document.getElementById('template-list');
    if(tList) tList.scrollIntoView({behavior:'smooth'});
  }, 400);
}
// Close fab on background tap
document.addEventListener('click', e => {
  const submenu = document.getElementById('fab-submenu');
  const fab = document.getElementById('fab-nuevo');
  if(submenu && submenu.classList.contains('open')) {
    if(!submenu.contains(e.target) && e.target!==fab) {
      closeFabMenu();
    }
  }
});

// ── NAV RIAL STYLE ────────────────────────────────────────
function pwaNavRial(section) {
  haptic('light');
  document.querySelectorAll('.pwa-nav-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('nav-' + section);
  if(activeBtn) activeBtn.classList.add('active');
  switch(section) {
    case 'dashboard':
      // FIX-VII-4: al volver al dashboard, restaurar FAB si no hay modal abierto
      unlockScroll();
      window.scrollTo({top:0, behavior:'smooth'});
      break;
    case 'presupuesto':
      const budgetEl = document.querySelector('[data-label*="Presupuesto"], #dash-s-presupuesto');
      if(budgetEl) budgetEl.scrollIntoView({behavior:'smooth'});
      else window.scrollTo({top: document.body.scrollHeight/2, behavior:'smooth'});
      break;
    case 'ia': openIA(); break;
    case 'config': openSettings(); break;
    case 'mas': openMobileMenu(); break;
  }
}

// ── SIDEBAR DESKTOP ───────────────────────────────────────
function sidebarNav(section) {
  document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('sb-'+section);
  if(btn) btn.classList.add('active');
}
function toggleDesktopSidebar() {
  document.body.classList.toggle('show-sidebar');
}

// ── HELPERS ───────────────────────────────────────────────
function hexDim(hex) {
  // Create a dimmed version of hex color for card backgrounds
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${Math.round(r*.25)},${Math.round(g*.25)},${Math.round(b*.25)},1)`;
}
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── HOOK INTO EXISTING renderDashboard ───────────────────
const _origRenderDash = typeof renderDashboard === 'function' ? renderDashboard : null;
if(_origRenderDash) {
  renderDashboard = function(...args) {
    _origRenderDash.apply(this, args);
    updateHeroBalance();
    renderMobileRecentTxn();
  };
} else {
  // Fallback: run after DOMContentLoaded
  document.addEventListener('finanzas-ready', () => {
    updateHeroBalance();
    renderMobileRecentTxn();
  });
}

// ── HOOK loadCuentas into app init ────────────────────────
const _origOnLoginSuccess = typeof onLoginSuccess === 'function' ? onLoginSuccess : null;
// We call loadCuentas after init - use a MutationObserver on app-shell visibility
const _appShellObserver = new MutationObserver((mutations) => {
  for(const m of mutations) {
    if(m.type==='attributes' && m.attributeName==='style') {
      const shell = document.getElementById('app-shell');
      if(shell && shell.style.display !== 'none') {
        setTimeout(() => {
          loadCuentas();
          renderColorPicker();
          updateSidebarUser();
        }, 800);
        _appShellObserver.disconnect();
        break;
      }
    }
  }
});
const _shell = document.getElementById('app-shell');
if(_shell) _appShellObserver.observe(_shell, {attributes:true});

function updateSidebarUser() {
  if(!currentUser) return;
  const name = getDisplayName(currentUser.email);
  const sbName = document.getElementById('sidebar-name');
  const sbAvatar = document.getElementById('sidebar-avatar');
  if(sbName) sbName.textContent = name;
  if(sbAvatar) sbAvatar.textContent = name.charAt(0).toUpperCase();
}

// Patch saveMovimiento to include cuenta_id
const _origSaveMov = window.saveMovimiento;
window.saveMovimientoOrig = _origSaveMov;
// We patch the submit to add cuenta_id after the main function runs
// by hooking into the upsert call via the movement object
// Note: saveMovimiento reads f-cuenta field and includes it in mov object
// The original function references a local `mov` object - we need to
// ensure cuenta_id gets passed through. We override openModal/saveMovimiento:
const _origOpenModal = typeof openModal === 'function' ? openModal : null;
if(_origOpenModal) {
  window.openModal = function(prefill) {
    _origOpenModal.call(this, prefill);
    updateCuentaSelectInModal();
    if(prefill && prefill.cuenta_id) {
      const sel = document.getElementById('f-cuenta');
      if(sel) sel.value = prefill.cuenta_id;
    }
  };
}



// ─── ORDEN BILLETERAS — BATCH-XXVII ─────────────────────────────────
const WALLET_ORDER_KEY = 'fin_wallet_order';

function _applyWalletOrder() {
  // Prioridad: CONFIG.walletOrder (Supabase) → localStorage
  const order = (CONFIG && CONFIG.walletOrder && CONFIG.walletOrder.length)
    ? CONFIG.walletOrder
    : (() => { try { return JSON.parse(localStorage.getItem(WALLET_ORDER_KEY) || '[]'); } catch(e) { return []; } })();
  if (!order.length || !CUENTAS.length) return;
  CUENTAS.sort((a, b) => {
    const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
    return (ia === -1 ? 9999 : ia) - (ib === -1 ? 9999 : ib);
  });
}

function _saveWalletOrder() {
  const order = CUENTAS.map(c => c.id);
  localStorage.setItem(WALLET_ORDER_KEY, JSON.stringify(order));
  if (typeof CONFIG !== 'undefined') {
    CONFIG.walletOrder = order;
    if (typeof sbSaveConfig === 'function') sbSaveConfig();
  }
}

let _walletReorderActive = false;

function toggleWalletReorder() {
  _walletReorderActive = !_walletReorderActive;
  const btn = document.getElementById('btn-reorder-wallets');
  if (btn) {
    btn.textContent = _walletReorderActive ? '✅ Listo' : '🔀 Orden';
    btn.style.color = _walletReorderActive ? '#3fb950' : '#8b949e';
    btn.style.borderColor = _walletReorderActive ? '#3fb950' : '#30363d';
    btn.style.background = _walletReorderActive ? 'rgba(63,185,80,.12)' : 'transparent';
  }
  _renderWalletReorderable();
}

function _renderWalletReorderable() {
  var container = document.getElementById('wallet-cards-container');
  if (!container || !CUENTAS.length) return;
  if (!_walletReorderActive) { renderWalletCards(); return; }

  container.innerHTML = CUENTAS.map(function(c) {
    var bal = calcCuentaBalance(c);
    return '<div class="wallet-card" data-wid="' + escHtml(c.id) + '"'
      + ' style="background:' + hexDim(c.color) + ';border:2px dashed ' + c.color + ';cursor:grab;position:relative;user-select:none"'
      + ' draggable="true" ondragstart="_wDragStart(event)" ondragover="_wDragOver(event)"'
      + ' ondrop="_wDrop(event)" ondragend="_wDragEnd(event)">'
      + '<div style="position:absolute;top:5px;right:6px;font-size:.72rem;opacity:.5;pointer-events:none">&#x2630;</div>'
      + '<div class="wallet-card-top">'
      + '<div class="wallet-logo" style="background:' + c.color + '">' + getCuentaLogoHtml(c,'card') + '</div>'
      + '<div><div class="wallet-name">' + escHtml(c.nombre) + '</div>'
      + '<div class="wallet-owner" style="font-size:.55rem;color:#8b949e">Arrastra p/ reordenar</div></div>'
      + '</div>'
      + '<div class="wallet-amount" style="color:' + c.color + '">$' + bal.toFixed(2) + '</div>'
      + '</div>';
  }).join('');
}

let _wDragSrc = null;
function _wDragStart(e) { _wDragSrc = e.currentTarget; e.currentTarget.style.opacity='.4'; e.dataTransfer.effectAllowed='move'; }
function _wDragOver(e)  { e.preventDefault(); e.dataTransfer.dropEffect='move'; return false; }
function _wDrop(e) {
  e.stopPropagation();
  if (!_wDragSrc || _wDragSrc === e.currentTarget) return false;
  const srcId = _wDragSrc.dataset.wid, tgtId = e.currentTarget.dataset.wid;
  const si = CUENTAS.findIndex(c=>c.id===srcId), ti = CUENTAS.findIndex(c=>c.id===tgtId);
  if (si < 0 || ti < 0) return;
  const tmp = CUENTAS[si]; CUENTAS[si] = CUENTAS[ti]; CUENTAS[ti] = tmp;
  _saveWalletOrder();
  _renderWalletReorderable();
  if (typeof toast === 'function') toast('Orden guardado ✅','ok');
}
function _wDragEnd(e) { if(e.currentTarget) e.currentTarget.style.opacity='1'; _wDragSrc = null; }

// ─── ORDEN ACCESOS RÁPIDOS ─────────────────────────────────────────
const SHORTCUT_ORDER_KEY = 'fin_shortcut_order';
let _shortcutReorderActive = false;

function toggleShortcutReorder() {
  _shortcutReorderActive = !_shortcutReorderActive;
  const btn = document.getElementById('btn-reorder-shortcuts');
  if (btn) {
    btn.textContent = _shortcutReorderActive ? '✅ Listo' : '🔀 Orden';
    btn.style.color = _shortcutReorderActive ? '#3fb950' : '#8b949e';
    btn.style.borderColor = _shortcutReorderActive ? '#3fb950' : '#30363d';
    btn.style.background = _shortcutReorderActive ? 'rgba(63,185,80,.12)' : 'transparent';
  }
  const container = document.getElementById('mobile-quick-actions');
  if (!container) return;

  if (!_shortcutReorderActive) {
    // Restaurar estado normal
    Array.from(container.querySelectorAll('.quick-btn')).forEach(b => {
      b.draggable = false;
      b.style.border = '';
      b.style.cursor = '';
    });
    // Guardar orden actual
    const order = Array.from(container.querySelectorAll('.quick-btn'))
      .map(b => b.querySelector('.quick-label')?.textContent || '');
    localStorage.setItem(SHORTCUT_ORDER_KEY, JSON.stringify(order));
    if (typeof toast === 'function') toast('Orden de accesos guardado ✅','ok');
    return;
  }

  // Aplicar orden guardado primero
  const saved = (() => { try { return JSON.parse(localStorage.getItem(SHORTCUT_ORDER_KEY)||'[]'); } catch(e){ return []; } })();
  if (saved.length) {
    saved.forEach(label => {
      const btn = Array.from(container.querySelectorAll('.quick-btn')).find(b=>b.querySelector('.quick-label')?.textContent===label);
      if (btn) container.appendChild(btn);
    });
  }
  // Activar drag
  Array.from(container.querySelectorAll('.quick-btn')).forEach(b => {
    b.draggable = true;
    b.style.border = '1px dashed rgba(88,166,255,.4)';
    b.style.cursor = 'grab';
    b.ondragstart = _sDragStart;
    b.ondragover  = _sDragOver;
    b.ondrop      = _sDrop;
    b.ondragend   = _sDragEnd;
  });
  if (typeof toast === 'function') toast('Arrastra para reordenar','ok');
}

let _sDragSrc = null;
function _sDragStart(e){ _sDragSrc=e.currentTarget; e.currentTarget.style.opacity='.4'; e.dataTransfer.effectAllowed='move'; }
function _sDragOver(e) { e.preventDefault(); return false; }
function _sDrop(e) {
  e.stopPropagation();
  if(!_sDragSrc||_sDragSrc===e.currentTarget) return;
  const container = document.getElementById('mobile-quick-actions');
  const btns = Array.from(container.querySelectorAll('.quick-btn'));
  if(btns.indexOf(_sDragSrc) < btns.indexOf(e.currentTarget)) container.insertBefore(_sDragSrc, e.currentTarget.nextSibling);
  else container.insertBefore(_sDragSrc, e.currentTarget);
}
function _sDragEnd(e){ if(e.currentTarget) e.currentTarget.style.opacity='1'; _sDragSrc=null; }

// Aplicar orden de shortcuts al arrancar (después de que el DOM esté listo)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const saved = (() => { try { return JSON.parse(localStorage.getItem(SHORTCUT_ORDER_KEY)||'[]'); } catch(e){return[];} })();
    if (!saved.length) return;
    const container = document.getElementById('mobile-quick-actions');
    if (!container) return;
    saved.forEach(label => {
      const btn = Array.from(container.querySelectorAll('.quick-btn')).find(b=>b.querySelector('.quick-label')?.textContent===label);
      if (btn) container.appendChild(btn);
    });
  }, 600);
});

// ── FIXES BATCH-XXVIII ────────────────────────────────────

// FIX: alias requerido por index.html
function deleteCuentaFromDash(id) {
  if (id) deleteCuenta(id);
}

// FIX: abrir transferencia preseleccionando cuenta origen
function openTransferRialFrom(cuentaId) {
  ['modal-cuenta-detail','modal-cuentas','modal-cuentas-v2-view'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.classList.remove('open');
  });
  if (typeof openTransferRial === 'function') {
    openTransferRial();
    if (cuentaId) setTimeout(function(){ selectTransferAccount(cuentaId,'from'); }, 150);
  }
}

// FIX: inyectar botón Transferir en el detail de billetera
var _origOpenCuentaDetail = window.openCuentaDetail;
window.openCuentaDetail = function(id) {
  if (typeof _origOpenCuentaDetail === 'function') _origOpenCuentaDetail(id);
  setTimeout(function() {
    var actionsRow = document.querySelector('#modal-cuenta-detail [style*="display:flex"][style*="gap:8px"]');
    if (actionsRow && !actionsRow.querySelector('.btn-transfer-det')) {
      var tbtn = document.createElement('button');
      tbtn.className = 'btn-transfer-det';
      tbtn.style.cssText = 'flex:1;background:#0d2137;border:1px solid #58a6ff;color:#58a6ff;padding:9px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit';
      tbtn.innerHTML = '↔️ Transferir';
      var _cid = id;
      tbtn.onclick = function(){ openTransferRialFrom(_cid); };
      actionsRow.appendChild(tbtn);
    }
  }, 80);
};
