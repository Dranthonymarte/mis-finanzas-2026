
// ═══════════════════════════════════════════════════════
//  DETECCIÓN REAL DE DISPOSITIVO + VIEWPORT ADAPTATIVO v13
//  Corre ANTES de render para que no haya flash de layout
// ═══════════════════════════════════════════════════════
(function detectAndAdapt() {
  const ua = navigator.userAgent;
  const isMobileHW = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  const isIOS      = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid  = /Android/i.test(ua);
  const isPWA      = window.matchMedia('(display-mode: standalone)').matches ||
                     window.navigator.standalone === true;
  // Señales adicionales de móvil
  const hasTouch   = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const narrowW    = window.screen.width <= 820 || window.innerWidth <= 820;

  // Marcar body antes de pintar
  if (isMobileHW) document.documentElement.classList.add('is-mobile-hw');

  function applyViewport() {
    const W   = window.innerWidth  || screen.width;
    const H   = window.innerHeight || screen.height;
    const DPR = window.devicePixelRatio || 1;
    // Móvil si: hardware móvil OR pantalla angosta OR touch + pantalla < 900
    const isMob = isMobileHW || W <= 820 || (hasTouch && W < 900);

    // Clasificar tamaño
    let sizeClass = 'screen-lg';
    if (W < 360)       sizeClass = 'screen-xs';
    else if (W < 420)  sizeClass = 'screen-sm';
    else if (W < 600)  sizeClass = 'screen-md';
    else if (W < 900)  sizeClass = 'screen-tab';
    else               sizeClass = 'screen-lg';

    // Aplicar clases al body
    const body = document.body;
    body.classList.toggle('is-mobile',  isMob);
    body.classList.toggle('is-ios',     isIOS);
    body.classList.toggle('is-android', isAndroid);
    body.classList.toggle('is-pwa',     isPWA);
    ['screen-xs','screen-sm','screen-md','screen-tab','screen-lg'].forEach(c => body.classList.remove(c));
    body.classList.add(sizeClass);

    // Calcular variables CSS adaptativas con las medidas REALES
    const fontScale  = Math.max(0.85, Math.min(1.15, W / 390));
    const spaceScale = Math.max(0.7,  Math.min(1.2,  W / 390));
    const navH = isMob ? Math.max(56, Math.min(68, H * 0.075)) : 0;

    const root = document.documentElement.style;
    root.setProperty('--vp-w',    W + 'px');
    root.setProperty('--vp-h',    H + 'px');
    root.setProperty('--nav-h',   navH + 'px');
    root.setProperty('--font-xs', (0.62 * fontScale).toFixed(3) + 'rem');
    root.setProperty('--font-sm', (0.74 * fontScale).toFixed(3) + 'rem');
    root.setProperty('--font-base',(0.84 * fontScale).toFixed(3) + 'rem');
    root.setProperty('--font-lg', (0.98 * fontScale).toFixed(3) + 'rem');
    root.setProperty('--spacing-xs', (4  * spaceScale).toFixed(1) + 'px');
    root.setProperty('--spacing-sm', (8  * spaceScale).toFixed(1) + 'px');
    root.setProperty('--spacing-md', (14 * spaceScale).toFixed(1) + 'px');
    root.setProperty('--spacing-lg', (22 * spaceScale).toFixed(1) + 'px');
    root.setProperty('--kpi-val',   (1.05 * fontScale).toFixed(3) + 'rem');
    root.setProperty('--card-radius', (isMob ? 10 : 12) + 'px');

    // Guardar para session
    try { sessionStorage.setItem('fp_viewport', JSON.stringify({W,H,DPR,isMob,sizeClass})); } catch(e){}
  }

  // Guardar en closure para re-usar en DOMContentLoaded
  window._applyViewport = applyViewport;

  // CRÍTICO: document.body puede ser null si el script corre en <head>
  // Si body no existe aún, esperamos DOMContentLoaded
  if (document.body) {
    applyViewport();
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      applyViewport();
      // Segunda pasada 100ms después para cubrir PWA standalone
      setTimeout(applyViewport, 100);
    });
  }

  // Re-calcular en resize (rotación, split view, etc.)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyViewport, 120);
  });
  window.addEventListener('orientationchange', () => setTimeout(applyViewport, 300));

  // PWA standalone: re-aplicar al hacer foco en la ventana
  window.addEventListener('pageshow', () => setTimeout(applyViewport, 50));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(applyViewport, 50);
  });
})();
