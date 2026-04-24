// Guard: escHtml disponible desde app-cuentas.js (cargado antes)
// Si por alguna razón no está, definir aquí como fallback
if (typeof escHtml === 'undefined') {
  window.escHtml = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
// ╔══════════════════════════════════════════════════════════════════════╗
// ║  app-smart.js — Mis Finanzas 2026                                    ║
// ║  Módulo independiente — 7 features de alto impacto                   ║
// ║  1. Pantalla Novedades                                               ║
// ║  2. Categorización automática por reglas                             ║
// ║  3. Pronóstico de flujo de caja                                      ║
// ║  4. Detección automática de recurrentes                              ║
// ║  5. Simulador de deuda                                               ║
// ║  6. Patrimonio neto consolidado                                      ║
// ║  7. Modo presupuesto tipo sobre (envelope)                           ║
// ╚══════════════════════════════════════════════════════════════════════╝

(function SmartModule() {

// ═══════════════════════════════════════════════════════════════════════
// 1. PANTALLA NOVEDADES
// ═══════════════════════════════════════════════════════════════════════
const NOVEDADES_VERSION  = 'Batch-XXVII-r1';
const NOVEDADES_SEEN_KEY = 'fin_novedades_' + NOVEDADES_VERSION;

const NOVEDADES = {
  nuevo: [
    { icon:'📸', color:'gold',  title:'Escáner OCR más preciso',             desc:'Detecta RIF venezolano, extrae el total final (no subtotales), convierte Bs→USD, clasifica en 9 categorías.' },
    { icon:'📋', color:'blue',  title:'Lista de compras: menú de listas primero', desc:'Al abrir la lista de compras, aparece el menú general. Edita nombre, elimina, selecciona lista activa o crea nueva.' },
    { icon:'✏️', color:'',      title:'Editar productos en lista de compras',  desc:'Cada producto tiene ✏️ para editar nombre, emoji, precio y cantidad directamente.' },
    { icon:'↔️', color:'green', title:'Transferir en cuentas y billeteras',   desc:'Botón ↔️ en el panel de cuentas y en el detalle de cada billetera. Las transferencias en Bs se convierten automáticamente a USD.' },
    { icon:'🔀', color:'',      title:'Reordenar Mis Saldos y accesos rápidos', desc:'Botón 🔀 para arrastrar y reordenar. El orden se guarda en Supabase y localStorage.' },
    { icon:'🧾', color:'gold',  title:'Últimos movimientos mejorado',         desc:'15 movimientos con scroll, badge de tipo, ✏️ Editar y 🗑 Eliminar funcionales, ℹ️🤖 en el header.' },
  ],
  corregido: [
    { icon:'🔧', color:'red', title:'Saldo manual sumaba movimientos pasados', desc:'Fix en calcCuentaBalance: condición <= y exclusión de transacciones sin fecha.' },
    { icon:'🔧', color:'red', title:'Fecha día siguiente al registrar',        desc:'Fix de timezone: se usa la hora local del dispositivo, no UTC.' },
    { icon:'🔧', color:'',   title:'Editar/Eliminar desde últimos movimientos', desc:'Los botones ahora llaman a editMov/deleteMov con el mes correcto.' },
    { icon:'🔧', color:'',   title:'Voz: selección rápida no funcionaba',      desc:'Fix de sincronización _voicePendingData en processVoiceLanding.' },
    { icon:'🔧', color:'',   title:'Transferencia en Bs se guardaba como USD', desc:'El numpad detecta la moneda de la cuenta y convierte correctamente.' },
  ]
};

// Función para ver novedades desde Settings (resetea el seen-key)
window.openNovedadesFromSettings = function() {
  try { localStorage.removeItem(NOVEDADES_SEEN_KEY); } catch(e) {}
  window.openNovedades && window.openNovedades();
};
let _novTab = 'nuevo';

window.novedadesTab = function(tab, btn) {
  _novTab = tab;
  document.querySelectorAll('.novedades-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _renderNovList();
};

function _renderNovList() {
  const el = document.getElementById('novedades-list');
  if (!el) return;
  el.innerHTML = (NOVEDADES[_novTab] || []).map((item, i) =>
    `<div class="novedades-item" style="animation-delay:${i * 0.05}s">
      <div class="novedades-icon-wrap ${item.color || ''}">${item.icon}</div>
      <div>
        <div class="novedades-item-title">${item.title}</div>
        <div class="novedades-item-desc">${item.desc}</div>
      </div>
    </div>`
  ).join('');
}

window.openNovedades = function() {
  _novTab = 'nuevo';
  const modal = document.getElementById('modal-novedades');
  if (!modal) return;
  document.querySelectorAll('.novedades-tab').forEach((b,i) => b.classList.toggle('active', i===0));
  _renderNovList();
  modal.classList.add('open');
  if (typeof lockScroll === 'function') lockScroll();
};

window.closeNovedades = function() {
  document.getElementById('modal-novedades')?.classList.remove('open');
  if (typeof unlockScroll === 'function') unlockScroll();
  try { localStorage.setItem(NOVEDADES_SEEN_KEY, '1'); } catch(e) {}
};

window._checkNovedades = function() {
  try {
    const hasPending = !localStorage.getItem(NOVEDADES_SEEN_KEY);
    // FIX-NOVEDADES-BADGE: mostrar badge rojo en botón Settings si hay novedades
    if (hasPending) {
      setTimeout(() => {
        // Badge en botón de Settings en la barra de navegación
        ['nav-config','btn-settings','sett-btn'].forEach(id => {
          const el = document.getElementById(id);
          if (el && !el.querySelector('.novedad-badge')) {
            const badge = document.createElement('span');
            badge.className = 'novedad-badge';
            badge.style.cssText = 'position:absolute;top:2px;right:2px;width:8px;height:8px;background:#f85149;border-radius:50%;border:1.5px solid #0d1117;pointer-events:none';
            el.style.position = 'relative';
            el.appendChild(badge);
          }
        });
        // Badge en el ícono de la barra inferior (nav-config)
        const navConfig = document.getElementById('nav-config');
        if (navConfig) {
          const iconEl = navConfig.querySelector('.nav-icon, span');
          if (iconEl && !navConfig.querySelector('.novedad-badge')) {
            const badge = document.createElement('span');
            badge.className = 'novedad-badge';
            badge.style.cssText = 'position:absolute;top:4px;right:8px;width:8px;height:8px;background:#f85149;border-radius:50%;border:1.5px solid #0d1117;pointer-events:none';
            navConfig.style.position = 'relative';
            navConfig.appendChild(badge);
          }
        }
      }, 2000);
      setTimeout(window.openNovedades, 1400);
    }
  } catch(e) {}
};

// Limpiar badge al ver novedades
const _origCloseNovedades = window.closeNovedades;
window.closeNovedades = function() {
  if (_origCloseNovedades) _origCloseNovedades();
  document.querySelectorAll('.novedad-badge').forEach(b => b.remove());
};

function _injectNovedadesModal() {
  if (document.getElementById('modal-novedades')) return;
  const el = document.createElement('div');
  el.id = 'modal-novedades';
  el.style.cssText = 'display:none;position:fixed;inset:0;z-index:19500;background:rgba(0,0,0,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);align-items:flex-end;justify-content:center;padding:0';
  el.innerHTML = `
    <div class="novedades-sheet">
      <div class="novedades-handle"></div>
      <div class="novedades-header">
        <div class="novedades-version">${NOVEDADES_VERSION}</div>
        <div class="novedades-title">Novedades</div>
      </div>
      <div class="novedades-tabs">
        <button class="novedades-tab active" onclick="novedadesTab('nuevo',this)">✨ Lo nuevo</button>
        <button class="novedades-tab" onclick="novedadesTab('corregido',this)">🔧 Lo corregido</button>
      </div>
      <div class="novedades-list" id="novedades-list"></div>
      <button class="novedades-cta" onclick="closeNovedades()">Continuar →</button>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) window.closeNovedades(); });
  document.body.appendChild(el);
  // Override display:none with flex when open class added
  const style = document.createElement('style');
  style.textContent = '#modal-novedades.open{display:flex!important}';
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. CATEGORIZACIÓN AUTOMÁTICA POR REGLAS
// ═══════════════════════════════════════════════════════════════════════
const RULES_KEY = 'fin_cat_rules_v1';

function loadRules() {
  try { return JSON.parse(localStorage.getItem(RULES_KEY) || '[]'); }
  catch(e) { return []; }
}
function saveRules(rules) {
  try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch(e) {}
}

// Called from saveMovimiento hook — apply rules to auto-fill category
window.applyCatRules = function(desc) {
  if (!desc) return null;
  const rules = loadRules();
  const lower = desc.toLowerCase();
  for (const rule of rules) {
    if (!rule.keyword || !rule.cat) continue;
    if (lower.includes(rule.keyword.toLowerCase())) {
      return { cat: rule.cat, subcat: rule.subcat || '', tipo: rule.tipo || '' };
    }
  }
  return null;
};

window.openCatRules = function() {
  const rules = loadRules();
  const tipos = (typeof CONFIG !== 'undefined' && CONFIG.tipos?.length > 0)
    ? CONFIG.tipos : ['Gasto','Ingreso Fijo','Ingreso Variable','Ahorro en efectivo'];
  const allCats = (typeof CONFIG !== 'undefined' && CONFIG.categorias)
    ? [...new Set(Object.values(CONFIG.categorias).flat())] : [];

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:10300;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:0;width:500px;max-width:100%;max-height:88vh;overflow-y:auto">
      <div style="padding:16px 20px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#161b22;z-index:1">
        <h3 style="color:#e6edf3;font-size:.95rem;margin:0">🤖 Reglas de categorización automática</h3>
        <button onclick="this.closest('[style*=fixed]').remove();if(typeof unlockScroll==='function')unlockScroll()" style="background:none;border:none;color:#8b949e;font-size:1.2rem;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px 20px">
        <p style="font-size:.75rem;color:#8b949e;margin-bottom:14px;line-height:1.6">
          Define palabras clave que la app reconocerá automáticamente al escribir una descripción.<br>
          Ej: "farmatodo" → Salud | "netflix" → Entretenimiento
        </p>

        <!-- Nueva regla -->
        <div style="background:#1c2128;border:1px solid #30363d;border-radius:10px;padding:14px;margin-bottom:16px">
          <div style="font-size:.72rem;color:#8b949e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">➕ Nueva regla</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
            <div>
              <label style="font-size:.68rem;color:#8b949e;display:block;margin-bottom:3px">PALABRA CLAVE</label>
              <input id="rule-keyword" placeholder="ej: farmatodo" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:7px 10px;border-radius:7px;font-size:.8rem;outline:none;box-sizing:border-box">
            </div>
            <div>
              <label style="font-size:.68rem;color:#8b949e;display:block;margin-bottom:3px">TIPO</label>
              <select id="rule-tipo" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:7px 10px;border-radius:7px;font-size:.8rem;outline:none">
                ${tipos.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div>
              <label style="font-size:.68rem;color:#8b949e;display:block;margin-bottom:3px">CATEGORÍA</label>
              <select id="rule-cat" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:7px 10px;border-radius:7px;font-size:.8rem;outline:none">
                ${allCats.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:.68rem;color:#8b949e;display:block;margin-bottom:3px">SUBCATEGORÍA (opcional)</label>
              <input id="rule-subcat" placeholder="ej: Medicamentos" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:7px 10px;border-radius:7px;font-size:.8rem;outline:none;box-sizing:border-box">
            </div>
          </div>
          <button onclick="_addCatRule()" style="width:100%;background:linear-gradient(135deg,#238636,#2ea043);color:#fff;border:none;padding:9px;border-radius:9px;font-weight:700;font-size:.82rem;cursor:pointer">
            ✅ Guardar regla
          </button>
        </div>

        <!-- Lista de reglas -->
        <div id="rules-list"></div>
      </div>
    </div>`;
  overlay.onclick = e => { if (e.target === overlay) { overlay.remove(); if(typeof unlockScroll==='function') unlockScroll(); } };
  document.body.appendChild(overlay);
  if (typeof lockScroll === 'function') lockScroll();
  _renderRulesList(overlay);
};

window._addCatRule = function() {
  const keyword = document.getElementById('rule-keyword')?.value?.trim();
  const tipo    = document.getElementById('rule-tipo')?.value;
  const cat     = document.getElementById('rule-cat')?.value;
  const subcat  = document.getElementById('rule-subcat')?.value?.trim() || '';
  if (!keyword) { if(typeof toast==='function') toast('Escribe una palabra clave','err'); return; }
  if (!cat)     { if(typeof toast==='function') toast('Selecciona una categoría','err'); return; }
  const rules = loadRules();
  if (rules.find(r => r.keyword.toLowerCase() === keyword.toLowerCase())) {
    if(typeof toast==='function') toast('Ya existe una regla para "'+keyword+'"','err'); return;
  }
  rules.push({ id: Date.now(), keyword, tipo, cat, subcat });
  saveRules(rules);
  if(typeof toast==='function') toast('✅ Regla guardada: "'+keyword+'" → '+cat,'ok');
  document.getElementById('rule-keyword').value = '';
  document.getElementById('rule-subcat').value = '';
  const overlay = document.querySelector('[style*="z-index:10300"]');
  if (overlay) _renderRulesList(overlay);
};

function _renderRulesList(overlay) {
  const el = overlay?.querySelector('#rules-list') || document.getElementById('rules-list');
  if (!el) return;
  const rules = loadRules();
  if (!rules.length) {
    el.innerHTML = '<p style="text-align:center;color:#484f58;font-size:.75rem;padding:12px">No hay reglas todavía.</p>';
    return;
  }
  el.innerHTML = `
    <div style="font-size:.72rem;color:#8b949e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">${rules.length} regla${rules.length!==1?'s':''} activa${rules.length!==1?'s':''}</div>
    ${rules.map(r => `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#1c2128;border:1px solid #30363d;border-radius:9px;margin-bottom:6px">
        <div style="flex:1;min-width:0">
          <div style="font-size:.78rem;font-weight:600;color:#e6edf3">"${r.keyword}"</div>
          <div style="font-size:.68rem;color:#8b949e;margin-top:2px">${r.tipo} → ${r.cat}${r.subcat?' / '+r.subcat:''}</div>
        </div>
        <button onclick="_deleteCatRule(${r.id})" style="background:none;border:1px solid #3d1a1a;color:#f85149;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:.75rem;flex-shrink:0">🗑</button>
      </div>`
    ).join('')}`;
}

window._deleteCatRule = function(id) {
  const rules = loadRules().filter(r => r.id !== id);
  saveRules(rules);
  const overlay = document.querySelector('[style*="z-index:10300"]');
  if (overlay) _renderRulesList(overlay);
  if(typeof toast==='function') toast('Regla eliminada','ok');
};

// ═══════════════════════════════════════════════════════════════════════
// 3. PRONÓSTICO DE FLUJO DE CAJA
// ═══════════════════════════════════════════════════════════════════════
window.renderForecast = function() {
  const el = document.getElementById('forecast-card-content');
  if (!el) return;

  if (typeof EXCEL_DATA === 'undefined' || typeof activeMonths === 'undefined') {
    el.innerHTML = '<p style="color:var(--muted);font-size:.75rem">Cargando...</p>';
    return;
  }

  // Calculate averages from last 3 active months
  const last3 = activeMonths.slice(-3);
  if (last3.length === 0) {
    el.innerHTML = '<p style="color:var(--muted);font-size:.75rem;text-align:center;padding:12px">Registra al menos un mes para ver el pronóstico.</p>';
    return;
  }

  const avgIngresos = last3.reduce((s,m) => s + (EXCEL_DATA[m]?.ingresos||0), 0) / last3.length;
  const avgGastos   = last3.reduce((s,m) => s + (EXCEL_DATA[m]?.gastos||0), 0)   / last3.length;
  const avgAhorros  = last3.reduce((s,m) => s + (EXCEL_DATA[m]?.ahorros||0), 0)  / last3.length;

  // Fixed expenses from RECURRENTES
  const recurrentes = typeof RECURRENTES !== 'undefined' ? RECURRENTES : [];
  const gastosFijos = recurrentes
    .filter(r => r.activa !== false && ['Gasto','Prestamo pagado'].includes(r.tipo))
    .reduce((s,r) => s + (parseFloat(r.amount)||0), 0);
  const ingresosFijos = recurrentes
    .filter(r => r.activa !== false && ['Ingreso Fijo','Ingreso Variable'].includes(r.tipo))
    .reduce((s,r) => s + (parseFloat(r.amount)||0), 0);

  const fmt = typeof window.fmt === 'function' ? window.fmt : v => '$'+parseFloat(v).toFixed(2);

  // Projections
  const ingreso30  = Math.max(avgIngresos, ingresosFijos);
  const gasto30    = Math.max(avgGastos,   gastosFijos);
  const balance30  = ingreso30 - gasto30;
  const balance60  = balance30 * 2;
  const isPositive = balance30 >= 0;

  // Current month progress
  const currentD  = typeof currentMonth !== 'undefined' ? (EXCEL_DATA[currentMonth]||{}) : {};
  const ingActual = currentD.ingresos||0;
  const gasActual = currentD.gastos||0;
  const restante  = ingreso30 - ingActual;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:${isPositive?'rgba(63,185,80,.08)':'rgba(248,81,73,.08)'};border:1px solid ${isPositive?'rgba(63,185,80,.2)':'rgba(248,81,73,.2)'};border-radius:12px;padding:12px;text-align:center">
        <div style="font-size:.65rem;color:#8b949e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">30 días</div>
        <div style="font-size:1.15rem;font-weight:800;color:${isPositive?'#3fb950':'#f85149'}">${isPositive?'+':''}${fmt(balance30)}</div>
        <div style="font-size:.62rem;color:#8b949e;margin-top:2px">balance proyectado</div>
      </div>
      <div style="background:${balance60>=0?'rgba(63,185,80,.05)':'rgba(248,81,73,.05)'};border:1px solid ${balance60>=0?'rgba(63,185,80,.15)':'rgba(248,81,73,.15)'};border-radius:12px;padding:12px;text-align:center">
        <div style="font-size:.65rem;color:#8b949e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">60 días</div>
        <div style="font-size:1.15rem;font-weight:800;color:${balance60>=0?'#3fb950':'#f85149'}">${balance60>=0?'+':''}${fmt(balance60)}</div>
        <div style="font-size:.62rem;color:#8b949e;margin-top:2px">acumulado</div>
      </div>
    </div>
    <div style="background:#1c2128;border-radius:10px;padding:10px 12px;margin-bottom:10px">
      <div style="font-size:.68rem;color:#8b949e;margin-bottom:6px;font-weight:600">BASADO EN PROMEDIO (últimos ${last3.length} ${last3.length===1?'mes':'meses'})</div>
      <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:4px">
        <span style="color:#8b949e">📈 Ingresos esperados</span>
        <span style="color:#3fb950;font-weight:600">${fmt(ingreso30)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:4px">
        <span style="color:#8b949e">📉 Gastos esperados</span>
        <span style="color:#f85149;font-weight:600">${fmt(gasto30)}</span>
      </div>
      ${gastosFijos>0?`<div style="display:flex;justify-content:space-between;font-size:.68rem;color:#484f58">
        <span>↳ Gastos fijos (recurrentes)</span>
        <span>${fmt(gastosFijos)}</span>
      </div>`:''}
    </div>
    ${ingActual>0?`<div style="background:rgba(88,166,255,.06);border:1px solid rgba(88,166,255,.15);border-radius:10px;padding:10px 12px">
      <div style="font-size:.68rem;color:#58a6ff;font-weight:600;margin-bottom:6px">MES ACTUAL: ${typeof currentMonth!=='undefined'?currentMonth:'Este mes'}</div>
      <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:3px">
        <span style="color:#8b949e">Ya ingresaste</span><span style="color:#3fb950">${fmt(ingActual)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:3px">
        <span style="color:#8b949e">Ya gastaste</span><span style="color:#f85149">${fmt(gasActual)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.72rem;font-weight:700;border-top:1px solid rgba(88,166,255,.1);padding-top:6px;margin-top:6px">
        <span style="color:#58a6ff">Balance actual</span>
        <span style="color:${ingActual-gasActual>=0?'#3fb950':'#f85149'}">${fmt(ingActual-gasActual)}</span>
      </div>
    </div>`:''}`;
};

// ═══════════════════════════════════════════════════════════════════════
// 4. DETECCIÓN AUTOMÁTICA DE RECURRENTES
// ═══════════════════════════════════════════════════════════════════════
window.detectRecurrentes = function() {
  if (typeof EXCEL_DATA === 'undefined' || typeof activeMonths === 'undefined') return [];

  const freq = {}; // desc+cat → {count, amounts, dias, tipo, cat}
  const months = activeMonths.slice(-4); // last 4 months
  if (months.length < 2) return [];

  months.forEach(m => {
    (EXCEL_DATA[m]?.transactions || []).forEach(t => {
      if (!t.desc || t.amount <= 0) return;
      const key = (t.desc.toLowerCase().trim() + '|' + (t.cat||''));
      if (!freq[key]) freq[key] = { desc:t.desc, tipo:t.tipo, cat:t.cat||'', amounts:[], dias:[], months:new Set() };
      freq[key].amounts.push(t.amount);
      freq[key].dias.push(parseInt((t.date||'').slice(8))||1);
      freq[key].months.add(m);
    });
  });

  const suggestions = [];
  Object.values(freq).forEach(f => {
    if (f.months.size < 2) return; // must appear in at least 2 months
    const existing = (typeof RECURRENTES !== 'undefined' ? RECURRENTES : [])
      .find(r => r.desc?.toLowerCase() === f.desc.toLowerCase());
    if (existing) return; // already registered

    const avgAmount = f.amounts.reduce((a,b)=>a+b,0) / f.amounts.length;
    const avgDia    = Math.round(f.dias.reduce((a,b)=>a+b,0) / f.dias.length);
    const consistency = f.months.size / months.length; // 0-1

    suggestions.push({
      desc: f.desc, tipo: f.tipo, cat: f.cat,
      amount: avgAmount, dia: avgDia,
      months: f.months.size, consistency,
      label: f.months.size + '/' + months.length + ' meses'
    });
  });

  return suggestions.sort((a,b) => b.consistency - a.consistency).slice(0, 8);
};

window.openDetectRecurrentes = function() {
  const suggestions = window.detectRecurrentes();
  const fmt = typeof window.fmt === 'function' ? window.fmt : v => '$'+parseFloat(v).toFixed(2);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:10300;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;width:500px;max-width:100%;max-height:88vh;overflow-y:auto">
      <div style="padding:16px 20px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#161b22;z-index:1">
        <h3 style="color:#e6edf3;font-size:.95rem;margin:0">🔍 Gastos recurrentes detectados</h3>
        <button onclick="this.closest('[style*=fixed]').remove();if(typeof unlockScroll==='function')unlockScroll()" style="background:none;border:none;color:#8b949e;font-size:1.2rem;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px 20px">
        ${suggestions.length === 0
          ? '<p style="text-align:center;color:#8b949e;font-size:.78rem;padding:20px">No se detectaron patrones recurrentes todavía.<br>Registra al menos 2 meses de movimientos.</p>'
          : `<p style="font-size:.72rem;color:#8b949e;margin-bottom:14px;line-height:1.6">Estos gastos aparecen en ${suggestions[0]?.label||'varios meses'}. ¿Quieres agregarlos como recurrentes?</p>
            ${suggestions.map((s,i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:11px 12px;background:#1c2128;border:1px solid #30363d;border-radius:10px;margin-bottom:7px">
                <div style="flex:1;min-width:0">
                  <div style="font-size:.8rem;font-weight:600;color:#e6edf3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.desc}</div>
                  <div style="font-size:.67rem;color:#8b949e;margin-top:2px">${s.tipo} · ${s.cat} · día ~${s.dia} · ${s.label}</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:.82rem;font-weight:700;color:#e3b341">${fmt(s.amount)}</div>
                  <div style="font-size:.6rem;color:#484f58">promedio</div>
                </div>
                <button onclick="_addSuggestedRecurrente(${i})" style="background:#238636;border:none;color:#fff;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:.72rem;font-weight:600;white-space:nowrap">+ Agregar</button>
              </div>`).join('')}`
        }
      </div>
    </div>`;
  overlay.onclick = e => { if(e.target===overlay) { overlay.remove(); if(typeof unlockScroll==='function') unlockScroll(); } };
  document.body.appendChild(overlay);
  if (typeof lockScroll === 'function') lockScroll();
  window._detectedSuggestions = suggestions;
};

window._addSuggestedRecurrente = function(i) {
  const s = (window._detectedSuggestions || [])[i];
  if (!s) return;
  if (typeof RECURRENTES === 'undefined') return;
  const rec = {
    id: 'r' + Date.now(), desc: s.desc, tipo: s.tipo, cat: s.cat,
    amount: parseFloat(s.amount.toFixed(2)), dia: s.dia, method: 'Pago móvil',
    activo: true, created_at: new Date().toISOString()
  };
  RECURRENTES.push(rec);
  if (typeof saveRecurrentes === 'function') saveRecurrentes();
  else if (typeof sbSaveConfig === 'function') sbSaveConfig();
  if (typeof toast === 'function') toast('✅ "' + s.desc + '" agregado como recurrente', 'ok');
  // Remove from list
  const btn = document.querySelectorAll('[style*="z-index:10300"] button[style*="238636"]')[i];
  if (btn) { btn.textContent = '✓'; btn.disabled = true; btn.style.background = '#1a3626'; }
};

// ═══════════════════════════════════════════════════════════════════════
// 5. SIMULADOR DE DEUDA
// ═══════════════════════════════════════════════════════════════════════
window.openDebtSimulator = function(deudaId) {
  const deud = typeof loadDeudasData === 'function' ? loadDeudasData() : { deudas: [] };
  const deuda = deudaId
    ? deud.deudas.find(d => d.id === deudaId)
    : deud.deudas.filter(d => !d.pagada)[0];

  const fmt = typeof window.fmt === 'function' ? window.fmt : v => '$'+parseFloat(v).toFixed(2);

  if (!deuda) {
    if (typeof toast === 'function') toast('No hay deudas activas para simular', 'err');
    return;
  }

  const saldo = (deuda.montoOriginal||0) - (deuda.montoAbonado||0);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:10300;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;width:460px;max-width:100%;max-height:88vh;overflow-y:auto">
      <div style="padding:16px 20px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#161b22;z-index:1">
        <h3 style="color:#e6edf3;font-size:.95rem;margin:0">💳 Simulador de deuda</h3>
        <button onclick="this.closest('[style*=fixed]').remove();if(typeof unlockScroll==='function')unlockScroll()" style="background:none;border:none;color:#8b949e;font-size:1.2rem;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px 20px">
        <div style="background:#1c2128;border:1px solid #30363d;border-radius:10px;padding:12px 14px;margin-bottom:16px">
          <div style="font-size:.75rem;font-weight:700;color:#e6edf3;margin-bottom:2px">${deuda.acreedor||'Deuda'}</div>
          <div style="font-size:.7rem;color:#8b949e">${deuda.concepto||''}</div>
          <div style="font-size:1.1rem;font-weight:800;color:#f85149;margin-top:6px">Saldo pendiente: ${fmt(saldo)}</div>
        </div>

        <div style="margin-bottom:14px">
          <label style="font-size:.72rem;color:#8b949e;display:block;margin-bottom:6px">¿CUÁNTO PUEDES PAGAR POR MES?</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px" id="sim-quick-btns">
            ${[50,100,150,200,300].map(v => `<button onclick="document.getElementById('sim-pago').value=${v};_calcDebtSim(${saldo})" 
              style="background:#1c2128;border:1px solid #30363d;color:#8b949e;padding:6px 12px;border-radius:20px;cursor:pointer;font-size:.72rem">${fmt(v)}</button>`).join('')}
          </div>
          <input id="sim-pago" type="number" placeholder="Monto mensual en USD" oninput="_calcDebtSim(${saldo})"
            style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:9px 12px;border-radius:9px;font-size:.85rem;outline:none;box-sizing:border-box">
        </div>

        <div id="sim-result" style="min-height:80px"></div>
      </div>
    </div>`;
  overlay.onclick = e => { if(e.target===overlay) { overlay.remove(); if(typeof unlockScroll==='function') unlockScroll(); } };
  document.body.appendChild(overlay);
  if (typeof lockScroll === 'function') lockScroll();
};

window._calcDebtSim = function(saldo) {
  const pago = parseFloat(document.getElementById('sim-pago')?.value) || 0;
  const el   = document.getElementById('sim-result');
  const fmt  = typeof window.fmt === 'function' ? window.fmt : v => '$'+parseFloat(v).toFixed(2);
  if (!el) return;
  if (pago <= 0) { el.innerHTML = ''; return; }
  if (pago >= saldo) {
    el.innerHTML = `<div style="background:rgba(63,185,80,.1);border:1px solid rgba(63,185,80,.3);border-radius:10px;padding:14px;text-align:center">
      <div style="font-size:1.3rem;margin-bottom:6px">🎉</div>
      <div style="font-size:.85rem;font-weight:700;color:#3fb950">¡Puedes saldarla de una vez!</div>
      <div style="font-size:.72rem;color:#8b949e;margin-top:4px">Con ${fmt(pago)} cubres el saldo completo.</div>
    </div>`; return;
  }
  const meses = Math.ceil(saldo / pago);
  const años  = Math.floor(meses / 12);
  const mesesR = meses % 12;
  const tiempoStr = años > 0
    ? `${años} año${años>1?'s':''} y ${mesesR} mes${mesesR!==1?'es':''}`
    : `${meses} mes${meses!==1?'es':''}`;

  // Compare scenarios
  const pagos = [[pago,'Actual'], [pago*1.25,'25% más'], [pago*1.5,'50% más'], [pago*2,'Doble']];
  el.innerHTML = `
    <div style="background:rgba(88,166,255,.06);border:1px solid rgba(88,166,255,.15);border-radius:10px;padding:14px;margin-bottom:12px;text-align:center">
      <div style="font-size:.68rem;color:#8b949e;margin-bottom:4px;text-transform:uppercase">PAGAS ${fmt(pago)}/mes → TERMINAS EN</div>
      <div style="font-size:1.4rem;font-weight:900;color:#58a6ff">${tiempoStr}</div>
      <div style="font-size:.68rem;color:#8b949e;margin-top:4px">Total: ${fmt(pago*meses)} · ${fmt(pago*meses-saldo)} en tiempo</div>
    </div>
    <div style="font-size:.68rem;color:#8b949e;margin-bottom:8px;font-weight:600;text-transform:uppercase">¿Y si pagas más?</div>
    ${pagos.slice(1).map(([p, label]) => {
      const m = Math.ceil(saldo/p);
      const saved = meses - m;
      const a = Math.floor(m/12); const mr = m%12;
      const ts = a>0 ? `${a}a ${mr}m` : `${m} meses`;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #21262d;font-size:.72rem">
        <span style="color:#8b949e">${label} (${fmt(p)}/mes)</span>
        <div style="text-align:right">
          <div style="color:#e6edf3;font-weight:600">${ts}</div>
          ${saved>0?`<div style="color:#3fb950;font-size:.62rem">ahorras ${saved} ${saved===1?'mes':'meses'}</div>`:''}
        </div>
      </div>`;
    }).join('')}`;
};

// ═══════════════════════════════════════════════════════════════════════
// 6. PATRIMONIO NETO CONSOLIDADO
// ═══════════════════════════════════════════════════════════════════════
window.openPatrimonioNeto = function() {
  const fmt = typeof window.fmt === 'function' ? window.fmt : v => '$'+parseFloat(v).toFixed(2);
  const rateBCV_val = typeof rateBCV !== 'undefined' ? rateBCV : 1;

  // Assets
  const cuentasTotal = typeof calcTotalCuentas === 'function' ? calcTotalCuentas() : 0;
  const ahorrosMeses = typeof EXCEL_DATA !== 'undefined' && typeof activeMonths !== 'undefined'
    ? activeMonths.reduce((s,m) => s + (EXCEL_DATA[m]?.ahorros||0), 0) : 0;
  const coch = typeof loadCochinitoData === 'function' ? loadCochinitoData() : { items:[] };
  const cochTotal = coch.items.filter(i=>i.tipo!=='gasto').reduce((s,i)=>s+i.monto,0)
                  - coch.items.filter(i=>i.tipo==='gasto').reduce((s,i)=>s+i.monto,0);
  const efTotal = typeof CONFIG !== 'undefined' ? ((CONFIG.efManualBase||0)+(CONFIG.efAutoContrib||0)) : 0;
  const totalActivos = cuentasTotal + ahorrosMeses + cochTotal + efTotal;

  // Liabilities
  const deud = typeof loadDeudasData === 'function' ? loadDeudasData() : { deudas:[] };
  const pres = typeof loadPrestamosData === 'function' ? loadPrestamosData() : { prestamos:[] };
  const totalDeudas    = deud.deudas.filter(d=>!d.pagada).reduce((s,d)=>s+(d.saldo||0),0);
  const totalPrestamos = pres.prestamos.filter(p=>!p.cobrado).reduce((s,p)=>s+(p.monto||0),0);
  const totalPasivos   = totalDeudas;

  // Net worth
  const patrimonio = totalActivos - totalPasivos + totalPrestamos;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:10300;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;width:480px;max-width:100%;max-height:88vh;overflow-y:auto">
      <div style="padding:16px 20px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#161b22;z-index:1">
        <h3 style="color:#e6edf3;font-size:.95rem;margin:0">🏦 Patrimonio Neto</h3>
        <button onclick="this.closest('[style*=fixed]').remove();if(typeof unlockScroll==='function')unlockScroll()" style="background:none;border:none;color:#8b949e;font-size:1.2rem;cursor:pointer">✕</button>
      </div>
      <div style="padding:20px">

        <!-- Total -->
        <div style="text-align:center;margin-bottom:20px;padding:20px;background:${patrimonio>=0?'rgba(63,185,80,.08)':'rgba(248,81,73,.08)'};border:1px solid ${patrimonio>=0?'rgba(63,185,80,.2)':'rgba(248,81,73,.2)'};border-radius:16px">
          <div style="font-size:.7rem;color:#8b949e;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Tu patrimonio neto</div>
          <div style="font-size:2rem;font-weight:900;color:${patrimonio>=0?'#3fb950':'#f85149'}">${fmt(patrimonio)}</div>
          <div style="font-size:.65rem;color:#8b949e;margin-top:4px">Bs ${parseInt(patrimonio*rateBCV_val).toLocaleString()}</div>
        </div>

        <!-- ACTIVOS -->
        <div style="font-size:.7rem;font-weight:700;color:#3fb950;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">ACTIVOS — ${fmt(totalActivos)}</div>
        ${[
          ['🏦 Billeteras', cuentasTotal],
          ['💰 Ahorros acumulados', ahorrosMeses],
          ['🐷 Cochinito', cochTotal],
          ['🆘 Fondo de emergencia', efTotal],
        ].map(([label, val]) => val > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #21262d;font-size:.75rem">
            <span style="color:#8b949e">${label}</span>
            <span style="color:#3fb950;font-weight:600">${fmt(val)}</span>
          </div>` : '').join('')}
        ${totalPrestamos>0?`
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #21262d;font-size:.75rem">
            <span style="color:#8b949e">🤝 Préstamos por cobrar</span>
            <span style="color:#e3b341;font-weight:600">${fmt(totalPrestamos)}</span>
          </div>`:'' }

        <!-- PASIVOS -->
        ${totalDeudas>0?`
          <div style="font-size:.7rem;font-weight:700;color:#f85149;text-transform:uppercase;letter-spacing:.07em;margin:14px 0 8px">PASIVOS — ${fmt(totalDeudas)}</div>
          ${deud.deudas.filter(d=>!d.pagada).map(d=>`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #21262d;font-size:.75rem">
              <span style="color:#8b949e">💳 ${d.acreedor||'Deuda'}</span>
              <span style="color:#f85149;font-weight:600">-${fmt(d.saldo||0)}</span>
            </div>`).join('')}`:''}

        <!-- Fórmula -->
        <div style="background:#1c2128;border-radius:10px;padding:12px 14px;margin-top:14px;font-size:.7rem;color:#484f58;text-align:center;line-height:1.8">
          ${fmt(totalActivos)} activos ${totalPrestamos>0?'+ '+fmt(totalPrestamos)+' por cobrar ':''}- ${fmt(totalDeudas)} deudas = <span style="color:${patrimonio>=0?'#3fb950':'#f85149'};font-weight:700">${fmt(patrimonio)}</span>
        </div>
      </div>
    </div>`;
  overlay.onclick = e => { if(e.target===overlay) { overlay.remove(); if(typeof unlockScroll==='function') unlockScroll(); } };
  document.body.appendChild(overlay);
  if (typeof lockScroll === 'function') lockScroll();
};

// Helper — try to get total from cuentas
function calcTotalCuentas() {
  if (typeof CUENTAS !== 'undefined' && typeof calcCuentaBalance === 'function') {
    return (CUENTAS||[]).reduce((s,c) => s + calcCuentaBalance(c), 0);
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════
// 7. MODO PRESUPUESTO TIPO SOBRE (ENVELOPE BUDGETING)
// ═══════════════════════════════════════════════════════════════════════
const ENV_KEY = 'fin_envelope_v1';

function loadEnvelopes() {
  try { return JSON.parse(localStorage.getItem(ENV_KEY) || 'null'); }
  catch(e) { return null; }
}
function saveEnvelopes(data) {
  try { localStorage.setItem(ENV_KEY, JSON.stringify(data)); } catch(e) {}
}

window.openEnvelopeBudget = function() {
  const fmt = typeof window.fmt === 'function' ? window.fmt : v => '$'+parseFloat(v).toFixed(2);
  const mes = typeof currentMonth !== 'undefined' ? currentMonth : 'este mes';
  const ingresos = typeof EXCEL_DATA !== 'undefined' && typeof currentMonth !== 'undefined'
    ? (EXCEL_DATA[currentMonth]?.ingresos || 0) : 0;

  let saved = loadEnvelopes() || {};
  if (!saved[mes]) saved[mes] = {};

  // Categorías de Gasto
  const cats = typeof CONFIG !== 'undefined' && CONFIG.categorias?.Gasto
    ? CONFIG.categorias.Gasto
    : ['Alimentación','Transporte','Salud','Entretenimiento','Hogar','Otros'];

  // Gasto real por categoría este mes
  const gastoXCat = {};
  if (typeof EXCEL_DATA !== 'undefined' && typeof currentMonth !== 'undefined') {
    (EXCEL_DATA[currentMonth]?.transactions||[]).forEach(t => {
      if (t.tipo === 'Gasto' && t.cat) {
        gastoXCat[t.cat] = (gastoXCat[t.cat]||0) + t.amount;
      }
    });
  }

  // Tipos de ingreso para tab Ingresos
  const tiposIngreso = typeof CONFIG !== 'undefined' && CONFIG.tipos
    ? CONFIG.tipos.filter(t => t.toLowerCase().includes('ingreso') || t === 'Ahorro en efectivo')
    : ['Ingreso Fijo','Ingreso Variable','Ahorro en efectivo'];

  // Categorías reales de ingreso — SOLO de tipos que son de ingreso
  const _ingresoCatKeys = new Set([
    ...(CONFIG.categorias?.['Ingreso Fijo']     || []),
    ...(CONFIG.categorias?.['Ingreso Variable'] || []),
    ...tiposIngreso
      .filter(t => t !== 'Ingreso Fijo' && t !== 'Ingreso Variable')
      .flatMap(t => CONFIG.categorias?.[t] || []),
    // Solo incluir de presupuestosIngresos si la cat existe en algún tipo ingreso
    ...Object.keys(CONFIG.presupuestosIngresos || {}).filter(k => {
      const ingCats = [
        ...(CONFIG.categorias?.['Ingreso Fijo']     || []),
        ...(CONFIG.categorias?.['Ingreso Variable'] || []),
        ...tiposIngreso.flatMap(t => CONFIG.categorias?.[t] || [])
      ];
      return ingCats.includes(k);
    })
  ]);
  const catsIngreso = typeof CONFIG !== 'undefined'
    ? Array.from(_ingresoCatKeys).filter(Boolean).sort((a,b) => a.localeCompare(b,'es'))
    : tiposIngreso;

  // Real registrado este mes por categoría de ingreso
  const realXTipo = {};
  if (typeof EXCEL_DATA !== 'undefined' && typeof currentMonth !== 'undefined') {
    (EXCEL_DATA[currentMonth]?.transactions||[]).forEach(t => {
      if (tiposIngreso.includes(t.tipo) && t.cat) {
        realXTipo[t.cat] = (realXTipo[t.cat]||0) + t.amount;
      }
    });
  }

  const totalAsignado = cats.reduce((s,c) => s + (parseFloat(saved[mes][c])||0), 0);
  const sinAsignar    = ingresos - totalAsignado;

  const overlay = document.createElement('div');
  overlay.id = 'envelope-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:10300;display:flex;align-items:center;justify-content:center;padding:16px';

  // Función de render de tabs (closure sobre overlay)
  let _envTab = 'gastos';

  function _renderEnvContent() {
    const body = overlay.querySelector('#env-body');
    if (!body) return;

    if (_envTab === 'gastos') {
      const totAsig = cats.reduce((s,c) => s + (parseFloat(saved[mes][c])||0), 0);
      const sinAsig = ingresos - totAsig;
      body.innerHTML = `
        <!-- Header: income vs assigned -->
        <div style="background:${sinAsig>=0?'rgba(63,185,80,.08)':'rgba(248,81,73,.08)'};border:1px solid ${sinAsig>=0?'rgba(63,185,80,.2)':'rgba(248,81,73,.2)'};border-radius:12px;padding:12px 14px;margin-bottom:16px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
            <div>
              <div style="font-size:.62rem;color:#8b949e;text-transform:uppercase;margin-bottom:2px">Ingreso</div>
              <div style="font-size:.9rem;font-weight:700;color:#3fb950">${fmt(ingresos)}</div>
            </div>
            <div>
              <div style="font-size:.62rem;color:#8b949e;text-transform:uppercase;margin-bottom:2px">Asignado</div>
              <div style="font-size:.9rem;font-weight:700;color:#58a6ff">${fmt(totAsig)}</div>
            </div>
            <div>
              <div style="font-size:.62rem;color:#8b949e;text-transform:uppercase;margin-bottom:2px">Sin asignar</div>
              <div style="font-size:.9rem;font-weight:700;color:${sinAsig>=0?'#3fb950':'#f85149'}">${fmt(sinAsig)}</div>
            </div>
          </div>
          ${ingresos===0?'<div style="font-size:.65rem;color:#8b949e;text-align:center;margin-top:8px">⚠️ Registra un ingreso este mes para ver el presupuesto completo</div>':''}
        </div>
        <!-- Category envelopes -->
        <div id="envelope-list">
          ${cats.map(cat => {
            const asig  = parseFloat(saved[mes][cat]||0);
            const gasto = gastoXCat[cat]||0;
            const saldo = asig - gasto;
            const pct   = asig>0 ? Math.min(100,(gasto/asig)*100) : 0;
            const color = pct>=100?'#f85149':pct>=80?'#e3b341':'#3fb950';
            // Subcategorías con presupuesto
            const subcats = (typeof CONFIG!=='undefined' && CONFIG.subcategorias && CONFIG.subcategorias[cat]) ? CONFIG.subcategorias[cat] : [];
            const subcatPresup = (typeof CONFIG!=='undefined' && CONFIG.presupuestosSubcat && CONFIG.presupuestosSubcat[cat]) ? CONFIG.presupuestosSubcat[cat] : {};
            const subcatTotal = Object.values(subcatPresup).reduce((s,v)=>s+(parseFloat(v)||0),0);
            const subcatBadge = subcatTotal>0 ? `<span style="font-size:.62rem;color:#e3b341;margin-right:2px">📋$${subcatTotal.toFixed(0)}</span>` : '';
            const catEmoji = typeof getCatDisplayIcon==='function' ? getCatDisplayIcon(cat) : '';
            const subcatRows = subcats.length > 0 ? `
              <div id="env-subcat-${cat.replace(/[^a-z0-9]/gi,'_')}" style="display:none;margin-top:6px;padding:8px;background:#0d1117;border-radius:8px;border:1px solid #21262d">
                <div style="font-size:.63rem;color:#e3b341;margin-bottom:6px;font-weight:600">Asignar por subcategoría (suma = total de ${cat})</div>
                ${subcats.map(sc => {
                  const scEmoji = typeof getCatDisplayIcon==='function' ? getCatDisplayIcon(sc) : '';
                  const scVal = parseFloat(subcatPresup[sc]||0);
                  const scGasto = (typeof EXCEL_DATA!=='undefined'&&typeof currentMonth!=='undefined')
                    ? (EXCEL_DATA[currentMonth]?.transactions||[]).filter(t=>t.tipo==='Gasto'&&t.cat===cat&&t.subcat===sc).reduce((s,t)=>s+t.amount,0) : 0;
                  return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
                    <span style="font-size:.72rem;color:#c9d1d9;flex:1">${scEmoji} ${sc}</span>
                    <input type="number" value="${scVal||''}" placeholder="0"
                      data-mes="${mes}" data-cat="${cat}" data-sc="${sc}"
                      oninput="_saveSubcatEnvelope(this.dataset.mes,this.dataset.cat,this.dataset.sc,this.value)"
                      style="width:75px;background:#161b22;border:1px solid #e3b341;color:#e3b341;padding:4px 6px;border-radius:6px;font-size:.72rem;outline:none;text-align:right">
                    <span style="font-size:.62rem;color:#484f58;min-width:50px;text-align:right">${scGasto>0?fmt(scGasto)+' gast.':''}</span>
                  </div>`;
                }).join('')}
              </div>` : '';
            return `<div style="margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                <span style="font-size:.78rem;color:#e6edf3;flex:1;font-weight:500">${catEmoji} ${cat} ${subcatBadge}</span>
                ${subcats.length>0 ? `<button data-cat="${cat}" onclick="_toggleEnvSubcat(this.dataset.cat)" style="background:none;border:1px solid #e3b341;color:#e3b341;padding:2px 7px;border-radius:5px;font-size:.65rem;cursor:pointer;font-family:inherit">📋</button>` : ''}
                <input type="number" value="${asig||''}" placeholder="0"
                  data-mes="${mes}" data-cat="${cat}"
                  oninput="_saveEnvelope(this.dataset.mes,this.dataset.cat,this.value)"
                  style="width:80px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:5px 8px;border-radius:7px;font-size:.75rem;outline:none;text-align:right">
                <span style="font-size:.68rem;font-weight:600;color:${saldo>=0||asig===0?'#8b949e':'#f85149'};min-width:52px;text-align:right">
                  ${asig>0?fmt(saldo)+' resto':gasto>0?fmt(gasto)+' gast.':''}
                </span>
              </div>
              ${asig>0?`<div style="background:#1c2128;border-radius:3px;height:4px;overflow:hidden">
                <div style="height:4px;border-radius:3px;background:${color};width:${Math.min(100,pct)}%;transition:width .4s"></div>
              </div>`:''}
              ${subcatRows}
            </div>`;
          }).join('')}
        </div>
        <p style="font-size:.65rem;color:#484f58;text-align:center;margin-top:8px">Los cambios se guardan automáticamente en tu dispositivo.</p>`;
    } else {
      // Tab Ingresos
      body.innerHTML = `
        <div style="background:rgba(63,185,80,.06);border:1px solid rgba(63,185,80,.2);border-radius:12px;padding:11px 14px;margin-bottom:14px;font-size:.7rem;color:#8b949e;line-height:1.6">
          💡 Define una <b style="color:#e6edf3">meta mensual</b> por fuente de ingreso y compárala con lo realmente registrado este mes.
        </div>
        ${(catsIngreso.length ? catsIngreso : tiposIngreso).map(tipo => {
          const meta = parseFloat((CONFIG?.presupuestosIngresos||{})[tipo]||0);
          const real = realXTipo[tipo]||0;
          const pct  = meta>0 ? Math.min(100,(real/meta)*100) : 0;
          const color = pct>=100?'#3fb950':pct>=60?'#e3b341':'#f85149';
          const emoji = typeof getCatDisplayIcon==='function' ? getCatDisplayIcon(tipo) : '💵';
          return `<div style="margin-bottom:14px;background:#1c2128;border-radius:10px;padding:11px 13px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
              <span style="font-size:1.1rem">${emoji}</span>
              <span style="font-size:.78rem;color:#e6edf3;flex:1;font-weight:600">${tipo}</span>
              <span style="font-size:.68rem;color:${color};font-weight:700">${meta>0?Math.round(pct)+'%':''}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:.65rem;color:#8b949e;min-width:40px">Meta:</span>
              <input type="number" value="${meta||''}" placeholder="0"
                onchange="_saveIncomeMeta('${tipo.replace(/'/g,"\\'")}',this.value)"
                style="width:90px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:4px 8px;border-radius:6px;font-size:.75rem;outline:none;text-align:right">
              <span style="font-size:.65rem;color:#8b949e">USD/mes</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:${meta>0?'6px':'0'}">
              <span style="font-size:.65rem;color:#8b949e;min-width:40px">Real:</span>
              <span style="font-size:.78rem;font-weight:700;color:${real>0?'#3fb950':'#484f58'}">${fmt(real)}</span>
              ${meta>0&&real>meta?'<span style="font-size:.62rem;color:#3fb950;margin-left:4px">✅ Meta superada</span>':''}
            </div>
            ${meta>0?`<div style="background:#0d1117;border-radius:3px;height:5px;overflow:hidden">
              <div style="height:5px;border-radius:3px;background:${color};width:${Math.min(100,pct)}%;transition:width .4s"></div>
            </div>`:''}
          </div>`;
        }).join('')}
        <p style="font-size:.65rem;color:#484f58;text-align:center;margin-top:4px">Las metas se sincronizan en Supabase.</p>`;
    }
  }

  overlay.innerHTML = `
    <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;width:500px;max-width:100%;max-height:88vh;overflow-y:auto">
      <div style="padding:16px 20px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#161b22;z-index:1">
        <div style="flex:1">
          <h3 style="color:#e6edf3;font-size:.95rem;margin:0 0 8px">✉️ Presupuesto por sobre — ${mes}</h3>
          <!-- Tabs -->
          <div style="display:flex;gap:6px">
            <button id="env-tab-gastos" onclick="window._envSwitchTab('gastos')"
              style="flex:1;padding:5px 8px;border:1px solid #30363d;border-radius:7px;background:#238636;color:#fff;font-size:.72rem;cursor:pointer;font-family:inherit">
              💸 Gastos
            </button>
            <button id="env-tab-ingresos" onclick="window._envSwitchTab('ingresos')"
              style="flex:1;padding:5px 8px;border:1px solid #30363d;border-radius:7px;background:#21262d;color:#8b949e;font-size:.72rem;cursor:pointer;font-family:inherit">
              💵 Ingresos
            </button>
          </div>
        </div>
        <button onclick="document.getElementById('envelope-overlay').remove();if(typeof unlockScroll==='function')unlockScroll()"
          style="background:none;border:none;color:#8b949e;font-size:1.2rem;cursor:pointer;margin-left:12px">✕</button>
      </div>
      <div id="env-body" style="padding:16px 20px"></div>
    </div>`;

  // Exponer switch de tab al scope global (closure limpio)
  window._envSwitchTab = function(tab) {
    _envTab = tab;
    const tg = overlay.querySelector('#env-tab-gastos');
    const ti = overlay.querySelector('#env-tab-ingresos');
    if(tg) { tg.style.background = tab==='gastos'?'#238636':'#21262d'; tg.style.color = tab==='gastos'?'#fff':'#8b949e'; }
    if(ti) { ti.style.background = tab==='ingresos'?'#1a3626':'#21262d'; ti.style.color = tab==='ingresos'?'#3fb950':'#8b949e'; }
    _renderEnvContent();
  };

  overlay.onclick = e => {
    if(e.target===overlay) { overlay.remove(); if(typeof unlockScroll==='function') unlockScroll(); }
  };
  document.body.appendChild(overlay);
  if (typeof lockScroll === 'function') lockScroll();
  _renderEnvContent();
};

