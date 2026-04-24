
// ── Navegación inferior PWA ──────────────────────────────
function pwaNav(section) {
  haptic('light');
  document.querySelectorAll('.pwa-nav-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('nav-' + section);
  if (activeBtn) activeBtn.classList.add('active');
  // Animación de sección
  const panels = document.querySelectorAll('.section-panel');
  panels.forEach(p => { p.style.animation = 'none'; p.offsetHeight; p.style.animation = ''; });
  switch(section) {
    case 'dashboard': window.scrollTo({top:0, behavior:'smooth'}); break;
    case 'buscar': openSearch(); break;
    case 'ia': openIA(); break;
    case 'config': openSettings(); break;
  }
}

// ── Pull to Refresh — sincronizar Supabase ───────────────
(function initPullToRefresh() {
  let startY = 0, pulling = false;
  let indicator = null;

  function getIndicator() {
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'ptr-indicator';
      indicator.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:8000;display:flex;align-items:center;justify-content:center;padding:10px;background:#0d1117;color:#58a6ff;font-size:.78rem;font-weight:600;transform:translateY(-100%);transition:transform .25s ease;border-bottom:1px solid #30363d';
      indicator.innerHTML = '↓ Suelta para sincronizar';
      document.body.appendChild(indicator);
    }
    return indicator;
  }

  // Pull-to-refresh guard
  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0 && document.body.classList.contains('is-mobile')) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 40) {
      const ind = getIndicator();
      const pull = Math.min(dy - 40, 60);
      ind.style.transform = `translateY(${pull - 60}px)`;
      ind.innerHTML = pull > 40 ? '↑ Suelta para sincronizar' : '↓ Desliza para sincronizar';
    }
  }, { passive: true });

  document.addEventListener('touchend', async e => {
    if (!pulling) return;
    const dy = e.changedTouches[0].clientY - startY;
    pulling = false;
    window._pullJustHappened = dy > 30; // flag to block accidental modal opens
    if(window._pullJustHappened) setTimeout(()=>{ window._pullJustHappened=false; }, 600);
    const ind = indicator;
    if (dy > 80 && ind) {
      ind.style.transform = 'translateY(0)';
      ind.innerHTML = '⟳ Sincronizando...';
      try {
        if (currentUser && navigator.onLine) {
          await loadFromSupabase();
          ind.innerHTML = '✅ Sincronizado';
        } else {
          ind.innerHTML = navigator.onLine ? '⚠️ Inicia sesión primero' : '📵 Sin conexión';
        }
      } catch(err) { ind.innerHTML = '❌ Error al sincronizar'; }
      setTimeout(() => { if (ind) ind.style.transform = 'translateY(-100%)'; }, 1500);
    } else if (ind) {
      ind.style.transform = 'translateY(-100%)';
    }
  }, { passive: true });
})();

