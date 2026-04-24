// ╔══════════════════════════════════════════════════════════════╗
// ║  config.js — Mis Finanzas 2026                               ║
// ║  Todas las constantes de configuración en un solo lugar.     ║
// ║  Registro abierto — auth controlada por Supabase Auth + RLS. ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Supabase ──────────────────────────────────────────────────
const SUPABASE_URL = 'https://jcgoccaisemrfsuwwrrl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ29jY2Fpc2VtcmZzdXd3cnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDc0NTYsImV4cCI6MjA4ODU4MzQ1Nn0.vZWSLR9B7rRr_uV3KIpfCiGmNknMZd7osRtjGu8iDHg';

// ── Usuarios conocidos (solo display names — auth vía Supabase) ──────────
const USER_NAMES = {
  'anthonymarte12@gmail.com':         'Anthony Marte',
  'isabelcristinapedrales@gmail.com': 'Isabel Pedrales'
};

// ── Reglas financieras ────────────────────────────────────────
const EF_CONTRIB_RATE     = 0.30;   // % de cada ingreso → fondo emergencia
const DEFAULT_EF_GOAL     = 3000;   // meta default del fondo (USD)
const DEFAULT_RATE_BCV    = 431.01; // tasa BCV de fallback (Bs/USD)
const DEFAULT_RATE_EUR    = 499.62; // tasa EUR de fallback (Bs/EUR)

// ── App metadata ──────────────────────────────────────────────
const APP_VERSION  = 'Batch-XXVIII-r1';
const SW_VERSION   = 'finanzas-v50-batch28';
const MONTHS_ES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// ── Google Calendar ───────────────────────────────────────────
window.GOOGLE_CLIENT_ID = '379267596046-onlfc458oei5bhm9q2hiabkmndjufifi.apps.googleusercontent.com';