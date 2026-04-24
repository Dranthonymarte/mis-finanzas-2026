// ══════════════════════════════════════════════════════════
// ERR-41 FIX: Ping /rest/v1/ sin apikey → 401 → falso "sin conexión"
// ERR-42 FIX: refresh_token inválido (400) → falso "sin conexión"
// Solución: usar /auth/v1/health (sin auth) + tratar 4xx como server UP
// ══════════════════════════════════════════════════════════
(function patchConnectivity() {
  const SUPA = 'https://jcgoccaisemrfsuwwrrl.supabase.co';

  // Override checkServerConnectivity si existe en app-core.js
  window.checkServerConnectivity = async function () {
    try {
      const res = await fetch(SUPA + '/auth/v1/health', { cache: 'no-store' });
      return res.status < 500; // 4xx = server up, 5xx = caído
    } catch (_) {
      return false;
    }
  };

  // Interceptar refresh_token inválido — NO mostrar error de conexión
  // BUG-1 FIX batch49: NO llamar signOut() ni removeItem() — destruían sesiones válidas
  // cuando Supabase y setSession() usaban el mismo refresh_token concurrentemente.
  window.addEventListener('unhandledrejection', function (e) {
    const msg = String(e?.reason?.message || e?.reason || '');
    if (msg.includes('refresh_token') || msg.includes('Refresh Token') || msg.includes('Invalid Refresh')) {
      e.preventDefault();
      const b = document.getElementById('login-error');
      if (b) b.style.display = 'none';
    }
  });

  // Parchear XMLHttpRequest y fetch para que 401 nunca active banner offline
  const _origFetch = window.fetch;
  window.fetch = function(url, opts) {
    return _origFetch.call(this, url, opts).then(function(res) {
      // Si alguien llama showOfflineError() tras un 401 de /rest/v1/ → ignorar
      if (res.status === 401 && String(url).includes('supabase.co/rest/v1/')) {
        // Marcar para que el caller sepa que es auth, no red
        Object.defineProperty(res, '_isAuthError', { value: true, writable: false });
      }
      return res;
    });
  };
})();


// ── Detección de conexión online/offline ─────────────────
function setOfflineMode(isOffline) {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.style.display = isOffline ? 'block' : 'none';

  // Botones que requieren internet — los oscurecemos y bloqueamos
  const writeSelectors = [
    '#btn-pwa-install',
    '.btn-save',
    '.btn-add',
    '#btn-close-month',
    '.btn-delete',
    '.btn-edit',
    '#btn-voice',
    '#btn-template'
  ];
  writeSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (isOffline) {
        el.classList.add('offline-dim');
        el.setAttribute('title', 'Sin internet — no disponible');
      } else {
        el.classList.remove('offline-dim');
        el.removeAttribute('title');
      }
    });
  });

  if (isOffline) {
    toast('📵 Sin conexión — modo solo lectura activado', 'err');
  } else {
    toast('✅ Conexión restaurada — ya puedes registrar movimientos', 'ok');
  }
}

window.addEventListener('online',  () => setOfflineMode(false));
window.addEventListener('offline', () => setOfflineMode(true));

// Verificar estado al cargar
window.addEventListener('load', () => {
  if (!navigator.onLine) setOfflineMode(true);
  // FIX-XIX-4: update PWA install status text if already installed
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    const statusEl = document.getElementById('pwa-install-status');
    if (statusEl) statusEl.textContent = '✅ App instalada';
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
  }
});

// ── Banner de instalación ─────────────────────────────────
// deferredPrompt declarado en app-core.js (var global)

// FIX-XIX-2: helper centralizado — muestra banner solo si no instalada ni dismisseada
function _showInstallBanner() {
  if (sessionStorage.getItem('pwa_install_dismissed')) return;
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'block';
  const btn = document.getElementById('btn-pwa-install');
  if (btn) {
    btn.style.display = 'inline-flex';
    // Si hay prompt nativo → instalación directa
    // Si no → mostrar guía de instalación manual
    btn.onclick = () => deferredPrompt ? triggerPWAInstall() : showPWAInstallGuide();
  }
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  _showInstallBanner();
});