window._saveIncomeMeta = function(tipo, val) {
  if (!CONFIG.presupuestosIngresos) CONFIG.presupuestosIngresos = {};
  CONFIG.presupuestosIngresos[tipo] = parseFloat(val)||0;
  if (typeof sbSaveConfig === 'function') sbSaveConfig();
};

window._saveEnvelope = function(mes, cat, val) {
  let saved = loadEnvelopes() || {};
  if (!saved[mes]) saved[mes] = {};
  saved[mes][cat] = parseFloat(val)||0;
  saveEnvelopes(saved);
};

window._saveSubcatEnvelope = function(mes, cat, sc, val) {
  // Guardar en CONFIG.presupuestosSubcat (persiste en Supabase)
  if (typeof CONFIG === 'undefined') return;
  if (!CONFIG.presupuestosSubcat)       CONFIG.presupuestosSubcat = {};
  if (!CONFIG.presupuestosSubcat[cat])  CONFIG.presupuestosSubcat[cat] = {};
  CONFIG.presupuestosSubcat[cat][sc] = parseFloat(val) || 0;
  // Sumar subcategorías y actualizar total de la categoría
  const total = Object.values(CONFIG.presupuestosSubcat[cat]).reduce((s,v)=>s+(parseFloat(v)||0),0);
  if (total > 0) {
    if (!CONFIG.presupuestos) CONFIG.presupuestos = {};
    CONFIG.presupuestos[cat] = total;
  }
  // Actualizar también el input del total de la categoría en el overlay
  const overlay = document.getElementById('envelope-overlay');
  if (overlay) {
    const inputs = overlay.querySelectorAll('input[data-cat]');
    inputs.forEach(inp => {
      if (inp.dataset.cat === cat && !inp.dataset.sc) {
        inp.value = total > 0 ? total.toFixed(2) : '';
      }
    });
  }
  if (typeof sbSaveConfig === 'function') sbSaveConfig();
};

