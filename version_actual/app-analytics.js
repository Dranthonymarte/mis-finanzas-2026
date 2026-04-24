
// ═══════════════════════════════════════════════
// NAV EDITOR — Personalizar barra inferior móvil
// ═══════════════════════════════════════════════
const NAV_ITEMS_ALL = [
  {id:'nav-dashboard', icon:'🏠', label:'Inicio',    action:"pwaNav('dashboard')"},
  {id:'nav-buscar',    icon:'🔍', label:'Buscar',    action:"openSearch()"},
  {id:'nav-ia',        icon:'🤖', label:'IA',        action:"openIA()"},
  {id:'nav-config',    icon:'⚙️', label:'Config',    action:"openSettings()"},
  {id:'nav-mas',       icon:'☰',  label:'Más',       action:"openMobileMenu()"},
  {id:'nav-conexiones',icon:'🔐', label:'Sesiones',  action:"openConexiones()"},
  {id:'nav-audit',     icon:'📋', label:'Historial', action:"openAuditLog()"},
  {id:'nav-backup',    icon:'💾', label:'Respaldo',  action:"openBackupPanel()"},
  {id:'nav-tasas',     icon:'💱', label:'Tasas',     action:"openMobileRatesPanel()"},
  {id:'nav-ordenar',   icon:'🔀', label:'Ordenar',   action:"openReorganize()"},
  {id:'nav-voz',       icon:'🎙️', label:'Voz',       action:"openVoiceLanding()"},
  {id:'nav-lista',     icon:'🛒', label:'Lista',     action:"openListaCompras()"},
];
// 4 posiciones: 3 editables + Menú fijo al final
let navOrder = ['nav-dashboard','nav-buscar','nav-ia','nav-mas'];
let navOrderEdit = [...navOrder];

function openNavEditor() {
  if (CONFIG.navOrder) navOrder = CONFIG.navOrder;
  // Fallback: load from localStorage if Supabase hasn't loaded yet
  if(!CONFIG.navOrder) {
    try { const ls = localStorage.getItem('fin_nav_order'); if(ls) { navOrder = JSON.parse(ls); CONFIG.navOrder = navOrder; } } catch(e){}
  }
  navOrder = navOrder.filter(n => n !== 'nav-mas').slice(0, 3);
  while (navOrder.length < 3) navOrder.push('nav-buscar');
  navOrder.push('nav-mas');
  navOrderEdit = [...navOrder];
  renderNavEditorList();
  lockScroll();
  document.getElementById('modal-nav-editor').classList.add('open');
}
function closeNavEditor(e) {
  unlockScroll();
  document.getElementById('modal-nav-editor').classList.remove('open');
}
function closeNavEditorIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-nav-editor')) closeNavEditor();
}
function renderNavEditorList() {
  const list = document.getElementById('nav-editor-list');
  const editableSlots = navOrderEdit.slice(0, 3);
  const positions = ['① Izquierda','② Centro-Izq','③ Centro-Der'];
  const available = NAV_ITEMS_ALL.filter(n => n.id !== 'nav-mas');
  list.innerHTML = editableSlots.map((navId, i) => {
    const options = available.map(n =>
      `<option value="${n.id}" ${n.id===navId?'selected':''}>${n.icon} ${n.label}</option>`
    ).join('');
    return `<div style="display:flex;align-items:center;gap:8px;background:#1c2128;border:1px solid #30363d;border-radius:8px;padding:9px 12px">
      <span style="font-size:.65rem;color:#8b949e;min-width:75px">${positions[i]}</span>
      <select onchange="navOrderEdit[${i}]=this.value" style="flex:1;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:5px 8px;border-radius:6px;font-size:.75rem">${options}</select>
    </div>`;
  }).join('') +
  `<div style="display:flex;align-items:center;gap:8px;background:#1c2128;border:1px solid #484f58;border-radius:8px;padding:9px 12px;opacity:.55">
    <span style="font-size:.65rem;color:#8b949e;min-width:75px">④ Derecha</span>
    <span style="flex:1;font-size:.75rem;color:#8b949e;padding:5px 8px">☰ Menú — siempre fijo 🔒</span>
  </div>`;
}
async function applyNavOrder() {
  const editables = navOrderEdit.slice(0, 3);
  if (new Set(editables).size < editables.length) {
    toast('⚠️ No puedes repetir el mismo ícono dos veces', 'err');
    return;
  }
  navOrder = [...editables, 'nav-mas'];
  navOrderEdit = [...navOrder];
  CONFIG.navOrder = navOrder;
  localStorage.setItem('fin_nav_order', JSON.stringify(navOrder));
  buildNavBar();
  toast('✅ Orden de barra guardado');
  sbSaveConfig();
  document.getElementById('modal-nav-editor').classList.remove('open');
  toast('✅ Barra personalizada guardada', 'ok');
}
function buildNavBar() {
  const nav = document.getElementById('pwa-nav');
  if (!nav) return;
  const order = CONFIG.navOrder || navOrder;
  // Reconstruir nav: primer slot, ➕ fijo en el medio, resto
  const half = Math.floor(order.length / 2);
  const leftItems = order.slice(0, half);
  const rightItems = order.slice(half);
  const makeBtn = (navId) => {
    const item = NAV_ITEMS_ALL.find(n => n.id === navId);
    if (!item) return '';
    return `<button class="pwa-nav-btn" id="${item.id}" onclick="${item.action}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </button>`;
  };
  nav.innerHTML = leftItems.map(makeBtn).join('') +
    `<button class="pwa-nav-btn" id="nav-nuevo" onclick="openModal()" style="position:relative">
      <span class="nav-icon" style="font-size:1.8rem;line-height:1;color:#3fb950;display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:#1a3626;border-radius:50%;border:2px solid #3fb950;margin-top:-14px">＋</span>
      <span style="margin-top:2px">Nuevo</span>
    </button>` +
    rightItems.map(makeBtn).join('');
  // Restaurar estado activo
  document.querySelectorAll('.pwa-nav-btn').forEach(b => b.classList.remove('active'));
  const dashBtn = document.getElementById('nav-dashboard');
  if (dashBtn) dashBtn.classList.add('active');
}

// ═══════════════════════════════════════════════
// VOICE NOTE IA CHAT — WhatsApp style
// ═══════════════════════════════════════════════
let iaVoiceRecognition = null;
let iaVoiceTimer = null;
let iaVoiceSeconds = 0;

function startIAVoiceNote() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { toast('Tu navegador no soporta voz. Usa Chrome.', 'err'); return; }
  const inputEl = document.getElementById('ia-input');
  const recEl   = document.getElementById('ia-voice-rec');
  const micBtn  = document.getElementById('btn-ia-voice');
  const timerEl = document.getElementById('ia-voice-timer');
  if (iaVoiceRecognition) { cancelVoiceNote(); return; }
  iaVoiceRecognition = new SpeechRecognition();
  iaVoiceRecognition.lang = 'es-VE';
  iaVoiceRecognition.interimResults = false;
  iaVoiceRecognition.continuous = false;
  inputEl.style.display = 'none';
  recEl.classList.add('active');
  micBtn.style.display = 'none';
  iaVoiceSeconds = 0; timerEl.textContent = '0:00';
  iaVoiceTimer = setInterval(() => {
    iaVoiceSeconds++;
    timerEl.textContent = `${Math.floor(iaVoiceSeconds/60)}:${String(iaVoiceSeconds%60).padStart(2,'0')}`;
  }, 1000);
  iaVoiceRecognition.start();
  iaVoiceRecognition.onresult = (e) => stopVoiceNote(e.results[0][0].transcript);
  iaVoiceRecognition.onerror = () => cancelVoiceNote();
  iaVoiceRecognition.onend = () => { if (iaVoiceRecognition) cancelVoiceNote(); };
}
function stopVoiceNote(spokenText) {
  clearInterval(iaVoiceTimer);
  const inputEl = document.getElementById('ia-input');
  const recEl   = document.getElementById('ia-voice-rec');
  const micBtn  = document.getElementById('btn-ia-voice');
  recEl.classList.remove('active'); inputEl.style.display = ''; micBtn.style.display = '';
  if (iaVoiceRecognition) { try{iaVoiceRecognition.stop();}catch(e){} iaVoiceRecognition = null; }
  if (spokenText) {
    // Add WhatsApp-style voice bubble then send
    const chat = document.getElementById('ia-chat');
    if (chat) {
      const div = document.createElement('div');
      div.className = 'ia-msg-voice';
      div.innerHTML = `<span style="font-size:1.1rem">🎙️</span><span style="font-size:.72rem;color:#e6edf3;flex:1">${spokenText}</span>`;
      chat.appendChild(div); chat.scrollTop = 9999;
    }
    setTimeout(() => askGroq(spokenText), 100);
  }
}
function cancelVoiceNote() {
  clearInterval(iaVoiceTimer);
  const inputEl = document.getElementById('ia-input');
  const recEl   = document.getElementById('ia-voice-rec');
  const micBtn  = document.getElementById('btn-ia-voice');
  recEl.classList.remove('active'); inputEl.style.display = ''; micBtn.style.display = '';
  if (iaVoiceRecognition) { try{iaVoiceRecognition.stop();}catch(e){} iaVoiceRecognition = null; }
}

