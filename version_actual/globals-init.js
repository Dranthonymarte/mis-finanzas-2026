// ── GLOBALS INIT ── declaraciones globales extraídas de app-core.js ──────
// Debe cargarse DESPUÉS de app-core.js (stub) y ANTES de household.js
// REGLA (13 Abr 2026): usar `var` para que sean window-accesibles cross-script.
// `let` al top-level = script-scoped, NO accesible desde otros módulos.

var _appInitialized = false; // guard de init única — accesible desde todos los módulos

var CONFIG = {
  tipos: [], categorias: {}, subcategorias: {},
  presupuestosIngresos: {}, presupuestos: {}, closedMonths: [],
  emergencyFundGoal: 3000, emergencyFundBase: 0,
  efManualBase: 0, efAutoContrib: 0,
  subscriptionStatus: 'free', subscriptionExpires: null,
  metasAhorro: [], _pinHash: null, efResetDate: null
};

var EXCEL_DATA = {};

const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
var activeMonths = ['Enero','Febrero','Marzo'];
var currentMonth = 'Marzo';
var charts = {};
var currentCurrency = 'USD';
var rateBCV = 431.01;
var rateEUR = 499.62;
var lastRateDate = null, lastRateTime = null;
const emergencyFundByMonth = {};
var RECURRENTES = [];
var templates = [];
var templateMode = false;
var selectedSubcatFilter = null;
var calcVal = '0', calcOperator = null, calcPrev = null,
    calcNewNum = true, calcHistory = '';
const userModifiedMonths = new Set();

months.forEach(m => {
  if (!EXCEL_DATA[m]) EXCEL_DATA[m] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
  if (EXCEL_DATA[m].ajustes === undefined) EXCEL_DATA[m].ajustes = 0;
});

function setCurrency(c) {
  currentCurrency = c;
  document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('cur-' + c).classList.add('active');
  if (typeof render === 'function') render();
}

function convertAmt(usd) {
  if (currentCurrency === 'BS') return usd * rateBCV;
  if (currentCurrency === 'EUR') return usd * rateBCV / rateEUR;
  return usd;
}

function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  const patterns = { light:[30], medium:[60], success:[30,50,30], error:[100,50,100] };
  navigator.vibrate(patterns[type] || [30]);
}

function fmt(n) {
  if (window._hideAmounts) return '••••••';
  const val = convertAmt(Math.abs(n || 0));
  const prefix = currentCurrency === 'BS' ? 'Bs ' : currentCurrency === 'EUR' ? '€' : '$';
  return prefix + val.toLocaleString('es-VE', {minimumFractionDigits:2,maximumFractionDigits:2});
}

function fmtSigned(n) {
  if (window._hideAmounts) return '••••••';
  return (n < 0 ? '-' : '') + fmt(n);
}

window._hideAmounts = localStorage.getItem('fin_hide_amounts') === '1';

function toggleHideAmounts() {
  window._hideAmounts = !window._hideAmounts;
  localStorage.setItem('fin_hide_amounts', window._hideAmounts ? '1' : '0');
  const btn = document.getElementById('btn-hide-balance');
  if (btn) btn.classList.toggle('hide-active', window._hideAmounts);
  if (typeof updateHeroBalance === 'function') updateHeroBalance();
  if (typeof renderWalletCards === 'function') renderWalletCards();
  if (typeof render === 'function') render();
}

function initHideBtn() {
  const btn = document.getElementById('btn-hide-balance');
  if (btn) btn.classList.toggle('hide-active', !!window._hideAmounts);
}
