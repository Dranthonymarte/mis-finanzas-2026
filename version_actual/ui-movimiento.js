// ─── MODAL MOVIMIENTO ─────────────────────────
function openModal(prefill) {
  if(window._pullJustHappened) { window._pullJustHappened=false; return; }
  try {
    const _bi = document.getElementById('rn-bcv-input');
    const _ei = document.getElementById('rn-eur-input');
    if (_bi) { _bi.value = rateBCV; _bi._userEdited = false; }
    if (_ei) { _ei.value = rateEUR; _ei._userEdited = false; }
    updateRateNote();
    if (CONFIG.closedMonths.includes(currentMonth) && !prefill?.edit) {
      toast('El mes está cerrado. Reabre primero.', 'err'); return;
    }
    // Poblar tipos dinámicamente desde CONFIG
    const tipoSel = document.getElementById('f-tipo');
    const tiposActuales = (CONFIG.tipos?.length > 0)
      ? CONFIG.tipos
      : ['Gasto','Ingreso Fijo','Ingreso Variable','Ahorro en efectivo','Prestamo recibido','Prestamo pagado','Ajuste'];
    tipoSel.innerHTML = '';
    tiposActuales.forEach(t => {
      const o = document.createElement('option'); o.value = t; o.textContent = t; tipoSel.appendChild(o);
    });
    document.getElementById('modal-mov-title').textContent = prefill?.edit ? 'Editar Movimiento' : 'Nuevo Movimiento';
    document.getElementById('edit-mov-id').value = prefill?.id || '';
    document.getElementById('f-desc').value = prefill?.desc || '';
    tipoSel.value = prefill?.tipo || 'Gasto';
    document.getElementById('f-date').value = prefill?.date || getLocalToday();
    document.getElementById('f-method').value = prefill?.method || 'Pago móvil';
    document.getElementById('f-amount-usd').value = prefill?.amount || '';
    document.getElementById('f-amount-bs').value = '';
    templateMode = false;
    document.getElementById('btn-template').classList.remove('active');
    document.getElementById('btn-template').textContent = '⭐ Guardar plantilla';
    onTipoChange();
    if (prefill?.cat) {
      setTimeout(() => {
        document.getElementById('f-cat').value = prefill.cat;
        onCatChange();
        if (prefill?.subcat) setTimeout(() => document.getElementById('f-subcat').value = prefill.subcat, 50);
      }, 50);
    }
    updateRateNote();
    renderTemplatePills();
    document.getElementById('modal-mov').classList.add('open');
    lockScroll();
    setTimeout(_injectCalcBtnInModal, 120);
  } catch(err) {
    console.error('openModal error:', err);
    toast('Error al abrir formulario. Recarga la app.', 'err');
  }
}

function closeModalMov(e) {
  unlockScroll(); document.getElementById('modal-mov').classList.remove('open');
}
function closeModalMovIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-mov')) closeModalMov();
}

function onTipoChange() {
  const tipoEl = document.getElementById('f-tipo');
  const catSel = document.getElementById('f-cat');
  const ajusteNote = document.getElementById('ajuste-note');
  const subcatGroup = document.getElementById('f-subcat') ? document.getElementById('f-subcat').closest('.form-group') : null;
  if (!tipoEl || !catSel) return;
  const tipo = tipoEl.value;
  catSel.innerHTML = '';
  // Transferencia Interna: opción especial
  if (tipo === 'Transferencia Interna') {
    const o = document.createElement('option'); o.value = 'Transferencia Interna'; o.textContent = '🔄 Transferencia Interna'; catSel.appendChild(o);
    if (catSel.closest('.form-group')) catSel.closest('.form-group').style.opacity = '0.4';
    if (subcatGroup) subcatGroup.style.opacity = '0.4';
  } else {
    const catsRaw = (CONFIG.categorias[tipo] && CONFIG.categorias[tipo].length > 0)
      ? CONFIG.categorias[tipo]
      : (CONFIG.categorias['Gasto'] || ['🛸Otros']);
    // FIX-SORT-ALPHA: orden alfabético ignorando emoji inicial
    const cats = [...catsRaw].sort((a,b) => {
      const cleanA = a.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u,'').toLowerCase();
      const cleanB = b.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u,'').toLowerCase();
      return cleanA.localeCompare(cleanB, 'es');
    });
    cats.forEach(c => {
      const o = document.createElement('option');
      // FIX-EMOJI-VALUE: value = nombre limpio sin emoji para que applyTemplate pueda seleccionarlo
      const cleanNameOpt = c.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '');
      const emoji = (typeof getCatDisplayIcon === 'function') ? getCatDisplayIcon(cleanNameOpt) : '';
      o.value = cleanNameOpt; // siempre el nombre limpio
      o.dataset.original = c; // guardar original para referencia
      o.textContent = emoji ? emoji + ' ' + cleanNameOpt : c;
      catSel.appendChild(o);
    });
    if (catSel.closest('.form-group')) catSel.closest('.form-group').style.opacity = '1';
    if (subcatGroup) subcatGroup.style.opacity = '1';
  }
  onCatChange();
  if (ajusteNote) ajusteNote.style.display = tipo === 'Ajuste' ? 'block' : 'none';
  // Ocultar subcategoría para tipos que no la necesitan
  if (subcatGroup) subcatGroup.style.display = ['Ajuste','Prestamo recibido','Prestamo pagado'].includes(tipo) ? 'none' : '';
}

function onCatChange() {
  const cat = document.getElementById('f-cat').value;
  const subcatSel = document.getElementById('f-subcat');
  subcatSel.innerHTML = '';
  const subsRaw = CONFIG.subcategorias[cat] || [];
  // FIX-SORT-ALPHA: orden alfabético en subcategorías
  const subs = [...subsRaw].sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'es'));
  if (subs.length === 0) {
    const o = document.createElement('option'); o.value = ''; o.textContent = '— Sin subcategoría —'; subcatSel.appendChild(o);
  } else {
    subs.forEach(s => {
      const o = document.createElement('option');
      o.value = s;
      // FIX-EMOJI-SUBCAT: usar getCatEmoji (app-core) + getCatDisplayIcon (app-features)
      const _se = (typeof getCatDisplayIcon==='function' ? getCatDisplayIcon(s) : '') || getCatEmoji(s);
      const cleanName = s.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim();
      o.textContent = _se ? _se + '  ' + cleanName : s;
      subcatSel.appendChild(o);
    });
  }
}

function onAmountUSD() {
  const usdEl = document.getElementById('f-amount-usd');
  const bsEl  = document.getElementById('f-amount-bs');
  if (!usdEl || !bsEl) return;
  const usd = parseFloat(usdEl.value);
  if (!isNaN(usd) && usd >= 0) bsEl.value = '';
}

function onAmountBS() {
  const bsEl  = document.getElementById('f-amount-bs');
  const usdEl = document.getElementById('f-amount-usd');
  if (!bsEl || !usdEl) return;
  const bs = parseFloat(bsEl.value);
  if (!isNaN(bs) && bs >= 0) usdEl.value = '';
}

function getAmountUSD() {
  const usdEl = document.getElementById('f-amount-usd');
  const bsEl  = document.getElementById('f-amount-bs');
  if (!usdEl || !bsEl) return null;
  const usd = parseFloat(usdEl.value);
  const bs  = parseFloat(bsEl.value);
  const tipo = document.getElementById('f-tipo')?.value || '';
  // FIX-NEG: todos los tipos permiten negativos
  if (!isNaN(usd) && usd !== 0) return usd;
  if (!isNaN(bs) && bs !== 0) {
    if (!rateBCV) { toast('Debes ingresar la tasa BCV para convertir Bs a USD','err'); return null; }
    return bs / rateBCV;
  }
  return null;
}