// FIX-XIX-2: ocultar banner si el usuario ya instaló la app
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'none';
  const btn = document.getElementById('btn-pwa-install');
  if (btn) btn.style.display = 'none';
  sessionStorage.setItem('pwa_install_dismissed', '1');
});

async function triggerPWAInstall() {
  const statusEl = document.getElementById('pwa-install-status');

  // Ya instalada
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    if (statusEl) statusEl.textContent = '✅ App ya instalada';
    toast('✅ La app ya está instalada en tu dispositivo', 'ok');
    return;
  }

  // Android/Desktop Chrome: usar el prompt nativo (instalación directa)
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast('📱 ¡App instalada! Búscala en tu pantalla de inicio.', 'ok');
        if (statusEl) statusEl.textContent = '✅ Instalada';
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
        const btn = document.getElementById('btn-pwa-install');
        if (btn) btn.style.display = 'none';
      } else {
        toast('Instalación cancelada', 'warn');
      }
      deferredPrompt = null;
    } catch(e) {
      showPWAInstallGuide();
    }
    return;
  }

  // iOS Safari o sin prompt: mostrar guía manual
  showPWAInstallGuide();
}

function dismissInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'none';
  sessionStorage.setItem('pwa_install_dismissed', '1');
}

window.addEventListener('appinstalled', () => {
  toast('✅ Finanzas instalada como app nativa', 'ok');
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'none';
  const btn = document.getElementById('btn-pwa-install');
  if (btn) btn.style.display = 'none';
  deferredPrompt = null;
});
// ══════════════════════════════════════════════════════════
// BIOMÉTRICO — WebAuthn con registro correcto de credencial
// ══════════════════════════════════════════════════════════
// FIX-H12: Biométrico eliminado — funciones removidas en Batch-H
// ─── BATCH-I — Correcciones (2026-03-12) ────────────────────────────────────
//  C1  sbSaveMov: guard !sb añadido; saveMovimiento usa window.sbSaveMov (parchado)
//  C2  doLogin: eliminada referencia a BIOMETRIC_KEY (causa del error al iniciar sesión)
//  C3  executeTransferRial: recalcMonth+render+offline; ↓↑ pills son solo visuales (span)
//  C4  modal-nueva-cuenta: z-index 10350→10850 (aparece sobre detail panel)
//  Rollback: revertir estos 4 cambios restaura el estado Batch-H
// ────────────────────────────────────────────────────────────────────────────
// ─── BATCH-II — Features (2026-03-12) ───────────────────────────────────────
//  B1  Hero balance = ingresos − gastos + ajustes (no saldo de cuentas)
//  B2  Fondo de emergencia: lógica por mes (30% ingresos) + total acumulado
//  B3  Botón ℹ️ en 7 KPI cards con CARD_INFO detallado
//  B4  Botón 🤖 en 7 KPI cards conectado a IA con contexto real
//  D1  KPI strip sortable con Sortable.js (drag ⠿, persiste CONFIG.kpiOrder)
//  D2  Movimientos dashboard: botones ✏️ 🗑️ al lado (sin swipe destructivo)
//  D3  FAB se oculta al abrir panel IA; se restaura al cerrar
//  T1  "Prestamo pagado" confirmado en select
//  T3  Fechas en formato "02 mar" en tabla desktop y lista móvil
//  M1  Modal modal-meta-cuenta insertado en DOM
//  M2  display_name cargado desde Supabase config_usuario al login
//  M3  Confirmación eliminar movimiento muestra descripción + monto
//  V1  Nuevas clases CSS: .settings-panel-dark, .settings-row-dark, etc.
//  EF  Fondo emergencia completo: por mes + total + retiros con movimiento especial
// ────────────────────────────────────────────────────────────────────────────
// ─── BATCH-III — Correcciones críticas (2026-03-12) ─────────────────────────
//  BUG1 KPI cards "Score" y "Predicción Anual": comillas dobles en onclick
//       rompían el HTML → dashboard vacío. Fix: comillas simples dentro del onclick
//  BUG2 openNuevaCuenta() no cerraba modal-cuentas ni modal-cuentas-v2-view
//       Fix: 2 líneas classList.remove('open') al inicio de la función
//  BUG3 Etiquetas ↑/↓ transferencia sin funcionalidad interactiva
//       Fix: font-weight:700 + cursor:pointer + onclick con showToast de total mensual
//  BUG4 Budget vs Real: barra sin colores claros
//       Fix: background inline verde ≤80% / amarillo 80-100% / rojo >100%
//       Valor real en negrita cuando excede el presupuesto
//  EF-FIX KPI F.Emergencia mostraba total acumulado — Fix: valor mes actual
// ────────────────────────────────────────────────────────────────────────────
// ─── PARTE-1 (sobre Batch-III) — Fixes deploy 2026-03-13 ────────────────────
//  FIX-REC  recalcMonth duplicada en línea ~11503 eliminada (override incorrecto
//           que ignoraba cat_totals → dashboard vacío y gráficos sin datos)
//  FIX-CTA  openNuevaCuenta(): cierra paneles padre antes de abrir formulario
//           (modal-cuentas y modal-cuentas-v2-view con classList.remove)
//  FIX-BDG  renderBudgetBars: barBg inline verde/amarillo/rojo + negrita si excede
//  FIX-TRF  Etiquetas ↑ Ingresos / ↓ Gastos en transferencia: font-weight+onclick
//           showToast con total de ingresos/gastos del mes actual
//  FIX-SCR  lockScroll()/unlockScroll() en openIA/closeIA, openModalCuentas/close,
//           openModal-mov/close — body.modal-open bloquea dashboard detrás de paneles
//  SW-V19   service-worker.js bump v18→v19 para forzar actualización de caché
// ────────────────────────────────────────────────────────────────────────────
// ─── BATCH-V — Parte 2 HOTFIX (2026-03-13) ──────────────────────────────────
//  CRITICAL-D    updateHeroBalance() tenía 'const d' declarado DOS veces en el
//                mismo scope (líneas 9757 y 9766). Causaba SyntaxError que
//                abortaba TODO el bloque 12 del script — el bloque que contiene
//                lockScroll, pwaNavRial, CUENTAS, y cientos de funciones más.
//                Fix: eliminada la segunda declaración, reutiliza el mismo 'd'.
//                Causa raíz: merge manual de dos versiones de la función.
//                Revertir: restaurar la segunda 'const d = EXCEL_DATA[...]'.
//  FIX-EF-BASE   Fondo de Emergencia rediseñado en openDineroFuera():
//                · Quitado: "Total acumulado todos los meses" como dato estático
//                · Quitado: botón "Registrar gasto del fondo"
//                · Agregado: campo editable de monto base con botón Guardar
//                · CONFIG.emergencyFundBase nuevo campo (default 0)
//                · efTotal = emergencyFundBase + sum(30% ingresos cada mes)
//                · saveEFBase() persiste en CONFIG via sbSaveConfig()
//                · updateEFBasePreview() muestra preview en tiempo real
//                · renderKPIs() y KPI-dashboard usan la misma fórmula efBase+meses
// ─────────────────────────────────────────────────────────────────────────────