// ── Menú Móvil "Más" ─────────────────────────────────────
function openMobileMenu() {
  closeAllMobilePanels('menu');
  const overlay = document.getElementById('mobile-menu-overlay');
  const sheet   = document.getElementById('mobile-menu-sheet');
  overlay.style.display = 'block';
  updateMobileMenuRates();
  requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
  const isClosed = CONFIG.closedMonths.includes(currentMonth);
  const btn = document.getElementById('mob-btn-cerrar');
  if (btn) btn.querySelector('span:last-child').textContent = isClosed ? 'Abrir Mes' : 'Cerrar Mes';
  lockScroll();
}
function closeMobileMenu(e) {
  if (e && e.target && e.target.id !== 'mobile-menu-overlay') return;
  const sheet = document.getElementById('mobile-menu-sheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => { document.getElementById('mobile-menu-overlay').style.display = 'none'; }, 300);
  document.querySelectorAll('.pwa-nav-btn').forEach(b => b.classList.remove('active'));
  const db = document.getElementById('nav-dashboard');
  if (db) db.classList.add('active');
  // FIX-VII-4s: restaurar FAB al cerrar menú móvil
  unlockScroll();
}
function forceCloseMobileMenu() {
  const sheet = document.getElementById('mobile-menu-sheet');
  const overlay = document.getElementById('mobile-menu-overlay');
  if (sheet) sheet.style.transform = 'translateY(100%)';
  setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 300);
}
// Helper: cerrar todos los paneles móviles antes de abrir uno nuevo
function closeAllMobilePanels(exceptId) {
  if (exceptId !== 'menu') {
    const sheet = document.getElementById('mobile-menu-sheet');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (overlay && overlay.style.display !== 'none') {
      if (sheet) sheet.style.transform = 'translateY(100%)';
      setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 200);
    }
  }
  if (exceptId !== 'rates') {
    const rOverlay = document.getElementById('rates-panel-overlay');
    const rSheet   = document.getElementById('rates-panel-sheet');
    if (rOverlay && rOverlay.style.display !== 'none') {
      if (rSheet) rSheet.style.transform = 'translateY(100%)';
      setTimeout(() => { if (rOverlay) rOverlay.style.display = 'none'; }, 200);
    }
  }
  if (exceptId !== 'ia')           document.getElementById('modal-ia')?.classList.remove('open');
  if (exceptId !== 'search')       document.getElementById('modal-search')?.classList.remove('open');
  if (exceptId !== 'conexiones')   document.getElementById('modal-conexiones')?.classList.remove('open');
  if (exceptId !== 'audit')        document.getElementById('modal-audit')?.classList.remove('open');
  if (exceptId !== 'backup-config') document.getElementById('modal-backup-config')?.classList.remove('open');
  // FIX-XIV-1: unlockScroll siempre al cerrar paneles — verifica que no quede nada abierto
  setTimeout(() => {
    const stillOpen  = document.querySelector('.modal-overlay.open, .modal.open');
    const dinero     = document.getElementById('dinero-fuera-overlay');
    const menuOpen   = document.getElementById('mobile-menu-overlay')?.style.display === 'block';
    const ratesOpen  = document.getElementById('rates-panel-overlay')?.style.display === 'block';
    if (!stillOpen && !dinero && !menuOpen && !ratesOpen) unlockScroll();
  }, 250);
}

// ── Subpanel de Tasas ────────────────────────────────────
function openMobileRatesPanel() {
  closeAllMobilePanels('rates');
  // Android back button: push estado para que el botón ← del SO cierre el panel
  history.pushState({ panel: 'rates' }, '');
  const overlay = document.getElementById('rates-panel-overlay');
  const sheet = document.getElementById('rates-panel-sheet');
  overlay.style.display = 'block';
  // Poblar valores actuales
  const bcvEl = document.getElementById('mobile-rate-bcv');
  const eurEl = document.getElementById('mobile-rate-eur');
  if (bcvEl) bcvEl.value = rateBCV;
  if (eurEl) eurEl.value = rateEUR;
  // Highlight moneda activa
  ['USD','BS','EUR'].forEach(c => {
    const btn = document.getElementById('mcur-' + c);
    if (btn) {
      btn.style.background = currentCurrency === c ? 'var(--blue)' : 'transparent';
      btn.style.color = currentCurrency === c ? '#0d1117' : '#8b949e';
      btn.style.borderColor = currentCurrency === c ? 'var(--blue)' : '#30363d';
      btn.style.fontWeight = currentCurrency === c ? '700' : '400';
    }
  });
  requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
  // Inicializar calculadora con tasa actual
  setTimeout(() => {
    const bcvEl2 = document.getElementById('mobile-rate-bcv');
    const eurEl2 = document.getElementById('mobile-rate-eur');
    if (bcvEl2) bcvEl2.value = rateBCV;
    if (eurEl2) eurEl2.value = rateEUR;
    _ratesCalcSetMode('bcv');
    // Limpiar campos de calculadora
    const inU = document.getElementById('rcalc-input-usd');
    const inB = document.getElementById('rcalc-input-bs');
    if (inU) inU.value = '';
    if (inB) inB.value = '';
  }, 50);
  lockScroll();
}
// ── CALCULADORA BIDIRECCIONAL DE TASAS ──────────────────────────────
// Modo: 'bcv' (USD↔Bs) o 'eur' (EUR↔Bs)
let _rcalcMode = 'bcv';
let _rcalcUpdating = false; // flag anti-loop

