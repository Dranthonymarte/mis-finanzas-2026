// ╔══════════════════════════════════════════════════════════════════════╗
// ║  theme.js · Mis Finanzas 2026 — Light/Dark mode (F6 batch56)         ║
// ║  CAPA: lógica UI pura. Responsabilidad única: gestión del tema.      ║
// ║  NO importa datos, NO toca negocio/auth/Supabase. Aislado.          ║
// ║  Contrato: tokens.css define [data-theme="light"]. Aquí solo se      ║
// ║  alterna el atributo data-theme en <html> y se persiste.            ║
// ╚══════════════════════════════════════════════════════════════════════╝
(function () {
  'use strict';

  var STORAGE_KEY = 'finanzas-theme';
  var root = document.documentElement;

  function readStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }

  function writeStored(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
  }

  function apply(theme) {
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme'); // dark = default (sin atributo)
  }

  function current() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function syncButton(theme) {
    var btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.textContent = theme === 'light' ? '☀️' : '🌙';
      btn.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    }
  }

  // ── LIGHT MODE DESACTIVADO TEMPORALMENTE ───────────────────────────
  // Causa: styles.css legacy (132KB) tiene colores hex hardcoded que NO
  // responden a [data-theme="light"] → mitad clara / mitad oscura = roto.
  // El light mode se REACTIVA cuando el rediseño pixel-perfect (bundle
  // Mobile UIX) migre todos los estilos a tokens. Hasta entonces: dark
  // forzado + botón oculto. Mejor sin feature que rompiendo la app.
  // ───────────────────────────────────────────────────────────────────
  window.toggleTheme = function () {
    // No-op intencional hasta rediseño completo (evita app rota).
    apply('dark');
  };

  apply('dark'); // dark forzado: único tema consistente hoy

  function hideToggle() {
    var btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.style.display = 'none';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideToggle);
  } else {
    hideToggle();
  }
})();
