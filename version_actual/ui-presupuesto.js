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