async function saveMovimiento() {
  // ── SANITIZAR inputs — prevenir XSS ──────────────────────
  const sanitize = s => (s||'').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])).trim();
  const desc   = sanitize(document.getElementById('f-desc').value);
  const tipo   = document.getElementById('f-tipo').value;
  const cat    = document.getElementById('f-cat').value;
  const subcat = document.getElementById('f-subcat').value;
  const method = document.getElementById('f-method').value;
  const date   = document.getElementById('f-date').value;
  const editId = document.getElementById('edit-mov-id').value;

  // Validate rates if BS amount entered
  const bsVal = parseFloat(document.getElementById('f-amount-bs').value);
  const usingBs = !isNaN(bsVal) && bsVal > 0;
  if (usingBs && (!rateBCV || rateBCV <= 0)) {
    toast('⚠️ Ingresa la tasa BCV (Bs/$) antes de registrar en bolívares.', 'err');
    return;
  }

  const amount = getAmountUSD();
  if (!desc || amount === null || amount === undefined || !date) {
    toast('Completa todos los campos y monto.', 'err'); return;
  }
  // FIX-NEG: validar solo que no sea exactamente 0
  const tipoVal = document.getElementById('f-tipo')?.value || '';
  if (amount === 0) { toast('⚠️ El monto no puede ser cero.', 'err'); return; }

  const amountBs = usingBs ? bsVal : amount * (rateBCV || 1);
  const movAuthor = currentUser ? getDisplayName(currentUser.email) : 'Anthony';
  const movRateType = 'bcv';
  const cuentaIdVal = (document.getElementById('f-cuenta')?.value)||null;
  const mov = { id: editId || ('n' + Date.now()), desc, tipo, cat, subcat: subcat||'', amount, amountBs, method, date, author: movAuthor, rate_type: movRateType, cuenta_id: cuentaIdVal||null };

  // ── DETECTAR DUPLICADOS (solo en creación nueva) ──────────
  if (!editId) {
    const txns = EXCEL_DATA[currentMonth]?.transactions || [];
    const possible = txns.filter(t =>
      t.desc.toLowerCase() === desc.toLowerCase() &&
      t.tipo === tipo &&
      t.date === date &&
      Math.abs(t.amount - amount) < 0.01
    );
    if (possible.length > 0) {
      const ok = await showConfirm(
        '⚠️ Posible duplicado',
        `Ya existe "${desc}" de ${fmt(amount)} el ${date}. ¿Registrar de todas formas?`,
        '⚠️'
      );
      if (!ok) return;
    }
  }

  // ── CONFIRMAR PRIMERO, antes de tocar los datos ──────────
  const isEdit = !!editId;
  const confirmMsg = isEdit
    ? `¿Confirmas la actualización de "${mov.desc}" por ${fmt(mov.amount)}?`
    : `¿Confirmas registrar "${mov.desc}" — ${mov.tipo} por ${fmt(mov.amount)}?`;
  const ok = await showConfirm(isEdit ? 'Actualizar movimiento' : 'Registrar movimiento', confirmMsg, isEdit ? '✏️' : '💾');
  if (!ok) return;

  // ── AHORA sí modificar los datos ─────────────────────────
  let movAnterior = null;
  if (isEdit) {
    const txns = EXCEL_DATA[currentMonth].transactions;
    const idx = txns.findIndex(t => t.id === editId);
    if (idx >= 0) {
      const prev = txns[idx];
      movAnterior = { ...prev }; // guardar snapshot antes de editar
      // FIX-EF-EDIT-RECALC: al editar, siempre recalcular EF desde CERO
      if (['Ingreso Fijo','Ingreso Variable'].includes(mov.tipo)) {
        mov.ef_contribution = mov.amount * 0.30;
      } else {
        mov.ef_contribution = null;
      }
      txns[idx] = mov;
      // Recalcular siempre — cubre: cambio de tipo, cambio de monto, cambio de fecha
      {
        const resetDate = CONFIG.efResetDate || null;
        let autoTotal = 0;
        Object.values(EXCEL_DATA).forEach(md => {
          (md.transactions || []).forEach(t => {
            if (['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)) {
              const contrib = t.ef_contribution ?? (parseFloat(t.amount||0) * 0.30);
              if (!resetDate || !t.date || t.date > resetDate) {
                autoTotal += contrib;
              }
            }
          });
        });
        CONFIG.efAutoContrib = autoTotal;
        CONFIG.emergencyFundBase = (CONFIG.efManualBase||0) + CONFIG.efAutoContrib;
        sbSaveConfig();
      }
    }
  } else {
    // FIX-X-1: guardar ef_contribution exacto en el movimiento
    if (['Ingreso Fijo','Ingreso Variable'].includes(mov.tipo)) {
      mov.ef_contribution = mov.amount * 0.30;
    }
    EXCEL_DATA[currentMonth].transactions.push(mov);
    if (mov.ef_contribution) {
      const resetDate = CONFIG.efResetDate || null;
      const movDate   = mov.date || getLocalToday();
      // FIX-EF-GATE: resetDate en el futuro no debe bloquear nuevos ingresos
      const efDateOk = !resetDate || movDate >= resetDate.slice(0,10);
      if (efDateOk) {
        // Recalcular desde CERO iterando todas las transacciones
        // NOTA: mov ya está en EXCEL_DATA (push arriba) → NO sumar ef_contribution de nuevo
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
        // FIX-EF-DOUBLE: NO sumar mov.ef_contribution aquí — ya está incluido en el loop
        CONFIG.efAutoContrib = autoTotal;
        CONFIG.emergencyFundBase = (CONFIG.efManualBase||0) + CONFIG.efAutoContrib;
        // Persistir ef_auto_contrib directo en Supabase (sin depender del guard de categorias)
        if (sb && currentUser) {
          const hid = HOUSEHOLD_ID || currentUser.id;
          // FIX-EF-CATCH: async IIFE evita "catch is not a function" con Supabase builder
          (async () => {
            try {
              await sb.from('config_usuario').upsert({
                user_id: hid,
                ef_auto_contrib: CONFIG.efAutoContrib,
                emergency_fund_base: CONFIG.emergencyFundBase,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });
            } catch(e) { console.warn('[EF save]', e.message); }
          })();
        }
        localStorage.setItem('fin_ef_split', JSON.stringify({
          base: CONFIG.efManualBase || 0, auto: CONFIG.efAutoContrib,
          reset: CONFIG.efResetDate || null, goal: CONFIG.emergencyFundGoal || 3000
        }));
        setTimeout(() => toast(`🆘 +${fmt(mov.ef_contribution)} al fondo de emergencia (30%)`, 'ok'), 400);
      }
    }
  }
  userModifiedMonths.add(currentMonth);

  if (templateMode && !isEdit) {
    const newTpl = { desc, tipo, cat, subcat, method, amount: parseFloat(document.getElementById('f-amount-usd')?.value)||0 };
    templates.push(newTpl);
    await saveTemplateToSupabase(newTpl);
    renderTemplatePills();
    setTimeout(() => toast('Plantilla guardada ⭐', 'ok'), 800);
  }

  recalcMonth(currentMonth);
  // FIX-IX-2: syncEF ANTES de render() → KPI y panel EF muestran valor correcto inmediatamente
  syncEF();
  unlockScroll();
  document.getElementById('modal-mov').classList.remove('open');
  render();
  // FIX-WALLET-REALTIME: forzar recálculo inmediato de saldos de cuentas
  if (typeof renderWalletCards === 'function') renderWalletCards();
  if (typeof updateHeroBalance === 'function') updateHeroBalance();
  // FIX-XI-6: actualizar vista pareja si está activa
  if (typeof renderParejaContent === 'function') {
    const parejaSection = document.getElementById('section-pareja');
    if (parejaSection && parejaSection.style.display !== 'none') renderParejaContent();
  }
  haptic('success');
  toast(isEdit ? '✅ Movimiento actualizado con éxito' : '✅ Movimiento registrado con éxito', 'ok');

  // ── ALERTAS POST-GUARDAR ──────────────────────────────────
  // Alerta balance negativo
  const bal = EXCEL_DATA[currentMonth]?.balance || 0;
  if (bal < 0) {
    setTimeout(() => sendNotification('🔴 Balance mensual negativo', `Tu balance de ${currentMonth} es -$${Math.abs(bal).toFixed(2)}. Revisa tus gastos.`), 500);
  }
  // Alerta presupuesto categoría >= 80%
  if (tipo === 'Gasto' && cat && CONFIG.presupuestos?.[cat]) {
    const gastoCat = EXCEL_DATA[currentMonth]?.cat_totals?.[cat] || 0;
    const budgetCat = CONFIG.presupuestos[cat];
    const pct = budgetCat > 0 ? (gastoCat / budgetCat) * 100 : 0;
    if (pct >= 80 && pct < 100) {
      setTimeout(() => toast(`⚠️ ${cat} al ${pct.toFixed(0)}% del presupuesto`, 'err'), 600);
      sendNotification(`⚠️ Presupuesto ${cat} al ${pct.toFixed(0)}%`, `Llevas $${gastoCat.toFixed(0)} de $${budgetCat} presupuestados.`);
    } else if (pct >= 100) {
      setTimeout(() => toast(`🔴 ¡Superaste el presupuesto de ${cat}!`, 'err'), 600);
      sendNotification(`🔴 ${cat} excedido`, `Gastaste $${gastoCat.toFixed(0)} de $${budgetCat} presupuestados.`);
    }
  }

  // Sincronizar con Supabase en background (sin bloquear)
  if (navigator.onLine) {
    (window.sbSaveMov || sbSaveMov)(mov, currentMonth);
    sbSaveFondo(currentMonth);
    sbLogMovimiento(isEdit ? 'editar' : 'crear', mov, currentMonth, movAnterior);
  } else {
    pushOfflineQueue({ type: 'saveMov', mov, month: currentMonth });
    toast('📵 Guardado localmente — se sincronizará al reconectarte', 'ok');
  }
}