window._toggleEnvSubcat = function(cat) {
  const id = 'env-subcat-' + cat.replace(/[^a-z0-9]/gi,'_');
  const panel = document.getElementById(id);
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

// ═══════════════════════════════════════════════════════════════════════
// HOOK: auto-categorize on description input
// ═══════════════════════════════════════════════════════════════════════
function _hookAutoCat() {
  const descInput = document.getElementById('f-desc');
  if (!descInput || descInput._smartHooked) return;
  descInput._smartHooked = true;

  let _autoTimer;
  descInput.addEventListener('input', function() {
    clearTimeout(_autoTimer);
    _autoTimer = setTimeout(() => {
      const match = window.applyCatRules(this.value);
      if (!match) return;
      // Auto-set tipo
      if (match.tipo) {
        const tipoEl = document.getElementById('f-tipo');
        if (tipoEl && tipoEl.value !== match.tipo) {
          tipoEl.value = match.tipo;
          if (typeof onTipoChange === 'function') onTipoChange();
        }
      }
      // Auto-set cat
      const catEl = document.getElementById('f-cat');
      if (catEl && match.cat) {
        setTimeout(() => {
          catEl.value = match.cat;
          if (typeof onCatChange === 'function') onCatChange();
          if (match.subcat) {
            setTimeout(() => {
              const subcatEl = document.getElementById('f-subcat');
              if (subcatEl) subcatEl.value = match.subcat;
            }, 60);
          }
          // Show hint
          let hint = document.getElementById('smart-cat-hint');
          if (!hint) {
            hint = document.createElement('div');
            hint.id = 'smart-cat-hint';
            hint.style.cssText = 'font-size:.65rem;color:#3fb950;padding:3px 0;animation:fadeIn .2s';
            catEl.closest('.form-group')?.appendChild(hint);
          }
          hint.textContent = '🤖 Categoría asignada automáticamente';
          setTimeout(() => { if (hint) hint.textContent = ''; }, 3000);
        }, 80);
      }
    }, 400);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  _injectNovedadesModal();
  // Hook auto-cat when modal opens
  const observer = new MutationObserver(() => {
    if (document.getElementById('f-desc') && !document.getElementById('f-desc')._smartHooked) {
      _hookAutoCat();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  _hookAutoCat();
});

})(); // end SmartModule

// ════════════════════════════════════════════════════════════════
// LISTA DE COMPRAS — v35
// Datos: Supabase tabla listas_compras (primary) + localStorage backup
// Multiusuario: user_id = auth.uid(), household_id para compartir
// ════════════════════════════════════════════════════════════════

const LISTA_KEY = 'fin_lista_compras_v1';

// Estado en memoria (cargado desde Supabase al abrir)
window._listasCompras = null;

// ── Supabase: cargar listas del hogar ────────────────────────────
async function loadListasFromSupabase() {
  if (!window.sb || !window.currentUser) return null;
  const uid = currentUser.id;
  const hid = window.HOUSEHOLD_ID || uid;
  try {
    // Leer listas propias + del hogar
    const { data: own } = await sb.from('listas_compras')
      .select('*').eq('user_id', uid).eq('archivada', false)
      .order('created_at', { ascending: false });
    let household = [];
    if (hid !== uid) {
      const { data: h } = await sb.from('listas_compras')
        .select('*').eq('user_id', hid).eq('archivada', false)
        .order('created_at', { ascending: false });
      if (h) household = h;
    }
    const seen = new Set();
    const all = [...(own || []), ...household].filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id); return true;
    });
    if (all.length > 0) {
      const listas = all.map(r => ({
        id: r.id,
        nombre: r.nombre,
        items: Array.isArray(r.items) ? r.items : [],
        activa: r.activa,
        tasa_usada: r.tasa_usada || null
      }));
      window._listasCompras = { listas };
      // Backup local
      try { localStorage.setItem(LISTA_KEY, JSON.stringify({ listas })); } catch(_) {}
      return { listas };
    }
  } catch(e) {
    console.warn('[listas_compras] load error:', e.message);
  }
  return null;
}