// ═══════════════════════════════════════════════
// CARD INFO & IA BUTTONS
// ═══════════════════════════════════════════════
const CARD_INFO = {
  'kpi-ingresos':   '<b>💚 Ingresos del Mes</b><br><br>Suma de todos los movimientos tipo <b>Ingreso Fijo</b>, <b>Ingreso Variable</b> y <b>Préstamo recibido</b> del mes actual.<br><br><b>¿Qué incluye?</b><br>• Salarios fijos mensuales<br>• Ingresos variables (honorarios, ventas, extras)<br>• Préstamos recibidos (cuenta como ingreso temporal)<br><br><i style="color:#8b949e">El ahorro no es ingreso — se registra por separado en el cochinito.</i>',
  'kpi-gastos':     '<b>🔴 Gastos del Mes</b><br><br>Suma de todos los movimientos tipo <b>Gasto</b> del mes actual, divididos por categoría.<br><br><b>Regla del 50/30/20:</b><br>• ≤50% en necesidades (casa, comida, transporte)<br>• ≤30% en deseos (entretenimiento, antojos)<br>• ≥20% en ahorro e inversión<br><br><i style="color:#8b949e">Revisa el presupuesto vs real más abajo para ver dónde te pasas.</i>',
  'kpi-ahorros':    '<b>💙 Ahorros (Cochinito)</b><br><br>Suma de movimientos tipo <b>Ahorro en efectivo</b>. Es dinero apartado intencionalmente — <b>no cuenta como ingreso ni gasto</b>.<br><br>• <b>Este mes:</b> lo que ahorraste en el mes actual<br>• <b>Total:</b> suma acumulada de todos los meses<br><br><b>Meta ideal:</b> 20% o más de tus ingresos mensuales.<br><br><i style="color:#8b949e">Este valor alimenta el Simulador FIRE y la Meta de Ahorro.</i>',
  'kpi-balance':    '<b>🏅 Balance del Mes</b><br><br>Resultado neto: <b>Ingresos − Gastos + Ajustes</b>.<br><br>• ✅ Positivo → gastaste menos de lo que entraste<br>• ❌ Negativo → los gastos superaron los ingresos<br><br><b>Nota:</b> los ajustes corrigen diferencias de cierre de mes (tipo saldo inicial).<br><br><i style="color:#8b949e">El Hero Balance de arriba siempre muestra este valor del mes activo.</i>',
  'kpi-score':      '<b>🏆 Score Financiero</b><br><br>Puntuación de 0 a 100 que mide tu salud financiera del mes.<br><br><b>Componentes:</b><br>• Hasta 50 pts por tasa de ahorro (ahorros/ingresos × 200)<br>• Hasta 50 pts por control de gastos (50 − gastos/ingresos × 50)<br>• +10 pts bonus si el balance es positivo<br><br><b>Rangos:</b><br>• 80–100 → Excelente 🟢<br>• 60–79 → Bueno 🟡<br>• 40–59 → Regular 🟠<br>• 0–39 → Crítico 🔴',
  'kpi-emergency':  '<b>🆘 Fondo de Emergencia</b><br><br>Reserva automática del <b>30% de tus ingresos</b> como colchón para imprevistos.<br><br>• <b>Este mes:</b> 30% de los ingresos del mes actual<br>• <b>Total acumulado:</b> suma de todos los meses<br><br><b>¿Para qué sirve?</b><br>Desempleo, enfermedad, reparaciones urgentes.<br><br><b>Meta recomendada:</b> 3–6 meses de gastos.<br><br><i style="color:#8b949e">Se calcula automáticamente — no requiere movimiento manual.</i>',
  'kpi-forecast':   '<b>🔮 Predicción Anual de Ahorro</b><br><br>Proyección de cuánto ahorrarás al cierre del año basada en tu <b>promedio mensual de ahorros</b>.<br><br><b>Fórmula:</b> Promedio mensual × 12 meses<br><br><b>Ejemplo:</b> Si ahorras $250/mes en promedio → proyección = $3,000/año.<br><br><i style="color:#8b949e">Solo cuenta movimientos tipo "Ahorro en efectivo". A mayor constancia, más precisa la proyección.</i>',
  'ingvsgastos':    '<b>📊 Ingresos vs Gastos vs Ahorros</b><br><br>Compara los tres valores clave del mes. Un mes saludable = barras de ingreso más altas que las de gasto.<br><br><b>Ejemplo con tus datos 2026:</b><br>• Enero: Ing $809 &gt; Gas $478 ✅ (balance +$130)<br>• Febrero: Ing $1,508 &lt; Gas $1,561 ⚠️ (pero ajuste +$130 = balance +$125)<br>• Marzo: Ing $645 &gt; Gas $503 ✅ (balance +$246)<br><br><i style="color:#8b949e">Nota: el Ahorro (cochinito) es separado — no cuenta como gasto.</i>',
  'distribgastos':  '<b>🍕 Distribución de Gastos</b><br><br>Torta que muestra qué % de tus gastos va a cada categoría.<br><br><b>Marzo 2026 (tus datos reales):</b><br>• 🛸 Otros: $259 (51%) — compra dólares, laptop<br>• 🏡 Casa: $79 (16%) — condominio, internet<br>• 🏦 Cashea: $56 (11%) — cuota mensual<br>• 🥑 Comida: $49 (10%)<br>• 🚓 Transporte: $38 (8%)<br>• 😋 Antojos: $22 (4%)<br><br><i style="color:#8b949e">El % ideal: Necesidades &lt;50%, Antojos &lt;30%, Ahorro &gt;20%.</i>',
  'patrimoniochart':'<b>📈 ¿Qué muestra este gráfico?</b><br><br>Línea temporal de tu patrimonio neto mes a mes. <b>Patrimonio = Ahorros acumulados + Balance acumulado.</b><br><br>Si la línea sube → están construyendo riqueza. Si baja → los gastos superaron los ingresos ese mes.<br><br><i style="color:#8b949e">Solo refleja lo registrado en la app, no incluye activos físicos ni deudas externas.</i>',
  'subcategastos':  'Desglose de gastos por subcategorías. Usa los filtros para ver solo una categoría. Útil para auditar gastos detallados.',
  'ingxtipo':       'Distribución de ingresos según fuente: Salario Isabel, Anthony, Pacientes, etc. Muestra de dónde viene el dinero.',
  'topgastos':      'Ranking de categorías con mayor gasto. La barra más larga = mayor porcentaje de tu presupuesto consumido.',
  'topingresos':    'Ranking de fuentes de ingresos de mayor a menor. Muestra qué ingreso aporta más al hogar.',
  'fondoemerg':     '<b>🛡️ Fondo de Emergencia</b><br><br>Tu colchón financiero para imprevistos: enfermedad, desempleo, reparaciones.<br><br><b>¿Cuánto necesito?</b><br>• Mínimo: 3 meses de gastos<br>• Ideal: 6 meses de gastos<br><br><b>📊 Ejemplo con tus datos:</b><br>• Gastos promedio: ~$514/mes (2026)<br>• Meta mínima (3 meses): $1,542<br>• Meta ideal (6 meses): $3,084<br>• El 30% de tus ingresos mensuales va acumulándose aquí<br><br><i style="color:#8b949e">Esta sección muestra el acumulado, no se mezcla con el cochinito.</i>',
  'presupuesto':    '<b>📋 Presupuesto vs Real</b><br><br>Compara lo que planeaste gastar vs lo que realmente gastaste por categoría.<br><br><b>📊 Marzo 2026 (tus datos):</b><br>• 🛸 Otros: Presupuesto $80 / Real $259 🔴 excedido<br>• 🏡 Casa: Presupuesto $90 / Real $79 ✅<br>• 🥑 Comida: Presupuesto $120 / Real $49 ✅<br>• 🏦 Cashea: Presupuesto $56 / Real $56 ✅<br><br>Rojo = excediste. Verde = bajo control.<br><i style="color:#8b949e">Ajusta los límites en ⚙️ Configuración.</i>',
  'transacciones':  'Todos los movimientos del mes: gastos, ingresos, ahorros. Edita ✏️ o elimina 🗑️ cualquier registro. Los meses cerrados 🔒 no se pueden modificar.',
  'fire':           '<b>🔥 ¿Qué es FIRE?</b><br><br>FIRE = <i>Financial Independence, Retire Early</i>. La meta es acumular 25× tus gastos anuales para vivir de las inversiones sin trabajar (regla del 4%).<br><br><b>📊 Ejemplo con tus datos:</b><br>• Gastos mensuales promedio: ~$500/mes → $6,000/año<br>• Meta FIRE = 25 × $6,000 = <b>$150,000</b><br>• Si ahorras ~$259/mes (promedio tus 3 meses), llegarías en ~48 años sin intereses<br>• Con 6% de rendimiento anual, la proyección baja significativamente<br><br><i style="color:#8b949e">Ajusta la tasa de retorno y la meta en el simulador.</i>',
  'meta':           '<b>🎯 ¿Para qué sirve la Meta de Ahorro?</b><br><br>Calcula cuánto debes apartar por mes para lograr una meta en un plazo dado.<br><br><b>📊 Ejemplo:</b><br>• Meta: $3,000 (fondo de emergencia o viaje)<br>• Plazo: 10 meses<br>• → Ahorra $300/mes para lograrlo<br>• Tu ritmo actual: ~$259/mes (promedio 2026)<br>• A ese ritmo llegarías en ~11.6 meses<br><br><i style="color:#8b949e">Cambia los valores en el simulador para ver tu proyección personalizada.</i>',
  'patrimest':      '<b>🏦 ¿Qué es el Patrimonio Estimado?</b><br><br><b>💰 Ahorro acumulado (Cochinito):</b> Suma de todo lo apartado como "Ahorro en efectivo" en todos los meses. <b>No cuenta como ingreso ni gasto.</b><br><br><b>💵 Balance (mes actual):</b> El resultado neto del mes seleccionado = Ingresos − Gastos + Ajustes. Cada mes ya tiene ajuste del anterior, por eso solo usamos el mes actual.<br><br><b>📊 Ejemplo con tus datos (Marzo 2026):</b><br>• Cochinito acumulado (Ene+Feb+Mar): $778<br>• Balance Marzo: +$245.94<br>• → Patrimonio Estimado: <b>$1,023.94</b><br><br><i style="color:#8b949e">⚠️ No incluye propiedades, inversiones externas ni deudas.</i>',
  'semanal':        '<b>📅 Desglose Semanal</b><br><br>Divide el mes en semanas (Lun-Dom) y muestra cuánto gastaste e ingresaste en cada una.<br><br><b>¿Para qué sirve?</b><br>• Detectar si gastas más al inicio o final del mes<br>• Ver semanas con picos inusuales<br>• Comparar ingresos vs gastos semana a semana<br><br><i style="color:#8b949e">Solo incluye transacciones con fecha válida del mes actual.</i>'
};
const CARD_IA_PROMPTS = {
  'kpi-ingresos':   () => { const d=EXCEL_DATA[currentMonth]; return `Mes ${currentMonth}: ingresos totales $${d.ingresos.toFixed(0)}. ¿Es un buen nivel? ¿Cómo diversificar o aumentar? Máx 100 palabras, español venezolano.`; },
  'kpi-gastos':     () => { const d=EXCEL_DATA[currentMonth]; const pct=d.ingresos?Math.round(d.gastos/d.ingresos*100):0; return `Mes ${currentMonth}: gastos $${d.gastos.toFixed(0)} (${pct}% de ingresos). ¿Está bajo control? ¿Qué reducir? Máx 100 palabras.`; },
  'kpi-ahorros':    () => { const d=EXCEL_DATA[currentMonth]; const total=activeMonths.reduce((s,m)=>s+(EXCEL_DATA[m]?.ahorros||0),0); return `Ahorro ${currentMonth}: $${d.ahorros.toFixed(0)}. Total acumulado: $${total.toFixed(0)}. ¿Buen ritmo? ¿Cómo mejorar? Máx 100 palabras.`; },
  'kpi-balance':    () => { const d=EXCEL_DATA[currentMonth]; return `Balance ${currentMonth}: $${d.balance.toFixed(0)} (ing $${d.ingresos.toFixed(0)} − gas $${d.gastos.toFixed(0)} + aj $${(d.ajustes||0).toFixed(0)}). ¿Es saludable? Consejo práctico. Máx 100 palabras.`; },
  'kpi-score':      () => { const d=EXCEL_DATA[currentMonth]; const s=calcScore(d); return `Score financiero ${currentMonth}: ${s}/100. ¿Qué área mejorar para subir la puntuación? Máx 100 palabras.`; },
  'kpi-emergency':  () => { const d=EXCEL_DATA[currentMonth]; const ef=d.ingresos*0.30; const total=activeMonths.reduce((s,m)=>s+((EXCEL_DATA[m]?.ingresos||0)*0.30),0); return `Fondo emergencia ${currentMonth}: $${ef.toFixed(0)}. Total acumulado: $${total.toFixed(0)}. ¿Es suficiente? Meta: 3-6 meses de gastos. Consejo. Máx 100 palabras.`; },
  'kpi-forecast':   () => { const avg=activeMonths.reduce((s,m)=>s+(EXCEL_DATA[m]?.ahorros||0),0)/activeMonths.length; return `Predicción anual: $${(avg*12).toFixed(0)} (promedio $${avg.toFixed(0)}/mes). ¿Es buen ritmo para Venezuela? ¿Cómo aumentar? Máx 100 palabras.`; },
  'ingvsgastos':    () => `${currentMonth}: Ingresos=$${EXCEL_DATA[currentMonth].ingresos.toFixed(0)}, Gastos=$${EXCEL_DATA[currentMonth].gastos.toFixed(0)}, Ahorros=$${EXCEL_DATA[currentMonth].ahorros.toFixed(0)}. ¿Es saludable? Dame 2 observaciones y 1 consejo. Máx 100 palabras.`,
  'distribgastos':  () => `Gastos ${currentMonth}: ${Object.entries(EXCEL_DATA[currentMonth].cat_totals||{}).map(([k,v])=>`${k.replace(/[^\w\s]/g,'').trim()}=$${v.toFixed(0)}`).join(', ')}. ¿Qué categoría controlar? 1 consejo concreto. Máx 80 palabras.`,
  'patrimoniochart':() => { let p=0; activeMonths.forEach(m=>{p+=EXCEL_DATA[m].ahorros+EXCEL_DATA[m].balance;}); return `Patrimonio neto: $${p.toFixed(0)}. ¿Buen ritmo de crecimiento? Dame perspectiva y consejo. Máx 100 palabras.`; },
  'subcategastos':  () => `Subcategorías ${currentMonth}: ${(EXCEL_DATA[currentMonth].transactions||[]).filter(t=>t.tipo==='Gasto').map(t=>`${t.subcat||t.cat}:$${t.amount.toFixed(0)}`).slice(0,10).join(', ')}. ¿Algo que reducir? Máx 100 palabras.`,
  'ingxtipo':       () => `Ingresos ${currentMonth}: ${(EXCEL_DATA[currentMonth].transactions||[]).filter(t=>t.tipo.includes('Ingreso')).map(t=>`${t.desc}:$${t.amount.toFixed(0)}`).slice(0,8).join(', ')}. ¿Cómo diversificar? Máx 100 palabras.`,
  'topgastos':      () => `Top gastos ${currentMonth}: ${Object.entries(EXCEL_DATA[currentMonth].cat_totals||{}).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k.replace(/[^\w\s]/g,'').trim()}:$${v.toFixed(0)}`).join(', ')}. ¿Cuál controlar más? Máx 80 palabras.`,
  'topingresos':    () => `Ingresos ${currentMonth}: $${EXCEL_DATA[currentMonth].ingresos.toFixed(0)} total. Consejo para mantener o aumentar. Máx 80 palabras.`,
  'fondoemerg':     () => `Fondo emergencia: $${getEmergencyFund(currentMonth).toFixed(0)} de $3,000 meta. ¿Cómo acelerar? Máx 80 palabras.`,
  'presupuesto':    () => `Gastos ${currentMonth}: $${EXCEL_DATA[currentMonth].gastos.toFixed(0)}. ¿Cómo ajustar el presupuesto? 1 consejo práctico. Máx 80 palabras.`,
  'transacciones':  () => `Tengo ${(EXCEL_DATA[currentMonth].transactions||[]).length} movimientos en ${currentMonth}. ¿Hay patrones inusuales? Máx 80 palabras.`,
  'fire':           () => { const avg=activeMonths.reduce((s,m)=>s+EXCEL_DATA[m].ahorros,0)/activeMonths.length; return `Ahorro promedio: $${avg.toFixed(0)}/mes. ¿Buen ritmo para FIRE en Venezuela? Máx 100 palabras.`; },
  'meta':           () => `Ahorro promedio: $${(activeMonths.reduce((s,m)=>s+EXCEL_DATA[m].ahorros,0)/activeMonths.length).toFixed(0)}/mes. ¿Cuándo llego a $3,000? Máx 80 palabras.`,
  'patrimest':      () => { let p=0; activeMonths.forEach(m=>{p+=EXCEL_DATA[m].ahorros+EXCEL_DATA[m].balance;}); return `Patrimonio: $${p.toFixed(0)}. ¿Suficiente? ¿Cómo crecer? Máx 80 palabras.`; },
  'semanal': () => { const txns=(EXCEL_DATA[currentMonth].transactions||[]).filter(t=>t.tipo==='Gasto'); const total=txns.reduce((s,t)=>s+t.amount,0); return `Gastos de ${currentMonth}: $${total.toFixed(0)} en ${txns.length} transacciones. ¿Cuáles semanas fueron más costosas según las fechas? Analiza el patrón semanal. Máx 100 palabras.`; }
};
const CARD_TITLES = {
  'kpi-ingresos':   '💚 Ingresos del Mes',
  'kpi-gastos':     '🔴 Gastos del Mes',
  'kpi-ahorros':    '💙 Ahorros (Cochinito)',
  'kpi-balance':    '🏅 Balance del Mes',
  'kpi-score':      '🏆 Score Financiero',
  'kpi-emergency':  '🆘 Fondo de Emergencia',
  'kpi-forecast':   '🔮 Predicción Anual',
  'ingvsgastos':    '📊 Ingresos vs Gastos',
  'distribgastos':  '🥧 Distribución de Gastos',
  'patrimoniochart':'📈 Patrimonio Neto',
  'subcategastos':  '🔍 Gastos por Subcategoría',
  'ingxtipo':       '💰 Ingresos por Tipo',
  'topgastos':      '🏆 Top Gastos',
  'topingresos':    '💚 Top Ingresos',
  'fondoemerg':     '🆘 Fondo de Emergencia',
  'presupuesto':    '📋 Presupuesto vs Real',
  'transacciones':  '📋 Movimientos del Mes',
  'fire':           '🔥 Simulador FIRE',
  'meta':           '🎯 Simulador de Meta',
  'patrimest':      '🏦 Patrimonio Estimado',
  'semanal':        '📅 Desglose Semanal'
};
// FIX-4: showCardInfo unificada — delega a _showCardInfoV2 para tipos con datos dinámicos
// REVERT: eliminar el if(_showCardInfoV2...) y dejar solo el bloque original
function showCardInfo(cardId) {
  // Mapear IDs de KPI strip (k-xxx) a claves de CARD_INFO
  const kpiMap = {
    'k-ingresos':  'kpi-ingresos',
    'k-gastos':    'kpi-gastos',
    'k-ahorros':   'kpi-ahorros',
    'k-balance':   'kpi-balance',
    'k-score':     'kpi-score',
    'k-emergency': 'kpi-emergency',
    'k-forecast':  'kpi-forecast',
  };
  if (kpiMap[cardId]) { cardId = kpiMap[cardId]; }
  // Tipos con datos dinámicos (calculados en tiempo real) → _showCardInfoV2
  const dynamicTypes = ['balance','gastos','ingresos','ingvsgastos','ranking'];
  if (dynamicTypes.includes(cardId) && typeof _showCardInfoV2 === 'function') {
    _showCardInfoV2(cardId); return;
  }
  const text  = CARD_INFO[cardId] || 'Información no disponible.';
  const title = CARD_TITLES[cardId] || '¿Qué muestra esta tarjeta?';
  const modal = document.getElementById('modal-card-info');
  if (!modal) return;
  document.getElementById('card-info-title').textContent = title;
  document.getElementById('card-info-body').innerHTML  = text;
  modal.style.display = 'flex';
}
async function askCardIA(cardId) {
  // Mapear IDs de KPI strip al clave de prompts
  const kpiMap = {
    'k-ingresos':  'kpi-ingresos',
    'k-gastos':    'kpi-gastos',
    'k-ahorros':   'kpi-ahorros',
    'k-balance':   'kpi-balance',
    'k-score':     'kpi-score',
    'k-emergency': 'kpi-emergency',
    'k-forecast':  'kpi-forecast',
  };
  if (kpiMap[cardId]) cardId = kpiMap[cardId];
  const promptFn = CARD_IA_PROMPTS[cardId];
  if (!promptFn) return;
  openIA();
  setTimeout(() => askGroq(promptFn()), 350);
}

// ═══════════════════════════════════════════════
// DRAG-AND-DROP Sortable.js
// ═══════════════════════════════════════════════
let dashSortable = null;
function initDragReorder() {
  if (typeof Sortable === 'undefined') { setTimeout(initDragReorder, 600); return; }
  const main = document.querySelector('.main');
  if (!main || dashSortable) return;
  dashSortable = Sortable.create(main, {
    animation: 200,
    ghostClass: 'drag-ghost',
    chosenClass: 'sortable-chosen',
    handle: '.drag-handle',
    delay: 200,
    delayOnTouchOnly: true,
    onEnd: function(evt) {
      if (evt.oldIndex === evt.newIndex) return;
      const newOrder = [...main.children]
        .filter(el => el.id && (el.id.startsWith('dash-s-') || el.id === 'dash-hero-unit' || el.id === 'kpi-strip' || el.id === 'mobile-quick-actions'))
        .map(el => el.id);
      CONFIG.dashboardOrder = newOrder;
      localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(newOrder));
      sbSaveConfig();
      toast('✅ Orden del dashboard guardado', 'ok');
    }
  });
}
function initAllSortable() {
  setTimeout(initDragReorder, 800);
  // KPI strip drag-to-reorder
  setTimeout(() => {
    if (typeof Sortable === 'undefined') return;
    const strip = document.getElementById('kpi-strip');
    if (!strip || strip._sortable) return;
    strip._sortable = Sortable.create(strip, {
      animation: 180,
      handle: '.drag-handle',
      ghostClass: 'drag-ghost',
      delay: 150,
      delayOnTouchOnly: true,
      onEnd: () => {
        // persist order in CONFIG for future sessions
        const order = [...strip.children].map(el => el.dataset.kpiId).filter(Boolean);
        try { CONFIG.kpiOrder = order; sbSaveConfig(); toast('🔀 Orden de métricas guardado', 'ok'); } catch(e) {}
      }
    });
  }, 900);
}

// ═══════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════
async function requestPushPermission() {
  if (!('Notification' in window)) { toast('Tu navegador no soporta notificaciones', 'err'); return; }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    toast('🔔 Notificaciones activadas ✅', 'ok');
    scheduleDailyReminders();
    localStorage.setItem('finanzas_push_enabled', '1');
  } else {
    toast('Notificaciones bloqueadas. Actívalas en Ajustes del navegador.', 'err');
  }
}

function scheduleDailyReminders() {
  if (Notification.permission !== 'granted') return;
  // Verificar si ya se programó hoy
  const today = new Date().toISOString().slice(0,10);
  const lastScheduled = localStorage.getItem('finanzas_push_last');
  if (lastScheduled === today) return;
  localStorage.setItem('finanzas_push_last', today);

  const now = new Date();
  const scheduleAt = (hour, minute, fn) => {
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    setTimeout(fn, delay);
  };

  // ── 8:00 AM — recordatorio de ingresos ───────────────────────────
  scheduleAt(8, 0, () => {
    const d = EXCEL_DATA[currentMonth];
    const todayStr = new Date().toISOString().slice(0,10);
    const ingrHoy = (d?.transactions||[]).filter(t => t.date === todayStr && t.tipo.includes('Ingreso'));
    const totalIngrHoy = ingrHoy.reduce((s,t) => s+t.amount, 0);
    if (ingrHoy.length === 0) {
      sendNotification(
        '💰 ¿Registraste tus ingresos hoy?',
        'No hay ingresos registrados hoy. ¿Recibiste algún pago o sueldo? Toca para registrar.',
        'icon-192.png', '/?action=nuevo&tipo=Ingreso%20Fijo'
      );
    } else {
      sendNotification(
        '✅ Ingresos del día registrados',
        `Llevas $${totalIngrHoy.toFixed(2)} en ingresos hoy (${ingrHoy.length} movimiento${ingrHoy.length!==1?'s':''}). ¡Buen trabajo!`,
        'icon-192.png', '/'
      );
    }
  });

  // ── 12:00 PM — check al mediodía ────────────────────────────────
  scheduleAt(12, 0, () => {
    const todayStr = new Date().toISOString().slice(0,10);
    const d = EXCEL_DATA[currentMonth];
    const movHoy = (d?.transactions||[]).filter(t => t.date === todayStr);
    if (movHoy.length === 0) {
      sendNotification(
        '📋 Sin movimientos hoy',
        '¿Tuviste gastos o ingresos esta mañana? Regístralos para mantener el control exacto.',
        'icon-192.png', '/?action=nuevo'
      );
    }
  });

  // ── 6:00 PM — recordatorio vespertino personalizado ────────────────
  scheduleAt(18, 30, () => {
    const todayStr = new Date().toISOString().slice(0,10);
    const d = EXCEL_DATA[currentMonth];
    const gastoHoy = (d?.transactions||[]).filter(t => t.date === todayStr && t.tipo === 'Gasto');
    const ingrHoy  = (d?.transactions||[]).filter(t => t.date === todayStr && t.tipo.includes('Ingreso'));
    const nombre   = currentUser ? getDisplayName(currentUser.email).split(' ')[0] : '';
    const saludo   = nombre ? `${nombre}, ¿` : '¿';

    if (gastoHoy.length === 0 && ingrHoy.length === 0) {
      sendNotification(
        '📝 ¿Registraste tus movimientos hoy?',
        `${saludo}tuviste gastos o ingresos hoy? Regístralos ahora para no perder el hilo.`,
        'icon-192.png', '/?action=nuevo'
      );
    } else if (gastoHoy.length === 0) {
      sendNotification(
        '🛒 ¿Registraste tus gastos hoy?',
        `Tienes ingresos del día pero sin gastos. ${saludo}realizaste alguna compra o pago?`,
        'icon-192.png', '/?action=nuevo&tipo=Gasto'
      );
    } else if (ingrHoy.length === 0) {
      sendNotification(
        '💰 ¿Registraste tus ingresos hoy?',
        `Tienes ${gastoHoy.length} gasto${gastoHoy.length!==1?'s':''} registrado${gastoHoy.length!==1?'s':''}. ${saludo}recibiste algún pago hoy?`,
        'icon-192.png', '/?action=nuevo&tipo=Ingreso%20Fijo'
      );
    }
    // Si tiene ambos: no molestar hasta las 9PM
  });

  // ── 9:00 PM — resumen nocturno completo ────────────────────────
  scheduleAt(21, 0, () => {
    const todayStr = new Date().toISOString().slice(0,10);
    const d = EXCEL_DATA[currentMonth];
    const gastoHoy     = (d?.transactions||[]).filter(t => t.date === todayStr && t.tipo === 'Gasto');
    const totalGastoHoy = gastoHoy.reduce((s,t) => s+t.amount, 0);
    const ingrHoy       = (d?.transactions||[]).filter(t => t.date === todayStr && t.tipo.includes('Ingreso'));
    const totalIngrHoy  = ingrHoy.reduce((s,t) => s+t.amount, 0);

    if (gastoHoy.length === 0 && ingrHoy.length === 0) {
      sendNotification(
        '🛒 Sin movimientos hoy',
        'No registraste gastos ni ingresos hoy. ¡No dejes que se te olvide ninguno!',
        'icon-192.png', '/?action=nuevo'
      );
    } else if (gastoHoy.length === 0) {
      sendNotification(
        '🛒 ¿Registraste tus gastos hoy?',
        `Tienes $${totalIngrHoy.toFixed(2)} en ingresos pero sin gastos registrados. ¿Tuviste algún gasto?`,
        'icon-192.png', '/?action=nuevo&tipo=Gasto'
      );
    } else if (ingrHoy.length === 0) {
      sendNotification(
        '💰 ¿Registraste tus ingresos hoy?',
        `Registraste $${totalGastoHoy.toFixed(2)} en gastos. ¿Recibiste algún ingreso hoy?`,
        'icon-192.png', '/?action=nuevo&tipo=Ingreso%20Fijo'
      );
    } else {
      const balance = totalIngrHoy - totalGastoHoy;
      const signo = balance >= 0 ? '+' : '';
      const emoji = balance >= 0 ? '📈' : '📉';
      sendNotification(
        `${emoji} Resumen de hoy · ${new Date().toLocaleDateString('es-VE',{weekday:'short',day:'numeric',month:'short'})}`,
        `Ingresos: $${totalIngrHoy.toFixed(2)} · Gastos: $${totalGastoHoy.toFixed(2)} · Balance: ${signo}$${Math.abs(balance).toFixed(2)}`,
        'icon-192.png', '/'
      );
    }
  });

  // ── Fin de mes (día 28) ─────────────────────────────────────────
  scheduleAt(18, 0, () => {
    const hoy = new Date();
    if (hoy.getDate() === 28) {
      const d = EXCEL_DATA[currentMonth];
      if (d) {
        sendNotification(
          '📅 ¿Listo para cerrar el mes?',
          `Quedan pocos días de ${currentMonth}. Balance actual: $${(d.balance||0).toFixed(2)}. Revisa tus pendientes.`,
          'icon-192.png', '/'
        );
      }
    }
  });

  // ── Alerta de presupuesto ────────────────────────────────────────
  checkBudgetAlerts();
}

function sendNotification(title, body, icon='icon-192.png', url='/') {
  // FIX-NOTIF-PUSH: delegar a sendLocalNotification de app-features si está disponible
  // Eso garantiza compatibilidad con el sistema VAPID y la apertura de la URL correcta
  if (typeof window.sendNotification !== 'undefined' && window.sendNotification !== sendNotification) {
    window.sendNotification(title, body, 'fin-notif', url);
    return;
  }
  if (Notification.permission !== 'granted') return;
  try {
    navigator.serviceWorker?.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: icon.startsWith('/') ? icon : '/' + icon,
        badge: '/icon-192.png',
        tag: 'finanzas-' + Date.now(),
        data: { url },
        vibrate: [100, 50, 100],
        requireInteraction: false
      });
    }).catch(() => {
      try { new Notification(title, { body, icon }); } catch(e) {}
    });
  } catch(e) { console.log('[Push]', e); }
}

function checkBudgetAlerts() {
  if (Notification.permission !== 'granted') return;
  Object.entries(CONFIG.presupuestos || {}).forEach(([cat, budget]) => {
    const gasto = EXCEL_DATA[currentMonth]?.cat_totals?.[cat] || 0;
    const pct = budget > 0 ? (gasto / budget) * 100 : 0;
    if (pct >= 80 && pct < 100) {
      sendNotification(`⚠️ Presupuesto de ${cat} al ${pct.toFixed(0)}%`, `Llevas $${gasto.toFixed(0)} de $${budget} presupuestados. ¡Ten cuidado!`);
    } else if (pct >= 100) {
      sendNotification(`🔴 ¡Superaste el presupuesto de ${cat}!`, `Gastaste $${gasto.toFixed(0)} de $${budget} presupuestados.`);
    }
  });
}

function initPushNotifications() {
  const enabled = localStorage.getItem('finanzas_push_enabled');
  if (enabled === '1' && Notification.permission === 'granted') {
    scheduleDailyReminders();
  } else if (!enabled) {
    // Mostrar prompt después de 3 segundos si nunca se ha pedido
    setTimeout(() => {
      if (Notification.permission === 'default') {
        const toastEl = document.createElement('div');
        toastEl.className = 'toast ok';
        toastEl.style.cssText += ';padding:12px 16px;display:flex;flex-direction:column;gap:8px;max-width:320px;cursor:default';
        toastEl.innerHTML = `
          <span style="font-weight:700;font-size:.82rem">🔔 ¿Activar recordatorios?</span>
          <span style="font-size:.72rem;color:#8b949e">Te avisaré para registrar ingresos (8am) y gastos (9pm)</span>
          <div style="display:flex;gap:8px">
            <button onclick="requestPushPermission();this.closest('.toast').remove()" style="flex:1;background:#238636;border:none;color:#fff;padding:6px 8px;border-radius:5px;font-size:.72rem;cursor:pointer;font-weight:600">✅ Activar</button>
            <button onclick="localStorage.setItem('finanzas_push_enabled','0');this.closest('.toast').remove()" style="flex:1;background:#21262d;border:1px solid #30363d;color:#8b949e;padding:6px 8px;border-radius:5px;font-size:.72rem;cursor:pointer">Ahora no</button>
          </div>`;
        document.body.appendChild(toastEl);
        setTimeout(() => { if (toastEl.parentNode) toastEl.remove(); }, 20000);
      }
    }, 3000);
  }
}

// ═══════════════════════════════════════════════
// EXPORTAR CSV
// ═══════════════════════════════════════════════
function exportCSV() {
  const rows = [['Mes','Fecha','Descripción','Tipo','Categoría','Subcategoría','Método','Monto USD','Monto Bs']];
  activeMonths.forEach(m => {
    (EXCEL_DATA[m]?.transactions||[]).forEach(t => {
      rows.push([m, t.date, `"${t.desc}"`, t.tipo, t.cat, t.subcat||'', t.method||'', t.amount.toFixed(2), (t.amountBs||0).toFixed(2)]);
    });
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `finanzas_${currentMonth}_2026.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('📥 CSV exportado ✅', 'ok');
}

