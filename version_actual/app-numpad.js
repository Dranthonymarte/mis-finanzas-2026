

// ══════════════════════════════════════════════════════════
//  NUMPAD NATIVO — v2
// ══════════════════════════════════════════════════════════
let _numpadMode = 'usd'; // 'usd' | 'bs'
let _numpadStr  = '0';
let _numpadTargetField = 'usd'; // which input to fill

function openNumpadForField(field) {
  // Only show numpad on mobile
  const isMob = document.body.classList.contains('is-mobile') ||
                document.body.classList.contains('screen-sm') ||
                document.body.classList.contains('screen-xs');
  if(!isMob) return; // desktop: use normal input
  // Prevent default focus
  event && event.preventDefault();
  _numpadTargetField = field;
  _numpadMode = field;
  // Read existing value
  const existingUsd = document.getElementById('f-amount-usd')?.value || '';
  const existingBs  = document.getElementById('f-amount-bs')?.value  || '';
  _numpadStr = (field==='usd' ? existingUsd : existingBs) || '0';
  numpadSetMode(field);
  numpadUpdateDisplay();
  // FIX-NEG: botón ± disponible para todos los tipos (reembolsos, devoluciones, correcciones)
  const _tipoVal = document.getElementById('f-tipo')?.value || '';
  const negRow = document.getElementById('numpad-neg-row');
  if (negRow) negRow.style.display = 'block';
  const overlay = document.getElementById('numpad-overlay');
  const sheet   = document.getElementById('numpad-sheet');
  if(!overlay||!sheet) return;
  overlay.classList.add('open');
  lockScroll(); // FIX-XIX-1: ocultar FAB al abrir numpad
  requestAnimationFrame(() => sheet.classList.add('visible'));
  // Label from movement desc
  const desc = document.getElementById('f-desc')?.value || 'Monto';
  document.getElementById('numpad-label').textContent = desc || 'Monto';
  document.getElementById('numpad-sublabel').textContent = field==='usd' ? '← Ingresa en dólares' : '← Ingresa en bolívares';
  haptic && haptic('light');
}

function closeNumpad() {
  const overlay = document.getElementById('numpad-overlay');
  const sheet   = document.getElementById('numpad-sheet');
  if(sheet) sheet.classList.remove('visible');
  // FIX-NUMPAD-LOCK: marcar como "cerrando" para que unlockScroll no espere
  // el timer de 320ms. Sin esto: si el usuario guarda el movimiento en < 320ms
  // después de cerrar el numpad, unlockScroll ve overlay.open=true y NO restaura
  // pointer-events en app-shell → toda la app queda bloqueada.
  window._numpadIsClosing = true;
  setTimeout(() => {
    if (overlay) overlay.classList.remove('open');
    window._numpadIsClosing = false;
    unlockScroll();
  }, 320);
}

function numpadSetMode(mode) {
  _numpadMode = mode;
  _numpadTargetField = mode;
  document.getElementById('np-btn-usd')?.classList.toggle('active', mode==='usd');
  document.getElementById('np-btn-bs')?.classList.toggle('active',  mode==='bs');
  document.getElementById('numpad-curr-sym').textContent = mode==='usd' ? '$' : 'Bs';
  // Re-read matching field
  const val = mode==='usd'
    ? (document.getElementById('f-amount-usd')?.value||'0')
    : (document.getElementById('f-amount-bs')?.value||'0');
  _numpadStr = val || '0';
  numpadUpdateDisplay();
}

function numpadKey(k) {
  haptic && haptic('light');
  if(k==='del') {
    _numpadStr = _numpadStr.length > 1 ? _numpadStr.slice(0,-1) : '0';
  } else if(k==='.') {
    if(!_numpadStr.includes('.')) _numpadStr += '.';
  } else if(k==='-') {
    // FIX-NEG: negativos válidos para todos los tipos
    if (_numpadStr.startsWith('-')) {
      _numpadStr = _numpadStr.slice(1); // quitar negativo
    } else {
      _numpadStr = '-' + (_numpadStr === '0' ? '' : _numpadStr);
      if (_numpadStr === '-') _numpadStr = '-0';
    }
  } else {
    if((_numpadStr==='0' || _numpadStr==='-0') && k!=='.') {
      _numpadStr = _numpadStr.startsWith('-') ? '-' + k : k;
    } else if(_numpadStr.replace('-','').length < 10) {
      _numpadStr += k;
    }
  }
  numpadUpdateDisplay();
}