function _ratesCalcSetMode(mode) {
  _rcalcMode = mode;
  const btnBcv = document.getElementById('rcalc-btn-bcv');
  const btnEur = document.getElementById('rcalc-btn-eur');
  const labelLeft = document.getElementById('rcalc-label-left');
  const rateLabel = document.getElementById('rcalc-rate-label');
  const inUSD = document.getElementById('rcalc-input-usd');
  if (btnBcv) {
    btnBcv.style.borderColor = mode === 'bcv' ? '#e3b341' : '#30363d';
    btnBcv.style.background  = mode === 'bcv' ? '#e3b34120' : 'transparent';
    btnBcv.style.color       = mode === 'bcv' ? '#e3b341' : '#8b949e';
  }
  if (btnEur) {
    btnEur.style.borderColor = mode === 'eur' ? '#58a6ff' : '#30363d';
    btnEur.style.background  = mode === 'eur' ? '#58a6ff20' : 'transparent';
    btnEur.style.color       = mode === 'eur' ? '#58a6ff' : '#8b949e';
  }
  if (labelLeft) labelLeft.textContent = mode === 'eur' ? '€' : '$';
  if (inUSD)     inUSD.placeholder     = '0.00';
  _ratesCalcUpdate();
}

function _ratesCalcUpdate() {
  // Actualiza el label de tasa activa cuando cambian los inputs de tasa
  const rateLabel = document.getElementById('rcalc-rate-label');
  const bcvVal = parseFloat(document.getElementById('mobile-rate-bcv')?.value) || rateBCV;
  const eurVal = parseFloat(document.getElementById('mobile-rate-eur')?.value) || rateEUR;
  const rate = _rcalcMode === 'eur' ? eurVal : bcvVal;
  if (rateLabel) rateLabel.textContent = (_rcalcMode === 'eur' ? 'Tasa EUR: Bs ' : 'Tasa BCV: Bs ') + rate.toFixed(2);
  // Re-calcular si ya hay un valor en algún campo
  const usdEl = document.getElementById('rcalc-input-usd');
  const bsEl  = document.getElementById('rcalc-input-bs');
  if (usdEl && bsEl) {
    if (usdEl.value) _ratesCalcFromUSD();
    else if (bsEl.value) _ratesCalcFromBs();
  }
}

function _ratesCalcFromUSD() {
  if (_rcalcUpdating) return;
  _rcalcUpdating = true;
  const usdVal = parseFloat(document.getElementById('rcalc-input-usd')?.value);
  const bsEl   = document.getElementById('rcalc-input-bs');
  const bcvVal = parseFloat(document.getElementById('mobile-rate-bcv')?.value) || rateBCV;
  const eurVal = parseFloat(document.getElementById('mobile-rate-eur')?.value) || rateEUR;
  const rate = _rcalcMode === 'eur' ? eurVal : bcvVal;
  if (bsEl && !isNaN(usdVal) && usdVal !== '') {
    bsEl.value = usdVal === 0 ? '' : (usdVal * rate).toFixed(2);
  } else if (bsEl) {
    bsEl.value = '';
  }
  const rateLabel = document.getElementById('rcalc-rate-label');
  if (rateLabel) rateLabel.textContent = (_rcalcMode === 'eur' ? 'Tasa EUR: Bs ' : 'Tasa BCV: Bs ') + rate.toFixed(2);
  _rcalcUpdating = false;
}

function _ratesCalcFromBs() {
  if (_rcalcUpdating) return;
  _rcalcUpdating = true;
  const bsVal  = parseFloat(document.getElementById('rcalc-input-bs')?.value);
  const usdEl  = document.getElementById('rcalc-input-usd');
  const bcvVal = parseFloat(document.getElementById('mobile-rate-bcv')?.value) || rateBCV;
  const eurVal = parseFloat(document.getElementById('mobile-rate-eur')?.value) || rateEUR;
  const rate = _rcalcMode === 'eur' ? eurVal : bcvVal;
  if (usdEl && !isNaN(bsVal) && bsVal !== '' && rate > 0) {
    usdEl.value = bsVal === 0 ? '' : (bsVal / rate).toFixed(4);
  } else if (usdEl) {
    usdEl.value = '';
  }
  const rateLabel = document.getElementById('rcalc-rate-label');
  if (rateLabel) rateLabel.textContent = (_rcalcMode === 'eur' ? 'Tasa EUR: Bs ' : 'Tasa BCV: Bs ') + rate.toFixed(2);
  _rcalcUpdating = false;
}