// ── Supabase: guardar/actualizar una lista ───────────────────────
async function saveListaToSupabase(lista) {
  // Backup local inmediato
  try {
    const data = window._listasCompras || { listas: [] };
    localStorage.setItem(LISTA_KEY, JSON.stringify(data));
  } catch(_) {}
  if (!window.sb || !window.currentUser) return;
  const uid = currentUser.id;
  const hid = window.HOUSEHOLD_ID || uid;
  try {
    await sb.from('listas_compras').upsert({
      id:           lista.id,
      user_id:      uid,
      household_id: hid,
      nombre:       lista.nombre,
      items:        lista.items || [],
      activa:       lista.activa !== false,
      archivada:    lista.archivada || false,
      tasa_usada:   lista.tasa_usada || (typeof rateBCV !== 'undefined' ? rateBCV : null),
      updated_at:   new Date().toISOString()
    }, { onConflict: 'id' });
  } catch(e) {
    console.warn('[saveListaToSupabase]', e.message);
  }
}

// ── Cargar desde localStorage como fallback ──────────────────────
function loadListaComprasLocal() {
  try { return JSON.parse(localStorage.getItem(LISTA_KEY) || '{"listas":[]}'); }
  catch(e) { return { listas: [] }; }
}

// ── loadListaCompras: primero memoria, luego Supabase, luego local ─
function loadListaCompras() {
  if (window._listasCompras) return window._listasCompras;
  return loadListaComprasLocal();
}