function numpadUpdateDisplay() {
  const val = document.getElementById('numpad-val');
  const bsEl = document.getElementById('numpad-bs');
  if(!val) return;
  val.textContent = _numpadStr;
  // Color rojo para valores negativos
  val.style.color = _numpadStr.startsWith('-') ? '#f85149' : '';
  const num = parseFloat(_numpadStr) || 0;
  const rate = rateBCV || 65.2;
  if(_numpadMode==='usd') {
    bsEl.textContent = (num * rate).toFixed(2);
  } else {
    bsEl.textContent = rate > 0 ? (num / rate).toFixed(4)+' USD est.' : '—';
  }
}

function numpadConfirm() {
  const num = parseFloat(_numpadStr);
  const finalVal = isNaN(num) ? 0 : num;
  if(_numpadMode==='usd') {
    const usdEl = document.getElementById('f-amount-usd');
    if(usdEl) { usdEl.value = finalVal; onAmountUSD && onAmountUSD(); }
  } else {
    const bsEl = document.getElementById('f-amount-bs');
    if(bsEl) { bsEl.value = finalVal; onAmountBS && onAmountBS(); }
  }
  closeNumpad();
  haptic && haptic('medium');
}

// ══════════════════════════════════════════════════════════
//  TRANSFERENCIA ENTRE CUENTAS — v2
// ══════════════════════════════════════════════════════════
function updateTransferSelects() {
  const fromSel = document.getElementById('f-transfer-from');
  const toSel   = document.getElementById('f-transfer-to');
  if(!fromSel || !toSel) return;
  const opts = '<option value="">Seleccionar...</option>' +
    CUENTAS.map(c => `<option value="${escHtml(c.id)}">${escHtml(c.nombre)} ($${calcCuentaBalance(c).toFixed(2)})</option>`).join('');
  fromSel.innerHTML = opts;
  toSel.innerHTML   = opts;
}

// Hook into onTipoChange to show/hide transfer row
const _origOnTipoChange = typeof onTipoChange === 'function' ? onTipoChange : null;
if(_origOnTipoChange) {
  window.onTipoChange = function() {
    _origOnTipoChange.call(this);
    const tipo = document.getElementById('f-tipo')?.value;
    const transferRow = document.getElementById('transfer-cuenta-row');
    const cuentaRow   = document.getElementById('f-cuenta-row');
    if(tipo === 'Transferencia Interna') {
      if(transferRow) transferRow.classList.add('show');
      if(cuentaRow)   cuentaRow.style.display = 'none';
      updateTransferSelects();
    } else {
      if(transferRow) transferRow.classList.remove('show');
      if(cuentaRow)   cuentaRow.style.display = '';
    }
  };
}

// ── FIX-TRANSFER-COMPLETE: cadena de patches reescrita ──────────────
// Problema anterior: 3 patches en cadena confusos, mirror con tipo incorrecto
// (Ingreso Variable infla el dashboard), renderWalletCards no se llamaba tras
// crear el mirror, subcat debit/credit no se seteaban explícitamente.
//
// Solución: UN solo patch limpio que:
//   1. Lee _transfer_to desde el campo oculto ANTES de llamar al original
//   2. Llama al sbSaveMov original para guardar el DÉBITO (cuenta origen)
//   3. Crea el CRÉDITO (cuenta destino) con tipo='Transferencia Interna'
//      y subcat='credit' — así calcCuentaBalance lo suma y recalcMonth lo excluye
//      del balance general del mes (una transferencia no cambia el neto)
//   4. Llama renderWalletCards() después de crear el mirror en EXCEL_DATA

const _origSbSaveMov = typeof sbSaveMov === 'function' ? sbSaveMov : null;
window.sbSaveMovOrig = _origSbSaveMov;