// ═══════════════════════════════════════════════
// NAV BAR DRAG CON CONFIRMACIÓN (Sortable)
// ═══════════════════════════════════════════════
function initNavSortable() {
  if (typeof Sortable === 'undefined') { setTimeout(initNavSortable, 800); return; }
  const nav = document.getElementById('pwa-nav');
  if (!nav) return;
  let pendingOrder = null;
  Sortable.create(nav, {
    animation: 150,
    delay: 300,
    delayOnTouchOnly: true,
    filter: '#nav-nuevo',
    onEnd: async function(evt) {
      if (evt.oldIndex === evt.newIndex) return;
      const newOrder = [...nav.querySelectorAll('.pwa-nav-btn')]
        .filter(b => b.id && b.id !== 'nav-nuevo')
        .map(b => b.id);
      const ok = await showConfirm('✏️ Cambiar barra de navegación', '¿Guardar este nuevo orden de botones en tu perfil?', '✏️');
      if (ok) {
        CONFIG.navOrder = newOrder;
        sbSaveConfig();
        toast('✅ Barra guardada', 'ok');
      } else {
        // Revertir — rebuild from saved order
        buildNavBar();
      }
    }
  });
}
// ══════════════════════════════════════════════════════════
// NUEVAS FEATURES — v14
// ══════════════════════════════════════════════════════════

// ── TASA PARALELA ─────────────────────────────────────────

// ── OCR DE RECIBOS — Groq Vision ──────────────────────────
async function openOCRCamera() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast('📷 Analizando recibo...', 'ok');
    try {
      const base64 = await new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.readAsDataURL(file);
      });
      const cats = CONFIG.categorias.join(', ');
      const subcats = Object.entries(CONFIG.subcategorias).map(([c,s])=>`${c}: ${s.join(',')}`).join(' | ');
      const methods = CONFIG.tipos.metodos ? CONFIG.tipos.metodos.join(', ') : 'Pago móvil, Transferencia, Efectivo en dólares, Efectivo en bolívares';
      const prompt = `Analiza este recibo/ticket. Extrae los datos y responde SOLO con JSON válido:
{"desc":"nombre del comercio o gasto","amount":monto_en_dolares_o_null,"amountBs":monto_en_bolivares_o_null,"date":"YYYY-MM-DD o null","tipo":"Gasto","cat":"la más apropiada de: ${cats}","subcat":"subcategoría apropiada de: ${subcats}","method":"el más apropiado de: ${methods}","confianza":0.0_a_1.0}
Si el monto está en bolívares usa amountBs y deja amount en null. Usa la fecha de hoy si no está en el recibo.`;
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getGroqKey() },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          max_tokens: 400,
          messages: [{ role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } }
          ]}]
        })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      const clean = text.replace(/```json|```/g,'').trim();
      const parsed = JSON.parse(clean);
      // Llenar formulario
      if (parsed.desc) document.getElementById('f-desc').value = parsed.desc;
      if (parsed.tipo) document.getElementById('f-tipo').value = parsed.tipo;
      if (parsed.date) document.getElementById('f-date').value = parsed.date;
      // Monto: si viene en Bs lo ponemos en el campo Bs
      if (parsed.amountBs && !parsed.amount) {
        const bsInput = document.getElementById('f-amount-bs');
        if (bsInput) { bsInput.value = parsed.amountBs; document.querySelector('[data-currency="BS"]')?.click(); }
      } else if (parsed.amount) {
        const usdInput = document.getElementById('f-amount-usd') || document.querySelector('#f-amount-usd');
        if (usdInput) usdInput.value = parsed.amount;
      }
      // Categoría
      if (parsed.cat) {
        const catSel = document.getElementById('f-cat');
        [...catSel.options].forEach(o => { if(o.value === parsed.cat) catSel.value = parsed.cat; });
        onCatChange();
      }
      if (parsed.subcat) {
        setTimeout(() => {
          const subcatSel = document.getElementById('f-subcat');
          [...(subcatSel?.options||[])].forEach(o => { if(o.value===parsed.subcat) subcatSel.value=parsed.subcat; });
        }, 200);
      }
      if (parsed.method) {
        const mSel = document.getElementById('f-method');
        [...(mSel?.options||[])].forEach(o => { if(o.value===parsed.method) mSel.value=parsed.method; });
      }
      const conf = parsed.confianza || 0;
      const confColor = conf >= 0.85 ? '#3fb950' : conf >= 0.6 ? '#e3b341' : '#f85149';
      toast(`📷 Recibo analizado — Confianza: <span style="color:${confColor}">${Math.round(conf*100)}%</span>`, 'ok');
    } catch(err) {
      console.error('OCR error:', err);
      toast('⚠️ No se pudo analizar el recibo. Intenta con mejor iluminación.', 'err');
    }
  };
  input.click();
}

// ── AUTO CATEGORIZACIÓN AL ESCRIBIR ───────────────────────
// FIX-AUTOCAT-FULL: referencia directa al objeto, sin string escaping,
// timing escalonado correcto, sin memory leak en event listener
let _autocatBest  = null;
let _autocatTimer = 0;

function autoCategorizarDesc(val) {
  clearTimeout(_autocatTimer);
  const hint = document.getElementById('autocateg-hint');
  if (!hint || val.length < 3) {
    if (hint) hint.style.display = 'none';
    _autocatBest = null;
    return;
  }
  _autocatTimer = setTimeout(() => {
    const allTxns = Object.values(EXCEL_DATA).flatMap(d => d.transactions || []);
    const lower   = val.toLowerCase();
    const matches = allTxns.filter(t =>
      t.desc && (
        t.desc.toLowerCase().includes(lower) ||
        lower.includes((t.desc.toLowerCase()).slice(0, 5))
      )
    );
    if (!matches.length) { hint.style.display = 'none'; _autocatBest = null; return; }

    // Contar frecuencia por combinación única tipo+cat+subcat+method
    const freq = {};
    matches.forEach(t => {
      const key = (t.tipo||'')+'|||'+(t.cat||'')+'|||'+(t.subcat||'')+'|||'+(t.method||'');
      if (!freq[key]) freq[key] = { count: 0, t };
      freq[key].count++;
      freq[key].t = t;
    });
    const best = Object.values(freq).sort((a,b) => b.count - a.count)[0]?.t;
    if (!best) { hint.style.display = 'none'; _autocatBest = null; return; }

    _autocatBest = best; // referencia directa — sin encoding

    // Display con emoji si existe en CONFIG.catEmojis
    const emoji     = CONFIG?.catEmojis?.[best.cat] || '';
    const catDisp   = emoji ? emoji + ' ' + escHtml(best.cat || '') : escHtml(best.cat || '—');
    const subcatStr = best.subcat ? ' › ' + escHtml(best.subcat) : '';
    const methStr   = best.method ? ' · ' + escHtml(best.method) : '';
    const countStr  = freq[Object.keys(freq)[0]]?.count > 1
      ? ' <span style="color:#484f58;font-size:.62rem">('+freq[Object.keys(freq).sort((a,b)=>freq[b].count-freq[a].count)[0]].count+'x)</span>'
      : '';

    hint.style.display = 'block';
    // Recrear innerHTML limpia para evitar listener duplicado
    hint.innerHTML =
      '<span style="font-size:.72rem;color:#8b949e">💡 ' +
      '<b style="color:#e6edf3">' + escHtml(best.tipo||'') + '</b> · ' +
      catDisp + subcatStr + methStr + countStr + '</span>' +
      '<button id="autocat-apply-btn" style="margin-left:8px;background:#238636;color:#fff;' +
      'border:none;border-radius:4px;padding:2px 10px;font-size:.68rem;cursor:pointer;' +
      'font-family:inherit;font-weight:700">✓ Aplicar</button>';

    // Asignar onclick directamente al nuevo botón — sin acumulación de listeners
    const btn = document.getElementById('autocat-apply-btn');
    if (btn) btn.onclick = () => aplicarAutoCateg();
  }, 380);
}

function aplicarAutoCateg() {
  const best = _autocatBest;
  if (!best) return;
  _autocatBest = null;

  const hint = document.getElementById('autocateg-hint');
  if (hint) hint.style.display = 'none';

  // PASO 1: aplicar tipo → dispara onTipoChange que reconstruye cats
  const tipoEl = document.getElementById('f-tipo');
  if (tipoEl && best.tipo) {
    tipoEl.value = best.tipo;
    if (typeof onTipoChange === 'function') onTipoChange();
  }

  // PASO 2: aplicar categoría — esperar que onTipoChange construya options
  setTimeout(() => {
    if (best.cat) {
      const catSel = document.getElementById('f-cat');
      if (catSel && catSel.options.length > 0) {
        // Estrategia: value exacto → nombre limpio → match parcial
        const cleanCat = (best.cat || '').replace(/^[^\w\s]\s*/, '').trim();
        let matched = Array.from(catSel.options).find(o =>
          o.value === best.cat ||
          o.value === cleanCat ||
          (o.dataset.original && (
            o.dataset.original === best.cat ||
            o.dataset.original === cleanCat
          ))
        );
        if (!matched) {
          matched = Array.from(catSel.options).find(o =>
            o.value.toLowerCase().includes(cleanCat.toLowerCase()) ||
            cleanCat.toLowerCase().includes(o.value.toLowerCase())
          );
        }
        if (matched) catSel.value = matched.value;
        if (typeof onCatChange === 'function') onCatChange();
      }
    }

    // PASO 3: método de pago — ya disponible, no depende de onCatChange
    if (best.method) {
      const mthEl = document.getElementById('f-method');
      if (mthEl) {
        // Buscar por value exacto o match parcial
        const matchMth = Array.from(mthEl.options).find(o =>
          o.value === best.method || o.value.toLowerCase().includes((best.method||'').toLowerCase())
        );
        if (matchMth) mthEl.value = matchMth.value;
        else mthEl.value = best.method;
      }
    }

    // PASO 4: subcategoría — esperar que onCatChange construya options
    setTimeout(() => {
      if (best.subcat) {
        const subEl = document.getElementById('f-subcat');
        if (subEl && subEl.options.length > 0) {
          const matchSub = Array.from(subEl.options).find(o =>
            o.value === best.subcat ||
            o.value.toLowerCase() === (best.subcat||'').toLowerCase() ||
            o.value.includes(best.subcat)
          );
          if (matchSub) subEl.value = matchSub.value;
        }
      }
      // Toast al final — cuando todos los campos ya están aplicados
      if (typeof toast === 'function') toast('✅ Categoría aplicada', 'ok');
      if (typeof haptic === 'function') haptic('light');
    }, 120);

  }, 100);
}


// Transferencia Interna handled in main onTipoChange