// ── saveListaCompras: sincrónico en memoria + async a Supabase ────
function saveListaCompras(data) {
  window._listasCompras = data;
  try { localStorage.setItem(LISTA_KEY, JSON.stringify(data)); } catch(_) {}
  // Guardar cada lista en Supabase (async, sin bloquear UI)
  if (data.listas) {
    data.listas.forEach(lista => {
      saveListaToSupabase(lista).catch(() => {});
    });
  }
}

window.openListaCompras = async function() {
  // FIX-BATCH-XXVII: entrar primero al menú de listas (UX más clara)
  // Cargar datos en paralelo mientras se muestra el historial
  loadListasFromSupabase().then(sbData => {
    if (sbData && sbData.listas.length) {
      window._listasCompras = sbData;
      // Actualizar panel si sigue abierto
      if (document.getElementById('lista-historial-panel')) {
        _listaHistorialPanel();
      }
    }
  });
  _listaHistorialPanel();
};

function _renderListaComprasModal(data) {
  document.getElementById('lista-compras-overlay')?.remove();
  const lista = data.listas.find(l => l.activa) || data.listas[0];
  const rate = typeof rateBCV !== 'undefined' ? (rateBCV || 451.51) : 451.51;
  const fmt = typeof window.fmt === 'function' ? window.fmt : v => '$' + parseFloat(v).toFixed(2);
  
  // Calcular totales
  const totalUSD = lista.items.reduce((s, item) => s + (item.precio * item.cantidad), 0);
  const totalBs = totalUSD * rate;
  const checkeados = lista.items.filter(i => i.checked).length;

  const overlay = document.createElement('div');
  overlay.id = 'lista-compras-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:10400;display:flex;align-items:flex-end;justify-content:center';
  
  const CATEGORIAS_LISTA = [
    {emoji:'🥛',label:'Lácteos'},{emoji:'🥩',label:'Carnes'},{emoji:'🐟',label:'Pescado'},
    {emoji:'🥦',label:'Verduras'},{emoji:'🍎',label:'Frutas'},{emoji:'🍞',label:'Panadería'},
    {emoji:'🧴',label:'Limpieza'},{emoji:'💊',label:'Farmacia'},{emoji:'🥫',label:'Enlatados'},
    {emoji:'🧃',label:'Bebidas'},{emoji:'🛒',label:'General'},{emoji:'❌',label:'Sin cat.'}
  ];
  
  overlay.innerHTML = `
  <div style="background:#0d1117;border-radius:22px 22px 0 0;border-top:1px solid #21262d;width:100%;max-width:540px;max-height:94vh;display:flex;flex-direction:column;overflow:hidden">
    
    <!-- HEADER -->
    <div style="display:flex;justify-content:center;padding:10px 0 2px">
      <div style="width:36px;height:4px;background:#30363d;border-radius:2px"></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 18px 8px;flex-shrink:0">
      <div>
        <div style="font-size:.7rem;color:#8b949e;text-transform:uppercase;letter-spacing:.06em">Lista de compras</div>
        <div style="font-size:.95rem;font-weight:800;color:#e6edf3" id="lista-nombre-display">${escHtml(lista.nombre)}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button onclick="_listaHistorialPanel()" style="background:#21262d;border:1px solid #30363d;color:#8b949e;padding:0 10px;height:30px;border-radius:10px;font-size:.66rem;font-weight:700;cursor:pointer">📋 Listas</button>
        <button onclick="document.getElementById('lista-compras-overlay').remove();if(typeof unlockScroll==='function')unlockScroll();" style="background:#21262d;border:none;color:#8b949e;width:30px;height:30px;border-radius:50%;font-size:1rem;cursor:pointer">✕</button>
      </div>
    </div>

    <!-- TOTAL HERO CARD -->
    <div style="margin:0 16px 10px;border-radius:18px;background:linear-gradient(135deg,#1a3d26,#0d2a1c);border:1px solid rgba(63,185,80,.25);padding:16px 20px;position:relative;overflow:hidden;flex-shrink:0">
      <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;background:radial-gradient(circle,rgba(63,185,80,.2),transparent 70%);border-radius:50%"></div>
      <div style="font-size:.65rem;color:#4a9960;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Total estimado</div>
      <div style="display:flex;align-items:baseline;gap:4px">
        <span style="font-size:.9rem;color:#6bcf8a;font-weight:700">$</span>
        <span style="font-size:2.2rem;font-weight:900;color:#e6edf3;letter-spacing:-1px" id="lista-total-usd">${totalUSD.toFixed(2).replace('.','.').split('.')[0]}</span>
        <span style="font-size:1rem;font-weight:600;color:#6b7280">.${totalUSD.toFixed(2).split('.')[1]}</span>
      </div>
      <div style="font-size:.8rem;color:#4a9960;margin-top:2px" id="lista-total-bs">Bs ${totalBs.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <div style="font-size:.62rem;color:#2d5a3d;margin-top:1px">Tasa USD: Bs ${rate.toFixed(2)}</div>
      ${checkeados > 0 ? `<div style="position:absolute;top:12px;right:14px;background:rgba(63,185,80,.2);border:1px solid rgba(63,185,80,.3);border-radius:20px;padding:3px 10px;font-size:.68rem;color:#3fb950">${checkeados}/${lista.items.length} ✓</div>` : ''}
    </div>

    <!-- BOTÓN AGREGAR ITEM -->
    <div style="padding:0 16px 8px;flex-shrink:0">
      <button onclick="_listaAgregarItemModal()" style="width:100%;background:#13181f;border:1px dashed #3fb950;color:#3fb950;padding:11px;border-radius:12px;font-size:.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
        <span style="font-size:1.1rem">+</span> Agregar producto
      </button>
    </div>

    <!-- LISTA DE ITEMS -->
    <div style="padding:0 16px 8px;font-size:.75rem;font-weight:700;color:#8b949e;text-transform:uppercase;letter-spacing:.06em;flex-shrink:0">
      Productos (${lista.items.length})
      ${lista.items.some(i=>i.checked) ? `<button onclick="_listaLimpiarCheckeados()" style="float:right;background:none;border:none;color:#f85149;font-size:.68rem;cursor:pointer;text-transform:none">🗑 Quitar marcados</button>` : ''}
    </div>
    <div id="lista-items-container" style="overflow-y:auto;flex:1;padding:0 16px 10px">
      ${_renderListaItems(lista, rate)}
    </div>

    <!-- BOTONES INFERIORES -->
    <div style="padding:10px 16px;padding-bottom:max(14px,env(safe-area-inset-bottom,14px));display:flex;gap:8px;flex-shrink:0;border-top:1px solid #21262d">
      <button onclick="_listaRegistrarComoMovimiento()" style="flex:1;background:linear-gradient(135deg,#238636,#2ea043);border:none;color:#fff;padding:12px;border-radius:12px;font-weight:800;font-size:.88rem;cursor:pointer">
        💾 Registrar como gasto
      </button>
      <button onclick="_listaHistorialPanel()" style="background:#21262d;border:1px solid #30363d;color:#8b949e;padding:12px 11px;border-radius:12px;cursor:pointer;font-size:.74rem;font-weight:700">＋ Lista</button>
      <button onclick="_listaCompartir()" style="background:#21262d;border:1px solid #30363d;color:#8b949e;padding:12px 14px;border-radius:12px;cursor:pointer;font-size:.88rem">📤</button>
    </div>
  </div>`;

  overlay.onclick = e => { if(e.target === overlay) { overlay.remove(); if(typeof unlockScroll === 'function') unlockScroll(); } };
  document.body.appendChild(overlay);
  if (typeof lockScroll === 'function') lockScroll();
  window._listaActivaId = lista.id;
}