window.sbSaveMov = async function(mov, month, _retry=0) {
  // Leer destino desde campo oculto (lo pone saveMovimiento justo antes de llamarnos)
  const hiddenTo = document.getElementById('f-transfer-to-hidden');
  if (mov.tipo === 'Transferencia Interna' && hiddenTo && hiddenTo.value) {
    mov._transfer_to = hiddenTo.value;
    mov.subcat = 'debit'; // FIX: identificar explícitamente como débito
    hiddenTo.value = '';
  }

  // Guardar el movimiento principal (débito en cuenta origen)
  if (_origSbSaveMov) await _origSbSaveMov(mov, month, _retry);

  // Crear el movimiento espejo (crédito en cuenta destino)
  if (mov.tipo === 'Transferencia Interna' && mov.cuenta_id && mov._transfer_to) {
    const nombreOrigen = (typeof CUENTAS !== 'undefined' && CUENTAS.find(c => c.id === mov.cuenta_id)?.nombre) || 'cuenta';
    const mirror = {
      ...mov,
      id: 'n' + (Date.now() + 1) + 'c', // +1 para evitar colisión de timestamp
      tipo: 'Transferencia Interna',     // FIX: mismo tipo, no Ingreso Variable
      subcat: 'credit',                  // FIX: marcado como crédito explícito
      desc: '🔄 Transferencia desde ' + nombreOrigen,
      cuenta_id: mov._transfer_to,
      _transfer_to: null
    };

    // Guardar crédito en Supabase
    if (_origSbSaveMov) await _origSbSaveMov(mirror, month, 0);

    // Agregar a EXCEL_DATA local para actualización inmediata
    if (typeof EXCEL_DATA !== 'undefined' && EXCEL_DATA[month]) {
      EXCEL_DATA[month].transactions.push(mirror);
    }

    // FIX: recalcular y renderizar billeteras DESPUÉS de crear el mirror
    if (typeof recalcMonth === 'function') recalcMonth(month);
    if (typeof renderWalletCards === 'function') renderWalletCards();
    if (typeof renderCuentasV2List === 'function') renderCuentasV2List();
  }
};

// Patch saveMovimiento: leer cuentas origen/destino del formulario de transferencia
const _orig_saveMovimiento = window.saveMovimiento;
window.saveMovimiento = async function() {
  const tipo = document.getElementById('f-tipo')?.value;
  if (tipo === 'Transferencia Interna') {
    const fromId = document.getElementById('f-transfer-from')?.value;
    const toId   = document.getElementById('f-transfer-to')?.value;
    if (!fromId || !toId) { toast('Selecciona cuenta origen y destino', 'err'); return; }
    if (fromId === toId)  { toast('Origen y destino deben ser cuentas distintas', 'err'); return; }
    // Poner cuenta origen en f-cuenta para que saveMovimiento lea cuenta_id correcto
    const cuentaSel = document.getElementById('f-cuenta');
    if (cuentaSel) cuentaSel.value = fromId;
    // Dejar destino en campo oculto para que sbSaveMov lo recoja
    let hiddenTo = document.getElementById('f-transfer-to-hidden');
    if (!hiddenTo) {
      hiddenTo = document.createElement('input');
      hiddenTo.type = 'hidden';
      hiddenTo.id = 'f-transfer-to-hidden';
      document.body.appendChild(hiddenTo);
    }
    hiddenTo.value = toId;
  }
  if (_orig_saveMovimiento) await _orig_saveMovimiento.apply(this, arguments);
};

// ══════════════════════════════════════════════════════════
//  METAS DE AHORRO — v2
// ══════════════════════════════════════════════════════════
let CUENTAS_METAS = {}; // { cuenta_id: { nombre, objetivo } }

async function loadCuentasMetas() {
  if(!currentUser) return;
  const hid = HOUSEHOLD_ID || currentUser.id;
  try {
    const { data } = await sb.from('config_usuario')
      .select('cuentas_metas')
      .eq('user_id', hid)
      .single();
    if(data && data.cuentas_metas) {
      CUENTAS_METAS = data.cuentas_metas;
      renderMetasSection();
    }
  } catch(e) { console.warn('loadCuentasMetas:', e); }
}

async function saveMetasToSupabase() {
  if(!currentUser) return;
  const hid = HOUSEHOLD_ID || currentUser.id;
  try {
    // Intentar UPDATE específico primero (más rápido)
    const { error } = await sb.from('config_usuario')
      .update({ cuentas_metas: CUENTAS_METAS, updated_at: new Date().toISOString() })
      .eq('user_id', hid);
    if (error) {
      // Si falla, usar sbSaveConfig completo como fallback
      if (typeof sbSaveConfig === 'function') await sbSaveConfig();
    }
  } catch(e) {
    if (typeof sbSaveConfig === 'function') await sbSaveConfig();
  }
}