// ─── BATCH-V — Parte 1 (2026-03-13) ─────────────────────────────────────────
//  FIX-HERO-UNIT  Hero balance + Ingresos + Gastos envueltos en #dash-hero-unit
//                 arrastrable como bloque único en el dashboard (Sortable).
//                 inc-card/exp-card reciben ℹ️→kpi-ingresos/kpi-gastos y 🤖 propios.
//                 Revertir: eliminar #dash-hero-unit wrapper, restaurar HTML original.
//  FIX-HERO-BAL   updateHeroBalance() siempre usa d.balance del mes actual.
//                 Eliminada rama if(CUENTAS.length>0) que reemplazaba el balance.
//  FIX-INTL-CTA   setCuentaTipo('internacional') muestra campo banco/país adicional.
//                 saveCuenta() guarda internacional:true, banco_pais, moneda:'USD'.
//                 Revertir: eliminar #nc-intl-field del HTML y _ncTipo de saveCuenta.
//  FIX-TOAST-TRF  Etiquetas ↑/↓ en transferencia llamaban showToast (inexistente).
//                 Fix: reemplazado por toast() con tipo ok/err.
//  FIX-LOCKSCROLL openSearch, openPareja, openBCVHistory, openRecurrentes ahora
//                 llaman lockScroll()/unlockScroll(). FAB se oculta con cualquier
//                 modal (lockScroll oculta FAB, unlockScroll lo restaura si no hay
//                 otro modal abierto).
//  FIX-TOAST-STACK toast() reescrito: apilable verticalmente en contenedor,
//                 botón ✕ por toast, cap de 5 toasts, auto-fade a 3.5s.
//                 Revertir: restaurar función toast() original de 4 líneas.
//  FIX-SCANNER    catch del escáner de recibo ahora llama toast() informando
//                 al usuario que llene manualmente.
//  FIX-PAREJA     renderParejaContent() infiere autor por cat/desc para txns
//                 del Excel (que no tienen campo author). Filtros Anthony/Isabel
//                 ahora incluyen movimientos "compartidos".
//  FIX-TRAVEL     activateTravelMode() actualizado. updateTravelConversion() nueva:
//                 muestra equivalencia en tiempo real en el formulario de movimiento.
//                 Revertir: eliminar #travel-conv-row del HTML y la función.
//  FIX-DINERO-EF  Sección 🆘 Fondo de Emergencia en openDineroFuera() con monto
//                 del mes, total acumulado, barra de progreso y botón de gasto.
//  FIX-GLASS      dinero-fuera-overlay usa var(--glass-surface) y backdrop-filter.
//                 CSS global --bg-card/--bg-input aliases para compatibilidad.
//  FIX-NAMES      getDisplayName() prioriza USER_NAMES sobre saved names (fijos).
//  FIX-CRUD-TOAST editTipo, editSubcat, updateBudget, KPI sortable → toast confirm.
//  FIX-CV2-CUR    renderCuentasV2List() muestra saldo en moneda seleccionada (pill).
//                 Badge 🌎 en cuentas internacionales. banco_pais visible en lista.
// ─────────────────────────────────────────────────────────────────────────────