// ── PDF EXPORT ────────────────────────────────────────────
async function exportPDF() {
  const btn = document.getElementById('btn-pdf-report');
  if(btn) { btn.innerHTML = '⏳ Generando...'; btn.disabled = true; }
  try {
    // Esperar jsPDF si aún no cargó
    if (typeof window.jspdf === 'undefined') {
      await new Promise((res,rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const d = EXCEL_DATA[currentMonth] || {};
    const txns = d.transactions || [];
    const pageW = 210; const margin = 14;
    // Header
    doc.setFillColor(13,17,23); doc.rect(0,0,pageW,40,'F');
    doc.setTextColor(230,237,243); doc.setFontSize(18); doc.setFont('helvetica','bold');
    doc.text('Finanzas Anthony & Isabel', margin, 16);
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text(`Informe ${currentMonth} 2026`, margin, 25);
    doc.setFontSize(8); doc.setTextColor(139,148,158);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-VE')}  ·  BCV: ${rateBCV} Bs/$`, margin, 33);
    // KPIs
    let y = 50;
    const kpis = [
      ['Ingresos', fmt(d.ingresos||0), [63,185,80]],
      ['Gastos',   fmt(d.gastos||0),   [248,81,73]],
      ['Ahorros',  fmt(d.ahorros||0),  [88,166,255]],
      ['Balance',  fmt(d.balance||0),  (d.balance||0)>=0?[63,185,80]:[248,81,73]],
    ];
    kpis.forEach((k, i) => {
      const x = margin + i * 46;
      doc.setFillColor(22,27,34); doc.roundedRect(x, y, 43, 18, 2, 2, 'F');
      doc.setTextColor(139,148,158); doc.setFontSize(7); doc.text(k[0], x+3, y+6);
      doc.setTextColor(...k[2]); doc.setFontSize(10); doc.setFont('helvetica','bold');
      doc.text(k[1], x+3, y+14);
    });
    y += 26;
    // Gastos por categoría
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(230,237,243);
    doc.text('Gastos por Categoría', margin, y); y += 6;
    const catEntries = Object.entries(d.cat_totals || {}).sort((a,b)=>b[1]-a[1]).slice(0,8);
    catEntries.forEach(([cat, val]) => {
      const pct = d.gastos > 0 ? val/d.gastos : 0;
      const barW = Math.max(2, pct * 100);
      doc.setFillColor(22,27,34); doc.rect(margin, y, 180, 7, 'F');
      doc.setFillColor(248,81,73); doc.rect(margin, y, barW, 7, 'F');
      doc.setTextColor(230,237,243); doc.setFontSize(7); doc.setFont('helvetica','normal');
      const cleanCat = cat.replace(/[^\w\s$.,€]/g,'').trim();
      doc.text(`${cleanCat}`, margin+2, y+5);
      doc.text(fmt(val), margin+140, y+5);
      y += 9;
      if (y > 260) { doc.addPage(); y = 20; }
    });
    y += 4;
    // Transacciones
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(230,237,243);
    doc.text('Movimientos del Mes', margin, y); y += 7;
    // Cabecera tabla
    doc.setFillColor(22,27,34); doc.rect(margin, y-5, 182, 7, 'F');
    doc.setTextColor(139,148,158); doc.setFontSize(7);
    doc.text('Fecha', margin+1, y); doc.text('Descripción', margin+18, y);
    doc.text('Tipo', margin+90, y); doc.text('Monto', margin+155, y); y += 4;
    doc.setDrawColor(48,54,61); doc.line(margin, y, pageW-margin, y); y += 3;
    txns.forEach(t => {
      if (y > 270) { doc.addPage(); y = 20; }
      const isGasto = t.tipo === 'Gasto';
      doc.setTextColor(isGasto ? 248 : 63, isGasto ? 81 : 185, isGasto ? 73 : 80);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text(t.date?.slice(5)||'', margin+1, y);
      const descShort = (t.desc||'').substring(0,38);
      doc.setTextColor(200,209,217); doc.text(descShort, margin+18, y);
      doc.setTextColor(139,148,158); doc.text((t.tipo||'').substring(0,14), margin+90, y);
      const amtColor = isGasto ? [248,81,73] : [63,185,80];
      doc.setTextColor(...amtColor); doc.text(fmt(t.amount), margin+155, y);
      y += 6;
    });
    // Pie de página
    const totalPages = doc.internal.getNumberOfPages();
    for(let i=1;i<=totalPages;i++){
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(72,79,88);
      doc.text(`Finanzas 2026 · Página ${i} de ${totalPages}`, margin, 290);
    }
    doc.save(`Finanzas_${currentMonth}_2026.pdf`);
    toast('📄 PDF generado ✅', 'ok');
  } catch(err) {
    console.error('PDF error:', err);
    toast('⚠️ Error generando PDF', 'err');
  } finally {
    if(btn) { btn.innerHTML = '📄 Descargar PDF'; btn.disabled = false; }
  }
}

// ── PREDICCIÓN SEMANAL ────────────────────────────────────
function calcPrediccionSemanal() {
  const allTxns = Object.values(EXCEL_DATA).flatMap(d => d.transactions || []);
  const gastos = allTxns.filter(t => t.tipo === 'Gasto');
  if (gastos.length < 5) return null;
  // Promedio por día de semana
  const porDia = [0,0,0,0,0,0,0]; const cuentaDia = [0,0,0,0,0,0,0];
  gastos.forEach(t => {
    const dow = new Date(t.date).getDay();
    porDia[dow] += t.amount; cuentaDia[dow]++;
  });
  const promDia = porDia.map((total,i) => cuentaDia[i] > 0 ? total/cuentaDia[i] : 0);
  const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const diaMaxIdx = promDia.indexOf(Math.max(...promDia));
  // Proyección semana actual
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  let proyeccionSemana = 0;
  for(let i=0; i<7; i++) proyeccionSemana += promDia[i];
  // Gasto semana actual
  const inicioSemana = new Date(hoy); inicioSemana.setDate(hoy.getDate()-diaSemana);
  const txnsEstaSemana = (EXCEL_DATA[currentMonth]?.transactions||[]).filter(t => {
    const d = new Date(t.date); return d >= inicioSemana && t.tipo === 'Gasto';
  });
  const gastoActualSemana = txnsEstaSemana.reduce((s,t)=>s+t.amount,0);
  return { promDia, dias, diaMaxIdx, proyeccionSemana, gastoActualSemana, diaSemana };
}

function renderPrediccionSemanal(container) {
  if (!container) return; // Fix 8: guard against null container
  const data = calcPrediccionSemanal();
  if (!data) { container.innerHTML = '<p style="color:#484f58;font-size:.75rem;text-align:center">Necesitas más historial para predicciones</p>'; return; }
  const { promDia, dias, diaMaxIdx, proyeccionSemana, gastoActualSemana, diaSemana } = data;
  const maxVal = Math.max(...promDia);
  const pct = proyeccionSemana > 0 ? Math.min(100, gastoActualSemana/proyeccionSemana*100) : 0;
  const pctColor = pct < 60 ? '#3fb950' : pct < 85 ? '#e3b341' : '#f85149';
  container.innerHTML = `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:.72rem;color:#8b949e;margin-bottom:4px">
        <span>Esta semana: <b style="color:#e6edf3">${fmt(gastoActualSemana)}</b></span>
        <span>Proyectado: <b style="color:#e6edf3">${fmt(proyeccionSemana)}</b></span>
      </div>
      <div style="height:8px;background:#21262d;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:4px;transition:width .6s"></div>
      </div>
      <div style="font-size:.62rem;color:${pctColor};margin-top:3px">${pct.toFixed(0)}% de la semana proyectada</div>
    </div>
    <div style="display:flex;gap:4px;align-items:flex-end;height:52px;margin-bottom:6px">
      ${dias.map((d,i) => {
        const h = maxVal > 0 ? Math.round(promDia[i]/maxVal*44) : 0;
        const isToday = i === diaSemana;
        const isMax = i === diaMaxIdx;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="width:100%;height:${h}px;background:${isMax?'#f85149':isToday?'#58a6ff':'#30363d'};border-radius:3px 3px 0 0;min-height:2px"></div>
          <span style="font-size:.55rem;color:${isToday?'#58a6ff':isMax?'#f85149':'#484f58'}">${d}</span>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:.68rem;color:#8b949e">📊 Día más caro: <b style="color:#f85149">${dias[diaMaxIdx]}</b> (${fmt(promDia[diaMaxIdx])} promedio)</div>`;
}

// ── SCORE DE DISCIPLINA ───────────────────────────────────
function calcScoreDisciplina() {
  const scores = {};
  if (!CONFIG.presupuestos) return scores;
  Object.entries(CONFIG.presupuestos).forEach(([cat, budget]) => {
    if (!budget || cat === 'ingresos' || cat === 'gastos') return;
    const gastoCat = EXCEL_DATA[currentMonth]?.cat_totals?.[cat] || 0;
    const ratio = gastoCat / budget;
    const score = Math.max(0, Math.round((1 - Math.max(0, ratio-1)) * 100));
    scores[cat] = { gastoCat, budget, ratio, score };
  });
  return scores;
}

function renderScoreDisciplina(container) {
  if (!container) return; // Fix 8: guard against null container
  const scores = calcScoreDisciplina() || {};
  const entries = Object.entries(scores).sort((a,b) => a[1].score - b[1].score);
  if (entries.length === 0) { container.innerHTML = '<p style="color:#484f58;font-size:.75rem">Configura presupuestos en Ajustes</p>'; return; }
  container.innerHTML = entries.map(([cat, s]) => {
    const color = s.score >= 85 ? '#3fb950' : s.score >= 60 ? '#e3b341' : '#f85149';
    const cleanCat = cat.replace(/[\u{1F000}-\u{1FFFF}]/gu,'').trim();
    return `<div class="score-bar-wrap">
      <div class="score-bar-label"><span>${cleanCat}</span><span style="color:${color}">${s.score}pts · ${fmt(s.gastoCat)}/${fmt(s.budget)}</span></div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.min(100,s.ratio*100)}%;background:${color}"></div></div>
    </div>`;
  }).join('');
}

// ── SIMULADOR DE ESCENARIOS ───────────────────────────────
function calcEscenario(catName, reduccionPct) {
  const d = EXCEL_DATA[currentMonth];
  const gastoCat = d?.cat_totals?.[catName] || 0;
  const reduccion = gastoCat * (reduccionPct/100);
  const nuevoGasto = (d?.gastos||0) - reduccion;
  const nuevoBalance = (d?.ingresos||0) - nuevoGasto + (d?.ajustes||0);
  const extraAhorro = reduccion;
  const proyeccionAnual = extraAhorro * 12;
  return { reduccion, nuevoGasto, nuevoBalance, extraAhorro, proyeccionAnual };
}

// ── MEJOR / PEOR MES ──────────────────────────────────────
function getMejorPeorMes() {
  const meses = activeMonths.filter(m => EXCEL_DATA[m]?.ingresos > 0);
  if (meses.length < 2) return null;
  const scores = meses.map(m => {
    const d = EXCEL_DATA[m];
    const ratio = d.ingresos > 0 ? (d.balance + d.ahorros) / d.ingresos : 0;
    return { mes: m, ratio, balance: d.balance, ahorro: d.ahorros, ingresos: d.ingresos, gastos: d.gastos };
  });
  const mejor = scores.reduce((a,b) => a.ratio > b.ratio ? a : b);
  const peor  = scores.reduce((a,b) => a.ratio < b.ratio ? a : b);
  return { mejor, peor };
}

// ── ANÁLISIS EFECTIVO VS DIGITAL ─────────────────────────
function calcEfectivoVsDigital() {
  // Batch-XX: solo gastos, incluye todos los métodos de efectivo venezolanos
  const txns = (EXCEL_DATA[currentMonth]?.transactions||[]).filter(t=>t.tipo==='Gasto');
  const esEfectivo = m => {
    if (!m) return false;
    const s = m.toLowerCase();
    return s.includes('efectivo') || s.includes('cash') || s === 'bs efectivo' || s === 'efectivo bs';
  };
  const efectivo = txns.filter(t=>esEfectivo(t.method)).reduce((s,t)=>s+t.amount,0);
  const digital  = txns.filter(t=>!esEfectivo(t.method)).reduce((s,t)=>s+t.amount,0);
  const total    = efectivo + digital;
  return { efectivo, digital, total,
    pctEfectivo: total>0 ? efectivo/total*100 : 0,
    pctDigital:  total>0 ? digital/total*100  : 0
  };
}

// ── COMPARATIVA MES ANTERIOR ──────────────────────────────
function getComparativaMesAnterior() {
  const idx = activeMonths.indexOf(currentMonth);
  if (idx <= 0) return null;
  const mesAnterior = activeMonths[idx-1];
  const curr = EXCEL_DATA[currentMonth] || {};
  const prev = EXCEL_DATA[mesAnterior] || {};
  const cats = [...new Set([
    ...Object.keys(curr.cat_totals||{}),
    ...Object.keys(prev.cat_totals||{})
  ])];
  return {
    mesAnterior,
    cats: cats.map(c => ({
      cat: c,
      curr: curr.cat_totals?.[c] || 0,
      prev: prev.cat_totals?.[c] || 0,
      diff: (curr.cat_totals?.[c]||0) - (prev.cat_totals?.[c]||0)
    })).sort((a,b) => Math.abs(b.diff)-Math.abs(a.diff)).slice(0,8),
    totalIngresos: { curr: curr.ingresos||0, prev: prev.ingresos||0 },
    totalGastos:   { curr: curr.gastos||0,   prev: prev.gastos||0   },
    totalAhorros:  { curr: curr.ahorros||0,  prev: prev.ahorros||0  }
  };
}

// ── INVENTARIO COCHINITO ──────────────────────────────────
let _cochinitoData = null;
function loadCochinitoData() {
  try { _cochinitoData = JSON.parse(localStorage.getItem('finanzas_cochinito_v2') || 'null'); } catch(e) {}
  if (!_cochinitoData) _cochinitoData = { items: [], total: 0 };
  return _cochinitoData;
}
function saveCochinitoData() {
  try { localStorage.setItem('finanzas_cochinito_v2', JSON.stringify(_cochinitoData)); } catch(e) {}
}

// ── DEUDAS ACTIVAS — Batch-XX: Supabase ──────────────────
let _deudasData = null;
function loadDeudasData() {
  // Fuente de verdad: window._deudasData (escrito por app-core.js al cargar desde Supabase)
  if (!window._deudasData) window._deudasData = { deudas: [] };
  // Fallback: si Supabase no cargó datos, restaurar desde localStorage backup
  if (window._deudasData.deudas.length === 0 && !window._dfLoadedFromSupabase) {
    try {
      const bk = localStorage.getItem('fin_deudas_bk');
      if (bk) {
        const parsed = JSON.parse(bk);
        if (Array.isArray(parsed) && parsed.length > 0) {
          window._deudasData.deudas = parsed;
          console.log('[loadDeudasData] restauradas desde localStorage:', parsed.length);
        }
      }
    } catch(_) {}
  }
  return window._deudasData;
}
async function saveDeudasData() {
  // FIX: usar currentUser.id (auth.uid()) para cumplir con RLS de Supabase.
  // HOUSEHOLD_ID puede ser distinto a auth.uid() → violación de política silenciosa.
  if (!window._deudasData) return;
  // ── Capa 1: localStorage backup inmediato (sin red) ──
  try { localStorage.setItem('fin_deudas_bk', JSON.stringify(window._deudasData.deudas)); } catch(_) {}
  // ── Capa 2: Supabase ──
  if (!sb || !currentUser) return;
  const uid = currentUser.id; // siempre auth.uid() para RLS
  const hid = HOUSEHOLD_ID || uid;
  let allOk = true;
  try {
    for (const d of window._deudasData.deudas) {
      if (!d.id) d.id = 'deu_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
      const { error: dErr } = await sb.from('dinero_fuera').upsert({
        id: d.id,
        user_id: uid,          // auth.uid() — cumple RLS
        household_id: hid,     // FIX-DEU-1: NOT NULL requerido por schema (igual que préstamos)
        tipo: 'deuda',
        nombre: d.acreedor || '',
        concepto: d.concepto || '',
        monto_original: parseFloat(d.montoOriginal || d.saldo || 0),
        monto_abonado:  parseFloat(d.montoAbonado || 0),
        abonos:         d.abonos || [],
        fecha_inicio:   d.fecha || new Date().toISOString().slice(0,10),
        fecha_vencimiento: d.fechaVencimiento || null,
        pagado:         d.pagada || false,
        fecha_pago:     d.fechaPago || null,
        updated_at:     new Date().toISOString()
      }, { onConflict: 'id' });
      if (dErr) {
        console.error('[saveDeudasData] upsert error:', dErr.message, dErr.code);
        allOk = false;
        toast('⚠️ Error sincronizando deuda: ' + dErr.message.slice(0,50), 'err');
      }
    }
    if (allOk) console.log('[saveDeudasData] ✅ guardadas:', window._deudasData.deudas.length);
  } catch(e) {
    console.warn('[saveDeudasData] exception:', e.message);
    toast('⚠️ Sin conexión — deuda guardada localmente', 'warn');
  }
}

// ── PRÉSTAMOS A TERCEROS — Batch-XX: Supabase ─────────────
let _prestamosData = null;
function loadPrestamosData() {
  if (!window._prestamosData) window._prestamosData = { prestamos: [] };
  // Fallback: si Supabase no cargó datos, restaurar desde localStorage backup
  if (window._prestamosData.prestamos.length === 0 && !window._dfLoadedFromSupabase) {
    try {
      const bk = localStorage.getItem('fin_prestamos_bk');
      if (bk) {
        const parsed = JSON.parse(bk);
        if (Array.isArray(parsed) && parsed.length > 0) {
          window._prestamosData.prestamos = parsed;
          console.log('[loadPrestamosData] restaurados desde localStorage:', parsed.length);
        }
      }
    } catch(_) {}
  }
  return window._prestamosData;
}
async function savePrestamosData() {
  if (!window._prestamosData) return;
  // ── Capa 1: localStorage backup inmediato ──
  try { localStorage.setItem('fin_prestamos_bk', JSON.stringify(window._prestamosData.prestamos)); } catch(_) {}
  // ── Capa 2: Supabase ──
  if (!sb || !currentUser) return;
  const uid = currentUser.id; // siempre auth.uid() para RLS
  const hid = HOUSEHOLD_ID || uid; // FIX-PREST: household_id es NOT NULL en schema
  let allOk = true;
  try {
    for (const p of window._prestamosData.prestamos) {
      if (!p.id) p.id = 'pre_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
      const { error: pErr } = await sb.from('dinero_fuera').upsert({
        id: p.id,
        user_id: uid,          // auth.uid() — cumple RLS
        household_id: hid,     // FIX-PREST: NOT NULL requerido por schema
        tipo: 'prestamo',
        nombre: p.deudor || '',
        concepto: p.concepto || '',
        monto_original: parseFloat(p.montoOriginal || p.monto || 0),
        monto_abonado:  parseFloat(p.montoAbonado || 0),
        abonos:         p.abonos || [],
        fecha_inicio:   p.fecha || new Date().toISOString().slice(0,10),
        fecha_vencimiento: p.fechaVencimiento || null,
        pagado:         p.cobrado || false,
        fecha_pago:     p.fechaCobro || null,
        updated_at:     new Date().toISOString()
      }, { onConflict: 'id' });
      if (pErr) {
        console.error('[savePrestamosData] upsert error:', pErr.message, pErr.code);
        allOk = false;
        toast('⚠️ Error sincronizando préstamo: ' + pErr.message.slice(0,50), 'err');
      }
    }
    if (allOk) {
      window._dfLoadedFromSupabase = true;
      console.log('[savePrestamosData] ✅ guardados:', window._prestamosData.prestamos.length);
    }
  } catch(e) {
    console.warn('[savePrestamosData] exception:', e.message);
    toast('⚠️ Sin conexión — préstamo guardado localmente', 'warn');
  }
}

// ── MODAL DINERO FUERA (Cochinito + Deudas + Préstamos) ───
function openDineroFuera() {
  const coch = loadCochinitoData();
  const deud = loadDeudasData();
  const pres = loadPrestamosData();
  // Cochinito: Excel savings (all months) + manual extra items
  let excelAhorro = 0;
  activeMonths.forEach(m => { excelAhorro += (EXCEL_DATA[m]?.ahorros||0); });
  const manualCoch = coch.items.filter(i=>i.tipo!=='gasto').reduce((s,i)=>s+i.monto,0);
  const gastosCoch = coch.items.filter(i=>i.tipo==='gasto').reduce((s,i)=>s+i.monto,0);
  const totalCoch = excelAhorro + manualCoch - gastosCoch;
  const totalDeud = deud.deudas.filter(d=>!d.pagada).reduce((s,d)=>s+d.saldo,0);
  const totalPres = pres.prestamos.filter(p=>!p.cobrado).reduce((s,p)=>s+p.monto,0);
  // Deudas pagadas (history)
  const deudasPagadas = deud.deudas.filter(d=>d.pagada);
  const prestamosCobrados = pres.prestamos.filter(p=>p.cobrado);
  const overlay = document.createElement('div');
  overlay.id = 'dinero-fuera-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:10200;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = e => { if(e.target===overlay) { unlockScroll(); overlay.remove(); } };
  lockScroll();
  overlay.innerHTML = `
  <div style="background:var(--glass-surface,rgba(13,17,23,0.92));backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border:1px solid var(--glass-border,rgba(48,54,61,.7));border-radius:18px;padding:0;width:500px;max-width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.6)">
    <div style="padding:16px 20px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#161b22;z-index:1">
      <h3 style="color:#e6edf3;font-size:.95rem">💰 Dinero fuera de la app</h3>
      <button onclick="unlockScroll();document.getElementById('dinero-fuera-overlay').remove()" style="background:none;border:none;color:#8b949e;font-size:1.1rem;cursor:pointer">✕</button>
    </div>

    <!-- COCHINITO -->
    <div style="padding:16px 20px;border-bottom:1px solid #21262d">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:.85rem;color:#e6edf3;font-weight:600">🐷 Cochinito (Ahorro Físico)</span>
        <div style="text-align:right">
          <div style="font-size:.9rem;font-weight:700;color:#3fb950">${fmt(EXCEL_DATA[currentMonth]?.ahorros||0)}</div>
          <div style="font-size:.6rem;color:#484f58">este mes</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;background:#0d2137;border-radius:8px;padding:8px 12px">
        <span style="font-size:.75rem;color:#8b949e">💰 Total acumulado todos los meses</span>
        <span style="font-size:.88rem;font-weight:700;color:#3fb950">${fmt(totalCoch)}</span>
      </div>
      <p style="font-size:.67rem;color:#484f58;margin:0 0 10px">💡 Los movimientos tipo <b>Ahorro en efectivo</b> van aquí automáticamente. No afectan el balance mensual ni los gastos — son dinero físico separado.</p>
      <div style="background:#0d1117;border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:.72rem">
        <div style="display:flex;justify-content:space-between;color:#8b949e"><span>📊 Registrado en Excel (${activeMonths.join(", ")})</span><span style="color:#3fb950">+${fmt(excelAhorro)}</span></div>
        ${manualCoch>0?`<div style="display:flex;justify-content:space-between;color:#8b949e;margin-top:3px"><span>💵 Efectivo extra registrado</span><span style="color:#3fb950">+${fmt(manualCoch)}</span></div>`:""}
        ${gastosCoch>0?`<div style="display:flex;justify-content:space-between;color:#8b949e;margin-top:3px"><span>💸 Gastos del cochinito</span><span style="color:#f85149">-${fmt(gastosCoch)}</span></div>`:""}
      </div>
      <div id="cochinito-list">${renderCochinitoList(coch)}</div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="dinero-add-btn" style="flex:1" onclick="addAhorroCochinito()">➕ Agregar efectivo</button>
        <button class="dinero-add-btn" style="flex:1;border-color:#f85149;color:#f85149" onclick="gastarAhorroCochinito()">💸 Registrar gasto</button>
      </div>
    </div>

    <!-- FONDO DE EMERGENCIA -->
    ${(()=>{
      const efManual = CONFIG.efManualBase  || 0;
      const efAuto   = CONFIG.efAutoContrib || 0;
      const efTotal  = efManual + efAuto;
      const efGoal   = CONFIG.emergencyFundGoal || 3000;
      const pct      = Math.min(100, (efTotal/efGoal)*100).toFixed(1);
      const ingMes   = (EXCEL_DATA[currentMonth]?.transactions||[]).filter(t=>['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)).reduce((s,t)=>s+t.amount,0);
      return `<div style="padding:16px 20px;border-bottom:1px solid #21262d">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:.85rem;color:#e6edf3;font-weight:600">🆘 Fondo de Emergencia</span>
          <div style="text-align:right">
            <div style="font-size:.9rem;font-weight:700;color:#f0a83a">${fmt(efTotal)}</div>
            <div style="font-size:.6rem;color:#484f58">${pct}% de meta</div>
          </div>
        </div>
        <div style="background:#13181f;border-radius:6px;overflow:hidden;margin-bottom:6px;height:6px">
          <div style="height:100%;background:linear-gradient(90deg,#f0a83a,#e67e22);width:${pct}%;transition:.5s"></div>
        </div>
        <div style="font-size:.62rem;color:#484f58;margin-bottom:8px">
          ${pct}% de meta ${fmt(efGoal)}
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <div style="flex:1;background:#13181f;border-radius:6px;padding:7px 10px;text-align:center">
            <div style="font-size:.6rem;color:#484f58">Base manual</div>
            <div style="font-size:.8rem;font-weight:700;color:#f0a83a">${fmt(efManual)}</div>
          </div>
          <div style="flex:1;background:#13181f;border-radius:6px;padding:7px 10px;text-align:center">
            <div style="font-size:.6rem;color:#484f58">Auto 30%</div>
            <div style="font-size:.8rem;font-weight:700;color:#e3b341">${fmt(efAuto)}</div>
          </div>
          <div style="flex:1;background:#13181f;border-radius:6px;padding:7px 10px;text-align:center">
            <div style="font-size:.6rem;color:#484f58">Faltante</div>
            <div style="font-size:.8rem;font-weight:700;color:#8b949e">${fmt(Math.max(0,efGoal-efTotal))}</div>
          </div>
        </div>
        <div style="background:#1a160d;border-radius:8px;padding:10px 12px;margin-bottom:10px">
          <div style="font-size:.7rem;color:#8b949e;margin-bottom:6px">✏️ Ajustar base manual del fondo</div>
          <div style="display:flex;gap:8px;align-items:center">
            <span style="color:#f0a83a;font-size:.85rem;font-weight:700">$</span>
            <input id="ef-base-input" type="number" min="0" step="1" value="${efManual.toFixed(2)}"
              style="flex:1;background:#0d1117;border:1px solid #f0a83a;color:#f0a83a;padding:7px 10px;border-radius:7px;font-size:.85rem;outline:none;font-weight:700"
              oninput="updateEFBasePreview(this.value)" placeholder="0.00">
            <button onclick="saveEFBase()" style="background:#f0a83a;border:none;color:#0d1117;padding:7px 14px;border-radius:7px;font-size:.78rem;font-weight:700;cursor:pointer">Guardar</button>
          </div>
          <div id="ef-base-preview" style="font-size:.65rem;color:#8b949e;margin-top:5px">
            Total: ${fmt(efManual)} + ${fmt(efAuto)} auto = ${fmt(efTotal)}
          </div>
        </div>
        <p style="font-size:.65rem;color:#484f58;margin:0">
          💡 La base manual es lo que ya tienes guardado. El 30% automático se acumula con cada ingreso que registres.
        </p>
      </div>`;
    })()}

    <!-- DEUDAS ACTIVAS -->
    <div style="padding:16px 20px;border-bottom:1px solid #21262d">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:.85rem;color:#e6edf3;font-weight:600">💳 Deudas activas (debo yo)</span>
        <span style="font-size:.9rem;font-weight:700;color:#f85149">${totalDeud > 0 ? '-'+fmt(totalDeud) : '$0'}</span>
      </div>
      <p style="font-size:.67rem;color:#484f58;margin:0 0 10px">💡 Las deudas son <b>informativas</b> — no afectan tu balance mensual. Al marcarlas pagadas quedan en el historial.</p>
      <div id="deudas-list">${renderDeudasList(deud)}</div>
      ${deudasPagadas.length ? `
      <details style="margin-top:8px">
        <summary style="font-size:.68rem;color:#484f58;cursor:pointer">📋 Historial pagadas (${deudasPagadas.length})</summary>
        <div style="margin-top:6px">${deudasPagadas.map(d=>`
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #21262d;font-size:.68rem">
            <span style="color:#8b949e">${d.acreedor}${d.concepto?' · '+d.concepto:''}</span>
            <span style="color:#484f58">${fmt(d.saldo)} · <span style="color:#3fb950">✓ ${d.fechaPago||''}</span></span>
          </div>`).join('')}
        </div>
      </details>` : ''}
      <button class="dinero-add-btn" onclick="addDeudaItem()">+ Agregar deuda</button>
    </div>

    <!-- PRÉSTAMOS (me deben) -->
    <div style="padding:16px 20px;border-bottom:1px solid #21262d">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:.85rem;color:#e6edf3;font-weight:600">🤝 Préstamos (me deben)</span>
        <span style="font-size:.9rem;font-weight:700;color:#e3b341">${totalPres > 0 ? '+'+fmt(totalPres) : '$0'}</span>
      </div>
      <p style="font-size:.67rem;color:#484f58;margin:0 0 10px">💡 Los préstamos que hiciste o que te deben. <b>Informativo</b> — no afectan el balance hasta que se registren como Ingreso al cobrar.</p>
      <div id="prestamos-list">${renderPrestamosList(pres)}</div>
      ${prestamosCobrados.length ? `
      <details style="margin-top:8px">
        <summary style="font-size:.68rem;color:#484f58;cursor:pointer">📋 Historial cobrados (${prestamosCobrados.length})</summary>
        <div style="margin-top:6px">${prestamosCobrados.map(p=>`
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #21262d;font-size:.68rem">
            <span style="color:#8b949e">${p.deudor}${p.concepto?' · '+p.concepto:''}</span>
            <span style="color:#484f58">${fmt(p.monto)} · <span style="color:#3fb950">✓ ${p.fechaCobro||''}</span></span>
          </div>`).join('')}
        </div>
      </details>` : ''}
      <button class="dinero-add-btn" onclick="addPrestamoItem()">+ Agregar préstamo</button>
    </div>

    <!-- NETO -->
    <div style="padding:14px 20px;background:#0d1117;border-top:1px solid #30363d;border-radius:0 0 14px 14px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:.78rem;color:#8b949e">Patrimonio real (cochinito + balance − deudas + me deben)</span>
        <span id="patrimonio-real-val" style="font-size:1rem;font-weight:700;color:#bc8cff">${calcPatrimonioReal(totalCoch, totalDeud, totalPres)}</span>
      </div>
    </div>
  </div>`;
  // Remove any existing overlay first
  const prev = document.getElementById('dinero-fuera-overlay');
  if (prev) prev.remove();
  document.body.appendChild(overlay);
}

// gastarCochinito legacy movida arriba como alias
function calcPatrimonioReal(totalCoch, totalDeud, totalPres) {
  // Fórmula: cochinito + balance mes actual - deudas + me deben
  // totalCoch ya incluye excelAhorro (todos los meses) desde openDineroFuera()
  const currentBalance = EXCEL_DATA[currentMonth]?.balance || 0;
  const total = totalCoch + currentBalance + totalPres - totalDeud;
  return fmt(total);
}

function renderCochinitoList(coch) {
  const items = coch.items;
  if (!items.length) return '<p style="color:#484f58;font-size:.72rem;text-align:center;padding:4px">Sin registros manuales</p>';
  return items.map((item,i) => `
    <div class="dinero-item">
      <div><div class="dinero-item-label">${item.tipo==='gasto'?'💸 ':'+'}${item.label}</div><div style="font-size:.62rem;color:#484f58">${item.fecha||''}</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="dinero-item-val" style="color:${item.tipo==='gasto'?'#f85149':'#3fb950'}">${item.tipo==='gasto'?'-':'+'}\${fmt(item.monto)}</span>
        <button onclick="removeCochinitoItem(${i})" style="background:none;border:none;color:#484f58;cursor:pointer;font-size:.8rem">✕</button>
      </div>
    </div>`).join('');
}
function renderDeudasList(deud) {
  const activas = deud.deudas.filter(d=>!d.pagada);
  if (!activas.length) return '<p style="color:#484f58;font-size:.72rem;text-align:center;padding:4px">Sin deudas activas 🎉</p>';
  return activas.map((d,i) => {
    const saldoPend = (d.montoOriginal || d.saldo || 0) - (d.montoAbonado || 0);
    const pctAbonado = d.montoOriginal > 0 ? Math.min(100,(d.montoAbonado||0)/d.montoOriginal*100) : 0;
    const plazoStr = d.fecha && d.fechaVencimiento
      ? `📅 ${d.fecha} → ${d.fechaVencimiento}`
      : d.fecha ? `📅 Desde ${d.fecha}` : '';
    const abonosStr = (d.montoAbonado||0) > 0
      ? `<div style="font-size:.6rem;color:#e3b341">Abonado: ${fmt(d.montoAbonado||0)} · Pendiente: ${fmt(saldoPend)}</div>` : '';
    return `<div class="dinero-item" style="flex-direction:column;align-items:stretch;gap:4px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="dinero-item-label">${d.acreedor}</div>
          <div style="font-size:.62rem;color:#484f58">${d.concepto||''}</div>
          ${plazoStr ? `<div style="font-size:.6rem;color:#484f58">${plazoStr}</div>` : ''}
          ${abonosStr}
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <span class="dinero-item-val" style="color:#f85149">-${fmt(saldoPend)}</span>
        </div>
      </div>
      ${pctAbonado > 0 ? `<div style="background:#21262d;border-radius:4px;height:4px;overflow:hidden"><div style="height:100%;background:#e3b341;width:${pctAbonado.toFixed(1)}%;transition:.4s"></div></div>` : ''}
      <div style="display:flex;gap:5px;margin-top:2px">
        <button onclick="openDebtSimulator('${d.id}')" style="background:none;border:1px solid #1f4068;color:#58a6ff;padding:5px 8px;border-radius:7px;font-size:.65rem;cursor:pointer" title="Simular pago">📊</button>
        <button onclick="editarDeuda('${d.id}')" style="background:#161b22;border:1px solid #58a6ff;color:#58a6ff;border-radius:4px;font-size:.6rem;padding:3px 7px;cursor:pointer">✏️</button>
        <button onclick="abonarDeuda(${i})" style="flex:1;background:#1a1a0d;border:1px solid #e3b341;color:#e3b341;border-radius:4px;font-size:.6rem;padding:3px 5px;cursor:pointer">💰 Abonar</button>
        <button onclick="marcarDeudaPagada(${i})" style="flex:1;background:#1a3626;border:1px solid #3fb950;color:#3fb950;border-radius:4px;font-size:.6rem;padding:3px 5px;cursor:pointer">✓ Pagada</button>
        <button onclick="eliminarDeuda(${i})" style="background:#3d1a1a;border:1px solid #f85149;color:#f85149;border-radius:4px;font-size:.6rem;padding:3px 7px;cursor:pointer">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function renderPrestamosList(pres) {
  const activos = pres.prestamos.filter(p=>!p.cobrado);
  if (!activos.length) return '<p style="color:#484f58;font-size:.72rem;text-align:center;padding:4px">Sin préstamos pendientes</p>';
  return activos.map((p,i) => {
    const saldoPend = (p.montoOriginal || p.monto || 0) - (p.montoAbonado || 0);
    const pctCobrado = (p.montoOriginal||p.monto||0) > 0 ? Math.min(100,(p.montoAbonado||0)/(p.montoOriginal||p.monto)*100) : 0;
    const plazoStr = p.fecha && p.fechaVencimiento
      ? `📅 ${p.fecha} → ${p.fechaVencimiento}`
      : p.fecha ? `📅 Desde ${p.fecha}` : '';
    const cobranzaStr = (p.montoAbonado||0) > 0
      ? `<div style="font-size:.6rem;color:#3fb950">Cobrado: ${fmt(p.montoAbonado||0)} · Pendiente: ${fmt(saldoPend)}</div>` : '';
    return `<div class="dinero-item" style="flex-direction:column;align-items:stretch;gap:4px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="dinero-item-label">${p.deudor}</div>
          <div style="font-size:.62rem;color:#484f58">${p.concepto||''}</div>
          ${plazoStr ? `<div style="font-size:.6rem;color:#484f58">${plazoStr}</div>` : ''}
          ${cobranzaStr}
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <span class="dinero-item-val" style="color:#e3b341">+${fmt(saldoPend)}</span>
        </div>
      </div>
      ${pctCobrado > 0 ? `<div style="background:#21262d;border-radius:4px;height:4px;overflow:hidden"><div style="height:100%;background:#3fb950;width:${pctCobrado.toFixed(1)}%;transition:.4s"></div></div>` : ''}
      <div style="display:flex;gap:5px;margin-top:2px">
        <button onclick="editPrestamoItem(${i})" style="background:#13181f;border:1px solid #30363d;color:#e6edf3;border-radius:4px;font-size:.6rem;padding:3px 7px;cursor:pointer">✏️</button>
        <button onclick="cobrarPrestamo(${i})" style="flex:1;background:#0d2137;border:1px solid #58a6ff;color:#58a6ff;border-radius:4px;font-size:.6rem;padding:3px 5px;cursor:pointer">💵 Cobrar abono</button>
        <button onclick="marcarPrestamoCobrado(${i})" style="flex:1;background:#1a3626;border:1px solid #3fb950;color:#3fb950;border-radius:4px;font-size:.6rem;padding:3px 5px;cursor:pointer">✓ Cobrado</button>
        <button onclick="eliminarPrestamo(${i})" style="background:#3d1a1a;border:1px solid #f85149;color:#f85149;border-radius:4px;font-size:.6rem;padding:3px 7px;cursor:pointer">🗑</button>
      </div>
    </div>`;
  }).join('');
}

// ── COCHINITO: Agregar efectivo → registra como Ahorro en efectivo en el mes actual ──
// ── FONDO DE EMERGENCIA: editar monto base ────────────────
function updateEFBasePreview(val) {
  const base    = parseFloat(val) || 0;
  const auto    = CONFIG.efAutoContrib || 0;
  const total   = base + auto;
  const pct     = Math.min(100, total / (CONFIG.emergencyFundGoal||3000) * 100).toFixed(1);
  const preview = document.getElementById('ef-base-preview');
  if (!preview) return;
  if (auto > 0) {
    preview.textContent = fmt(base) + ' (base) + ' + fmt(auto) + ' (30% acumulado) = ' + fmt(total) + ' · ' + pct + '% de meta';
  } else {
    preview.textContent = 'Al guardar: base = ' + fmt(base) + ' · El 30% empezará desde hoy · ' + pct + '% de meta';
  }
}
async function saveEFBase() {
  const input = document.getElementById('ef-base-input');
  const val = parseFloat(input?.value) || 0;
  if (val < 0) { toast('El monto base no puede ser negativo', 'err'); return; }
  // Batch-XX: solo modifica la base manual — las contribuciones automáticas se preservan
  const ok = await showConfirm('💾 Actualizar Fondo de Emergencia',
    `¿Establecer la base manual en ${fmt(val)}? Las contribuciones automáticas del 30% se sumarán encima.`, '🆘');
  if (!ok) return;
  // FIX-EF-v4: la base manual ABSORBE todo lo anterior.
  // ef_reset_date = hoy → los 30% empiezan a acumularse de cero desde este momento.
  const today = new Date().toISOString().slice(0,10);
  CONFIG.efManualBase = val;
  CONFIG.efResetDate  = today;
  CONFIG.efAutoContrib = 0;            // reset: lo anterior queda absorbido en la base
  CONFIG.emergencyFundBase = val;      // total = solo base manual hasta el próximo ingreso
  sbSaveConfig();
  syncEF();
  toast(`🆘 Base establecida en ${fmt(val)} — el 30% empezará a acumularse con los próximos ingresos`, 'ok');
  unlockScroll();
  document.getElementById('dinero-fuera-overlay')?.remove();
  openDineroFuera();
}

async function addAhorroCochinito() {
  // FIX-XII-3: usar modal en lugar de prompt() nativo
  const label = await _promptModal('🐷 Agregar al Cochinito', '¿Descripción?', 'Ej: Sueldo Isabel, Dólares guardados', 'text');
  if (!label) return;
  const montoStr = await _promptModal('🐷 Agregar al Cochinito', '¿Cuánto? (USD)', '0.00', 'number');
  const monto = parseFloat(montoStr);
  if (isNaN(monto) || monto <= 0) { toast('Monto inválido', 'err'); return; }
  const ok = await showConfirm('🐷 Guardar en el Cochinito',
    `¿Agregar ${fmt(monto)} con descripción "${label}"?`, '🐷');
  if (!ok) return;
  const today = new Date().toISOString().slice(0,10);
  const mov = {
    id: 'n' + Date.now(), desc: label, tipo: 'Ahorro en efectivo',
    cat: 'AHORRO COCHINITO', subcat: '', amount: monto, amountBs: monto * (rateBCV||1),
    method: 'Efectivo $', date: today, author: currentUser ? getDisplayName(currentUser.email) : 'Anthony', rate_type: 'bcv'
  };
  EXCEL_DATA[currentMonth].transactions.push(mov);
  userModifiedMonths.add(currentMonth);
  recalcMonth(currentMonth);
  render();
  // FIX-WALLET-COCHINITO: forzar actualización de billeteras
  if (typeof renderWalletCards === 'function') renderWalletCards();
  haptic('success');
  toast(`🐷 +${fmt(monto)} al cochinito de ${currentMonth}`, 'ok');
  document.getElementById('dinero-fuera-overlay')?.remove();
  openDineroFuera();
  if (navigator.onLine) { sbSaveMov(mov, currentMonth); sbLogMovimiento('crear', mov, currentMonth, null); }
  else pushOfflineQueue({ type: 'saveMov', mov, month: currentMonth });
}

async function gastarAhorroCochinito() {
  // FIX-XII-3: usar modal en lugar de prompt() nativo
  const label = await _promptModal('💸 Gastar del Cochinito', '¿En qué gastaste?', 'Ej: Viaje, Emergencia...', 'text');
  if (!label) return;
  const montoStr = await _promptModal('💸 Gastar del Cochinito', '¿Cuánto? (USD)', '0.00', 'number');
  const monto = parseFloat(montoStr);
  if (isNaN(monto) || monto <= 0) { toast('Monto inválido', 'err'); return; }
  const ok = await showConfirm('💸 Gastar del Cochinito',
    `¿Registrar gasto de ${fmt(monto)} por "${label}"?`, '💸');
  if (!ok) return;
  const today = new Date().toISOString().slice(0,10);
  const mov = {
    id: 'n' + Date.now(), desc: label, tipo: 'Ahorro en efectivo',
    cat: 'AHORRO COCHINITO', subcat: '', amount: -monto, amountBs: -monto * (rateBCV||1),
    method: 'Efectivo $', date: today, author: currentUser ? getDisplayName(currentUser.email) : 'Anthony', rate_type: 'bcv'
  };
  EXCEL_DATA[currentMonth].transactions.push(mov);
  userModifiedMonths.add(currentMonth);
  recalcMonth(currentMonth);
  render();
  // FIX-WALLET-COCHINITO: forzar actualización de billeteras
  if (typeof renderWalletCards === 'function') renderWalletCards();
  haptic('medium');
  toast(`💸 -${fmt(monto)} del cochinito de ${currentMonth}`, 'ok');
  document.getElementById('dinero-fuera-overlay')?.remove();
  openDineroFuera();
  if (navigator.onLine) { sbSaveMov(mov, currentMonth); sbLogMovimiento('crear', mov, currentMonth, null); }
  else pushOfflineQueue({ type: 'saveMov', mov, month: currentMonth });
}

// Mantener funciones legacy para compatibilidad
async function addCochinitoItem() { addAhorroCochinito(); }
function gastarCochinito() { gastarAhorroCochinito(); }

async function removeCochinitoItem(idx) {
  const ok = await showConfirm('🗑 Eliminar item', '¿Eliminar este registro del cochinito?', '🐷');
  if (!ok) return;
  const coch = loadCochinitoData();
  coch.items.splice(idx,1); saveCochinitoData(); openDineroFuera();
}


// ─── EDITAR DEUDA — BATCH-XXVII ──────────────────────────────────────
async function editarDeuda(id) {
  const deud = loadDeudasData();
  const d = deud.deudas.find(x => x.id === id);
  if (!d) { toast('Deuda no encontrada','err'); return; }

  const mini = document.createElement('div');
  mini.id = 'edit-deuda-mini';
  mini.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:11000;display:flex;align-items:flex-end;justify-content:center';
  mini.innerHTML = `
  <div style="background:#161b22;border-radius:20px 20px 0 0;border-top:1px solid #30363d;width:100%;max-width:540px;padding:20px 18px;padding-bottom:max(22px,env(safe-area-inset-bottom,22px));max-height:85vh;overflow-y:auto">
    <div style="font-size:.92rem;font-weight:800;color:#e6edf3;margin-bottom:16px">✏️ Editar Deuda</div>
    <div style="display:grid;gap:10px">
      <div>
        <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Acreedor (¿A quién le debes?)</label>
        <input id="ed-acreedor" value="${escHtml(d.acreedor||'')}" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.86rem;outline:none;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Monto original (USD)</label>
        <input id="ed-monto" type="number" step="0.01" min="0" value="${d.montoOriginal||d.saldo||0}" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.86rem;outline:none;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Monto abonado (USD)</label>
        <input id="ed-abonado" type="number" step="0.01" min="0" value="${d.montoAbonado||0}" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.86rem;outline:none;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Concepto</label>
        <input id="ed-concepto" value="${escHtml(d.concepto||'')}" placeholder="ej: Pago iPhone, préstamo personal" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.86rem;outline:none;box-sizing:border-box">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Fecha inicio</label>
          <input id="ed-fecha" type="date" value="${d.fecha||''}" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:9px 10px;border-radius:10px;font-size:.82rem;outline:none;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Fecha vencimiento</label>
          <input id="ed-fvenc" type="date" value="${d.fechaVencimiento||''}" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:9px 10px;border-radius:10px;font-size:.82rem;outline:none;box-sizing:border-box">
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button onclick="document.getElementById('edit-deuda-mini').remove()" style="background:#1c2128;border:1px solid #30363d;color:#8b949e;padding:12px;border-radius:10px;cursor:pointer;flex-shrink:0">Cancelar</button>
      <button onclick="_guardarEditDeuda('${id}')" style="flex:1;background:#1f6feb;border:none;color:#fff;padding:12px;border-radius:10px;font-weight:700;font-size:.88rem;cursor:pointer">💾 Guardar cambios</button>
    </div>
  </div>`;
  mini.onclick = e => { if(e.target===mini) mini.remove(); };
  document.body.appendChild(mini);
}

window._guardarEditDeuda = async function(id) {
  const deud = loadDeudasData();
  const d = deud.deudas.find(x => x.id === id);
  if (!d) return;
  const acreedor = document.getElementById('ed-acreedor')?.value?.trim();
  const monto    = parseFloat(document.getElementById('ed-monto')?.value) || 0;
  const abonado  = parseFloat(document.getElementById('ed-abonado')?.value) || 0;
  const concepto = document.getElementById('ed-concepto')?.value?.trim() || '';
  const fecha    = document.getElementById('ed-fecha')?.value || '';
  const fvenc    = document.getElementById('ed-fvenc')?.value || null;
  if (!acreedor) { toast('Escribe el nombre del acreedor','err'); return; }
  if (monto <= 0) { toast('El monto debe ser mayor a 0','err'); return; }
  d.acreedor = acreedor;
  d.montoOriginal = monto;
  d.montoAbonado  = Math.min(abonado, monto);
  d.saldo         = monto - d.montoAbonado;
  d.concepto      = concepto;
  d.fecha         = fecha;
  d.fechaVencimiento = fvenc;
  d.pagada        = d.montoAbonado >= monto;
  await saveDeudasData();
  document.getElementById('edit-deuda-mini')?.remove();
  document.getElementById('dinero-fuera-overlay')?.remove();
  openDineroFuera();
  toast('✅ Deuda actualizada','ok');
  if (typeof haptic === 'function') haptic('success');
};

// ─── EDITAR PRÉSTAMO — BATCH-XXVII ───────────────────────────────────
async function editarPrestamo(id) {
  const pres = loadPrestamosData();
  const p = pres.prestamos.find(x => x.id === id);
  if (!p) { toast('Préstamo no encontrado','err'); return; }

  const mini = document.createElement('div');
  mini.id = 'edit-prestamo-mini';
  mini.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:11000;display:flex;align-items:flex-end;justify-content:center';
  mini.innerHTML = `
  <div style="background:#161b22;border-radius:20px 20px 0 0;border-top:1px solid #30363d;width:100%;max-width:540px;padding:20px 18px;padding-bottom:max(22px,env(safe-area-inset-bottom,22px));max-height:85vh;overflow-y:auto">
    <div style="font-size:.92rem;font-weight:800;color:#e6edf3;margin-bottom:16px">✏️ Editar Préstamo</div>
    <div style="display:grid;gap:10px">
      <div>
        <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Deudor (¿Quién te debe?)</label>
        <input id="ep-deudor" value="${escHtml(p.deudor||'')}" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.86rem;outline:none;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Monto original (USD)</label>
        <input id="ep-monto" type="number" step="0.01" min="0" value="${p.montoOriginal||p.monto||0}" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.86rem;outline:none;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Monto cobrado (USD)</label>
        <input id="ep-cobrado" type="number" step="0.01" min="0" value="${p.montoAbonado||0}" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.86rem;outline:none;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Concepto</label>
        <input id="ep-concepto" value="${escHtml(p.concepto||'')}" placeholder="ej: Préstamo personal, adelanto" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 12px;border-radius:10px;font-size:.86rem;outline:none;box-sizing:border-box">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Fecha inicio</label>
          <input id="ep-fecha" type="date" value="${p.fecha||''}" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:9px 10px;border-radius:10px;font-size:.82rem;outline:none;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:.63rem;color:#8b949e;text-transform:uppercase;display:block;margin-bottom:3px">Fecha devolución</label>
          <input id="ep-fvenc" type="date" value="${p.fechaVencimiento||''}" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:9px 10px;border-radius:10px;font-size:.82rem;outline:none;box-sizing:border-box">
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button onclick="document.getElementById('edit-prestamo-mini').remove()" style="background:#1c2128;border:1px solid #30363d;color:#8b949e;padding:12px;border-radius:10px;cursor:pointer;flex-shrink:0">Cancelar</button>
      <button onclick="_guardarEditPrestamo('${id}')" style="flex:1;background:#238636;border:none;color:#fff;padding:12px;border-radius:10px;font-weight:700;font-size:.88rem;cursor:pointer">💾 Guardar cambios</button>
    </div>
  </div>`;
  mini.onclick = e => { if(e.target===mini) mini.remove(); };
  document.body.appendChild(mini);
}

window._guardarEditPrestamo = async function(id) {
  const pres = loadPrestamosData();
  const p = pres.prestamos.find(x => x.id === id);
  if (!p) return;
  const deudor   = document.getElementById('ep-deudor')?.value?.trim();
  const monto    = parseFloat(document.getElementById('ep-monto')?.value) || 0;
  const cobrado  = parseFloat(document.getElementById('ep-cobrado')?.value) || 0;
  const concepto = document.getElementById('ep-concepto')?.value?.trim() || '';
  const fecha    = document.getElementById('ep-fecha')?.value || '';
  const fvenc    = document.getElementById('ep-fvenc')?.value || null;
  if (!deudor) { toast('Escribe el nombre del deudor','err'); return; }
  if (monto <= 0) { toast('El monto debe ser mayor a 0','err'); return; }
  p.deudor        = deudor;
  p.montoOriginal = monto;
  p.montoAbonado  = Math.min(cobrado, monto);
  p.monto         = monto - p.montoAbonado;
  p.concepto      = concepto;
  p.fecha         = fecha;
  p.fechaVencimiento = fvenc;
  p.cobrado       = p.montoAbonado >= monto;
  await savePrestamosData();
  document.getElementById('edit-prestamo-mini')?.remove();
  document.getElementById('dinero-fuera-overlay')?.remove();
  openDineroFuera();
  toast('✅ Préstamo actualizado','ok');
  if (typeof haptic === 'function') haptic('success');
};

async function editDeudaItem(idx) {
  const deud = loadDeudasData();
  const activas = deud.deudas.filter(d=>!d.pagada);
  const d = activas[idx];
  if (!d) return;
  const acreedor = await _promptModal('✏️ Editar Deuda','¿A quién le debes?', d.acreedor,'text');
  if (!acreedor) return;
  const saldoStr = await _promptModal('✏️ Editar Deuda','Monto total (USD)',String(d.montoOriginal||d.saldo||0),'number');
  const saldo = parseFloat(saldoStr);
  if (isNaN(saldo)||saldo<=0){toast('Monto inválido','err');return;}
  const concepto = await _promptModal('✏️ Editar Deuda','Concepto (opcional)',d.concepto||'','text')||'';
  const fechaVenc = await _promptModal('✏️ Editar Deuda','Fecha límite YYYY-MM-DD',d.fechaVencimiento||'','date')||null;
  const ri = deud.deudas.findIndex(x=>x.id===d.id);
  if (ri>=0){
    deud.deudas[ri].acreedor=acreedor;
    deud.deudas[ri].montoOriginal=saldo;
    deud.deudas[ri].saldo=saldo-(d.montoAbonado||0);
    deud.deudas[ri].concepto=concepto;
    deud.deudas[ri].fechaVencimiento=fechaVenc;
  }
  await saveDeudasData();
  document.getElementById('dinero-fuera-overlay')?.remove();openDineroFuera();
  toast('✅ Deuda actualizada','ok');
}

async function editPrestamoItem(idx) {
  const pres = loadPrestamosData();
  const activos = pres.prestamos.filter(p=>!p.cobrado);
  const p = activos[idx];
  if (!p) return;
  const deudor = await _promptModal('✏️ Editar Préstamo','¿Quién te debe?',p.deudor,'text');
  if (!deudor) return;
  const montoStr = await _promptModal('✏️ Editar Préstamo','Monto total (USD)',String(p.montoOriginal||p.monto||0),'number');
  const monto = parseFloat(montoStr);
  if (isNaN(monto)||monto<=0){toast('Monto inválido','err');return;}
  const concepto = await _promptModal('✏️ Editar Préstamo','Concepto (opcional)',p.concepto||'','text')||'';
  const fechaVenc = await _promptModal('✏️ Editar Préstamo','Fecha límite YYYY-MM-DD',p.fechaVencimiento||'','date')||null;
  const ri = pres.prestamos.findIndex(x=>x.id===p.id);
  if (ri>=0){
    pres.prestamos[ri].deudor=deudor;
    pres.prestamos[ri].montoOriginal=monto;
    pres.prestamos[ri].monto=monto-(p.montoAbonado||0);
    pres.prestamos[ri].concepto=concepto;
    pres.prestamos[ri].fechaVencimiento=fechaVenc;
  }
  await savePrestamosData();
  document.getElementById('dinero-fuera-overlay')?.remove();openDineroFuera();
  toast('✅ Préstamo actualizado','ok');
}

async function addDeudaItem() {
  // Modal para agregar deuda con plazo
  const acreedor = await _promptModal('💳 Nueva Deuda', '¿A quién le debes?', 'ej: Cashea, Mamá Isa', 'text');
  if (!acreedor) return;
  const saldoStr = await _promptModal('💳 Nueva Deuda', '¿Cuánto debes? (USD)', '0.00', 'number');
  const saldo = parseFloat(saldoStr);
  if (isNaN(saldo) || saldo <= 0) { toast('Monto inválido', 'err'); return; }
  const concepto = await _promptModal('💳 Nueva Deuda', 'Concepto (opcional)', 'ej: Compra iPhone, Préstamo personal', 'text') || '';
  const today = new Date().toISOString().slice(0,10);
  const fechaVenc = await _promptModal('💳 Nueva Deuda', 'Fecha límite de pago (opcional, YYYY-MM-DD)', '', 'date') || null;
  const deud = loadDeudasData();
  const id = 'deu_' + Date.now();
  const ok = await showConfirm('💳 Confirmar nueva deuda',
    `¿Registrar deuda de ${fmt(saldo)} con ${acreedor}${fechaVenc ? ' · Vence: '+fechaVenc : ''}?`, '💳');
  if (!ok) return;
  deud.deudas.push({ id, acreedor, saldo, montoOriginal: saldo, montoAbonado: 0, abonos: [], concepto, pagada: false, fecha: today, fechaVencimiento: fechaVenc });
  await saveDeudasData();
  document.getElementById('dinero-fuera-overlay')?.remove(); openDineroFuera();
  toast('💳 Deuda registrada', 'ok');
}

async function abonarDeuda(idx) {
  const deud = loadDeudasData();
  const activas = deud.deudas.filter(d=>!d.pagada);
  const d = activas[idx];
  const saldoPend = (d.montoOriginal||d.saldo||0) - (d.montoAbonado||0);
  const montoStr = await _promptModal('💰 Abonar a Deuda', `Deuda con ${d.acreedor} — Pendiente: ${fmt(saldoPend)}\n¿Cuánto abonas? (USD)`, '0.00', 'number');
  const monto = parseFloat(montoStr);
  if (isNaN(monto) || monto <= 0) { toast('Monto inválido', 'err'); return; }
  if (monto > saldoPend + 0.01) { toast(`No puedes abonar más que el saldo pendiente (${fmt(saldoPend)})`, 'err'); return; }
  const ok = await showConfirm('💰 Confirmar Abono', `¿Abonar ${fmt(monto)} a ${d.acreedor}?`, '💰');
  if (!ok) return;
  d.montoAbonado = (d.montoAbonado||0) + monto;
  if (!d.abonos) d.abonos = [];
  d.abonos.push({ fecha: new Date().toISOString().slice(0,10), monto });
  d.saldo = (d.montoOriginal||d.saldo) - d.montoAbonado;
  if (d.montoAbonado >= (d.montoOriginal||d.saldo)) {
    d.pagada = true; d.fechaPago = new Date().toISOString().slice(0,10);
    toast('🎉 ¡Deuda saldada completamente!', 'ok');
  } else {
    toast(`💰 Abono de ${fmt(monto)} registrado. Pendiente: ${fmt(d.saldo)}`, 'ok');
  }
  await saveDeudasData();
  document.getElementById('dinero-fuera-overlay')?.remove(); openDineroFuera(); haptic('success');
}

async function marcarDeudaPagada(idx) {
  const deud = loadDeudasData();
  const activas = deud.deudas.filter(d=>!d.pagada);
  const ok = await showConfirm('✅ Marcar como pagada', `¿Marcar la deuda con ${activas[idx].acreedor} como pagada completamente?`, '✅');
  if (!ok) return;
  activas[idx].pagada = true;
  activas[idx].fechaPago = new Date().toISOString().slice(0,10);
  activas[idx].montoAbonado = activas[idx].montoOriginal || activas[idx].saldo || 0;
  await saveDeudasData();
  document.getElementById('dinero-fuera-overlay')?.remove(); openDineroFuera(); haptic('success');
  toast('✅ Deuda marcada como pagada');
}

async function eliminarDeuda(idx) {
  const deud = loadDeudasData();
  const activas = deud.deudas.filter(d=>!d.pagada);
  const d = activas[idx];
  if (!d) return;
  const ok = await showConfirm('🗑 Eliminar deuda', `¿Eliminar la deuda de ${fmt(d.montoOriginal||d.saldo||0)} con ${d.acreedor}? Esta acción no se puede deshacer.`, '🗑');
  if (!ok) return;
  const realIdx = deud.deudas.findIndex(x => x.id === d.id);
  if (realIdx >= 0) deud.deudas.splice(realIdx, 1);
  // Eliminar de Supabase usando auth.uid() — no HOUSEHOLD_ID
  if (sb && d.id && currentUser) {
    try {
      const { error } = await sb.from('dinero_fuera').delete()
        .eq('id', d.id).eq('user_id', currentUser.id);
      if (error) console.warn('[eliminarDeuda] delete error:', error.message);
    } catch(e) { console.warn('[eliminarDeuda] exception:', e.message); }
  }
  // Actualizar localStorage backup
  try { localStorage.setItem('fin_deudas_bk', JSON.stringify(deud.deudas)); } catch(_) {}
  document.getElementById('dinero-fuera-overlay')?.remove(); openDineroFuera();
  toast('🗑 Deuda eliminada', 'ok');
}

async function addPrestamoItem() {
  const deudor = await _promptModal('🤝 Nuevo Préstamo', '¿Quién te debe?', 'ej: Johnny, Luis Eduardo', 'text');
  if (!deudor) return;
  const montoStr = await _promptModal('🤝 Nuevo Préstamo', '¿Cuánto te debe? (USD)', '0.00', 'number');
  const monto = parseFloat(montoStr);
  if (isNaN(monto) || monto <= 0) { toast('Monto inválido', 'err'); return; }
  const concepto = await _promptModal('🤝 Nuevo Préstamo', 'Concepto (opcional)', 'ej: Préstamo personal, adelanto', 'text') || '';
  const today = new Date().toISOString().slice(0,10);
  const fechaVenc = await _promptModal('🤝 Nuevo Préstamo', 'Fecha de devolución esperada (opcional, YYYY-MM-DD)', '', 'date') || null;
  const pres = loadPrestamosData();
  const id = 'pre_' + Date.now();
  const ok = await showConfirm('🤝 Confirmar préstamo',
    `¿Registrar préstamo de ${fmt(monto)} a ${deudor}${fechaVenc ? ' · Devolución: '+fechaVenc : ''}?`, '🤝');
  if (!ok) return;
  pres.prestamos.push({ id, deudor, monto, montoOriginal: monto, montoAbonado: 0, abonos: [], concepto, cobrado: false, fecha: today, fechaVencimiento: fechaVenc });
  await savePrestamosData();
  document.getElementById('dinero-fuera-overlay')?.remove(); openDineroFuera();
  toast('🤝 Préstamo registrado', 'ok');
}

async function cobrarPrestamo(idx) {
  const pres = loadPrestamosData();
  const activos = pres.prestamos.filter(p=>!p.cobrado);
  const p = activos[idx];
  const saldoPend = (p.montoOriginal||p.monto||0) - (p.montoAbonado||0);
  const montoStr = await _promptModal('💵 Cobrar Abono', `${p.deudor} te debe — Pendiente: ${fmt(saldoPend)}\n¿Cuánto te pagó? (USD)`, '0.00', 'number');
  const monto = parseFloat(montoStr);
  if (isNaN(monto) || monto <= 0) { toast('Monto inválido', 'err'); return; }
  if (monto > saldoPend + 0.01) { toast(`No puedes cobrar más que el pendiente (${fmt(saldoPend)})`, 'err'); return; }
  const ok = await showConfirm('💵 Confirmar Cobro', `¿Registrar cobro de ${fmt(monto)} de ${p.deudor}?`, '💵');
  if (!ok) return;
  p.montoAbonado = (p.montoAbonado||0) + monto;
  if (!p.abonos) p.abonos = [];
  p.abonos.push({ fecha: new Date().toISOString().slice(0,10), monto });
  p.monto = (p.montoOriginal||p.monto) - p.montoAbonado;
  if (p.montoAbonado >= (p.montoOriginal||p.monto)) {
    p.cobrado = true; p.fechaCobro = new Date().toISOString().slice(0,10);
    toast('🎉 ¡Préstamo cobrado completamente!', 'ok');
  } else {
    toast(`💵 Cobrado ${fmt(monto)}. Pendiente: ${fmt(p.monto)}`, 'ok');
  }
  await savePrestamosData();
  document.getElementById('dinero-fuera-overlay')?.remove(); openDineroFuera(); haptic('success');
}

async function marcarPrestamoCobrado(idx) {
  const pres = loadPrestamosData();
  const activos = pres.prestamos.filter(p=>!p.cobrado);
  const ok = await showConfirm('✅ Marcar como cobrado', `¿Marcar el préstamo de ${activos[idx].deudor} como cobrado completamente?`, '✅');
  if (!ok) return;
  activos[idx].cobrado = true;
  activos[idx].fechaCobro = new Date().toISOString().slice(0,10);
  activos[idx].montoAbonado = activos[idx].montoOriginal || activos[idx].monto || 0;
  await savePrestamosData();
  document.getElementById('dinero-fuera-overlay')?.remove(); openDineroFuera(); haptic('success');
  toast('✅ Préstamo marcado como cobrado');
}

async function eliminarPrestamo(idx) {
  const pres = loadPrestamosData();
  const activos = pres.prestamos.filter(p=>!p.cobrado);
  const p = activos[idx];
  if (!p) return;
  const ok = await showConfirm('🗑 Eliminar préstamo', `¿Eliminar el préstamo de ${fmt(p.montoOriginal||p.monto||0)} a ${p.deudor}? Esta acción no se puede deshacer.`, '🗑');
  if (!ok) return;
  const realIdx = pres.prestamos.findIndex(x => x.id === p.id);
  if (realIdx >= 0) pres.prestamos.splice(realIdx, 1);
  // Eliminar de Supabase usando auth.uid() — no HOUSEHOLD_ID
  if (sb && p.id && currentUser) {
    try {
      const { error } = await sb.from('dinero_fuera').delete()
        .eq('id', p.id).eq('user_id', currentUser.id);
      if (error) console.warn('[eliminarPrestamo] delete error:', error.message);
    } catch(e) { console.warn('[eliminarPrestamo] exception:', e.message); }
  }
  // Actualizar localStorage backup
  try { localStorage.setItem('fin_prestamos_bk', JSON.stringify(pres.prestamos)); } catch(_) {}
  document.getElementById('dinero-fuera-overlay')?.remove(); openDineroFuera();
  toast('🗑 Préstamo eliminado', 'ok');
}

// ── MODAL INTELIGENCIA FINANCIERA ────────────────────────
function openIntelFinanciera() {
  const mejorPeor = getMejorPeorMes();
  const comparativa = getComparativaMesAnterior();
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:10200;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = e => { if(e.target===overlay) { unlockScroll(); overlay.remove(); } };
  lockScroll();
  // Score general
  const scores = calcScoreDisciplina();
  const avgScore = Object.values(scores).length > 0
    ? Math.round(Object.values(scores).reduce((s,x)=>s+x.score,0)/Object.values(scores).length) : '--';
  overlay.innerHTML = `
  <div style="background:#161b22;border:1px solid #30363d;border-radius:14px;width:520px;max-width:100%;max-height:90vh;overflow-y:auto">
    <div style="padding:18px 20px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#161b22;z-index:1">
      <h3 style="color:#e6edf3;font-size:.95rem">🧠 Inteligencia Financiera</h3>
      <button onclick="unlockScroll();this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:#8b949e;font-size:1.1rem;cursor:pointer">✕</button>
    </div>
    <!-- SCORE GENERAL -->
    <div style="padding:16px 20px;border-bottom:1px solid #21262d">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:.85rem;color:#e6edf3;font-weight:600">🏆 Score de Disciplina — ${currentMonth}</span>
        <span style="font-size:1.1rem;font-weight:700;color:${avgScore>=80?'#3fb950':avgScore>=60?'#e3b341':'#f85149'}">${avgScore}pts</span>
      </div>
      <div id="score-disciplina-container"></div>
    </div>
    <!-- PREDICCIÓN SEMANAL -->
    <div style="padding:16px 20px;border-bottom:1px solid #21262d">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:.85rem;color:#e6edf3;font-weight:600">📅 Predicción Semanal</div>
        <button onclick="try{var p=this.closest('div');var n=p&&p.nextElementSibling;if(n)n.style.display=n.style.display==='none'?'block':'none';}catch(e){}" style="background:none;border:none;color:#58a6ff;font-size:.72rem;cursor:pointer">ℹ️ ¿Cómo funciona?</button>
      </div>
      <div style="display:none;background:#0d1117;border-radius:6px;padding:10px;margin-bottom:10px;font-size:.7rem;color:#8b949e;line-height:1.6">
        <b style="color:#e6edf3">¿Cómo funciona la Predicción Semanal?</b><br>
        Analiza tus gastos históricos agrupados por día de la semana (Lun, Mar, Mié...) para proyectar cuánto gastarás esta semana.<br><br>
        <b>Ejemplo:</b> Si históricamente los Viernes gastas ~$25 y los Martes ~$8, y ya es Miércoles habiendo gastado $30 de una proyección de $80 esta semana → vas al <b>37%</b> de la semana.<br><br>
        La barra muestra el avance vs la proyección basada en tu historial de ese día de la semana.
      </div>
      <div id="prediccion-semanal-container"></div>
    </div>
    <!-- AHORROS VS FONDO DE EMERGENCIA -->
    <div style="padding:16px 20px;border-bottom:1px solid #21262d">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:.85rem;color:#e6edf3;font-weight:600">🐷 Ahorros vs 🆘 Fondo de Emergencia</div>
      </div>
      <div style="background:#0d1117;border-radius:8px;padding:10px;margin-bottom:12px;font-size:.7rem;color:#8b949e;line-height:1.6">
        <b style="color:#e6edf3">¿Qué mide esto?</b><br>
        Compara dos pilares clave de tu salud financiera: el <b>Cochinito</b> (ahorro físico acumulado) y el <b>Fondo de Emergencia</b> (colchón para imprevistos).<br><br>
        <b>Cochinito:</b> dinero que apartaste físicamente, no disponible en el día a día.<br>
        <b>Fondo de emergencia:</b> 3–6 meses de gastos disponibles ante cualquier imprevisto. Tu meta actual: ${fmt(CONFIG.emergencyFundGoal||3000)}.
      </div>
      ${(()=>{
        const totalAhorros = activeMonths.reduce((s,m)=>s+(EXCEL_DATA[m]?.ahorros||0),0);
        const efManual  = CONFIG.efManualBase  || 0;
        const efAuto    = CONFIG.efAutoContrib || 0;
        const efTotal   = efManual + efAuto;
        const efGoal    = CONFIG.emergencyFundGoal || 3000;
        const pctEF     = Math.min(100,(efTotal/efGoal)*100);
        const pctAhorro = efGoal > 0 ? Math.min(100,(totalAhorros/efGoal)*100) : 0;
        const salud     = efTotal >= efGoal ? '✅ Meta alcanzada' : efTotal >= efGoal*0.5 ? '🟡 En progreso' : '🔴 Por debajo de la meta';
        return `
        <div style="display:flex;gap:10px;margin-bottom:12px">
          <div style="flex:1;background:#0d1a2e;border:1px solid #1a3a5c;border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:1.1rem;margin-bottom:4px">🐷</div>
            <div style="font-size:.65rem;color:#8b949e;margin-bottom:4px">Cochinito acumulado</div>
            <div style="font-size:1rem;font-weight:800;color:#58a6ff">${fmt(totalAhorros)}</div>
            <div style="font-size:.6rem;color:#484f58;margin-top:2px">todos los meses</div>
          </div>
          <div style="flex:1;background:#1a160d;border:1px solid #3d2e00;border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:1.1rem;margin-bottom:4px">🆘</div>
            <div style="font-size:.65rem;color:#8b949e;margin-bottom:4px">Fondo emergencia</div>
            <div style="font-size:1rem;font-weight:800;color:#f0a83a">${fmt(efTotal)}</div>
            <div style="font-size:.6rem;color:#484f58;margin-top:2px">${pctEF.toFixed(0)}% de meta</div>
          </div>
        </div>
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:.65rem;color:#8b949e;margin-bottom:3px">
            <span>🐷 Cochinito</span><span style="color:#58a6ff">${fmt(totalAhorros)}</span>
          </div>
          <div style="background:#21262d;border-radius:4px;height:6px;overflow:hidden;margin-bottom:8px">
            <div style="height:100%;background:#58a6ff;width:${pctAhorro.toFixed(1)}%;transition:.5s;border-radius:4px"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:.65rem;color:#8b949e;margin-bottom:3px">
            <span>🆘 Fondo emergencia</span><span style="color:#f0a83a">${fmt(efTotal)}</span>
          </div>
          <div style="background:#21262d;border-radius:4px;height:6px;overflow:hidden;margin-bottom:8px">
            <div style="height:100%;background:#f0a83a;width:${pctEF.toFixed(1)}%;transition:.5s;border-radius:4px"></div>
          </div>
        </div>
        <div style="background:#13181f;border-radius:6px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:.68rem;color:#8b949e">Estado financiero</span>
          <span style="font-size:.72rem;font-weight:600;color:#e6edf3">${salud}</span>
        </div>
        <div style="font-size:.62rem;color:#484f58;margin-top:8px;text-align:center">
          Auto 30% acumulado: ${fmt(efAuto)} · Base manual: ${fmt(efManual)}
        </div>`;
      })()}
    </div>
    ${mejorPeor ? `
    <!-- MEJOR / PEOR MES -->
    <div style="padding:16px 20px;border-bottom:1px solid #21262d">
      <div style="font-size:.85rem;color:#e6edf3;font-weight:600;margin-bottom:8px">📊 Mejor y Peor Mes</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:#0d1117;border:1px solid #1a3626;border-radius:8px;padding:10px">
          <div style="font-size:.62rem;color:#3fb950;margin-bottom:4px">🏆 MEJOR MES</div>
          <div style="font-size:.88rem;font-weight:700;color:#e6edf3">${mejorPeor.mejor.mes}</div>
          <div style="font-size:.7rem;color:#3fb950">Balance: ${fmt(mejorPeor.mejor.balance)}</div>
          <div style="font-size:.7rem;color:#8b949e">Ahorro: ${fmt(mejorPeor.mejor.ahorro)}</div>
        </div>
        <div style="background:#0d1117;border:1px solid #3d1a1a;border-radius:8px;padding:10px">
          <div style="font-size:.62rem;color:#f85149;margin-bottom:4px">⚠️ MES MÁS AJUSTADO</div>
          <div style="font-size:.88rem;font-weight:700;color:#e6edf3">${mejorPeor.peor.mes}</div>
          <div style="font-size:.7rem;color:#f85149">Balance: ${fmt(mejorPeor.peor.balance)}</div>
          <div style="font-size:.7rem;color:#8b949e">Ahorro: ${fmt(mejorPeor.peor.ahorro)}</div>
        </div>
      </div>
    </div>` : ''}
    ${comparativa ? `
    <!-- COMPARATIVA MES ANTERIOR -->
    <div style="padding:16px 20px">
      <div style="font-size:.85rem;color:#e6edf3;font-weight:600;margin-bottom:8px">📈 ${currentMonth} vs ${comparativa.mesAnterior}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px">
        ${[['Ingresos',comparativa.totalIngresos,'#3fb950'],['Gastos',comparativa.totalGastos,'#f85149'],['Ahorros',comparativa.totalAhorros,'#58a6ff']].map(([lbl,vals,color])=>{
          const diff = vals.curr - vals.prev;
          const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
          const isGood = (lbl==='Gastos') ? diff<=0 : diff>=0;
          return `<div style="background:#0d1117;border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:.62rem;color:#8b949e">${lbl}</div>
            <div style="font-size:.82rem;font-weight:700;color:${color}">${fmt(vals.curr)}</div>
            <div style="font-size:.65rem;color:${isGood?'#3fb950':'#f85149'}">${arrow} ${fmt(Math.abs(diff))}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="font-size:.72rem;color:#8b949e;margin-bottom:6px">Cambios por categoría:</div>
      ${comparativa.cats.map(c => {
        const arrow = c.diff > 0 ? '↑' : c.diff < 0 ? '↓' : '=';
        const color = c.diff > 0 ? '#f85149' : '#3fb950';
        const cleanCat = c.cat.replace(/[\u{1F000}-\u{1FFFF}]/gu,'').trim();
        return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #21262d;font-size:.73rem">
          <span style="color:#c9d1d9">${cleanCat}</span>
          <span style="color:${color}">${arrow} ${fmt(Math.abs(c.diff))}</span>
        </div>`;
      }).join('')}
    </div>` : ''}
    <!-- SIMULADOR DE ESCENARIOS -->
    <div style="padding:16px 20px;border-top:1px solid #21262d">
      <div style="font-size:.85rem;color:#e6edf3;font-weight:600;margin-bottom:10px">🎮 Simulador de Escenarios</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <select id="escen-cat" style="flex:1;min-width:120px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:7px;border-radius:7px;font-size:.75rem" onchange="updateEscenario()">
          ${Object.entries(EXCEL_DATA[currentMonth]?.cat_totals||{}).sort((a,b)=>b[1]-a[1]).map(([c])=>`<option value="${c}">${c.replace(/[\u{1F000}-\u{1FFFF}]/gu,'').trim()}</option>`).join('')}
        </select>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:.72rem;color:#8b949e">Reducir</span>
          <input type="range" id="escen-pct" min="5" max="80" value="20" oninput="updateEscenario()" style="width:80px">
          <span id="escen-pct-val" style="font-size:.72rem;color:#e3b341;min-width:28px">20%</span>
        </div>
      </div>
      <div id="escenario-result" style="background:#0d1117;border-radius:8px;padding:12px;font-size:.75rem"></div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  renderScoreDisciplina(document.getElementById('score-disciplina-container'));
  renderPrediccionSemanal(document.getElementById('prediccion-semanal-container'));
  updateEscenario();
}

function updateEscenario() {
  const cat = document.getElementById('escen-cat')?.value;
  const pct = parseInt(document.getElementById('escen-pct')?.value || '20');
  const pctLabel = document.getElementById('escen-pct-val');
  if (pctLabel) pctLabel.textContent = pct + '%';
  const res = document.getElementById('escenario-result');
  if (!cat || !res) return;
  const e = calcEscenario(cat, pct);
  const cleanCat = cat.replace(/[\u{1F000}-\u{1FFFF}]/gu,'').trim();
  res.innerHTML = `
    <div style="color:#8b949e;margin-bottom:6px">Si reduces <b style="color:#e3b341">${cleanCat}</b> un <b style="color:#e3b341">${pct}%</b>:</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div style="text-align:center"><div style="font-size:.6rem;color:#8b949e">Ahorro extra/mes</div><div style="font-size:.92rem;font-weight:700;color:#3fb950">+${fmt(e.extraAhorro)}</div></div>
      <div style="text-align:center"><div style="font-size:.6rem;color:#8b949e">Proyección anual</div><div style="font-size:.92rem;font-weight:700;color:#58a6ff">+${fmt(e.proyeccionAnual)}</div></div>
      <div style="text-align:center"><div style="font-size:.6rem;color:#8b949e">Nuevo balance</div><div style="font-size:.92rem;font-weight:700;color:${e.nuevoBalance>=0?'#3fb950':'#f85149'}">${fmt(e.nuevoBalance)}</div></div>
      <div style="text-align:center"><div style="font-size:.6rem;color:#8b949e">Total gastos nuevo</div><div style="font-size:.92rem;font-weight:700;color:#e6edf3">${fmt(e.nuevoGasto)}</div></div>
    </div>`;
}

// ── FILTRO POR USUARIO EN BÚSQUEDA ────────────────────────
function addUserFilterToSearch() {
  const filterArea = document.getElementById('search-filters');
  if (!filterArea || document.getElementById('search-author')) return;
  const div = document.createElement('div');
  div.style.cssText = 'margin-top:6px';
  div.innerHTML = `<select id="search-author" onchange="applySearch()" style="width:100%;background:#1c2128;border:1px solid #30363d;color:#e6edf3;padding:7px 10px;border-radius:7px;font-size:.78rem;outline:none">
    <option value="">👥 Todos los usuarios</option>
    <option value="Anthony">👤 Anthony</option>
    <option value="Isabel">👤 Isabel</option>
  </select>`;
  filterArea.appendChild(div);
}


// ════════════════════════════════════════════════════════════════
//  METAS DE AHORRO ESPECÍFICAS — v1
//  Almacenadas en CONFIG.metasAhorro (array persistido en Supabase)
//  Cada meta: { id, nombre, objetivo, actual, fechaLimite, emoji, color }
// ════════════════════════════════════════════════════════════════

// ── Estado ─────────────────────────────────────────────────────
if (!window.CONFIG) window.CONFIG = {};
window._metasLoaded = false;

// ── Inicializar desde CONFIG ────────────────────────────────────
function getMetasAhorro() {
  return CONFIG.metasAhorro || [];
}

// ── Guardar metas en Supabase via CONFIG ──────────────────────
async function saveMetasAhorro() {
  // Backup en localStorage siempre
  try { localStorage.setItem('fin_metas_ahorro', JSON.stringify(CONFIG.metasAhorro || [])); } catch(e){}
  // Usar sbSaveConfig completo — incluye metas_ahorro + todos los campos requeridos
  // Evita fallar por columnas faltantes (NOT NULL constraints)
  if (typeof sbSaveConfig === 'function') await sbSaveConfig();
}

// ── Abrir panel de metas ────────────────────────────────────────
function openMetasAhorro() {
  lockScroll();
  var overlay = document.createElement('div');
  overlay.id = 'metas-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10400;display:flex;align-items:flex-end;justify-content:center';
  overlay.onclick = function(e) { if(e.target===overlay) closeMetasAhorro(); };
  overlay.innerHTML = _renderMetasPanel();
  document.body.appendChild(overlay);
}

function closeMetasAhorro() {
  unlockScroll();
  document.getElementById('metas-overlay')?.remove();
}

// ── Render del panel ────────────────────────────────────────────
function _renderMetasPanel() {
  var metas = getMetasAhorro();
  var totalAhorros = activeMonths.reduce(function(s,m){ return s + (EXCEL_DATA[m]?.ahorros||0); }, 0);

  var metasList = metas.length === 0
    ? '<div style="text-align:center;padding:32px;color:#484f58;font-size:.85rem">Sin metas aún.<br>Crea tu primera meta de ahorro ↓</div>'
    : metas.map(function(m, i) {
        var pct = m.objetivo > 0 ? Math.min(100, (m.actual / m.objetivo) * 100) : 0;
        var falta = Math.max(0, m.objetivo - m.actual);
        var dias = m.fechaLimite
          ? Math.ceil((new Date(m.fechaLimite) - new Date()) / 86400000)
          : null;
        var diasStr = dias !== null
          ? (dias < 0 ? '<span style="color:#f85149">Vencida</span>'
             : dias === 0 ? '<span style="color:#e3b341">Hoy</span>'
             : '<span style="color:#8b949e">' + dias + ' días</span>')
          : '';
        var completada = pct >= 100;
        return '<div style="background:#13181f;border:1px solid ' + (completada ? '#238636' : '#21262d') + ';border-radius:12px;padding:14px;margin-bottom:10px">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
          + '<div style="display:flex;align-items:center;gap:8px">'
          + '<span style="font-size:1.3rem">' + (m.emoji||'🎯') + '</span>'
          + '<div>'
          + '<div style="font-size:.88rem;font-weight:700;color:#e6edf3">' + escHtml(m.nombre) + '</div>'
          + '<div style="font-size:.68rem;color:#8b949e">' + fmt(m.actual) + ' de ' + fmt(m.objetivo) + (diasStr ? ' · ' + diasStr : '') + '</div>'
          + '</div></div>'
          + '<div style="display:flex;gap:6px">'
          + '<button onclick="abonarMeta(' + i + ')" style="background:#0d2218;border:1px solid #238636;color:#3fb950;padding:4px 10px;border-radius:6px;font-size:.72rem;cursor:pointer">+Abonar</button>'
          + '<button onclick="deleteMeta(' + i + ')" style="background:none;border:none;color:#484f58;cursor:pointer;font-size:.9rem">🗑</button>'
          + '</div></div>'
          + '<div style="background:#21262d;border-radius:4px;height:6px;overflow:hidden;margin-bottom:4px">'
          + '<div style="height:100%;width:' + pct.toFixed(1) + '%;background:' + (completada ? '#3fb950' : (m.color||'#58a6ff')) + ';border-radius:4px;transition:.6s"></div>'
          + '</div>'
          + '<div style="display:flex;justify-content:space-between;font-size:.65rem;color:#484f58">'
          + '<span>' + pct.toFixed(0) + '%</span>'
          + '<span>' + (completada ? '✅ Completada' : 'Falta ' + fmt(falta)) + '</span>'
          + '</div></div>';
      }).join('');

  return '<div style="background:#161b22;border-radius:20px 20px 0 0;padding:0;width:100%;max-width:500px;max-height:92vh;overflow-y:auto">'
    + '<div style="padding:14px 20px;border-bottom:1px solid #21262d;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#161b22;z-index:1">'
    + '<span style="font-size:.95rem;font-weight:700;color:#e6edf3">🎯 Metas de Ahorro</span>'
    + '<button onclick="closeMetasAhorro()" style="background:none;border:none;color:#8b949e;font-size:1.1rem;cursor:pointer">✕</button>'
    + '</div>'
    + '<div style="padding:16px 20px;background:#0d1117;border-bottom:1px solid #21262d">'
    + '<div style="font-size:.72rem;color:#8b949e">Cochinito total acumulado</div>'
    + '<div style="font-size:1.4rem;font-weight:800;color:#3fb950">' + fmt(totalAhorros) + '</div>'
    + '</div>'
    + '<div style="padding:16px 20px">'
    + metasList
    + '</div>'
    + '<div style="padding:0 20px 20px">'
    + '<div style="background:#0d1117;border:1px solid #30363d;border-radius:12px;padding:16px">'
    + '<div style="font-size:.78rem;font-weight:700;color:#e6edf3;margin-bottom:12px">+ Nueva meta</div>'
    + '<input id="meta-nombre" placeholder="Nombre (ej: Viaje a Bogotá)" style="width:100%;background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:9px 12px;border-radius:8px;font-size:.85rem;outline:none;margin-bottom:8px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
    + '<input id="meta-objetivo" type="number" placeholder="Meta ($)" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:9px 12px;border-radius:8px;font-size:.85rem;outline:none;width:100%">'
    + '<input id="meta-actual" type="number" placeholder="Ahorrado ($)" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:9px 12px;border-radius:8px;font-size:.85rem;outline:none;width:100%">'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
    + '<input id="meta-fecha" type="date" style="background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:9px 12px;border-radius:8px;font-size:.85rem;outline:none;width:100%">'
    + '<div style="display:flex;gap:6px;align-items:center">'
    + ['🎯','✈️','🏠','🚗','💍','📱','🎓','🐷','💰','🌎'].map(function(e){
        return '<button onclick="document.getElementById(\'meta-emoji\').value=\''+e+'\';this.style.background=\'#1a3626\';" style="background:none;border:none;font-size:1.1rem;cursor:pointer;padding:2px">' + e + '</button>';
      }).join('')
    + '<input id="meta-emoji" type="hidden" value="🎯">'
    + '</div></div>'
    + '<button onclick="crearMeta()" style="width:100%;background:#238636;border:1px solid #3fb950;color:#fff;padding:10px;border-radius:8px;font-weight:700;font-size:.88rem;cursor:pointer">Crear meta</button>'
    + '</div></div></div>';
}

// ── Crear meta ──────────────────────────────────────────────────
async function crearMeta() {
  var nombre  = document.getElementById('meta-nombre')?.value?.trim();
  var objetivo = parseFloat(document.getElementById('meta-objetivo')?.value) || 0;
  var actual   = parseFloat(document.getElementById('meta-actual')?.value) || 0;
  var fecha    = document.getElementById('meta-fecha')?.value || null;
  var emoji    = document.getElementById('meta-emoji')?.value || '🎯';

  if (!nombre || objetivo <= 0) { toast('Ingresa nombre y monto objetivo', 'err'); return; }

  if (!CONFIG.metasAhorro) CONFIG.metasAhorro = [];
  CONFIG.metasAhorro.push({
    id: Date.now().toString(),
    nombre: nombre, objetivo: objetivo,
    actual: actual, fechaLimite: fecha,
    emoji: emoji, color: '#58a6ff',
    creada: new Date().toISOString().slice(0,10)
  });

  await saveMetasAhorro();
  toast('🎯 Meta creada: ' + nombre, 'ok');
  closeMetasAhorro();
  setTimeout(openMetasAhorro, 100);
}

// ── Abonar a meta ───────────────────────────────────────────────
async function abonarMeta(idx) {
  var metas = getMetasAhorro();
  var meta = metas[idx];
  if (!meta) return;

  var montoStr = await _promptModal('💰 Abonar a "' + meta.nombre + '"', '¿Cuánto abonar? (USD)', '0.00', 'number');
  var monto = parseFloat(montoStr);
  if (isNaN(monto) || monto <= 0) return;

  meta.actual = (meta.actual || 0) + monto;
  if (meta.actual >= meta.objetivo) {
    toast('🎉 ¡Meta "' + meta.nombre + '" completada!', 'ok');
    meta.completada = true;
  } else {
    toast('💰 +' + fmt(monto) + ' abonado a "' + meta.nombre + '"', 'ok');
  }

  await saveMetasAhorro();
  closeMetasAhorro();
  setTimeout(openMetasAhorro, 100);
}

// ── Eliminar meta ───────────────────────────────────────────────
async function deleteMeta(idx) {
  var metas = getMetasAhorro();
  var ok = await showConfirm('Eliminar meta', '¿Eliminar "' + metas[idx]?.nombre + '"?', '🗑');
  if (!ok) return;
  CONFIG.metasAhorro.splice(idx, 1);
  await saveMetasAhorro();
  closeMetasAhorro();
  setTimeout(openMetasAhorro, 100);
}

// ════════════════════════════════════════════════════════════════
//  NOTIFICACIONES INTELIGENTES — v1
//  Corre al cargar la app. No molesta al usuario con spam.
//  Solo notifica cuando hay algo accionable y real.
// ════════════════════════════════════════════════════════════════

// ── Recordatorios de vencimiento ──────────────────────────────
function checkVencimientos() {
  if (Notification.permission !== 'granted') return;
  var hoy = new Date();
  hoy.setHours(0,0,0,0);

  // Revisar deudas
  var deudas = (window._deudasData?.deudas || []).filter(function(d){ return !d.pagada; });
  deudas.forEach(function(d) {
    if (!d.fechaVencimiento) return;
    var vence = new Date(d.fechaVencimiento);
    vence.setHours(0,0,0,0);
    var dias = Math.round((vence - hoy) / 86400000);
    if (dias < 0) {
      sendNotification(
        '🔴 Deuda vencida: ' + escHtml(d.acreedor),
        'Tu deuda de ' + fmt(d.saldo) + ' con ' + d.acreedor + ' venció hace ' + Math.abs(dias) + ' días.'
      );
    } else if (dias <= 3) {
      sendNotification(
        '⚠️ Deuda vence en ' + (dias === 0 ? 'hoy' : dias + ' días'),
        d.acreedor + ' — ' + fmt(d.saldo) + '. Vence: ' + d.fechaVencimiento
      );
    } else if (dias <= 7) {
      sendNotification(
        '📅 Recordatorio: Deuda en ' + dias + ' días',
        d.acreedor + ' — ' + fmt(d.saldo)
      );
    }
  });

  // Revisar préstamos (dinero que te deben)
  var prestamos = (window._prestamosData?.prestamos || []).filter(function(p){ return !p.cobrado; });
  prestamos.forEach(function(p) {
    if (!p.fechaVencimiento) return;
    var vence = new Date(p.fechaVencimiento);
    vence.setHours(0,0,0,0);
    var dias = Math.round((vence - hoy) / 86400000);
    if (dias <= 3) {
      sendNotification(
        '💰 Cobrar préstamo: ' + escHtml(p.deudor),
        fmt(p.monto) + ' — vence ' + (dias === 0 ? 'hoy' : 'en ' + dias + ' días')
      );
    }
  });

  // Revisar metas con fecha vencida o próxima
  var metas = (CONFIG.metasAhorro || []).filter(function(m){ return !m.completada && m.fechaLimite; });
  metas.forEach(function(m) {
    var vence = new Date(m.fechaLimite);
    vence.setHours(0,0,0,0);
    var dias = Math.round((vence - hoy) / 86400000);
    var pct = m.objetivo > 0 ? Math.round((m.actual / m.objetivo) * 100) : 0;
    if (dias <= 7 && dias >= 0 && pct < 100) {
      sendNotification(
        '🎯 Meta "' + m.nombre + '" — ' + dias + (dias===1?' día':' días'),
        'Llevas ' + fmt(m.actual) + ' de ' + fmt(m.objetivo) + ' (' + pct + '%). Faltan ' + fmt(m.objetivo - m.actual) + '.'
      );
    }
  });
}

// ── Detección de anomalías de gasto ────────────────────────────
function checkAnomalias() {
  if (Notification.permission !== 'granted') return;

  // Calcular promedio de los últimos 2 meses por categoría
  var monthsToAnalyze = activeMonths.slice(0, -1); // todos menos el actual
  if (monthsToAnalyze.length < 2) return; // necesitamos historial

  var promedios = {};
  monthsToAnalyze.forEach(function(m) {
    var cats = EXCEL_DATA[m]?.cat_totals || {};
    Object.entries(cats).forEach(function([cat, amt]) {
      if (!promedios[cat]) promedios[cat] = [];
      promedios[cat].push(amt);
    });
  });

  // Comparar mes actual contra promedio
  var catActual = EXCEL_DATA[currentMonth]?.cat_totals || {};
  Object.entries(catActual).forEach(function([cat, amt]) {
    var hist = promedios[cat];
    if (!hist || hist.length === 0) return;
    var avg = hist.reduce(function(s,v){ return s+v; }, 0) / hist.length;
    if (avg < 5) return; // ignorar categorías con gastos mínimos
    var diff = (amt - avg) / avg;
    if (diff > 0.4) { // 40% por encima del promedio
      sendNotification(
        '📊 Gasto inusual en ' + cat.replace(/[^\w\s]/gu, '').trim(),
        'Este mes: ' + fmt(amt) + ' vs promedio ' + fmt(avg) + ' (' + Math.round(diff*100) + '% más). ¿Todo bien?'
      );
    }
  });
}

// ── Racha de registro ───────────────────────────────────────────
function checkRachaDiaria() {
  // Verificar si ya se registró algo hoy
  var hoy = new Date().toISOString().slice(0,10);
  var txnsHoy = (EXCEL_DATA[currentMonth]?.transactions || [])
    .filter(function(t){ return t.date === hoy; });

  // Calcular racha actual (días consecutivos con al menos 1 movimiento)
  var racha = calcularRacha();

  if (Notification.permission === 'granted' && racha > 0) {
    // Solo notificar si no hay movimiento hoy y ya son las 7pm
    var hora = new Date().getHours();
    if (txnsHoy.length === 0 && hora >= 19) {
      sendNotification(
        '🔥 Tu racha de ' + racha + ' días está en riesgo',
        'Registra al menos un movimiento hoy para mantener tu racha financiera.'
      );
    }
  }

  // Actualizar racha en UI si existe el elemento
  var rachaEl = document.getElementById('racha-counter');
  if (rachaEl) rachaEl.textContent = racha + ' días';
}

function calcularRacha() {
  var racha = 0;
  var fecha = new Date();
  var maxDias = 30;
  for (var i = 0; i < maxDias; i++) {
    fecha.setDate(fecha.getDate() - (i === 0 ? 0 : 1));
    var fechaStr = fecha.toISOString().slice(0,10);
    var mes = normalizeMes(fechaStr.slice(0,7)); // YYYY-MM
    var txnsDelDia = (EXCEL_DATA[mes]?.transactions || [])
      .filter(function(t){ return t.date === fechaStr; });
    if (txnsDelDia.length > 0) {
      racha++;
    } else if (i > 0) { // el día de hoy puede no tener aún
      break;
    }
  }
  return racha;
}

// ── Runner principal — corre al iniciar ───────────────────────
function runSmartNotifications() {
  // Esperar 3 segundos para no bloquear el login
  setTimeout(function() {
    if (Notification.permission !== 'granted') return;
    checkVencimientos();
    checkAnomalias();
    checkRachaDiaria();
  }, 3000);
}

// ── Mostrar racha en dashboard ────────────────────────────────
function renderRachaCard() {
  var racha = calcularRacha();
  var hoy = new Date().toISOString().slice(0,10);
  var txnsHoy = (EXCEL_DATA[currentMonth]?.transactions || [])
    .filter(function(t){ return t.date === hoy; }).length;
  var color = racha >= 7 ? '#e3b341' : racha >= 3 ? '#3fb950' : '#8b949e';
  var flame = racha >= 7 ? '🔥' : racha >= 3 ? '✅' : '📅';
  return '<div style="display:flex;align-items:center;gap:10px;background:#13181f;border:1px solid #21262d;border-radius:10px;padding:10px 14px">'
    + '<span style="font-size:1.4rem">' + flame + '</span>'
    + '<div>'
    + '<div style="font-size:.72rem;color:#8b949e;text-transform:uppercase;letter-spacing:.06em">Racha de registro</div>'
    + '<div style="font-size:1rem;font-weight:800;color:' + color + '">' + racha + ' días consecutivos</div>'
    + '<div style="font-size:.65rem;color:#484f58">' + (txnsHoy > 0 ? '✅ Ya registraste hoy' : '⏳ Sin movimiento hoy') + '</div>'
    + '</div></div>';
}