function openMetaCuenta(cuentaId) {
  const c = CUENTAS.find(x=>x.id===cuentaId);
  if(!c) return;
  const meta = CUENTAS_METAS[cuentaId] || {};
  document.getElementById('meta-cuenta-id').value = cuentaId;
  document.getElementById('meta-nombre').value = meta.nombre || '';
  document.getElementById('meta-objetivo').value = meta.objetivo || '';
  document.getElementById('btn-delete-meta').style.display = meta.objetivo ? 'block' : 'none';
  updateMetaPreview();
  lockScroll();
  document.getElementById('modal-meta-cuenta').classList.add('open');
}
function closeMetaCuenta() {
  unlockScroll();
  document.getElementById('modal-meta-cuenta').classList.remove('open');
}
function openMetasPanel() {
  // FIX-XI-4: mostrar selector si hay múltiples cuentas
  if(CUENTAS.length === 0) {
    toast('💡 Crea una cuenta en "Mis Saldos" primero para asociarle una meta.');
    return;
  }
  if(CUENTAS.length === 1) {
    openMetaCuenta(CUENTAS[0].id);
    return;
  }
  // Más de una cuenta: mostrar selector
  const lista = CUENTAS.map(c => {
    const tieneMeta = !!(CUENTAS_METAS||{})[c.id];
    return `<button onclick="closeMetaSelector();openMetaCuenta('${c.id}')"
      style="width:100%;text-align:left;background:var(--surface2);border:1px solid var(--border);
      color:var(--text);padding:10px 14px;border-radius:10px;cursor:pointer;font-family:inherit;
      font-size:.82rem;display:flex;align-items:center;gap:10px">
      <div style="width:24px;height:24px;border-radius:6px;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0">${c.nombre.charAt(0)}</div>
      <span style="flex:1">${c.nombre}</span>
      ${tieneMeta ? '<span style="font-size:.65rem;color:#3fb950">🎯 tiene meta</span>' : ''}
    </button>`;
  }).join('');
  const sel = document.createElement('div');
  sel.id = 'meta-selector-overlay';
  sel.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:11500;display:flex;align-items:center;justify-content:center;padding:16px';
  sel.onclick = e => { if(e.target===sel) closeMetaSelector(); };
  sel.innerHTML = `<div style="background:#161b22;border:1px solid var(--border);border-radius:16px;padding:20px;width:100%;max-width:380px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="font-size:.9rem;font-weight:700;color:var(--text)">🎯 ¿Meta para qué cuenta?</span>
      <button onclick="closeMetaSelector()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer">✕</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">${lista}</div>
  </div>`;
  document.body.appendChild(sel);
  lockScroll();
}
function closeMetaSelector() {
  const sel = document.getElementById('meta-selector-overlay');
  if(sel) sel.remove();
  unlockScroll();
}

document.getElementById('meta-nombre')?.addEventListener('input', updateMetaPreview);
document.getElementById('meta-objetivo')?.addEventListener('input', updateMetaPreview);

function updateMetaPreview() {
  const cuentaId = document.getElementById('meta-cuenta-id')?.value;
  const nombre   = document.getElementById('meta-nombre')?.value || 'Mi meta';
  const objetivo = parseFloat(document.getElementById('meta-objetivo')?.value) || 0;
  const preview  = document.getElementById('meta-preview');
  if(!preview) return;
  if(objetivo <= 0) { preview.style.display = 'none'; return; }
  preview.style.display = 'block';
  const c = CUENTAS.find(x=>x.id===cuentaId);
  const actual = c ? calcCuentaBalance(c) : 0;
  const pct = Math.min(100, Math.round((actual/objetivo)*100));
  // FIX-XI-4: usar IDs correctos del HTML del modal
  const lblEl = document.getElementById('meta-preview-label');
  const pctEl = document.getElementById('meta-preview-pct');
  const barEl = document.getElementById('meta-preview-bar');
  const subEl = document.getElementById('meta-preview-sub');
  if (lblEl) lblEl.textContent = nombre;
  if (pctEl) pctEl.textContent = pct + '%';
  if (barEl) barEl.style.width = pct + '%';
  if (subEl) subEl.textContent = 'Saldo: $' + actual.toFixed(2) + ' de $' + objetivo.toFixed(2);
}