function _ratesCopyVal(which) {
  const el = document.getElementById(which === 'usd' ? 'rcalc-input-usd' : 'rcalc-input-bs');
  if (!el || !el.value) return;
  navigator.clipboard?.writeText(el.value).then(() => {
    if (typeof toast === 'function') toast('📋 Copiado: ' + el.value, 'ok');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = el.value; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    if (typeof toast === 'function') toast('📋 Copiado', 'ok');
  });
}
// ─────────────────────────────────────────────────────────────────────

function closeMobileRatesPanel(e) {
  // FIX-TASAS-PANEL: solo cerrar si el click fue en el overlay (fondo),
  // no en elementos hijos como inputs, botones o el sheet mismo.
  if (e && e.target && e.target.id !== 'rates-panel-overlay') return;
  const sheet = document.getElementById('rates-panel-sheet');
  if (sheet) sheet.style.transform = 'translateY(100%)';
  setTimeout(() => {
    const ov = document.getElementById('rates-panel-overlay');
    if (ov) ov.style.display = 'none';
  }, 280);
  // Limpiar history.pushState si fue abierto desde openMobileRatesPanel
  if (history.state && history.state.panel === 'rates') history.back();
  unlockScroll();
}
function applyMobileRates() {
  const bcv = parseFloat(document.getElementById('mobile-rate-bcv').value);
  const eur = parseFloat(document.getElementById('mobile-rate-eur').value);
  if (!isNaN(bcv) && bcv > 0) {
    rateBCV = bcv;
    const el = document.getElementById('rate-bcv');
    if (el) el.value = bcv;
  }
  if (!isNaN(eur) && eur > 0) {
    rateEUR = eur;
    const el = document.getElementById('rate-eur');
    if (el) el.value = eur;
  }
  lastRateDate = new Date().toISOString().slice(0,10);
  updateRates();
  updateMobileRatesStrip();
  sbSaveTasas();
  closeMobileRatesPanel();
  toast('💱 Tasas actualizadas ✅', 'ok');
}
function updateMobileMenuRates() {
  // mantenida por compatibilidad
  updateMobileRatesStrip();
}
function updateMobileRatesStrip() {
  const bcvEl = document.getElementById('mob-bcv-val');
  const eurEl = document.getElementById('mob-eur-val');
  const fechaEl = document.getElementById('mob-rate-fecha');
  if (bcvEl) bcvEl.textContent = rateBCV.toFixed(2);
  if (eurEl) eurEl.textContent = rateEUR.toFixed(2);
  if (fechaEl) {
    if (lastRateDate) {
      const d = new Date(lastRateDate + 'T12:00:00');
      const dateStr = d.toLocaleDateString('es-VE',{day:'2-digit',month:'short'});
      fechaEl.textContent = lastRateTime ? `${dateStr} ${lastRateTime} · bcv.org.ve` : `${dateStr} · bcv.org.ve`;
    } else {
      fechaEl.textContent = 'bcv.org.ve';
    }
  }
}
function syncMobileRates(which) {
  // ya no se usa inline, mantenida por si algo la referencia
}

