#!/usr/bin/env node
// deploy-check.js — Validador pre-deploy Mis Finanzas 2026
// Uso: node deploy-check.js  (desde version_actual/)
// Bloquea el deploy si detecta: versiones SW desincronizadas, orphan preloads,
// scripts huérfanos (referenciados en HTML pero no existen), módulos fuera de PRECACHE.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
let errors = 0;
let warnings = 0;

function fail(msg)  { console.error('❌ FAIL:', msg); errors++; }
function warn(msg)  { console.warn('⚠  WARN:', msg); warnings++; }
function ok(msg)    { console.log('✅ OK:  ', msg); }

// ── 1. Versiones SW sincronizadas ─────────────────────────────────────────
const swJs   = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const swLoad = fs.readFileSync(path.join(ROOT, 'sw-loader.js'), 'utf8');
const swVer  = (swJs.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1];
const expVer = (swLoad.match(/SW_EXPECTED_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1];
if (!swVer)  fail('CACHE_VERSION no encontrado en service-worker.js');
if (!expVer) fail('SW_EXPECTED_VERSION no encontrado en sw-loader.js');
if (swVer && expVer && swVer !== expVer)
  fail(`Versiones desincronizadas: service-worker=${swVer}  sw-loader=${expVer}`);
else if (swVer && expVer)
  ok(`SW version sincronizada: ${swVer}`);

// ── 2. Orphan preloads en index.html ──────────────────────────────────────
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const preloads = [...html.matchAll(/<link[^>]+rel=["']preload["'][^>]+href=["']([^"']+\.js)["']/g)]
  .map(m => m[1]);
const scriptSrcs = new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m => {
  const p = m[1]; return p.startsWith('/') ? p : '/' + p;
}));
for (const preload of preloads) {
  const key = preload.startsWith('/') ? preload : '/' + preload;
  if (!scriptSrcs.has(key)) fail(`Orphan preload sin <script src>: ${preload}`);
  else warn(`Preload detectado (OK tiene script): ${preload}`);
}
if (preloads.length === 0) ok('Sin orphan preloads en index.html');

// ── 3. Scripts locales en index.html existen como archivos ────────────────
const localScripts = [...html.matchAll(/<script[^>]+src=["'](\/)?([^"'\/][^"']*)["']/g)]
  .map(m => m[2]).filter(s => !s.startsWith('http'));
for (const s of localScripts) {
  if (!fs.existsSync(path.join(ROOT, s))) fail(`Script referenciado pero no existe: ${s}`);
}
ok(`Scripts locales verificados: ${localScripts.length}`);

// ── 4. Módulos locales de index.html en PRECACHE_URLS ─────────────────────
const precacheBlock = (swJs.match(/PRECACHE_URLS\s*=\s*\[([^\]]+)\]/) || ['',''])[1];
const precached = new Set([...precacheBlock.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]));
for (const s of localScripts) {
  const key = '/' + s.replace(/^\//, '');
  if (!precached.has(key)) warn(`Módulo no está en PRECACHE_URLS: ${s}`);
}
ok('Verificación PRECACHE completada');

// ── Resultado final ────────────────────────────────────────────────────────
console.log('');
if (errors > 0) {
  console.error(`🚫 Deploy BLOQUEADO — ${errors} error(es), ${warnings} advertencia(s). Corrige antes de deployar.`);
  process.exit(1);
} else {
  console.log(`🚀 Deploy autorizado — 0 errores, ${warnings} advertencia(s). Procede con wrangler.`);
}