// ─── BATCH-IV — Correcciones profundas (2026-03-13) ─────────────────────────
//  HERO-BALANCE   Hero balance SIEMPRE = ingresos−gastos+ajustes del mes actual
//                 Causa raíz: override usaba CUENTAS.reduce(calcCuentaBalance)
//                 cuando había cuentas — nunca era el balance mensual.
//                 Fix: eliminar rama if(CUENTAS.length>0), siempre usar d.balance
//                 Revertir: restaurar la rama if/else en updateHeroBalance override
//  KPI-BTNS       Las 7 KPI cards ahora tienen drag handle ⠿, botón ℹ️ y 🤖
//                 en el HTML (antes las cards eran divs planos sin botones)
//                 showCardInfo y askCardIA manejan prefijo k- → kpi- con mapa
//                 CARD_INFO, CARD_IA_PROMPTS, CARD_TITLES extendidos con 7 entradas kpi-*
//  KPI-SORTABLE   initAllSortable() inicializa Sortable en #kpi-strip también
//                 (antes solo inicializaba el grid del dashboard)
//  EF-SUB         Fondo emergencia KPI: subtítulo "Total: $X" (como Ahorros)
//                 efPct calculado sobre todos los meses, no solo el actual
//  META-MODAL     modal-meta-cuenta insertado en DOM HTML (el JS ya lo llamaba
//                 pero el div no existía → error al abrir 🎯 Meta)
//  SWIPE-FIX      Swipe destructivo eliminado en renderTransactions modo móvil
//                 Reemplazado por botones ✏️ 🗑️ inline (siempre visibles)
//  LOCK-SETTINGS  openSettings/closeSettings llaman lockScroll/unlockScroll
//  GLASS-SYSTEM   CSS glassmorphism global: backdrop-filter blur(24px) en TODO
//                 modals, panels, cards, KPI strip, sidebar, header, nav, toasts
//                 Variables: --glass-bg, --glass-surface, --glass-blur, etc.
//  SW-V20         service-worker.js bump v19→v20
// ────────────────────────────────────────────────────────────────────────────