function _renderListaItems(lista, rate) {
  if (!lista.items.length) {
    return '<div style="text-align:center;padding:28px 16px;color:#484f58;font-size:.8rem;line-height:1.7">🛒<br>Lista vacía.<br>Toca <b>+ Agregar producto</b> para empezar.</div>';
  }
  // Separar: sin marcar primero, marcados al final
  const activos = lista.items.filter(i => !i.checked);
  const hechos  = lista.items.filter(i => i.checked);
  const all = [...activos, ...hechos];

  return all.map((item, i) => {
    const total = (item.precio * item.cantidad);
    const totalBs = total * rate;
    const realIdx = lista.items.findIndex(x => x.id === item.id);
    return `
    <div id="lista-item-${item.id}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${item.checked?'rgba(13,17,23,.5)':'#13181f'};border:1px solid ${item.checked?'#21262d':'#21262d'};border-radius:12px;margin-bottom:7px;transition:all .2s;opacity:${item.checked?'.55':'1'}">
      <div onclick="_listaToggleCheck(${realIdx})" style="width:22px;height:22px;border-radius:50%;border:2px solid ${item.checked?'#3fb950':'#30363d'};background:${item.checked?'#3fb950':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:.2s">
        ${item.checked ? '<span style="color:#000;font-size:.7rem;font-weight:900">✓</span>' : ''}
      </div>
      <div style="font-size:1.2rem;flex-shrink:0">${item.emoji || '🛒'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.84rem;font-weight:600;color:${item.checked?'#484f58':'#e6edf3'};text-decoration:${item.checked?'line-through':'none'}">${escHtml(item.nombre)}</div>
        <div style="font-size:.68rem;color:#8b949e;margin-top:1px">x${item.cantidad} · $${item.precio.toFixed(2)} · Bs ${(item.precio * rate).toFixed(2)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:.88rem;font-weight:800;color:${item.checked?'#484f58':'#e3b341'}">$${total.toFixed(2)}</div>
        <div style="font-size:.62rem;color:#484f58">Bs ${totalBs.toFixed(0)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0">
        <button onclick="_listaEditarItemModal(${realIdx})" style="background:none;border:none;color:#58a6ff;cursor:pointer;font-size:.78rem;padding:2px;line-height:1" title="Editar">✏️</button>
        <button onclick="_listaEliminarItem(${realIdx})" style="background:none;border:none;color:#484f58;cursor:pointer;font-size:.78rem;padding:2px;line-height:1" title="Eliminar">✕</button>
      </div>
    </div>`;
  }).join('');
}

window._listaToggleCheck = function(idx) {
  const data = loadListaCompras();
  const lista = data.listas.find(l => l.id === window._listaActivaId);
  if (!lista || !lista.items[idx]) return;
  lista.items[idx].checked = !lista.items[idx].checked;
  saveListaCompras(data);
  _renderListaComprasModal(data);
};

window._listaEliminarItem = function(idx) {
  const data = loadListaCompras();
  const lista = data.listas.find(l => l.id === window._listaActivaId);
  if (!lista) return;
  lista.items.splice(idx, 1);
  saveListaCompras(data);
  _renderListaComprasModal(data);
};

window._listaLimpiarCheckeados = async function() {
  const ok = await showConfirm('Limpiar lista', '¿Quitar los productos ya marcados?', '🗑');
  if (!ok) return;
  const data = loadListaCompras();
  const lista = data.listas.find(l => l.id === window._listaActivaId);
  if (!lista) return;
  lista.items = lista.items.filter(i => !i.checked);
  saveListaCompras(data);
  _renderListaComprasModal(data);
};

