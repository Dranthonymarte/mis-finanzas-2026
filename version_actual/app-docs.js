
// ── Documentación del sistema — funciones de control ──────────────────
function openAppDocs() {
  document.getElementById('modal-app-docs').style.display = 'block';
  lockScroll(); // FIX-XVIII-1
}
function closeAppDocs() {
  document.getElementById('modal-app-docs').style.display = 'none';
  unlockScroll(); // FIX-XVIII-1
}
function docsTab(idx) {
  document.querySelectorAll('.docs-tab-btn').forEach((b,i) => {
    b.classList.toggle('docs-tab-active', i === idx);
  });
  document.querySelectorAll('.docs-panel').forEach((p,i) => {
    p.style.display = i === idx ? '' : 'none';
  });
}
// Atajo de teclado: Ctrl + Shift + D
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    const modal = document.getElementById('modal-app-docs');
    if (modal.style.display === 'block') closeAppDocs(); else openAppDocs();
  }
});