function editMov(id, month) {
  if (CONFIG.closedMonths.includes(month)) {
    toast(`🔒 ${month} está cerrado. Reabre el mes para editar.`, 'err'); return;
  }
  const txns = EXCEL_DATA[month].transactions;
  const t = txns.find(x => x.id === id);
  if (!t) return;
  openModal({ id, desc:t.desc, tipo:t.tipo, cat:t.cat, subcat:t.subcat, method:t.method, date:t.date, amount:t.amount, edit:true });
}

async function deleteMov(id, month) {
  if (CONFIG.closedMonths.includes(month)) {
    toast(`🔒 ${month} está cerrado. Reabre el mes para eliminar.`, 'err'); return;
  }
  if (!navigator.onLine) { toast('📵 Sin internet — no se puede eliminar ahora', 'err'); return; }
  const ok = await showConfirm('Eliminar movimiento', '¿Estás seguro? Esta acción no se puede deshacer.', '🗑️');
  if (!ok) return;
  const txns = EXCEL_DATA[month].transactions;
  const t = txns.find(x => x.id === id);
  // FIX-EF-v4: solo restar contribución si el movimiento es posterior al ef_reset_date
  if (t && ['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)) {
    const resetDate = CONFIG.efResetDate || null;
    const movDate   = t.date || '0000-00-00';
    if (!resetDate || movDate > resetDate) {
      const contrib = t.ef_contribution ?? (t.amount * 0.30);
      CONFIG.efAutoContrib = Math.max(0, (CONFIG.efAutoContrib||0) - contrib);
      CONFIG.emergencyFundBase = (CONFIG.efManualBase||0) + CONFIG.efAutoContrib;
      sbSaveConfig();
    }
  }
  EXCEL_DATA[month].transactions = txns.filter(x => x.id !== id);
  userModifiedMonths.add(month);
  recalcMonth(month);
  // FIX-IX-2: syncEF antes de render() para actualizar KPI inmediatamente
  syncEF();
  render();
  // FIX-WALLET-REALTIME: forzar recálculo inmediato de saldos de cuentas
  if (typeof renderWalletCards === 'function') renderWalletCards();
  if (typeof updateHeroBalance === 'function') updateHeroBalance();
  // FIX-XI-6: actualizar vista pareja si está activa
  if (typeof renderParejaContent === 'function') {
    const parejaSection = document.getElementById('section-pareja');
    if (parejaSection && parejaSection.style.display !== 'none') renderParejaContent();
  }
  haptic('medium');
  toast('Movimiento eliminado 🗑️', 'ok');
  sbDeleteMov(id);
  sbSaveFondo(month);
}

// Templates
function toggleTemplate() {
  templateMode = !templateMode;
  const btn = document.getElementById('btn-template');
  btn.classList.toggle('active', templateMode);
  btn.textContent = templateMode ? '⭐ Guardar como plantilla ✓' : '⭐ Guardar plantilla';
}

// ─── TEMPLATE PERSISTENCE ─────────────────────────────
// ═══════════════════════════════════════════════════════════
// PLANTILLAS — tabla dedicada: plantillas_usuario
// SQL a ejecutar UNA VEZ en Supabase SQL Editor:
//   CREATE TABLE IF NOT EXISTS plantillas_usuario (
//     id          text PRIMARY KEY,
//     user_id     text NOT NULL,
//     desc        text,
//     tipo        text,
//     cat         text,
//     subcat      text,
//     method      text,
//     amount      numeric DEFAULT 0,
//     cuenta_id   text,
//     position    integer DEFAULT 0,
//     created_at  timestamptz DEFAULT now(),
//     updated_at  timestamptz DEFAULT now()
//   );
//   ALTER TABLE plantillas_usuario ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "own" ON plantillas_usuario
//     USING (user_id = auth.uid())
//     WITH CHECK (user_id = auth.uid());
// ═══════════════════════════════════════════════════════════
const TMPL_STORE_KEY = 'fin_templates_v3';

function loadTemplatesLocal() {
  if (!templates || templates.length === 0) {
    try {
      const saved = localStorage.getItem(TMPL_STORE_KEY);
      if (saved) templates = JSON.parse(saved);
    } catch(e) {}
  }
}
loadTemplatesLocal();

async function loadTemplatesFromSupabase() {
  if (!sb || !currentUser) return;
  const uid = currentUser.id; // auth.uid() para RLS
  try {
    const { data, error } = await sb.from('plantillas_usuario')
      .select('*').eq('user_id', uid).order('position', { ascending: true });
    if (error) {
      console.warn('[plantillas] load error:', error.message);
      loadTemplatesLocal(); return;
    }
    if (data) {
      templates = data.map(r => ({
        _id: r.id,
        desc:      r.nombre  || '',   // columna es "nombre" en Supabase
        tipo:      r.tipo    || 'Gasto',
        cat:       r.cat     || '',
        subcat:    r.subcat  || '',
        method:    r.method  || '',
        amount:    parseFloat(r.amount) || 0,
        cuenta_id: r.cuenta_id || null
      }));
      try { localStorage.setItem(TMPL_STORE_KEY, JSON.stringify(templates)); } catch(_) {}
      console.log('[plantillas] cargadas desde Supabase:', templates.length);
    }
  } catch(e) {
    console.warn('[plantillas] exception:', e.message);
    loadTemplatesLocal();
  }
}

async function saveTemplateToSupabase(tpl) {
  if (!sb || !currentUser) {
    try { localStorage.setItem(TMPL_STORE_KEY, JSON.stringify(templates)); } catch(_) {}
    return;
  }
  const uid = currentUser.id; // auth.uid() para RLS
  const id  = tpl._id || ('tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2,7));
  tpl._id   = id;
  try {
    const { error } = await sb.from('plantillas_usuario').upsert({
      id,
      user_id:  uid,
      nombre:   tpl.desc    || '',   // columna es "nombre" — desc es reservada en SQL
      tipo:     tpl.tipo    || 'Gasto',
      cat:      tpl.cat     || '',
      subcat:   tpl.subcat  || '',
      method:   tpl.method  || '',
      amount:   parseFloat(tpl.amount) || 0,
      cuenta_id: tpl.cuenta_id || null,
      position: templates.findIndex(t => t._id === id),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) {
      console.error('[plantillas] save error:', error.message);
      toast('⚠️ Plantilla guardada solo localmente', 'warn');
    } else {
      console.log('[plantillas] guardada:', id);
    }
  } catch(e) { console.warn('[plantillas] save exception:', e.message); }
  try { localStorage.setItem(TMPL_STORE_KEY, JSON.stringify(templates)); } catch(_) {}
}

async function deleteTemplateFromSupabase(id) {
  if (!id || !sb || !currentUser) return;
  const uid = currentUser.id; // auth.uid() para RLS
  try {
    const { error } = await sb.from('plantillas_usuario')
      .delete().eq('id', id).eq('user_id', uid);
    if (error) console.error('[plantillas] delete error:', error.message);
    else console.log('[plantillas] eliminada:', id);
  } catch(e) { console.warn('[plantillas] delete exception:', e.message); }
  try { localStorage.setItem(TMPL_STORE_KEY, JSON.stringify(templates)); } catch(_) {}
}

// Compatibilidad legacy — saveTemplatesLocal ya no llama sbSaveConfig
async function saveTemplatesLocal() {
  try { localStorage.setItem(TMPL_STORE_KEY, JSON.stringify(templates)); } catch(_) {}
}

function renderTemplatePills() {
  const div = document.getElementById('template-list');
  if(!div) return;
  if (!templates.length) {
    div.innerHTML = "<button class=\"template-add-card\" onclick=\"toast('💡 Guarda un movimiento como plantilla con ⭐','info')\">+</button>";
    return;
  }
  const catIconMap = {'🍽':'comida','🏡':'casa','🚗':'transporte','💅':'personal','📺':'suscri','🏦':'banco','💼':'sueldo','🥑':'mercado','💰':'ahorro'};
  div.innerHTML = templates.map((t, i) => {
    let icon = '💳';
    const catL = (t.cat||'').toLowerCase();
    for(const [em,k] of Object.entries(catIconMap)) { if(catL.includes(k)){icon=em;break;} }
    return `
      <div class="template-card" onclick="applyTemplate(${i})" style="position:relative">
        <button class="template-card-del" onclick="event.stopPropagation();deleteTemplate(${i})" title="Eliminar plantilla">✕</button>
        <div class="template-card-icon">${icon}</div>
        <div class="template-card-name">${escHtml(t.desc)}</div>
        <div class="template-card-cat">${escHtml(t.cat||'—')}</div>
        ${t.amount ? `<div style="font-size:9px;color:#3fb950;margin-top:1px">$${parseFloat(t.amount).toFixed(2)}</div>` : ''}
      </div>`;
  }).join('') + "<button class=\"template-add-card\" onclick=\"toast('⭐ Rellena el formulario y toca Guardar plantilla','info')\">+</button>";
}
function deleteTemplate(i) {
  const tpl = templates[i];
  if (!tpl) return;
  showConfirm('Eliminar plantilla', `¿Eliminar la plantilla "${tpl.desc}"?`, '🗑️').then(ok => {
    if (!ok) return;
    const id = tpl._id;
    templates.splice(i, 1);
    renderTemplatePills();
    toast('Plantilla eliminada');
    // Eliminar de la tabla dedicada en Supabase
    deleteTemplateFromSupabase(id);
  });
}

function applyTemplate(i) {
  const t = templates[i];
  if(!t) return;
  document.getElementById('f-desc').value = t.desc || '';
  document.getElementById('f-tipo').value = t.tipo || 'Gasto';
  if(t.amount) document.getElementById('f-amount-usd').value = parseFloat(t.amount).toFixed(2);
  if(t.date) document.getElementById('f-date').value = t.date;
  onTipoChange();
  // FIX-TEMPLATE-FULL: timing escalonado — tipo→cat→subcat+method
  setTimeout(() => {
    if (t.cat) {
      const catSel = document.getElementById('f-cat');
      if (catSel) {
        const cleanCat = (t.cat || '').replace(/^[^\w\s]\s*/, '').trim();
        const matchOpt = Array.from(catSel.options).find(o =>
          o.value === t.cat || o.value === cleanCat ||
          (o.dataset.original && (o.dataset.original === t.cat || o.dataset.original === cleanCat))
        );
        if (matchOpt) catSel.value = matchOpt.value;
        else {
          const partialMatch = Array.from(catSel.options).find(o =>
            o.value.toLowerCase().includes(cleanCat.toLowerCase()) ||
            cleanCat.toLowerCase().includes(o.value.toLowerCase())
          );
          if (partialMatch) catSel.value = partialMatch.value;
        }
      }
      onCatChange();
    }
    // Método de pago — disponible en este punto
    if (t.method) {
      const mEl = document.getElementById('f-method');
      if (mEl) mEl.value = t.method;
    }
    // Subcategoría — esperar a que onCatChange construya las options
    setTimeout(() => {
      if (t.subcat) {
        const subcatSel = document.getElementById('f-subcat');
        if (subcatSel) {
          const matchSub = Array.from(subcatSel.options).find(o =>
            o.value === t.subcat || o.value.includes(t.subcat)
          );
          if (matchSub) subcatSel.value = matchSub.value;
        }
      }
      if (t.cuenta_id) {
        const cuEl = document.getElementById('f-cuenta');
        if (cuEl) cuEl.value = t.cuenta_id;
      }
    }, 100);
  }, 80);
  if (typeof closeRecurrentes === 'function') closeRecurrentes();
  toast('📋 Plantilla aplicada — revisa los campos');
}

// ─── SEARCH ─────────────────────────────────
function openSearch() {
  lockScroll();
  const movModal = document.getElementById('modal-mov');
  if (movModal && movModal.classList.contains('open')) movModal.classList.remove('open');
  // FIX-SEARCH-INSTANT: abrir modal inmediatamente sin ningún cómputo.
  // populateSearchFilters es rápido (sólo selectores). applySearch es lento cuando
  // hay muchas transacciones — se difiere 80ms para que la animación CSS del modal
  // complete su primer frame antes de bloquear el hilo.
  populateSearchFilters();
  addUserFilterToSearch();
  document.getElementById('modal-search').classList.add('open');
  // Mostrar estado vacío inmediatamente, resultados llegan 80ms después
  const tbody = document.getElementById('search-results');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="color:var(--muted);text-align:center;padding:20px;font-size:.75rem">Escribe para buscar...</td></tr>';
  const countEl = document.getElementById('search-count');
  if (countEl) countEl.textContent = '';
  setTimeout(() => {
    applySearch();
    // Focus en el campo de texto para que el teclado aparezca en móvil
    const searchInput = document.getElementById('search-text');
    if (searchInput) searchInput.focus();
  }, 80);
}
// FIX-IX-5: closeSearch siempre cierra (para botones ✕ internos y btn Cerrar).
// El backdrop onclick usa closeSearchIfOutside(e) para solo cerrar al hacer click fuera.
function closeSearch() {
  unlockScroll();
  document.getElementById('modal-search').classList.remove('open');
}
function closeSearchIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-search')) closeSearch();
}
function populateSearchFilters() {
  // Month
  const monthSel = document.getElementById('search-month');
  if (monthSel) {
    monthSel.innerHTML = '<option value="">Todos los meses</option>';
    activeMonths.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; monthSel.appendChild(o); });
  }
  // Reset cascade
  onSearchTipoChange(false);
}
function onSearchTipoChange(doSearch=true) {
  const tipo = document.getElementById('search-tipo').value;
  const catSel = document.getElementById('search-cat');
  catSel.innerHTML = '<option value="">Todas</option>';
  if (tipo && CONFIG.categorias[tipo]) {
    CONFIG.categorias[tipo].forEach(c => {
      const o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o);
    });
  } else {
    // Show all categories
    const allCats = [...new Set(Object.values(CONFIG.categorias).flat())].sort();
    allCats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o); });
  }
  onSearchCatChange(doSearch);
}
function onSearchCatChange(doSearch=true) {
  const cat = document.getElementById('search-cat').value;
  const subcatSel = document.getElementById('search-subcat');
  subcatSel.innerHTML = '<option value="">Todas</option>';
  if (cat) {
    const fromConfig = CONFIG.subcategorias[cat] || [];
    const fromTxn = [...new Set(
      Object.values(EXCEL_DATA).flatMap(d =>
        (d.transactions||[]).filter(t => t.cat === cat && t.subcat).map(t => t.subcat)
      )
    )];
    [...new Set([...fromConfig, ...fromTxn])].sort().forEach(s => {
      const o = document.createElement('option'); o.value = s; o.textContent = s; subcatSel.appendChild(o);
    });
  }
  if (doSearch) applySearch();
}
function applySearch() {
  const text = (document.getElementById('search-text').value||'').toLowerCase();
  const amountRaw = document.getElementById('search-amount')?.value;
  const amountTarget = amountRaw ? parseFloat(amountRaw) : null;
  const tipo = document.getElementById('search-tipo').value;
  const cat = document.getElementById('search-cat').value;
  const subcat = document.getElementById('search-subcat').value;
  const month = document.getElementById('search-month').value;
  const method = document.getElementById('search-method').value;
  const author = document.getElementById('search-author')?.value || '';
  const tbody = document.getElementById('search-results');
  let count = 0;
  const searchMonths = month ? [month] : activeMonths;
  // FIX-SEARCH-SPEED: recolectar HTML como string, un solo innerHTML = al final
  // Antes: innerHTML += en loop causaba un reflow por transacción → lento con muchas filas
  const rows = [];
  searchMonths.forEach(m => {
    EXCEL_DATA[m].transactions.filter(t =>
      (!text || t.desc.toLowerCase().includes(text) || t.cat.toLowerCase().includes(text) || (t.subcat||'').toLowerCase().includes(text)) &&
      (!amountTarget || Math.abs(t.amount - amountTarget) < 0.5) &&
      (!tipo || t.tipo === tipo) &&
      (!cat || t.cat === cat) &&
      (!subcat || t.subcat === subcat) &&
      (!method || t.method === method) &&
      (!author || (t.author||'').toLowerCase().includes(author.toLowerCase()))
    ).sort((a,b) => b.date.localeCompare(a.date)).forEach(t => {
      count++;
      const isPos = ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo);
      const badge = {'Gasto':'tipo-gasto','Ingreso Fijo':'tipo-ingreso','Ingreso Variable':'tipo-ingreso',
        'Ahorro en efectivo':'tipo-ahorro','Prestamo recibido':'tipo-prestamo','Prestamo pagado':'tipo-gasto','Ajuste':'tipo-ajuste'}[t.tipo]||'tipo-ajuste';
      const authorBadge = t.author ? `<span class="txn-author ${t.author.toLowerCase().includes('isabel')?'isabel':'anthony'}">${t.author}</span>` : '';
      rows.push(`<tr>
        <td style="color:var(--muted);font-size:.68rem">${m}</td>
        <td style="color:var(--muted);font-size:.68rem">${t.date.slice(5)}</td>
        <td>${t.desc}${authorBadge}</td>
        <td><span class="tipo-badge ${badge}" style="font-size:.6rem">${t.tipo.replace('en efectivo','').replace('pagado','').trim()}</span></td>
        <td style="font-size:.7rem;color:var(--muted)">${t.cat}${t.subcat?('<br><span style="font-size:.62rem;color:#8b949e">'+((typeof getCatDisplayIcon==='function'?getCatDisplayIcon(t.subcat):getCatEmoji(t.subcat))?(typeof getCatDisplayIcon==='function'?getCatDisplayIcon(t.subcat):getCatEmoji(t.subcat))+'  ':'')+t.subcat+'</span>'):''}</td>
        <td style="font-size:.68rem;color:var(--muted)">${t.method||'—'}</td>
        <td class="${isPos?'txn-amount-pos':'txn-amount-neg'}">${isPos?'+':'-'}${fmt(t.amount)}</td>
        <td>
          <button class="btn-icon btn-edit" onclick="editMovFromSearch('${t.id}','${m}')" title="Editar">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteMovFromSearch('${t.id}','${m}')" title="Eliminar">🗑️</button>
        </td>
      </tr>`);
    });
  });
  tbody.innerHTML = rows.join('');
  document.getElementById('search-count').textContent = `${count} resultado${count!==1?'s':''}`;
}
function editMovFromSearch(id, month) {
  if (CONFIG.closedMonths.includes(month)) {
    toast(`🔒 ${month} está cerrado. Reabre el mes para editar.`, 'err'); return;
  }
  document.getElementById('modal-search').classList.remove('open');
  switchMonth(month);
  setTimeout(() => editMov(id, month), 100);
}
async function deleteMovFromSearch(id, month) {
  if (CONFIG.closedMonths.includes(month)) {
    toast(`🔒 ${month} está cerrado. Reabre el mes para eliminar.`, 'err'); return;
  }
  if (!navigator.onLine) { toast('📵 Sin internet — no se puede eliminar ahora', 'err'); return; }
  const ok = await showConfirm('Eliminar movimiento', '¿Estás seguro? Esta acción no se puede deshacer.', '🗑️');
  if (!ok) return;
  const txns = EXCEL_DATA[month].transactions;
  const t = txns.find(x => x.id === id);
  if (t && ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo)) {
    if (!emergencyFundByMonth[month]) emergencyFundByMonth[month] = 0;
    emergencyFundByMonth[month] = Math.max(0, emergencyFundByMonth[month] - t.amount * 0.30);
  }
  EXCEL_DATA[month].transactions = txns.filter(x => x.id !== id);
  userModifiedMonths.add(month);
  recalcMonth(month);
  render();
  applySearch();
  toast('Eliminado 🗑️', 'ok');
  sbDeleteMov(id);
  sbSaveFondo(month);
}

