function openTiposModal()      { _openCfgListModal('tipos',         '📋 Tipos de movimiento'); }
function openCategoriasModal() { _openCfgListModal('categorias',    '🏷️ Categorías'); }
function openSubcatModal()     { _openCfgListModal('subcategorias', '🔖 Subcategorías'); }

// ── C14: MODAL TIPOS ──────────────────────────────────────────
let _editingTipoIdx = null;
function openTipoEditModal(idx) {
  _editingTipoIdx = idx;
  const tipo = idx === -1 ? '' : (CONFIG.tipos.filter(t=>t!=='Ajuste')[idx] || '');
  const nameEl = document.getElementById('tipo-edit-name');
  if (nameEl) nameEl.value = tipo;
  const title = document.getElementById('tipo-edit-title');
  if (title) title.textContent = idx === -1 ? '➕ Nuevo Tipo' : '✏️ Editar Tipo';
  document.getElementById('modal-tipo-edit')?.classList.add('open');
}
function closeTipoEditModal() { document.getElementById('modal-tipo-edit')?.classList.remove('open'); }
async function saveTipoEdit() {
  const name = document.getElementById('tipo-edit-name')?.value?.trim();
  if (!name) { toast('Escribe un nombre', 'err'); return; }
  if (_editingTipoIdx === -1) {
    CONFIG.tipos.push(name);
    CONFIG.categorias[name] = CONFIG.categorias[name] || [];
  } else {
    const real = CONFIG.tipos.filter(t=>t!=='Ajuste');
    const realIdx = CONFIG.tipos.indexOf(real[_editingTipoIdx]);
    if (realIdx >= 0) CONFIG.tipos[realIdx] = name;
  }
  sbSaveConfig();
  toast('✅ Tipo guardado', 'ok');
  closeTipoEditModal();
  renderSettingsTab('tipos');
}
async function removeTipoModal(idx) {
  const real = CONFIG.tipos.filter(t=>t!=='Ajuste');
  const ok = await showConfirm('Eliminar tipo', `¿Eliminar "${real[idx]}"?`, '🗑️');
  if (!ok) return;
  const realIdx = CONFIG.tipos.indexOf(real[idx]);
  if (realIdx >= 0) CONFIG.tipos.splice(realIdx, 1);
  sbSaveConfig();
  toast('Tipo eliminado', 'ok');
  renderSettingsTab('tipos');
}