function initBiometric() {} // stub vacío para compatibilidad con llamadas existentes

// ─── ANÁLISIS IA INLINE ─────────────────────
async function runIAInline() {
  const btn = document.getElementById('btn-ia-inline');
  const result = document.getElementById('ia-inline-result');
  if (!btn || !result) return;
  btn.textContent = '⏳...'; btn.disabled = true;
  result.innerHTML = '<div class="ia-inline-bubble" style="color:#484f58;font-style:italic">🤖 Analizando con Groq...</div>';
  try {
    const d = EXCEL_DATA[currentMonth];
    const top3 = Object.entries(d.cat_totals||{}).slice(0,3).map(([k,v])=>`${k.replace(/[🛸🏡🥑💅🚑🚓🏦📺📽️]/gu,'').trim()}:$${v.toFixed(0)}`).join(', ');
    const prompt = `Analiza el mes ${currentMonth} 2026: Ingresos=$${d.ingresos.toFixed(0)}, Gastos=$${d.gastos.toFixed(0)}, Ahorros=$${d.ahorros.toFixed(0)}, Balance=$${d.balance.toFixed(0)}. Top gastos: ${top3}. Dame 3 observaciones cortas y 1 consejo práctico. Máx 120 palabras.`;
    const reply = await groqCall(prompt, 'Eres analista financiero. Conciso, español venezolano amigable.');
    // Render as WhatsApp bubbles (split by line)
    // FIX-6: usar renderIAText unificado en lugar del replace manual
    // REVERT: restaurar el bloque split+map+replace original
    result.innerHTML = reply.split('\n').filter(l=>l.trim()).map(line => {
      return `<div class="ia-inline-bubble">${renderIAText(line)}</div>`;
    }).join('');
  } catch(e) {
    result.innerHTML = `<div class="ia-inline-bubble" style="border-left-color:#f85149;color:#f85149">❌ ${e.message}</div>`;
  }
  btn.textContent = '⚡ Analizar'; btn.disabled = false;
}

// ─── MODO ESCRITORIO ─────────────────────────
let desktopMode = false;
function toggleDesktopMode() {
  desktopMode = !desktopMode;
  document.body.classList.toggle('desktop-force', desktopMode);
  const btn = document.getElementById('btn-desktop-mode');
  if (btn) {
    btn.textContent = desktopMode ? '📱' : '🖥️';
    btn.title = desktopMode ? 'Volver a modo móvil' : 'Visualizar en modo escritorio';
    btn.style.borderColor = desktopMode ? '#3fb950' : '';
    btn.style.color = desktopMode ? '#3fb950' : '';
  }
  toast(desktopMode ? '🖥️ Modo escritorio activado' : '📱 Modo móvil restaurado', 'ok');
}