// ─── SETTINGS ────────────────────────────────
let currentSettingsTab = 'tipos';
// ── SETTINGS NAVEGACIÓN ESTILO APP ────────────────────────
let _settCurrentTab = 'tipos';

// FIX-H8: Acceso rápido a presupuestos — Batch-G: redirige al modal Envelope
function openPresupuestosPanel() {
  if (typeof openEnvelopeBudget === 'function') { openEnvelopeBudget(); return; }
  openSettings();
  setTimeout(() => settNav('presupuestos'), 150);
}

function openSettings() {
  const savedName = currentUser ? getDisplayName(currentUser.email) : '';
  const nEl = document.getElementById('sett-nombre');
  if(nEl && savedName) nEl.value = savedName;
  const emailEl = document.getElementById('sett-correo-display');
  if(emailEl && currentUser) emailEl.value = currentUser.email;
  const pinLabel = document.getElementById('pin-status-label');
  if(pinLabel) pinLabel.textContent = (localStorage.getItem('fin_pin_v2') || localStorage.getItem('fin_pin_hash')) ? '✅ PIN configurado — toca para cambiar' : '⚠️ PIN no configurado';
  const alCb = document.getElementById('autolock-toggle-cb');
  if(alCb) alCb.checked = CONFIG?.autoLock !== false;
  const themeCb = document.getElementById('theme-toggle-cb');
  if(themeCb) themeCb.checked = document.body.classList.contains('light-theme');
  const travelLabel = document.getElementById('travel-mode-label');
  if(travelLabel) { try { const t=JSON.parse(localStorage.getItem('fin_travel_mode')||'null');
    travelLabel.textContent = t ? '✈️ Activo: '+t.currency+' @ '+t.rate : 'Inactivo — toca para configurar'; } catch(e){} }

  const movModal = document.getElementById('modal-mov');
  if (movModal && movModal.classList.contains('open')) movModal.classList.remove('open');
  // Refresh profile info
  if (currentUser) {
    const email = currentUser.email;
    const initials = email ? email[0].toUpperCase() : 'A';
    ['sett-avatar-main','sett-avatar-perfil'].forEach(id => {
      const el = document.getElementById(id); if(el) el.textContent = initials;
    });
    const savedName = localStorage.getItem('finanzas_nombre') || '';
    ['sett-name-display','sett-perfil-name'].forEach(id => {
      const el = document.getElementById(id); if(el) el.textContent = savedName || email.split('@')[0];
    });
    ['sett-email-display','sett-perfil-email'].forEach(id => {
      const el = document.getElementById(id); if(el) el.textContent = email;
    });
    const correoEl = document.getElementById('sett-correo-display');
    if (correoEl) correoEl.value = email;
    const nombreEl = document.getElementById('sett-nombre');
    if (nombreEl) {
      const displayName = getDisplayName(email);
      nombreEl.value    = displayName;
      nombreEl.readOnly = false;
      nombreEl.style.opacity = '';
      nombreEl.style.cursor  = '';
      nombreEl.style.background = '';
      nombreEl.title = '';
    }
  }
  settNav('main');
  lockScroll();
  document.getElementById('modal-settings').classList.add('open');
}
// FIX-IX-5: closeSettings siempre cierra (botones ✕ internos).
// No hay backdrop onclick en modal-settings — solo botones internos y filas de navegación.
function closeSettings() {
  unlockScroll();
  document.getElementById('modal-settings').classList.remove('open');
}
function closeSettingsIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-settings')) closeSettings();
}
function settNav(screen) {
  document.querySelectorAll('.sett-screen').forEach(s => s.classList.remove('active'));
  if (screen === 'main') {
    document.getElementById('sett-main').classList.add('active');
  } else if (screen === 'perfil') {
    document.getElementById('sett-perfil').classList.add('active');
  } else {
    // Lista screen (tipos, categorias, subcategorias, presupuestos)
    _settCurrentTab = screen;
    document.getElementById('sett-lista').classList.add('active');
    renderSettList(screen);
  }
}
function saveProfile() {
  const nombre = document.getElementById('sett-nombre')?.value?.trim();
  if(!nombre) { toast('Escribe tu nombre','err'); return; }
  if(currentUser?.email) saveUserDisplayName(currentUser.email, nombre);
  localStorage.setItem('finanzas_nombre', nombre);
  ['sett-name-display','sett-perfil-name'].forEach(id => {
    const el = document.getElementById(id); if(el) el.textContent = nombre;
  });
  const greetEl = document.getElementById('voice-greeting-name');
  if(greetEl) greetEl.textContent = 'Hola ' + nombre.split(' ')[0] + ',';
  toast('✅ Nombre guardado', 'ok');
}
function renderSettList(tab) {
  const titles = {tipos:'Tipos de movimiento',categorias:'Categorías',subcategorias:'Subcategorías',presupuestos:'Presupuestos'};
  const titleEl = document.getElementById('sett-lista-title');
  if (titleEl) titleEl.textContent = titles[tab] || tab;
  const addInput = document.getElementById('sett-add-input');
  if (addInput) addInput.value = '';
  renderSettingsTab(tab); // reuse existing render into sett-lista-content
}
function settAddItem() {
  const val = document.getElementById('sett-add-input')?.value?.trim();
  if (!val) return;
  if (_settCurrentTab === 'tipos') { CONFIG.tipos.push(val); sbSaveConfig(); renderSettList('tipos'); }
  else if (_settCurrentTab === 'categorias') { if(!CONFIG.categorias[val]) CONFIG.categorias[val]=[]; sbSaveConfig(); renderSettList('categorias'); }
  else if (_settCurrentTab === 'presupuestos') { /* handled by existing */ }
  document.getElementById('sett-add-input').value = '';
  toast('✅ Agregado', 'ok');
}
function setSettingsTab(tab) { _settCurrentTab = tab; renderSettingsTab(tab); }
function renderSettingsTab(tab, _forceTarget) {
  let c = _forceTarget || null;
  if (!c) {
    const cfgModal = document.getElementById('modal-cfg-list');
    if (cfgModal && cfgModal.classList.contains('open')) c = document.getElementById('cfg-list-body');
  }
  if (!c) c = document.getElementById('sett-lista-content');
  if (!c) c = document.getElementById('settings-content');
  if (!c) return;
  if (tab === 'tipos') {
    c.innerHTML = `
      <div style="font-size:.68rem;color:var(--muted);margin-bottom:6px">Toca ✏️ para editar · 🗑️ para eliminar.</div>
      <div class="settings-list" id="tipos-list">${CONFIG.tipos.filter(t=>t!=='Ajuste').map((t,i)=>`
        <div class="settings-item">
          <span style="flex:1;font-size:.78rem;color:var(--text)">${t}</span>
          <button class="btn-sm" onclick="openTipoEditModal(${i})" style="background:none;border:1px solid var(--border);color:var(--muted)">✏️</button>
          <button class="btn-sm red" onclick="removeTipoModal(${i})">🗑️</button>
        </div>`).join('')}</div>
      <div style="margin-top:10px"><button class="btn-sm green" style="width:100%;padding:9px;font-size:.78rem" onclick="openTipoEditModal(-1)">➕ Nuevo tipo</button></div>`;
  } else if (tab === 'categorias') {
    const allCats = [...new Set(Object.values(CONFIG.categorias).flat())].sort((a,b)=>a.localeCompare(b,'es'));
    // FIX-CAT-TIPOS-VISIBILITY: agrupar por tipo para que sea claro cuál es gasto vs ingreso
    const _catsByTipo = {};
    allCats.forEach(cat => {
      const tipos = Object.keys(CONFIG.categorias).filter(t => CONFIG.categorias[t].includes(cat));
      const hasIngreso = tipos.some(t => t.toLowerCase().includes('ingreso') || t === 'Ahorro en efectivo');
      const hasGasto   = tipos.some(t => t === 'Gasto' || t.toLowerCase().includes('prestamo'));
      const group = (hasIngreso && hasGasto) ? '⚠️ Ambos (revisar)' : hasIngreso ? '💚 Ingresos' : '🔴 Gastos';
      if (!_catsByTipo[group]) _catsByTipo[group] = [];
      _catsByTipo[group].push({ cat, tipos });
    });
    const _groupOrder = ['⚠️ Ambos (revisar)', '🔴 Gastos', '💚 Ingresos'];
    c.innerHTML = `
      <div style="font-size:.68rem;color:var(--muted);margin-bottom:8px;line-height:1.5">
        Toca ✏️ para editar nombre, emoji y tipos · 🗑️ para eliminar.<br>
        <span style="color:#e3b341">⚠️ Ambos</span> = categoría asignada a Gasto E Ingreso a la vez — toca ✏️ para corregir.
      </div>
      ${_groupOrder.filter(g => _catsByTipo[g]?.length).map(group => `
        <div style="font-size:.7rem;font-weight:700;color:${group.includes('Ambos')?'#e3b341':group.includes('Ingresos')?'#3fb950':'#f85149'};margin:10px 0 4px;text-transform:uppercase;letter-spacing:.05em">${group}</div>
        <div class="settings-list">${_catsByTipo[group].map(({cat, tipos}) => {
          const tiposBadges = tipos.map(t => {
            const isGasto   = t === 'Gasto' || t.toLowerCase().includes('prestamo');
            const isIngreso = t.toLowerCase().includes('ingreso') || t === 'Ahorro en efectivo';
            const bg    = isGasto ? '#3d1a1a' : isIngreso ? '#1a3d1a' : '#1a2a3d';
            const color = isGasto ? '#f85149'  : isIngreso ? '#3fb950' : '#58a6ff';
            const short = t.replace('Ingreso ','').replace('Prestamo ','P.').replace('en efectivo','').trim().slice(0,10);
            return `<span style="font-size:.65rem;padding:2px 6px;border-radius:5px;background:${bg};color:${color};font-weight:600">${short}</span>`;
          }).join(' ');
          return `
          <div class="settings-item" style="flex-wrap:wrap;gap:4px">
            <span class="cfg-cat-emoji">${getCatEmoji(cat)}</span>
            <span style="flex:1;font-size:.78rem;color:var(--text);min-width:80px">${escHtml(cat)}</span>
            <span style="display:flex;gap:3px;flex-wrap:wrap;align-items:center">${tiposBadges}</span>
            <button class="btn-sm" data-cat="${escHtml(cat)}" onclick="openCatEditModal(this.dataset.cat)" style="background:none;border:1px solid var(--border);color:var(--muted)">✏️</button>
            <button class="btn-sm red" data-cat="${escHtml(cat)}" onclick="removeCatModal(this.dataset.cat)">🗑️</button>
          </div>`;
        }).join('')}</div>`).join('')}
      <div style="margin-top:10px"><button class="btn-sm green" style="width:100%;padding:9px;font-size:.78rem" onclick="openCatEditModal(null)">➕ Nueva categoría</button></div>`;
  } else if (tab === 'subcategorias') {
    const allCats = Object.keys(CONFIG.subcategorias);
    c.innerHTML = `<select id="sel-cat-sub" onchange="renderSubcatList()" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:5px;font-size:.75rem;width:100%;margin-bottom:8px">
      ${allCats.map(cat=>`<option value="${cat}">${getCatEmoji(cat)} ${cat}</option>`).join('')}</select>
      <div id="subcat-list-content"></div>
      <div style="margin-top:8px"><button class="btn-sm green" style="width:100%;padding:9px;font-size:.78rem" onclick="openSubcatEditModal(document.getElementById('sel-cat-sub').value,-1)">➕ Nueva subcategoría</button></div>`;
    setTimeout(() => renderSubcatList(), 50);
  } else if (tab === 'presupuestos') {
    if(!CONFIG.presupuestosIngresos) CONFIG.presupuestosIngresos = {};
    if(!CONFIG.presupuestosSubcat) CONFIG.presupuestosSubcat = {};

    // ── Helpers para renderizar fila de categoría ──────────────────────
    function bRowPresup(k, v, mode) {
      const hasSubs = !!(CONFIG.subcategorias[k] && CONFIG.subcategorias[k].length > 0);
      const safeK   = escHtml(k);
      const totalSubcat = hasSubs
        ? Object.values(CONFIG.presupuestosSubcat[k] || {}).reduce((s,x)=>s+(x||0),0)
        : 0;
      const subcatInfo = hasSubs && totalSubcat > 0
        ? '<span style="font-size:.62rem;color:#e3b341;margin-right:4px">📋$'+totalSubcat.toFixed(0)+'</span>'
        : '';
      return '<div class="presup-row-wrap" data-cat="'+safeK+'" data-mode="'+mode+'">' +
        '<div class="settings-item">' +
          '<span style="flex:1;font-size:.74rem;color:var(--text)">'+safeK+'</span>' +
          subcatInfo +
          (hasSubs ? '<button class="btn-sm presup-subcat-open" data-cat="'+safeK+'" data-mode="'+mode+'" style="border-color:#e3b341;color:#e3b341;font-size:.65rem">📋</button>' : '') +
          '<input type="number" class="presup-val-input" data-cat="'+safeK+'" data-mode="'+mode+'" value="'+v+'" placeholder="0"' +
            ' style="width:76px;background:var(--surface3,#0d1117);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 6px;font-family:inherit">' +
          '<span style="font-size:.68rem;color:var(--muted)">USD</span>' +
          '<button class="btn-sm red presup-rm-btn" data-cat="'+safeK+'" data-mode="'+mode+'">✕</button>' +
        '</div>' +
      '</div>';
    }

    // ── Categorías a mostrar — TODAS (con y sin presupuesto asignado) ─
    // Gastos: todas las cats de tipo Gasto + las que ya tienen presupuesto
    const allGastoCatsSet = Array.from(new Set([
      ...(CONFIG.categorias['Gasto'] || []),
      ...Object.keys(CONFIG.presupuestos || {})
    ])).filter(Boolean).sort((a,b) => a.localeCompare(b,'es'));

    // Ingresos: todas las cats de tipos ingreso + las que ya tienen meta
    const allIngresoCatsSet = Array.from(new Set([
      ...(CONFIG.categorias['Ingreso Fijo']     || []),
      ...(CONFIG.categorias['Ingreso Variable'] || []),
      ...((CONFIG.tipos||[])
          .filter(t=>(t||'').toLowerCase().includes('ingreso')&&t!=='Ingreso Fijo'&&t!=='Ingreso Variable')
          .flatMap(t=>CONFIG.categorias[t]||[])),
      ...Object.keys(CONFIG.presupuestosIngresos || {})
    ])).filter(Boolean).sort((a,b) => a.localeCompare(b,'es'));

    // Mantener compatibilidad con código antiguo
    const gEntries = allGastoCatsSet.map(k => [k, CONFIG.presupuestos[k] || 0]);
    const iEntries = allIngresoCatsSet.map(k => [k, CONFIG.presupuestosIngresos[k] || 0]);
    const gExtra = []; // ya incluido en gEntries

    c.innerHTML =
      // ── TABS ──
      '<div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:12px">'+
        '<button id="presup-tab-gastos" onclick="switchPresupTab(\'gastos\')" style="flex:1;padding:9px;border:none;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;background:none;border-bottom:2px solid var(--red);color:var(--red)">💸 Gastos</button>'+
        '<button id="presup-tab-ingresos" onclick="switchPresupTab(\'ingresos\')" style="flex:1;padding:9px;border:none;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;background:none;border-bottom:2px solid transparent;color:var(--muted)">💵 Ingresos</button>'+
      '</div>'+

      // ── PANEL GASTOS ──
      '<div id="presup-panel-gastos">'+
        '<div style="font-size:.68rem;color:var(--muted);margin-bottom:10px;line-height:1.5">'+
          'Escribe el total de cada categoría, o toca <b style="color:#e3b341">📋</b> para asignar por subcategoría.'+
          '<br>La suma de subcategorías actualiza el total automáticamente.'+
        '</div>'+
        (gEntries.length
          ? '<div class="settings-list">'+gEntries.map(([k,v])=>bRowPresup(k,v,'gasto')).join('')+'</div>'
          : '<div style="color:var(--muted);font-size:.72rem;text-align:center;padding:8px">Sin categorías de gasto. Agrégalas en Ajustes → Categorías.</div>')+
        '<div class="add-item-row">'+
          '<input type="text" id="new-budget-key" placeholder="Categoría...">'+
          '<input type="number" id="new-budget-val" placeholder="USD">'+
          '<button class="btn-sm green" onclick="addBudget()">+ Total</button>'+
        '</div>'+
      '</div>'+

      // ── PANEL INGRESOS ──
      '<div id="presup-panel-ingresos" style="display:none">'+
        '<div style="font-size:.68rem;color:var(--muted);margin-bottom:10px;line-height:1.5">'+
          'Meta mensual de ingreso por tipo. Toca <b style="color:#3fb950">📋</b> para desglosar por subcategoría.'+
        '</div>'+
        (iEntries.length
          ? '<div class="settings-list" id="budget-ingresos-list">'+iEntries.map(([k,v])=>bRowPresup(k,v,'ingreso')).join('')+'</div>'
          : '<div class="settings-list" id="budget-ingresos-list"><div style="color:var(--muted);font-size:.72rem;text-align:center;padding:12px">Sin categorías de ingreso. Agrégalas en Ajustes → Categorías.</div></div>')+
        '<div class="add-item-row">'+
          '<select id="new-income-type" style="flex:2;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:5px;font-size:.75rem;font-family:inherit">'+
            '<option value="Ingreso Fijo">Ingreso Fijo</option>'+
            '<option value="Ingreso Variable">Ingreso Variable</option>'+
            ((CONFIG?.tipos||[]).filter(t=>(t||'').toLowerCase().includes('ingreso')&&t!=='Ingreso Fijo'&&t!=='Ingreso Variable').map(t=>'<option value="'+t+'">'+t+'</option>').join(''))+
          '</select>'+
          '<input type="number" id="new-income-val" placeholder="USD/mes">'+
          '<button class="btn-sm green" onclick="addIncomeBudget()">+ Meta</button>'+
        '</div>'+
        '<div style="font-size:.67rem;color:var(--muted);margin-top:6px;line-height:1.4">💡 Ej: Ingreso Fijo → meta $800/mes</div>'+
      '</div>';

    // ── Event delegation — busca en c directamente (contenedor real) ───
    setTimeout(() => {
      if (!c) return;

      // Botón 📋 → abrir modal de subcategorías
      c.querySelectorAll('.presup-subcat-open').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          openPresupSubcatModal(this.dataset.cat, this.dataset.mode || 'gasto');
        });
      });

      // Input monto → guardar al perder foco
      c.querySelectorAll('.presup-val-input').forEach(inp => {
        inp.addEventListener('change', function() {
          const cat  = this.dataset.cat;
          const mode = this.dataset.mode || 'gasto';
          const val  = parseFloat(this.value) || 0;
          if (mode === 'ingreso') updateIncomeBudget(cat, val);
          else updateBudget(cat, val);
        });
      });

      // Botón ✕ → eliminar
      c.querySelectorAll('.presup-rm-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const cat  = this.dataset.cat;
          const mode = this.dataset.mode || 'gasto';
          if (mode === 'ingreso') removeIncomeBudget(cat);
          else removeBudget(cat);
        });
      });
    }, 30);
  }
}
function renderSubcatList() {
  const cat = document.getElementById('sel-cat-sub').value;
  const subs = CONFIG.subcategorias[cat] || [];
  // FIX-BUG5: data-attributes evitan SyntaxError con nombres especiales en onclick
  document.getElementById('subcat-list-content').innerHTML = `
    <div style="font-size:.68rem;color:var(--muted);margin-bottom:4px">✏️ editar · 🗑️ eliminar.</div>
    <div class="settings-list">${subs.map((s,i)=>`
      <div class="settings-item">
        <span style="flex:1;font-size:.78rem;color:var(--text)">${escHtml(s)}</span>
        <button class="btn-sm" data-cat="${escHtml(cat)}" data-idx="${i}" onclick="openSubcatEditModal(this.dataset.cat,parseInt(this.dataset.idx))" style="background:none;border:1px solid var(--border);color:var(--muted)">✏️</button>
        <button class="btn-sm red" data-cat="${escHtml(cat)}" data-idx="${i}" onclick="removeSubcatModal(this.dataset.cat,parseInt(this.dataset.idx))">🗑️</button>
      </div>`).join('')}</div>`;
}
// ── Editar existentes ─────────────────────────
function editTipo(i, newVal) {
  if (!newVal.trim()) return;
  const realIdx = CONFIG.tipos.indexOf(CONFIG.tipos.filter(t=>t!=='Ajuste')[i]);
  if (realIdx >= 0) { CONFIG.tipos[realIdx] = newVal.trim(); sbSaveConfig(); toast('✏️ Tipo actualizado', 'ok'); }
}
function editCat(oldVal, newVal) {
  if (!newVal.trim() || oldVal === newVal.trim()) return;
  const nv = newVal.trim();
  Object.keys(CONFIG.categorias).forEach(k => {
    const idx = CONFIG.categorias[k].indexOf(oldVal);
    if (idx >= 0) CONFIG.categorias[k][idx] = nv;
  });
  if (CONFIG.subcategorias[oldVal] !== undefined) {
    CONFIG.subcategorias[nv] = CONFIG.subcategorias[oldVal];
    delete CONFIG.subcategorias[oldVal];
  }
  if (CONFIG.presupuestos[oldVal] !== undefined) {
    CONFIG.presupuestos[nv] = CONFIG.presupuestos[oldVal];
    delete CONFIG.presupuestos[oldVal];
  }
  sbSaveConfig();
  toast('✏️ Categoría actualizada', 'ok');
}
function editSubcat(cat, i, newVal) {
  if (!newVal.trim()) return;
  CONFIG.subcategorias[cat][i] = newVal.trim();
  sbSaveConfig();
  toast('✏️ Subcategoría actualizada', 'ok');
}
// ── Agregar nuevos ────────────────────────────
function addTipo() {
  const v = document.getElementById('new-tipo').value.trim();
  if (!v) return;
  CONFIG.tipos.push(v);
  if (!CONFIG.categorias[v]) CONFIG.categorias[v] = [];
  renderSettingsTab('tipos');
  // FIX-TIPO-REFRESH: actualizar dropdown del formulario si está abierto
  const tipoEl = document.getElementById('f-tipo');
  if (tipoEl) {
    const optExists = Array.from(tipoEl.options).some(o => o.value === v);
    if (!optExists) {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      tipoEl.appendChild(opt);
    }
  }
  toast('Tipo agregado ✅', 'ok');
  sbSaveConfig();
}
function addCat() {
  const v = document.getElementById('new-cat')?.value?.trim();
  if (!v) return;
  // FIX-CAT-TODOS-TIPOS: agregar a tipos base + personalizados del usuario
  const tiposBase = ['Gasto','Ingreso Fijo','Ingreso Variable','Prestamo recibido','Prestamo pagado'];
  const todosTipos = [...new Set([...tiposBase, ...(CONFIG.tipos || [])])];
  todosTipos.forEach(tipo => {
    if (!CONFIG.categorias[tipo]) CONFIG.categorias[tipo] = [];
    if (!CONFIG.categorias[tipo].includes(v)) CONFIG.categorias[tipo].push(v);
  });
  if (!CONFIG.subcategorias[v]) CONFIG.subcategorias[v] = [];
  if (CONFIG.presupuestos[v] === undefined) CONFIG.presupuestos[v] = 0;
  const nameEl = document.getElementById('new-cat');
  if (nameEl) nameEl.value = '';
  renderSettingsTab('categorias');
  // FIX-CAT-REFRESH: refrescar dropdown del formulario si está abierto
  if (typeof onTipoChange === 'function') {
    const tipoEl = document.getElementById('f-tipo');
    if (tipoEl) onTipoChange();
  }
  toast('✅ Categoría agregada a todos los tipos', 'ok');
  sbSaveConfig();
}
function addSubcat() {
  const cat = document.getElementById('sel-cat-sub').value;
  const v = document.getElementById('new-subcat').value.trim();
  if (!v || !cat) return;
  if (!CONFIG.subcategorias[cat]) CONFIG.subcategorias[cat] = [];
  CONFIG.subcategorias[cat].push(v);
  document.getElementById('new-subcat').value = '';
  renderSubcatList();
  toast('Subcategoría agregada ✅', 'ok');
  // FIX-SUBCAT-REFRESH: refrescar subcat dropdown si la cat está activa en form
  if (typeof onCatChange === 'function') {
    const catEl = document.getElementById('f-cat');
    if (catEl && catEl.value === cat) onCatChange();
  }
  sbSaveConfig();
}
function addBudget() {
  const k = document.getElementById('new-budget-key').value.trim();
  const v = parseFloat(document.getElementById('new-budget-val').value) || 0;
  if (!k) return;
  CONFIG.presupuestos[k] = v;
  renderSettingsTab('presupuestos');
  toast('Presupuesto agregado ✅', 'ok');
  sbSaveConfig();
}
// ── Eliminar ──────────────────────────────────
async function removeTipo(i) {
  const real = CONFIG.tipos.filter(t=>t!=='Ajuste');
  const ok = await showConfirm('Eliminar tipo', `¿Eliminar el tipo "${real[i]}"?`, '🗑️');
  if (!ok) return;
  const realIdx = CONFIG.tipos.indexOf(real[i]);
  if (realIdx >= 0) CONFIG.tipos.splice(realIdx, 1);
  renderSettingsTab('tipos');
  toast('Tipo eliminado', 'ok');
  sbSaveConfig();
}
function removeCat(cat) {
  Object.keys(CONFIG.categorias).forEach(k => {
    CONFIG.categorias[k] = CONFIG.categorias[k].filter(c => c !== cat);
  });
  delete CONFIG.subcategorias[cat];
  delete CONFIG.presupuestos[cat];
  renderSettingsTab('categorias');
  toast('Categoría eliminada', 'ok');
  sbSaveConfig();
}
function removeSubcat(cat, i) {
  CONFIG.subcategorias[cat].splice(i, 1);
  renderSubcatList();
  toast('Subcategoría eliminada', 'ok');
  sbSaveConfig();
}
async function removeBudget(k) {
  const ok = await showConfirm('Eliminar presupuesto', `¿Eliminar el presupuesto de "${k}"?`, '💰');
  if (!ok) return;
  delete CONFIG.presupuestos[k];
  renderSettingsTab('presupuestos');
  toast('Presupuesto eliminado', 'ok');
  sbSaveConfig();
}
function updateBudget(k, v) {
  CONFIG.presupuestos[k] = parseFloat(v) || 0;
  render();
  sbSaveConfig();
  toast(`📋 Presupuesto "${k}" actualizado`, 'ok');
}