// ── Auto fetch tasa BCV via exchangerate-api ─────────────
async function fetchTasaBCV(manual = false) {
  try {
    if (manual) toast('⏳ Consultando tasa...', 'ok');
    // Fuente 1: exchangerate-api (gratuita, CORS ok, actualización cada hora)
    let nuevaTasa = null;
    let nuevaEUR = null;
    try {
      const r1 = await fetch('https://open.er-api.com/v6/latest/USD');
      if (r1.ok) {
        const d1 = await r1.json();
        if (d1?.rates?.VES) nuevaTasa = parseFloat(d1.rates.VES.toFixed(2));
        if (d1?.rates?.EUR) nuevaEUR = parseFloat((1/d1.rates.EUR).toFixed(2)); // EUR/USD → Bs
      }
    } catch(e) {}
    // Fuente 2: si falla la primera
    if (!nuevaTasa) {
      try {
        const r2 = await fetch('https://api.frankfurter.app/latest?from=USD&to=VES,EUR');
        if (r2.ok) {
          const d2 = await r2.json();
          if (d2?.rates?.VES) nuevaTasa = parseFloat(d2.rates.VES.toFixed(2));
        }
      } catch(e) {}
    }
    if (nuevaTasa && nuevaTasa > 0) {
      rateBCV = nuevaTasa;
      const el = document.getElementById('rate-bcv');
      if (el) el.value = rateBCV;
      // Calcular EUR en Bs si tenemos la tasa EUR
      if (nuevaEUR && nuevaEUR > 0) {
        rateEUR = parseFloat((nuevaTasa * nuevaEUR).toFixed(2));
        const elEur = document.getElementById('rate-eur');
        if (elEur) elEur.value = rateEUR;
      }
      lastRateDate = new Date().toISOString().slice(0,10);
      // Actualizar display desktop
      const cdBcv = document.getElementById('cd-bcv-val');
      const cdEur = document.getElementById('cd-eur-val');
      const cdFecha = document.getElementById('cd-fecha');
      if (cdBcv) cdBcv.textContent = rateBCV.toFixed(2);
      if (cdEur) cdEur.textContent = rateEUR.toFixed(2);
      if (cdFecha) {
        const hoy = new Date();
        const dow = ['dom','lun','mar','mie','jue','vie','sab'][hoy.getDay()];
        cdFecha.textContent = dow + ' ' + hoy.toLocaleDateString('es-VE',{day:'2-digit',month:'short'});
      }
      updateMobileRatesStrip();
      updateRateNote();
      sbSaveTasas();
      if (manual) {
        toast(`💱 Tasa actualizada: ${rateBCV.toFixed(2)} Bs/$`, 'ok');
      } else {
        // Auto-fetch matutino: notificación push silenciosa
        sendNotification('💱 Tasa BCV actualizada', `1 $ = ${rateBCV.toFixed(2)} Bs · ${new Date().toLocaleDateString('es-VE',{day:'2-digit',month:'short'})}`);
        toast(`💱 BCV: ${rateBCV.toFixed(2)} Bs/$ (auto)`, 'ok');
      }
      return true;
    } else {
      if (manual) toast('⚠️ No se pudo obtener la tasa. Ingresa manual.', 'err');
    }
  } catch(e) {
    if (manual) toast('⚠️ Error al buscar tasa. Verifica conexión.', 'err');
    console.log('fetchTasaBCV:', e.message);
  }
  return false;
}

// ── Activar mes siguiente ────────────────────────────────
function activarSiguienteMes() {
  const allMonths = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  // Encontrar el siguiente mes no activo
  const nextMes = allMonths.find(m => !activeMonths.includes(m));
  if (!nextMes) { toast('Ya están activos todos los meses.', 'err'); return; }
  if (!EXCEL_DATA[nextMes]) {
    EXCEL_DATA[nextMes] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
  }
  activeMonths.push(nextMes);
  currentMonth = nextMes;
  buildTabs();
  buildMobileMonthSelect();
  render();
  toast(`✅ ${nextMes} activado. Puedes registrar movimientos.`, 'ok');
}
function checkActivarMesBtn() {
  // FIX-MES-CALENDARIO: solo mostrar si el mes real del calendario supera el último activo
  const allMonths = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const btn = document.getElementById('btn-activar-mes');
  if (!btn) return;
  const mesRealIdx    = new Date().getMonth();
  const mesRealNombre = allMonths[mesRealIdx];
  const lastActiveIdx = allMonths.indexOf(currentMonth);
  if (mesRealIdx > lastActiveIdx && !activeMonths.includes(mesRealNombre)) {
    btn.style.display = '';
    btn.title = `Activar ${mesRealNombre}`;
    btn.textContent = `📅 ${mesRealNombre}`;
  } else {
    btn.style.display = 'none';
  }
}