// ─── REORGANIZAR DASHBOARD ───────────────────
const SECTION_ORDER_KEY = 'finanzas_section_order';
const DASH_SECTIONS = [
  {id:'dash-s-ingvsgastos',    label:'📊 Ingresos vs Gastos'},
  {id:'dash-s-distribgastos',  label:'🥧 Distribución de Gastos'},
  {id:'dash-s-patrimoniochart',label:'📈 Patrimonio Neto (gráfico)'},
  {id:'dash-s-subcategastos',  label:'🔍 Gastos por Subcategoría'},
  {id:'dash-s-ingxtipo',       label:'💰 Ingresos por Tipo'},
  {id:'dash-s-topgastos',      label:'🏆 Top Gastos'},
  {id:'dash-s-topingresos',    label:'💚 Top Ingresos por Tipo'},
  {id:'dash-s-fondoemerg',     label:'🆘 Fondo de Emergencia'},
  {id:'dash-s-presupuesto',    label:'📋 Presupuesto vs Real'},
  {id:'dash-s-semanal',        label:'📅 Desglose Semanal'},
  {id:'dash-s-transacciones',  label:'📋 Movimientos del Mes'},
  {id:'dash-s-iaanalisis',     label:'🤖 Análisis IA del Mes'},
  {id:'dash-s-fire',           label:'🔥 Simulador FIRE'},
  {id:'dash-s-meta',           label:'🎯 Simulador de Meta'},
  {id:'dash-s-patrimest',      label:'🏦 Patrimonio Estimado'},
];
let currentOrder = DASH_SECTIONS.map(s => s.id);

function openReorganize() {
  // Cargar orden del usuario (Supabase tiene prioridad, luego localStorage)
  const saved = CONFIG.dashboardOrder || localStorage.getItem(SECTION_ORDER_KEY);
  if (saved) {
    try { currentOrder = typeof saved === 'string' ? JSON.parse(saved) : saved; } catch(e) {}
  }
  // Asegurar que todas las secciones estén (si se agregaron nuevas)
  DASH_SECTIONS.forEach(s => { if (!currentOrder.includes(s.id)) currentOrder.push(s.id); });
  renderReorganizeList();
  lockScroll();
  document.getElementById('modal-reorganize').classList.add('open');
}
function closeReorganize(e) {
  unlockScroll();
  document.getElementById('modal-reorganize').classList.remove('open');
}
function closeReorganizeIfOutside(e) {
  if (!e || e.target === document.getElementById('modal-reorganize')) closeReorganize();
}
function renderReorganizeList() {
  const list = document.getElementById('reorganize-list');
  list.innerHTML = currentOrder.map((id, i) => {
    const sec = DASH_SECTIONS.find(s => s.id === id);
    if (!sec) return '';
    return `<div style="display:flex;align-items:center;gap:8px;background:#1c2128;border:1px solid #30363d;border-radius:8px;padding:10px 12px">
      <span style="font-size:.8rem;flex:1;color:#e6edf3">${sec.label}</span>
      <button onclick="moveSection(${i},-1)" ${i===0?'disabled':''} style="background:#0d1117;border:1px solid #30363d;color:${i===0?'#484f58':'#58a6ff'};padding:3px 8px;border-radius:5px;cursor:${i===0?'default':'pointer'};font-size:.85rem">↑</button>
      <button onclick="moveSection(${i},1)" ${i===currentOrder.length-1?'disabled':''} style="background:#0d1117;border:1px solid #30363d;color:${i===currentOrder.length-1?'#484f58':'#58a6ff'};padding:3px 8px;border-radius:5px;cursor:${i===currentOrder.length-1?'default':'pointer'};font-size:.85rem">↓</button>
    </div>`;
  }).join('');
}
function moveSection(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= currentOrder.length) return;
  [currentOrder[i], currentOrder[j]] = [currentOrder[j], currentOrder[i]];
  renderReorganizeList();
}
async function applyReorganize() {
  const ok = await showConfirm('Reorganizar Dashboard', '¿Aplicar el nuevo orden de secciones?', '🔀');
  if (!ok) return;
  applyOrderToDOM(currentOrder);
  // Guardar en CONFIG (Supabase) Y localStorage (fallback)
  CONFIG.dashboardOrder = currentOrder;
  localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(currentOrder));
  sbSaveConfig();
  document.getElementById('modal-reorganize').classList.remove('open');
  toast('✅ Dashboard reorganizado y guardado', 'ok');
}
function applyOrderToDOM(order) {
  // Solo reordena dash-s-* después de wallet-section.
  // dash-hero-unit, kpi-strip, mobile-quick-actions y wallet-section son fijos.
  const anchor = document.getElementById('wallet-section');
  if (!anchor) return;
  let insertAfter = anchor;
  order.forEach(id => {
    if (!id.startsWith('dash-s-')) return;
    const el = document.getElementById(id);
    if (!el) return;
    insertAfter.after(el);
    insertAfter = el;
  });
}