window._listaAgregarItemModal = function() {
  const rate = typeof rateBCV !== 'undefined' ? rateBCV : 451.51;
  const EMOJIS_LISTA = ['🛒','🥛','🥩','🐟','🥦','🍎','🍞','🧴','💊','🥫','🧃','🧀','🍗','🥚','🌽','🍌','🍅','🧅','🧄','🌾'];

  const mini = document.createElement('div');
  mini.id = 'lista-add-mini';
  mini.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10500;display:flex;align-items:flex-end;justify-content:center';
  mini.innerHTML = `
  <div style="background:#161b22;border-radius:20px 20px 0 0;border-top:1px solid #30363d;width:100%;max-width:540px;padding:20px 18px;padding-bottom:max(20px,env(safe-area-inset-bottom,20px))">
    <div style="font-size:.9rem;font-weight:800;color:#e6edf3;margin-bottom:14px">🛒 Agregar producto</div>
    
    <!-- Emoji selector -->
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none;margin-bottom:12px">
      ${EMOJIS_LISTA.map(e => `<button class="lista-emoji-btn" onclick="_listaSelectEmoji('${e}')" style="font-size:1.4rem;background:#1c2128;border:2px solid transparent;border-radius:10px;padding:6px 8px;cursor:pointer;flex-shrink:0;transition:.15s">${e}</button>`).join('')}
    </div>
    <input id="lista-new-nombre" type="text" placeholder="Nombre del producto (ej: Leche, Atún...)" autofocus
      style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:11px 14px;border-radius:10px;font-size:.88rem;outline:none;margin-bottom:10px;box-sizing:border-box">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div>
        <label style="font-size:.65rem;color:#8b949e;display:block;margin-bottom:4px;text-transform:uppercase">Precio (USD)</label>
        <input id="lista-new-precio" type="number" step="0.01" placeholder="0.00" min="0"
          style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.95rem;outline:none;box-sizing:border-box"
          oninput="_listaUpdatePreviewBs()">
      </div>
      <div>
        <label style="font-size:.65rem;color:#8b949e;display:block;margin-bottom:4px;text-transform:uppercase">Cantidad</label>
        <div style="display:flex;align-items:center;background:#0d1117;border:1px solid #30363d;border-radius:10px;overflow:hidden">
          <button onclick="_listaCantidad(-1)" style="background:none;border:none;color:#e6edf3;padding:10px 14px;cursor:pointer;font-size:1.1rem;font-weight:700">−</button>
          <input id="lista-new-cant" type="number" value="1" min="1" max="99"
            style="flex:1;background:none;border:none;color:#e6edf3;text-align:center;font-size:.95rem;outline:none;font-weight:700">
          <button onclick="_listaCantidad(1)" style="background:none;border:none;color:#e6edf3;padding:10px 14px;cursor:pointer;font-size:1.1rem;font-weight:700">+</button>
        </div>
      </div>
    </div>
    <!-- Preview en Bs -->
    <div id="lista-preview-bs" style="background:#13181f;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:.75rem;color:#8b949e;display:none">
      Total: <span id="lista-prev-usd" style="color:#e3b341;font-weight:700">$0.00</span> · Bs <span id="lista-prev-bs" style="color:#e3b341;font-weight:700">0.00</span>
    </div>
    <input type="hidden" id="lista-new-emoji" value="🛒">
    <div style="display:flex;gap:8px">
      <button onclick="document.getElementById('lista-add-mini').remove()" style="background:#1c2128;border:1px solid #30363d;color:#8b949e;padding:12px;border-radius:10px;cursor:pointer;flex-shrink:0">Cancelar</button>
      <button onclick="_listaConfirmarItem()" style="flex:1;background:#238636;border:none;color:#fff;padding:12px;border-radius:10px;font-weight:700;font-size:.9rem;cursor:pointer">✅ Agregar</button>
    </div>
  </div>`;
  mini.onclick = e => { if(e.target === mini) mini.remove(); };
  document.body.appendChild(mini);
  setTimeout(() => document.getElementById('lista-new-nombre')?.focus(), 100);
};

window._listaSelectEmoji = function(e) {
  document.querySelectorAll('.lista-emoji-btn').forEach(b => { b.style.borderColor = 'transparent'; b.style.background = '#1c2128'; });
  const clicked = Array.from(document.querySelectorAll('.lista-emoji-btn')).find(b => b.textContent === e);
  if (clicked) { clicked.style.borderColor = '#3fb950'; clicked.style.background = 'rgba(63,185,80,.1)'; }
  const hiddenEmoji = document.getElementById('lista-new-emoji');
  if (hiddenEmoji) hiddenEmoji.value = e;
};

window._listaCantidad = function(delta) {
  const el = document.getElementById('lista-new-cant');
  if (!el) return;
  const v = Math.max(1, Math.min(99, (parseInt(el.value)||1) + delta));
  el.value = v;
  _listaUpdatePreviewBs();
};

window._listaUpdatePreviewBs = function() {
  const rate = typeof rateBCV !== 'undefined' ? rateBCV : 451.51;
  const precio = parseFloat(document.getElementById('lista-new-precio')?.value) || 0;
  const cant   = parseInt(document.getElementById('lista-new-cant')?.value) || 1;
  const total  = precio * cant;
  const prev   = document.getElementById('lista-preview-bs');
  const prevUsd = document.getElementById('lista-prev-usd');
  const prevBs  = document.getElementById('lista-prev-bs');
  if (prev)    prev.style.display = precio > 0 ? 'block' : 'none';
  if (prevUsd) prevUsd.textContent = '$' + total.toFixed(2);
  if (prevBs)  prevBs.textContent  = (total * rate).toFixed(2);
};

window._listaConfirmarItem = function() {
  const nombre = document.getElementById('lista-new-nombre')?.value?.trim();
  const precio = parseFloat(document.getElementById('lista-new-precio')?.value) || 0;
  const cant   = parseInt(document.getElementById('lista-new-cant')?.value) || 1;
  const emoji  = document.getElementById('lista-new-emoji')?.value || '🛒';
  if (!nombre) { if(typeof toast==='function') toast('Escribe el nombre del producto','err'); return; }
  if (precio < 0) { if(typeof toast==='function') toast('El precio no puede ser negativo','err'); return; }
  const data = loadListaCompras();
  const lista = data.listas.find(l => l.id === window._listaActivaId);
  if (!lista) return;
  lista.items.push({ id: Date.now(), nombre, emoji, precio: precio || 0, cantidad: cant, checked: false });
  saveListaCompras(data);
  document.getElementById('lista-add-mini')?.remove();
  _renderListaComprasModal(data);
};