// ── Detección automática de plantillas frecuentes ────────
async function detectarPlantillasAuto() {
  const todas = [];
  activeMonths.forEach(m => {
    (EXCEL_DATA[m]?.transactions || []).forEach(t => {
      if (t.tipo !== 'Ajuste') todas.push(t);
    });
  });
  if (todas.length < 5) { toast('Necesitas más movimientos para detectar patrones.', 'err'); return; }

  // Agrupar por desc+cat normalizado
  const grupos = {};
  todas.forEach(t => {
    const key = (t.desc.trim().toLowerCase() + '|' + t.cat);
    if (!grupos[key]) grupos[key] = { desc:t.desc, tipo:t.tipo, cat:t.cat, subcat:t.subcat, method:t.method, count:0, amounts:[] };
    grupos[key].count++;
    grupos[key].amounts.push(t.amount);
  });

  // Filtrar los que aparecen 3+ veces
  const frecuentes = Object.values(grupos)
    .filter(g => g.count >= 2)
    .sort((a,b) => b.count - a.count)
    .slice(0, 8);

  if (!frecuentes.length) { toast('No se detectaron movimientos repetidos (mín. 2 veces).', 'err'); return; }

  // Usar IA para generar descripciones de plantilla
  const prompt = `Tengo estos movimientos financieros frecuentes en mi app de finanzas personal en Venezuela:
${frecuentes.map((g,i) => `${i+1}. "${g.desc}" (${g.tipo}, ${g.cat}) - aparece ${g.count} veces, montos: ${g.amounts.map(a=>'$'+a.toFixed(2)).join(', ')}`).join('\n')}

Para cada uno, genera un nombre corto de plantilla (máx 20 chars) y sugiere si el monto es fijo o variable.
Responde SOLO con JSON array: [{"idx":0,"nombre":"string","montoFijo":boolean,"montoSug":number}]`;

  try {
    toast('🤖 Analizando patrones...', 'ok');
    const raw = await groqCall(prompt, 'Eres un analizador financiero. Responde SOLO con JSON válido, sin texto extra.');
    const clean = raw.replace(/```json|```/g,'').trim();
    const sugs = JSON.parse(clean);

    // Mostrar modal con sugerencias
    mostrarModalPlantillasAuto(frecuentes, sugs);
  } catch(e) {
    // Fallback sin IA
    mostrarModalPlantillasAuto(frecuentes, []);
  }
}