// ── C14: MODAL CATEGORÍAS ─────────────────────────────────────
let _editingCat = null;
function openCatEditModal(cat) {
  _editingCat = cat || null;
  const sp = cat ? splitEmojiName(cat) : {emoji:'', name:''};
  const emojiEl = document.getElementById('cat-edit-emoji');
  const nameEl  = document.getElementById('cat-edit-name');
  if (emojiEl) emojiEl.value = CONFIG.catEmojis?.[cat] || sp.emoji || '';
  if (nameEl)  nameEl.value  = sp.name || cat || '';
  const title = document.getElementById('cat-edit-title');
  if (title) title.textContent = cat ? '✏️ Editar Categoría' : '➕ Nueva Categoría';

  // Renderizar checkboxes de tipos — FIX-TIPOS-UI: etiquetas completas + íconos claros
  const tiposContainer = document.getElementById('cat-edit-tipos');
  if (tiposContainer) {
    const todosTipos = [...new Set(['Gasto','Ingreso Fijo','Ingreso Variable','Prestamo recibido','Prestamo pagado',...(CONFIG.tipos||[])])].filter(t => t !== 'Ajuste');
    const tiposActuales = cat ? Object.keys(CONFIG.categorias).filter(t => (CONFIG.categorias[t]||[]).includes(cat)) : ['Gasto'];

    // Metadatos visuales por tipo
    const tipoMeta = {
      'Gasto':              { icon:'💸', label:'Gasto',              sub:'Dinero que sale',              color:'#f85149', rgb:'248,81,73'  },
      'Ingreso Fijo':       { icon:'💵', label:'Ingreso Fijo',       sub:'Sueldo, renta mensual',        color:'#3fb950', rgb:'63,185,80'  },
      'Ingreso Variable':   { icon:'💹', label:'Ingreso Variable',   sub:'Comisiones, extras, ventas',   color:'#3fb950', rgb:'63,185,80'  },
      'Prestamo recibido':  { icon:'🤝', label:'Préstamo recibido',  sub:'Te prestaron dinero',          color:'#e3b341', rgb:'227,179,65' },
      'Prestamo pagado':    { icon:'💳', label:'Préstamo pagado',    sub:'Devolviste un préstamo',       color:'#e3b341', rgb:'227,179,65' },
    };

    tiposContainer.innerHTML = todosTipos.map(tipo => {
      const checked = tiposActuales.includes(tipo);
      const meta = tipoMeta[tipo] || {
        icon: '🏷️',
        label: tipo,
        sub: 'Tipo personalizado',
        color: '#58a6ff',
        rgb: '88,166,255'
      };
      const { icon, label, sub, color, rgb } = meta;
      const bg     = checked ? `rgba(${rgb},.12)` : 'transparent';
      const border  = checked ? color : 'var(--border,#30363d)';
      const textCol = checked ? color : 'var(--muted,#8b949e)';
      const subCol  = checked ? `rgba(${rgb},.8)` : '#484f58';

      return `<label data-tipo-label="${escHtml(tipo)}"
        style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;
               border:1.5px solid ${border};background:${bg};cursor:pointer;
               transition:border-color .15s,background .15s">
        <input type="checkbox" data-tipo="${escHtml(tipo)}" ${checked?'checked':''}
          style="accent-color:${color};width:16px;height:16px;flex-shrink:0;cursor:pointer">
        <span style="font-size:1.15rem;flex-shrink:0;line-height:1">${icon}</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-size:.8rem;font-weight:600;color:${textCol}">${escHtml(label)}</span>
          <span style="display:block;font-size:.66rem;color:${subCol};margin-top:1px">${escHtml(sub)}</span>
        </span>
        <span style="font-size:.7rem;font-weight:700;color:${checked?color:'#30363d'}">${checked?'✓':''}</span>
      </label>`;
    }).join('');

    // Efecto visual al cambiar checkbox
    tiposContainer.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', function() {
        const tipo = this.dataset.tipo;
        const meta = tipoMeta[tipo] || { color:'#58a6ff', rgb:'88,166,255' };
        const { color, rgb } = meta;
        const lbl = this.closest('label');
        const nameSpan = lbl.querySelector('span[style*="font-weight:600"]');
        const subSpan  = lbl.querySelectorAll('span[style]')[2];
        const checkMark = lbl.lastElementChild;
        if (this.checked) {
          lbl.style.borderColor  = color;
          lbl.style.background   = `rgba(${rgb},.12)`;
          if (nameSpan) nameSpan.style.color = color;
          if (checkMark) { checkMark.textContent = '✓'; checkMark.style.color = color; }
        } else {
          lbl.style.borderColor  = 'var(--border,#30363d)';
          lbl.style.background   = 'transparent';
          if (nameSpan) nameSpan.style.color = 'var(--muted,#8b949e)';
          if (checkMark) { checkMark.textContent = ''; checkMark.style.color = '#30363d'; }
        }
      });
    });
  }
  document.getElementById('modal-cat-edit')?.classList.add('open');
}
function closeCatEditModal() { document.getElementById('modal-cat-edit')?.classList.remove('open'); }
async function saveCatEdit() {
  const emoji   = document.getElementById('cat-edit-emoji')?.value?.trim() || '';
  const newName = document.getElementById('cat-edit-name')?.value?.trim();
  if (!newName) { toast('Escribe un nombre', 'err'); return; }
  if (!CONFIG.catEmojis) CONFIG.catEmojis = {};

  // Leer tipos seleccionados en checkboxes
  const tiposSeleccionados = [];
  document.querySelectorAll('#cat-edit-tipos input[type=checkbox]:checked').forEach(cb => {
    tiposSeleccionados.push(cb.dataset.tipo);
  });
  if (!tiposSeleccionados.length) { toast('Selecciona al menos un tipo', 'err'); return; }

  if (_editingCat && _editingCat !== newName) {
    // Renombrar: migrar en todos los tipos donde exista
    Object.keys(CONFIG.categorias).forEach(k => {
      const idx = CONFIG.categorias[k].indexOf(_editingCat);
      if (idx >= 0) CONFIG.categorias[k][idx] = newName;
    });
    if (CONFIG.subcategorias[_editingCat]) {
      CONFIG.subcategorias[newName] = CONFIG.subcategorias[_editingCat];
      delete CONFIG.subcategorias[_editingCat];
    }
    if (CONFIG.presupuestos[_editingCat] !== undefined) {
      CONFIG.presupuestos[newName] = CONFIG.presupuestos[_editingCat];
      delete CONFIG.presupuestos[_editingCat];
    }
    if (CONFIG.catEmojis[_editingCat]) delete CONFIG.catEmojis[_editingCat];
  }

  // Aplicar tipos: agregar a seleccionados, quitar de no seleccionados
  const todosTipos = [...new Set(['Gasto','Ingreso Fijo','Ingreso Variable','Prestamo recibido','Prestamo pagado',...(CONFIG.tipos||[])])];
  todosTipos.forEach(tipo => {
    if (!CONFIG.categorias[tipo]) CONFIG.categorias[tipo] = [];
    const idx = CONFIG.categorias[tipo].indexOf(newName);
    if (tiposSeleccionados.includes(tipo)) {
      if (idx < 0) CONFIG.categorias[tipo].push(newName);
    } else {
      if (idx >= 0) CONFIG.categorias[tipo].splice(idx, 1);
    }
  });

  if (!_editingCat) {
    if (!CONFIG.subcategorias[newName]) CONFIG.subcategorias[newName] = [];
    if (CONFIG.presupuestos[newName] === undefined) CONFIG.presupuestos[newName] = 0;
  }

  if (emoji) CONFIG.catEmojis[newName] = emoji;
  else if (CONFIG.catEmojis) delete CONFIG.catEmojis[newName];
  sbSaveConfig();
  toast('✅ Categoría guardada', 'ok');
  closeCatEditModal();
  renderSettingsTab('categorias');
  if (typeof onTipoChange === 'function') {
    const tipoEl = document.getElementById('f-tipo');
    if (tipoEl) onTipoChange();
  }
}
async function removeCatModal(cat) {
  const ok = await showConfirm('Eliminar categoría', `¿Eliminar "${cat}"?`, '🗑️');
  if (!ok) return;
  Object.keys(CONFIG.categorias).forEach(k => {
    CONFIG.categorias[k] = CONFIG.categorias[k].filter(c => c !== cat);
  });
  delete CONFIG.subcategorias[cat];
  delete CONFIG.presupuestos[cat];
  if (CONFIG.catEmojis) delete CONFIG.catEmojis[cat];
  sbSaveConfig();
  toast('Categoría eliminada', 'ok');
  renderSettingsTab('categorias');
}