// ─── EDITAR ITEM EXISTENTE — BATCH-XXVII ────────────────
window._listaEditarItemModal = function(idx) {
  var data = loadListaCompras();
  var lista = data.listas.find(function(l){ return l.id === window._listaActivaId; });
  if (!lista || !lista.items[idx]) return;
  var item = lista.items[idx];
  var rate = typeof rateBCV !== 'undefined' ? rateBCV : 451.51;
  var EMOJIS = ['🛒','🥛','🥩','🐟','🥦','🍎','🍞','🧴','💊','🥫','🧃','🧀','🍗','🥚','🌽','🍌','🍅','🧅','🧄','🌾'];

  var mini = document.createElement('div');
  mini.id = 'lista-edit-mini';
  mini.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10500;display:flex;align-items:flex-end;justify-content:center';

  var emojiRow = EMOJIS.map(function(e) {
    var isSel = e === item.emoji;
    return '<button onclick="_listaSelEmojiEdit(\'' + e.replace(/'/g, "\\x27") + '\')" class="lista-emoji-edit-btn"'
      + ' style="font-size:1.3rem;background:' + (isSel ? 'rgba(63,185,80,.1)' : '#1c2128') + ';border:2px solid ' + (isSel ? '#3fb950' : 'transparent') + ';border-radius:10px;padding:5px 7px;cursor:pointer;flex-shrink:0">' + e + '</button>';
  }).join('');

  var totalPrev = (item.precio||0) * (item.cantidad||1);
  mini.innerHTML = '<div style="background:#161b22;border-radius:20px 20px 0 0;border-top:1px solid #30363d;width:100%;max-width:540px;padding:20px 18px;padding-bottom:max(20px,env(safe-area-inset-bottom,20px))">'
    + '<div style="font-size:.9rem;font-weight:800;color:#e6edf3;margin-bottom:14px">&#x270F;&#xFE0F; Editar producto</div>'
    + '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none;margin-bottom:12px">' + emojiRow + '</div>'
    + '<input id="le-nombre" type="text" value="' + escHtml(item.nombre||'') + '"'
    + ' style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.86rem;outline:none;margin-bottom:10px;box-sizing:border-box">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
    + '<div><label style="font-size:.62rem;color:#8b949e;display:block;margin-bottom:3px;text-transform:uppercase">Precio USD</label>'
    + '<input id="le-precio" type="number" step="0.01" value="' + (item.precio||0) + '" min="0" oninput="_listaEditPreview()"'
    + ' style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:9px 11px;border-radius:9px;font-size:.9rem;outline:none;box-sizing:border-box"></div>'
    + '<div><label style="font-size:.62rem;color:#8b949e;display:block;margin-bottom:3px;text-transform:uppercase">Cantidad</label>'
    + '<div style="display:flex;align-items:center;background:#0d1117;border:1px solid #30363d;border-radius:9px;overflow:hidden">'
    + '<button onclick="_listaEditQty(-1)" style="background:none;border:none;color:#e6edf3;padding:9px 13px;cursor:pointer;font-size:1rem;font-weight:700">&#x2212;</button>'
    + '<input id="le-cant" type="number" value="' + (item.cantidad||1) + '" min="1" max="99" style="flex:1;background:none;border:none;color:#e6edf3;text-align:center;font-size:.9rem;outline:none;font-weight:700">'
    + '<button onclick="_listaEditQty(1)" style="background:none;border:none;color:#e6edf3;padding:9px 13px;cursor:pointer;font-size:1rem;font-weight:700">+</button>'
    + '</div></div></div>'
    + '<div id="le-prev" style="background:#13181f;border-radius:7px;padding:7px 11px;margin-bottom:12px;font-size:.73rem;color:#8b949e">Total: <span id="le-prev-usd" style="color:#e3b341;font-weight:700">$' + totalPrev.toFixed(2) + '</span> &middot; Bs <span id="le-prev-bs" style="color:#e3b341;font-weight:700">' + (totalPrev*rate).toFixed(2) + '</span></div>'
    + '<input type="hidden" id="le-emoji" value="' + escHtml(item.emoji||'🛒') + '">'
    + '<input type="hidden" id="le-idx" value="' + idx + '">'
    + '<div style="display:flex;gap:8px">'
    + '<button onclick="document.getElementById(\'lista-edit-mini\').remove()" style="background:#1c2128;border:1px solid #30363d;color:#8b949e;padding:11px;border-radius:9px;cursor:pointer;flex-shrink:0">Cancelar</button>'
    + '<button onclick="_listaGuardarEdit()" style="flex:1;background:#1f6feb;border:none;color:#fff;padding:11px;border-radius:9px;font-weight:700;font-size:.88rem;cursor:pointer">&#x1F4BE; Guardar</button>'
    + '</div></div>';

  mini.onclick = function(e){ if(e.target===mini) mini.remove(); };
  document.body.appendChild(mini);
  setTimeout(function(){ var el=document.getElementById('le-nombre'); if(el) el.focus(); }, 80);
};

window._listaSelEmojiEdit = function(e) {
  document.querySelectorAll('.lista-emoji-edit-btn').forEach(function(b){ b.style.borderColor='transparent'; b.style.background='#1c2128'; });
  var found = Array.from(document.querySelectorAll('.lista-emoji-edit-btn')).find(function(b){ return b.textContent===e; });
  if (found) { found.style.borderColor='#3fb950'; found.style.background='rgba(63,185,80,.1)'; }
  var h = document.getElementById('le-emoji'); if(h) h.value = e;
};
window._listaEditQty = function(d) {
  var el = document.getElementById('le-cant'); if(!el) return;
  el.value = Math.max(1, Math.min(99, (parseInt(el.value)||1) + d));
  _listaEditPreview();
};
window._listaEditPreview = function() {
  var rate = typeof rateBCV!=='undefined' ? rateBCV : 451.51;
  var p = parseFloat(document.getElementById('le-precio') && document.getElementById('le-precio').value) || 0;
  var q = parseInt(document.getElementById('le-cant') && document.getElementById('le-cant').value) || 1;
  var t = p*q;
  var u=document.getElementById('le-prev-usd'); if(u) u.textContent='$'+t.toFixed(2);
  var b=document.getElementById('le-prev-bs');  if(b) b.textContent=(t*rate).toFixed(2);
};
window._listaGuardarEdit = function() {
  var nombre  = document.getElementById('le-nombre') && document.getElementById('le-nombre').value && document.getElementById('le-nombre').value.trim();
  var precio  = parseFloat(document.getElementById('le-precio') && document.getElementById('le-precio').value) || 0;
  var cant    = parseInt(document.getElementById('le-cant') && document.getElementById('le-cant').value) || 1;
  var emoji   = (document.getElementById('le-emoji') && document.getElementById('le-emoji').value) || '🛒';
  var idx     = parseInt(document.getElementById('le-idx') && document.getElementById('le-idx').value);
  if (!nombre) { if(typeof toast==='function') toast('Escribe el nombre','err'); return; }
  var data    = loadListaCompras();
  var lista   = data.listas.find(function(l){ return l.id===window._listaActivaId; });
  if (!lista || !lista.items[idx]) return;
  lista.items[idx] = Object.assign({}, lista.items[idx], { nombre:nombre, emoji:emoji, precio:precio, cantidad:cant });
  saveListaCompras(data);
  document.getElementById('lista-edit-mini') && document.getElementById('lista-edit-mini').remove();
  _renderListaComprasModal(data);
  if(typeof toast==='function') toast('&#x2705; Producto actualizado','ok');
};

window._listaRegistrarComoMovimiento = async function() {
  const data = loadListaCompras();
  const lista = data.listas.find(l => l.id === window._listaActivaId);
  if (!lista || !lista.items.length) {
    if (typeof toast === 'function') toast('Lista vacía — agrega productos primero','err');
    return;
  }
  const rate = typeof rateBCV !== 'undefined' ? rateBCV : 451.51;
  const itemsARegistrar = lista.items.filter(i => !i.checked);
  if (!itemsARegistrar.length) {
    if (typeof toast === 'function') toast('Todos los productos ya fueron marcados como comprados','err');
    return;
  }
  const total = itemsARegistrar.reduce((s,i) => s + (i.precio * i.cantidad), 0);
  const nombres = itemsARegistrar.slice(0,3).map(i=>i.nombre).join(', ') + (itemsARegistrar.length > 3 ? '...' : '');
  const ok = await showConfirm('💾 Registrar compra',
    `¿Registrar $${total.toFixed(2)} como gasto de mercado?\nProductos: ${nombres}`, '🛒');
  if (!ok) return;
  // Cerrar lista y abrir modal de movimiento pre-llenado
  document.getElementById('lista-compras-overlay')?.remove();
  if (typeof unlockScroll === 'function') unlockScroll();
  if (typeof openModal === 'function') {
    openModal();
    setTimeout(() => {
      const desc = document.getElementById('f-desc');
      const tipo = document.getElementById('f-tipo');
      const cat  = document.getElementById('f-cat');
      const amt  = document.getElementById('f-amount-usd');
      if (desc) desc.value = `Compras mercado: ${nombres}`;
      if (tipo) { tipo.value = 'Gasto'; if(typeof onTipoChange==='function') onTipoChange(); }
      if (amt)  amt.value = total.toFixed(2);
      setTimeout(() => {
        if (cat) {
          // buscar categoría de mercado/comida
          const optMercado = Array.from(cat.options).find(o => /mercado|comida|aliment/i.test(o.value));
          if (optMercado) { cat.value = optMercado.value; if(typeof onCatChange==='function') onCatChange(); }
        }
      }, 80);
      if (typeof toast === 'function') toast('🛒 Lista cargada al formulario — revisa y guarda', 'ok');
    }, 300);
  }
};

window._listaCompartir = function() {
  const data = loadListaCompras();
  const lista = data.listas.find(l => l.id === window._listaActivaId);
  if (!lista) return;
  const rate = typeof rateBCV !== 'undefined' ? rateBCV : 451.51;
  const total = lista.items.reduce((s,i) => s + i.precio * i.cantidad, 0);
  let texto = `🛒 *${lista.nombre}*\n`;
  texto += '─────────────────\n';
  lista.items.forEach(i => {
    texto += `${i.checked?'✅':'⬜'} ${i.emoji} ${i.nombre}\n`;
    texto += `   x${i.cantidad} · $${i.precio.toFixed(2)} · Bs ${(i.precio*rate).toFixed(2)}\n`;
  });
  texto += '─────────────────\n';
  texto += `💰 Total: $${total.toFixed(2)} · Bs ${(total*rate).toFixed(2)}\n`;
  texto += `📅 Tasa: Bs ${rate.toFixed(2)}/$`;
  navigator.clipboard?.writeText(texto).then(() => {
    if (typeof toast === 'function') toast('📋 Lista copiada al portapapeles', 'ok');
  }).catch(() => {
    if (typeof toast === 'function') toast('No se pudo copiar: ' + texto.slice(0,30), 'err');
  });
};

// FIX-LISTA-HISTORIAL: reemplaza prompt() con panel dedicado de historial/gestión
window._listaAgregarModal = function() {
  _listaHistorialPanel();
};

window._listaHistorialPanel = function() {
  const data = loadListaCompras();
  const panel = document.createElement('div');
  panel.id = 'lista-historial-panel';
  panel.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10600;display:flex;align-items:flex-end;justify-content:center';
  const defaultNombre = 'Mercado ' + new Date().toLocaleDateString('es-VE',{day:'2-digit',month:'short'});
  panel.innerHTML = `
  <div style="background:#161b22;border-radius:20px 20px 0 0;border-top:1px solid #30363d;width:100%;max-width:540px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden">
    <div style="display:flex;justify-content:center;padding:10px 0 2px"><div style="width:36px;height:4px;background:#30363d;border-radius:2px"></div></div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 18px 12px">
      <span style="font-size:.95rem;font-weight:800;color:#e6edf3">📋 Mis listas</span>
      <button onclick="document.getElementById('lista-historial-panel').remove()" style="background:none;border:none;color:#8b949e;font-size:1.2rem;cursor:pointer">✕</button>
    </div>
    <!-- Nueva lista -->
    <div style="padding:0 16px 12px;flex-shrink:0">
      <div style="display:flex;gap:8px">
        <input id="lista-nueva-nombre" type="text" placeholder="${defaultNombre}"
          style="flex:1;background:#0d1117;border:1px solid #3fb950;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.85rem;outline:none;box-sizing:border-box">
        <button onclick="_listaCrearNueva()" style="background:#238636;border:none;color:#fff;padding:10px 16px;border-radius:10px;font-weight:700;font-size:.85rem;cursor:pointer;flex-shrink:0">+ Nueva</button>
      </div>
    </div>
    <!-- Historial de listas -->
    <div style="overflow-y:auto;flex:1;padding:0 16px 16px">
      <div style="font-size:.65rem;color:#8b949e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Historial (${data.listas.length} lista${data.listas.length!==1?'s':''})</div>
      ${data.listas.length ? data.listas.map(l => {
        const total = (l.items||[]).reduce((s,i) => s+(i.precio||0)*(i.cantidad||1), 0);
        const fecha = l.fecha ? new Date(l.fecha).toLocaleDateString('es-VE',{day:'2-digit',month:'short',year:'2-digit'}) : '';
        return `<div style="display:flex;align-items:center;gap:10px;padding:11px 12px;background:${l.activa?'rgba(63,185,80,.08)':'#13181f'};border:1px solid ${l.activa?'rgba(63,185,80,.3)':'#21262d'};border-radius:12px;margin-bottom:8px">
          <div style="flex:1;min-width:0;cursor:pointer" onclick="_listaSeleccionar('${l.id}')">
            <div style="font-size:.84rem;font-weight:600;color:${l.activa?'#3fb950':'#e6edf3'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.activa?'● ':''}${escHtml(l.nombre)}</div>
            <div style="font-size:.67rem;color:#8b949e;margin-top:2px">${l.items?l.items.length:0} productos · $${total.toFixed(2)}${fecha?' · '+fecha:''}</div>
          </div>
          <button onclick="_listaEditarNombre('${l.id}','${l.nombre.replace(/'/g,"\\\\'")}',this)" style="background:none;border:1px solid #30363d;color:#8b949e;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:.75rem" title="Renombrar">✏️</button>
          <button onclick="_listaBorrar('${l.id}')" style="background:none;border:1px solid rgba(248,81,73,.3);color:#f85149;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:.75rem" title="Eliminar">🗑</button>
        </div>`;
      }).join('') : '<div style="text-align:center;color:#484f58;font-size:.8rem;padding:24px">Sin listas guardadas</div>'}
    </div>
  </div>`;
  panel.onclick = e => { if(e.target===panel) panel.remove(); };
  document.body.appendChild(panel);
};

window._listaCrearNueva = function() {
  const input = document.getElementById('lista-nueva-nombre');
  const nombre = (input?.value?.trim()) || ('Mercado ' + new Date().toLocaleDateString('es-VE',{day:'2-digit',month:'short'}));
  const data = loadListaCompras();
  data.listas.forEach(l => l.activa = false);
  const nuevaId = 'lst_' + Date.now();
  data.listas.unshift({ id: nuevaId, nombre, items: [], activa: true, fecha: new Date().toISOString() });
  saveListaCompras(data);
  window._listaActivaId = nuevaId;
  document.getElementById('lista-historial-panel')?.remove();
  _renderListaComprasModal(data);
  if(typeof toast==='function') toast('✅ Lista "' + nombre + '" creada', 'ok');
};

window._listaSeleccionar = function(id) {
  const data = loadListaCompras();
  data.listas.forEach(l => l.activa = l.id === id);
  saveListaCompras(data);
  window._listaActivaId = id;
  document.getElementById('lista-historial-panel')?.remove();
  _renderListaComprasModal(data);
};

window._listaEditarNombre = async function(id, nombreActual, btn) {
  const nuevo = await _promptModal('✏️ Renombrar lista', 'Nuevo nombre:', nombreActual, 'text').catch(() => null);
  if (!nuevo || nuevo === nombreActual) return;
  const data = loadListaCompras();
  const lista = data.listas.find(l => l.id === id);
  if (lista) { lista.nombre = nuevo.trim(); saveListaCompras(data); }
  document.getElementById('lista-historial-panel')?.remove();
  _listaHistorialPanel();
};

window._listaBorrar = async function(id) {
  const data = loadListaCompras();
  const lista = data.listas.find(l => l.id === id);
  if (!lista) return;
  const ok = await showConfirm('🗑 Eliminar lista', `¿Eliminar "${lista.nombre}" y todos sus productos?`, '🗑');
  if (!ok) return;
  data.listas = data.listas.filter(l => l.id !== id);
  if (data.listas.length && !data.listas.find(l => l.activa)) data.listas[0].activa = true;
  if (window._listaActivaId === id) window._listaActivaId = data.listas[0]?.id;
  saveListaCompras(data);
  document.getElementById('lista-historial-panel')?.remove();
  if (data.listas.length) _listaHistorialPanel();
  if(typeof toast==='function') toast('Lista eliminada', 'ok');
};