async function saveMetaCuenta() {
  const cuentaId = document.getElementById('meta-cuenta-id')?.value;
  const nombre   = document.getElementById('meta-nombre')?.value?.trim();
  const objetivo = parseFloat(document.getElementById('meta-objetivo')?.value);
  if(!cuentaId) { toast('Error: cuenta no definida','err'); return; }
  if(!nombre)   { toast('Escribe el nombre de la meta','err'); return; }
  if(!objetivo || objetivo <= 0) { toast('Monto objetivo debe ser mayor a 0','err'); return; }
  // FIX-XII-3: confirmación
  const c = (CUENTAS||[]).find(x=>x.id===cuentaId);
  const ok = await showConfirm('🎯 Guardar Meta',
    `¿Guardar meta "${nombre}" de ${fmt(objetivo)} para la cuenta ${c?.nombre||''}?`, '🎯');
  if (!ok) return;
  CUENTAS_METAS[cuentaId] = { nombre, objetivo };
  await saveMetasToSupabase();
  toast('🎯 Meta guardada');
  closeMetaCuenta();
  renderMetasSection();
  renderWalletCards();
}

async function deleteMetaCuenta() {
  const cuentaId = document.getElementById('meta-cuenta-id')?.value;
  if(!cuentaId) return;
  const meta = (CUENTAS_METAS||{})[cuentaId];
  // FIX-XII-3: confirmación antes de eliminar
  const ok = await showConfirm('🗑️ Eliminar Meta',
    `¿Eliminar la meta "${meta?.nombre || ''}"? Esta acción no se puede deshacer.`, '🗑️');
  if (!ok) return;
  delete CUENTAS_METAS[cuentaId];
  await saveMetasToSupabase();
  toast('🗑 Meta eliminada');
  closeMetaCuenta();
  renderMetasSection();
  renderWalletCards && renderWalletCards();
}

function renderMetasSection() {
  const container = document.getElementById('metas-cards-container');
  if(!container) return;
  const withMeta = CUENTAS.filter(c => CUENTAS_METAS[c.id]);
  const section  = document.getElementById('metas-section');
  if(section) section.style.display = withMeta.length ? 'block' : 'none';
  if(!withMeta.length) { container.innerHTML = ''; return; }
  container.innerHTML = withMeta.map(c => {
    const meta   = CUENTAS_METAS[c.id];
    const actual = calcCuentaBalance(c);
    const pct    = Math.min(100, Math.round((actual/meta.objetivo)*100));
    const done   = pct >= 100;
    return `
      <div class="meta-card" onclick="openMetaCuenta('${escHtml(c.id)}')">
        <div class="meta-card-header">
          <div style="width:28px;height:28px;border-radius:8px;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff">${c.nombre.charAt(0)}</div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600;color:#e6edf3">${escHtml(meta.nombre)}</div>
            <div style="font-size:10px;color:#8b949e">${escHtml(c.nombre)}</div>
          </div>
          <div style="font-size:12px;font-weight:700;color:${done?'#3fb950':'#e3b341'}">${pct}% ${done?'✅':''}</div>
        </div>
        <div class="meta-bar-track">
          <div class="meta-bar-fill" style="width:${pct}%;background:${done?'#3fb950':c.color}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px">
          <span style="font-size:11px;color:#3fb950">${window._hideAmounts ? '••••' : '$' + actual.toFixed(2)}</span>
          <span style="font-size:11px;color:#8b949e">${window._hideAmounts ? '••••' : 'meta $' + meta.objetivo.toFixed(2)}</span>
        </div>
      </div>`;
  }).join('');
}

// ── HOOK loadCuentasMetas into loadCuentas ────────────────
const _origLoadCuentas = window.loadCuentas;
window.loadCuentas = async function() {
  if(_origLoadCuentas) await _origLoadCuentas();
  await loadCuentasMetas();
  renderMetasSection();
};

// Patch wallet card click in cuentas list
const _origRenderCuentasModal = window.renderCuentasModalList;
window.renderCuentasModalList = function() {
  if(_origRenderCuentasModal) _origRenderCuentasModal();
  // Replace onclick from closeModalCuentas path
};

// ── NUMPAD: also wire up from mobile amount display ───────
// If user taps the hero balance, open numpad for quick add
document.getElementById('hero-int')?.addEventListener('click', ()=>{
  openModal();
  setTimeout(()=>openNumpadForField('usd'), 400);
});

