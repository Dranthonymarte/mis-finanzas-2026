# PENDIENTES — Mis Finanzas 2026 (React App)

Orden por impacto. Actualizar al completar.
**Última actualización:** 2026-05-26 · rama `react-preview` · HEAD `e824580`

---

## 🔴 Acción ANTHONY (no código)

1. **hCaptcha secret key** — Supabase Dashboard → Auth → Attack Protection → pegar secret key de hcaptcha.com
2. **VAPID keys** — ver instrucciones al final de este archivo
3. **CF Worker BCV** — ver instrucciones al final de este archivo
4. **CF Pages config** (si no está):
   - Build command: `cd version_actual/react-app && npm ci && npm run build`
   - Build output: `version_actual/react-app/dist`
   - Env var: `VITE_GROQ_API_KEY` = key de console.groq.com

---

## ✅ Completado (batches 1–5, sesión 26 May 2026)

- [x] Supabase Realtime en useTransactions + useAccounts (postgres_changes + visibilitychange)
- [x] Backfill household_id NULL → 1,434 movimientos corregidos
- [x] Patrimonio = TODAS las cuentas (incl. AHORRO) + me deben
- [x] Score financiero: max(ahorro, neto positivo) como proxy real
- [x] Fondo emergencia: "Reserva recomendada", 30% ingresos, no asociado a cuentas
- [x] Filtro rate_type BCV / Sin BCV en Buscar.tsx
- [x] Tasa BCV visible bajo campo monto + botón "Obtener BCV"
- [x] Pareja: invitación real via supabase.auth.signInWithOtp
- [x] AppShell: animación slide lateral eliminada
- [x] Subcategorías: UIX idéntico a Categorías + chips muestran TODAS las categorías
- [x] Categorías: borde sutil uniforme en todas las cards
- [x] Tipos: "Ahorro en efectivo" chip separado
- [x] ListaCompras: multi-lista completa (listas → productos)
- [x] KPI Insights: score/100, superávit, tasa ahorro, fondo %, top gasto
- [x] Análisis: Ingresos tappable → desglose por categoría + comparativa mes anterior
- [x] Groq 405 FIX: functions/api/groq.js movido a raíz del repo
- [x] Home.tsx: 7 queries → 1 RPC get_home_stats (histKPIs 5M + ahorro + ingresos históricos)
- [x] NewTransaction: cola offline localStorage — flush al reconectar
- [x] NewAccount: insert real a tabla cuentas
- [x] useAccounts: trend real vs mes anterior, oculta 0%
- [x] Push notifications: sw-push-handler.js + usePushSubscription hook + tabla push_subscriptions
- [x] CF Worker BCV: workers/bcv-rate/index.js + wrangler.toml (pendiente deploy Anthony)
- [x] Supabase RPC get_home_stats aplicado en producción
- [x] Tabla push_subscriptions con RLS creada en producción

---

## 🔴 Seguridad — Pendiente (código)

1. **Rate limiting en /api/groq** — cualquiera con el URL puede llamarla sin auth. Agregar validación de `Authorization: Bearer <supabase_jwt>` en la CF Function.
2. **hCaptcha** — BUG-SEC2 activo (acción Anthony en Supabase dashboard)
3. **Input sanitization** — Escanear.tsx envía imagen a Groq sin validar tamaño (max 5MB recomendado)

---

## 🟡 Features pendientes

- [ ] KPI: "Presupuesto excedido en: X, Y" — requiere presupuesto por categoría definido
- [ ] Google Sign-In en Login — botón existe, flujo OAuth completo falta
- [ ] Fonts offline PWA — /public/fonts/ con .woff2 (Inter, Instrument Serif, JetBrains Mono)
- [ ] Settings: color picker por categoría
- [ ] Modo desktop: breakpoints en tokens.css
- [ ] Exportación PDF / compartir por Telegram
- [ ] Bot Telegram: registrar movimientos y recibir reportes
- [ ] Home.tsx RPC: incluir fondo_emergencia en get_home_stats (4ta query eliminable)

---

## 📋 Instrucciones VAPID keys

```bash
# 1. Instalar web-push
npm install -g web-push

# 2. Generar keys
npx web-push generate-vapid-keys

# Output:
# Public Key:  Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 3. Agregar en Cloudflare Pages → Settings → Environment variables:
#    VITE_VAPID_PUBLIC_KEY = <Public Key>

# 4. Guardar Private Key en el CF Worker de notificaciones (cuando se implemente el sender)
```

---

## 📋 Instrucciones CF Worker BCV

```bash
# Desde la raíz del repo:
cd workers/bcv-rate

# 1. Configurar secrets (solo la primera vez):
wrangler secret put SUPABASE_URL
# → pegar: https://jcgoccaisemrfsuwwrrl.supabase.co

wrangler secret put SUPABASE_SERVICE_KEY
# → pegar: la service_role key de Supabase Dashboard → Settings → API

# 2. Deploy:
wrangler deploy

# 3. Verificar manualmente:
# GET https://bcv-rate-updater.<tu-subdominio>.workers.dev/update
```