// ── C14: MODAL SUBCATEGORÍAS ──────────────────────────────────
let _editingSubcatCat = null, _editingSubcatIdx = null;
function openSubcatEditModal(cat, idx) {
  _editingSubcatCat = cat;
  _editingSubcatIdx = idx;
  const val = idx === -1 ? '' : (CONFIG.subcategorias[cat]?.[idx] || '');
  const nameEl = document.getElementById('subcat-edit-name');
  if (nameEl) nameEl.value = val;
  const catLabel = document.getElementById('subcat-edit-cat-label');
  if (catLabel) catLabel.textContent = cat;
  const title = document.getElementById('subcat-edit-title');
  if (title) title.textContent = idx === -1 ? '➕ Nueva Subcategoría' : '✏️ Editar Subcategoría';
  document.getElementById('modal-subcat-edit')?.classList.add('open');
}
function closeSubcatEditModal() { document.getElementById('modal-subcat-edit')?.classList.remove('open'); }
async function saveSubcatEdit() {
  const name = document.getElementById('subcat-edit-name')?.value?.trim();
  if (!name) { toast('Escribe un nombre', 'err'); return; }
  if (!CONFIG.subcategorias[_editingSubcatCat]) CONFIG.subcategorias[_editingSubcatCat] = [];
  if (_editingSubcatIdx === -1) {
    CONFIG.subcategorias[_editingSubcatCat].push(name);
  } else {
    CONFIG.subcategorias[_editingSubcatCat][_editingSubcatIdx] = name;
  }
  sbSaveConfig();
  toast('✅ Subcategoría guardada', 'ok');
  closeSubcatEditModal();
  renderSettingsTab('subcategorias');
}
async function removeSubcatModal(cat, idx) {
  const ok = await showConfirm('Eliminar', `¿Eliminar "${CONFIG.subcategorias[cat][idx]}"?`, '🗑️');
  if (!ok) return;
  CONFIG.subcategorias[cat].splice(idx, 1);
  sbSaveConfig();
  toast('Subcategoría eliminada', 'ok');
  renderSettingsTab('subcategorias');
}