function mostrarModalPlantillasAuto(frecuentes, sugs) {
  const existing = document.getElementById('modal-plantillas-auto');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-plantillas-auto';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:700;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:14px;padding:22px;width:500px;max-width:100%;max-height:88vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h3 style="margin:0;font-size:.95rem;color:#e6edf3">🔁 Plantillas detectadas por IA</h3>
        <button onclick="document.getElementById('modal-plantillas-auto').remove()" style="background:none;border:none;color:#8b949e;font-size:1.2rem;cursor:pointer">✕</button>
      </div>
      <p style="font-size:.72rem;color:#8b949e;margin-bottom:14px">Movimientos frecuentes detectados. Guárdalos como plantillas para registro rápido.</p>
      ${frecuentes.map((g, i) => {
        const sug = sugs.find(s => s.idx === i) || {};
        const avgAmt = (g.amounts.reduce((a,b)=>a+b,0)/g.amounts.length).toFixed(2);
        return `<div style="background:#0d1117;border:1px solid #21262d;border-radius:10px;padding:12px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div>
              <div style="font-size:.82rem;font-weight:700;color:#e6edf3">${g.desc}</div>
              <div style="font-size:.65rem;color:#8b949e;margin-top:2px">${g.tipo} · ${g.cat} · aparece <b style="color:#3fb950">${g.count}x</b></div>
            </div>
            <div style="text-align:right">
              <div style="font-size:.78rem;color:#e3b341;font-weight:600">~$${avgAmt}</div>
              <div style="font-size:.6rem;color:#484f58">${sug.montoFijo ? 'monto fijo' : 'variable'}</div>
            </div>
          </div>
          <button onclick="guardarPlantillaAuto(${i})" data-idx="${i}" style="width:100%;padding:6px;background:#1a3626;border:1px solid #3fb950;color:#3fb950;border-radius:7px;font-size:.73rem;cursor:pointer;font-weight:600">⭐ Guardar como plantilla</button>
        </div>`;
      }).join('')}
      <button onclick="document.getElementById('modal-plantillas-auto').remove()" style="width:100%;padding:10px;background:#1c2128;border:1px solid #30363d;color:#8b949e;border-radius:9px;font-size:.78rem;cursor:pointer;margin-top:4px">Cerrar</button>
    </div>`;

  // Guardar referencia a los datos
  modal._frecuentes = frecuentes;
  document.body.appendChild(modal);
}

function guardarPlantillaAuto(idx) {
  const modal = document.getElementById('modal-plantillas-auto');
  const frecuentes = modal?._frecuentes;
  if (!frecuentes || !frecuentes[idx]) return;
  const g = frecuentes[idx];
  // Verificar que no exista ya
  const existe = templates.find(t => t.desc.toLowerCase() === g.desc.toLowerCase() && t.cat === g.cat);
  if (existe) { toast('Esta plantilla ya existe.', 'err'); return; }
  templates.push({ desc:g.desc, tipo:g.tipo, cat:g.cat, subcat:g.subcat||'', method:g.method||'Pago móvil' });
  // Deshabilitar botón
  const btn = modal.querySelector(`[data-idx="${idx}"]`);
  if (btn) { btn.textContent = '✅ Guardada'; btn.disabled = true; btn.style.opacity = '.5'; }
  toast(`⭐ Plantilla "${g.desc}" guardada`, 'ok');
}

// ── Dropdown de meses en móvil ───────────────────────────
function buildMobileMonthSelect() {
  const sel = document.getElementById('mobile-month-select');
  if (!sel) return;
  sel.innerHTML = '';
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  months.forEach(m => {
    const inData = EXCEL_DATA[m] && (EXCEL_DATA[m].transactions?.length > 0 || activeMonths?.includes(m));
    if (!inData && m !== currentMonth) return; // solo mostrar meses activos
    const opt = document.createElement('option');
    opt.value = m;
    const isClosed = CONFIG.closedMonths.includes(m);
    opt.textContent = (isClosed ? '🔒 ' : '') + m + ' 2026';
    if (m === currentMonth) opt.selected = true;
    sel.appendChild(opt);
  });
  const statusEl = document.getElementById('mobile-month-status');
  if (statusEl) {
    const isClosed = CONFIG.closedMonths.includes(currentMonth);
    statusEl.textContent = isClosed ? '🔒 Cerrado' : '🟢 Activo';
    statusEl.style.color = isClosed ? 'var(--gold)' : 'var(--green)';
  }
}

// Resetear nav-dashboard como activo al cerrar modales
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    document.querySelectorAll('.pwa-nav-btn').forEach(b => b.classList.remove('active'));
    const db = document.getElementById('nav-dashboard');
    if (db) db.classList.add('active');
  }
});

// ── ANDROID BACK BUTTON (PWA): cerrar panel/modal activo ─────────────────
window.addEventListener('popstate', function(e) {
  const state = e.state;
  if (state && state.panel === 'rates') {
    // El back cerró el rates panel — animarlo sin volver a hacer history.back()
    const sheet = document.getElementById('rates-panel-sheet');
    if (sheet) sheet.style.transform = 'translateY(100%)';
    setTimeout(() => {
      const ov = document.getElementById('rates-panel-overlay');
      if (ov) ov.style.display = 'none';
    }, 280);
    unlockScroll();
    return;
  }
  // Cerrar cualquier modal-overlay abierto
  const openModal = document.querySelector('.modal-overlay.open, .modal-overlay[style*="flex"]');
  if (openModal) {
    // Buscar botón ✕ o cerrar por overlay click
    const closeBtn = openModal.querySelector('button[onclick*="close"]');
    if (closeBtn) closeBtn.click();
    else openModal.click();
  }
  // Cerrar menú mobile si está abierto
  const mobileMenu = document.getElementById('mobile-menu-overlay');
  if (mobileMenu && mobileMenu.style.display !== 'none') closeMobileMenu();
});
