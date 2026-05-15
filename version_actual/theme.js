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

  // API pública mínima — único punto de entrada para alternar tema
  window.toggleTheme = function () {
    var next = current() === 'light' ? 'dark' : 'light';
    apply(next);
    writeStored(next);
    syncButton(next);
  };

  // ── Init: preferencia guardada > preferencia del sistema > oscuro ──
  var stored = readStored();
  var initial;
  if (stored === 'light' || stored === 'dark') {
    initial = stored;
  } else if (window.matchMedia &&
             window.matchMedia('(prefers-color-scheme: light)').matches) {
    initial = 'light';
  } else {
    initial = 'dark';
  }
  apply(initial);

  // Sincronizar botón cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { syncButton(current()); });
  } else {
    syncButton(current());
  }
})();