// Aplicar orden guardado al cargar (usa CONFIG.dashboardOrder si viene de Supabase)
function applyStoredOrder() {
  const saved = CONFIG.dashboardOrder || localStorage.getItem(SECTION_ORDER_KEY);
  if (!saved) return;
  try {
    const order = typeof saved === 'string' ? JSON.parse(saved) : saved;
    applyOrderToDOM(order);
  } catch(e) {}
}


// ── Guía de reinstalación como app nativa ────────────────────
function showPWAInstallGuide() {
  var isIOS      = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches
                  || window.navigator.standalone;
  if (isStandalone) { toast('✅ La app ya está instalada correctamente', 'ok'); return; }

  lockScroll();
  var overlay = document.createElement('div');
  overlay.id = 'pwa-guide-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:10800;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick = function(e) { if(e.target===overlay){ unlockScroll(); overlay.remove(); } };

  var stepsHTML = isIOS
    ? '<div style="padding:8px 0;border-bottom:1px solid #21262d;font-size:.85rem;color:#e6edf3">1. Toca el botón <b>Compartir</b> (□↑) en Safari</div>'
    + '<div style="padding:8px 0;border-bottom:1px solid #21262d;font-size:.85rem;color:#e6edf3">2. Toca <b>"Añadir a pantalla de inicio"</b></div>'
    + '<div style="padding:8px 0;border-bottom:1px solid #21262d;font-size:.85rem;color:#e6edf3">3. Toca <b>Agregar</b> en la esquina superior</div>'
    + '<div style="padding:8px 0;font-size:.85rem;color:#3fb950">✅ Aparecerá como app nativa — no como acceso directo</div>'
    : '<div style="padding:8px 0;border-bottom:1px solid #21262d;font-size:.85rem;color:#e6edf3">1. Toca el menú <b>⋮</b> en Chrome</div>'
    + '<div style="padding:8px 0;border-bottom:1px solid #21262d;font-size:.85rem;color:#e6edf3">2. Toca <b>"Instalar aplicación"</b></div>'
    + '<div style="padding:8px 0;border-bottom:1px solid #21262d;font-size:.85rem;color:#e6edf3">3. Toca <b>Instalar</b> en el diálogo</div>'
    + '<div style="padding:8px 0;font-size:.85rem;color:#3fb950">✅ Se instalará como app — no como acceso directo</div>';

  var installBtn = deferredPrompt
    ? '<button onclick="triggerPWAInstall();document.getElementById(\'pwa-guide-overlay\').remove()" style="width:100%;margin-top:16px;background:#238636;border:1px solid #3fb950;color:#fff;padding:11px;border-radius:8px;font-weight:700;cursor:pointer;font-size:.88rem">📲 Instalar ahora</button>'
    : '';

  overlay.innerHTML = '<div style="background:#161b22;border:1px solid #3fb950;border-radius:16px;padding:24px;max-width:380px;width:100%">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    + '<span style="font-size:.95rem;font-weight:700;color:#e6edf3">📱 Instalar como app nativa</span>'
    + '<button onclick="unlockScroll();document.getElementById(\'pwa-guide-overlay\').remove()" style="background:none;border:none;color:#8b949e;font-size:1.1rem;cursor:pointer">✕</button>'
    + '</div>'
    + '<div style="background:#2d2207;border:1px solid #e3b341;border-radius:8px;padding:10px;margin-bottom:14px;font-size:.75rem;color:#8b949e;line-height:1.6">'
    + '⚠️ Si aparece como <b style="color:#e3b341">acceso directo</b>: elimínala de tu pantalla de inicio y reinstala siguiendo estos pasos:'
    + '</div>'
    + stepsHTML
    + installBtn
    + '</div>';

  document.body.appendChild(overlay);
}
