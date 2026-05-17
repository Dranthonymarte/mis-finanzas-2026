# SUPABASE_SCHEMA.md — Mis Finanzas 2026

Cache local del schema de producción. Evita re-querys cada sesión.
**Project:** `jcgoccaisemrfsuwwrrl` · **household_id:** `fa3f7b3b-148b-4dea-8e2a-37f740c08b3d`

> **Regla:** Antes de aplicar cualquier query/feature → consultar este archivo.
> Si una tabla/columna referida acá no coincide con el código → re-query con MCP y actualizar este doc en el mismo cambio.
> Última actualización: 2026-05-17

---

## TABLAS PRINCIPALES (filas a 17 May 2026)

| Tabla | Filas | RLS | Uso |
|---|---|---|---|
| `movimientos` | 1319 | ✅ | Transacciones — fuente de verdad de ingresos/gastos |
| `cuentas` | 18 | ✅ | Cuentas USD/VES + cuentas DEBT (excluidas del balance) |
| `households` | 5 | ✅ | Hogares (household_id principal) |
| `household_members` | 6 | ✅ | Miembros (Anthony + Isabel) |
| `config_usuario` | 4 | ✅ | Settings + presupuestos + metas_ahorro + dashboard_order (jsonb) |
| `fondo_emergencia` | 3 | ✅ | EF mensual (mes, monto) |
| `dinero_fuera` | 10 | ✅ | Deudas + préstamos (con abonos jsonb) |
| `metas` | **0** | ✅ | Goals dedicada — **VACÍA, no usada** |
| `tasas_cambio` | 8 | ✅ | USD/VES BCV + paralelo |
| `tasas_historicas` | 51 | ✅ | Histórico de tasas |
| `listas_compras` | 0 | ✅ | Listas de compra (list-based JSONB, ver esquema abajo) |
| `plantillas_usuario` | 0 | ✅ | Plantillas (vacía, viven en config_usuario.plantillas) |
| `feature_flags` | 1 | ✅ | Flags globales (SELECT para authenticated) |
| `scheduled_notifications` | 21 | ✅ | Worker telegramcron |
| `telegram_connections` | 1 | ✅ | Bot link |
| `push_subscriptions` | 1 | ✅ | Web Push |
| `google_oauth_tokens` | 1 | ✅ | Calendar OAuth |
| `project_files` | 53 | ✅ | Archivos de código (SELECT authenticated; write = service_role only) |
| `working_version_files` | 30 | ✅ | Backups de archivos (deny_all para anon) |

**Deprecated (no tocar):** `_deprecated_alertas`, `_deprecated_reminders`, `_deprecated_notificaciones_programadas`, `household` (singular, legacy de `households`).

---

## ESQUEMA — `movimientos` (FUENTE DE VERDAD)

```
id            text  PK            (no UUID — generado client-side)
user_id       uuid  NOT NULL      ← DEBE SER householdId (RLS usa active_household_id())
household_id  uuid                (RLS scope)
mes           text  NOT NULL      formato "Mayo", "Diciembre" (nombre español completo)
                                  ⚠️ NO "YYYY-MM". Convertir con mesIdToDbKey("may-26") → "Mayo"
fecha         date  NOT NULL
descripcion   text  NOT NULL      max 200 chars
tipo          text  NOT NULL      valores reales en español:
                                  "Gasto" | "Ingreso Fijo" | "Ingreso Variable" |
                                  "Ahorro en efectivo" | "Transferencia Interna" |
                                  "Prestamo recibido" | "Prestamo pagado" | "Ajuste"
cat           text  NOT NULL      categoría — default '' (NOT NULL)
subcat        text  NOT NULL      subcategoría — SIEMPRE '' nunca NULL
amount        numeric NOT NULL    USD (negativo para gastos, positivo para ingresos)
amount_bs     numeric NOT NULL    VES snapshot — SIEMPRE 0 si no aplica, nunca NULL
rate_type     text                bcv | paralelo | manual (default 'bcv')
method        text                default '' (NOT NULL)
cuenta_id     uuid                FK → cuentas.id (nullable)
author        text                null | 'i' | 'a' (minúsculas)
fuente        text                app | telegram | gcal (default 'app')
gcal_event_id text                nullable
deleted_at    timestamptz         SOFT DELETE — SIEMPRE filtrar IS NULL
ef_contribution numeric           nullable
created_at    timestamptz
updated_at    timestamptz
```

**Reglas críticas:**
- Transacciones **INMUTABLES**: para "editar" → `deleted_at = now()` en original + INSERT con nuevo UUID.
- `user_id` en INSERT = `householdId` (UUID del household), NO `auth.uid()`. RLS valida `active_household_id()`.
- `subcat` y `method` son NOT NULL en DB — SIEMPRE enviar `''` no `null`.
- Queries siempre con `WHERE deleted_at IS NULL`.
- Scope: `user_id = householdId`. **NUNCA** `user_id = auth.uid()`.

---

## ESQUEMA — `cuentas`

```
id                    uuid  PK
user_id               uuid  NOT NULL
household_id          uuid
nombre                text  NOT NULL
color                 text  NOT NULL  default '#3fb950'
moneda                text  NOT NULL  default 'USD'   (USD | VES)
saldo_inicial         numeric NOT NULL default 0
balance_override      numeric            (cuando ≠ NULL → se usa este valor desde balance_override_date)
balance_override_date date
owner                 text               A | I | shared
activa                boolean NOT NULL default true
meta_ahorro           numeric            ← target de ahorro PER-ACCOUNT (numeric, no jsonb)
logo_url, website_url, notas text
created_at, updated_at
```

**Tipo cuenta DEBT:** se infiere por convención (nombre/categoría). Excluidas del balance total. Verificar lógica en `app-cuentas.js`.

---

## ESQUEMA — `config_usuario` (un row por user_id)

JSONB columns clave:
```
tipos                  jsonb  array de tipos custom
categorias             jsonb  {tipo: [cat,...]}
subcategorias          jsonb  {cat: [sub,...]}
presupuestos           jsonb  {cat: monto USD}    ← presupuestos por categoría
presupuestos_subcat    jsonb  {cat: {sub: monto}}
presupuestos_ingresos  jsonb  {tipo: monto}
metas_ahorro           jsonb  array de metas      ← uno de los 3 lugares para goals
cuentas_metas          jsonb  {cuenta_id: ...}
dashboard_order        jsonb  array de dash-s-* IDs (orden custom)
nav_order              jsonb  array IDs nav
recurrentes            jsonb  array recurring rules
plantillas             jsonb  array templates
deudas                 jsonb  array
prestamos              jsonb  array
cat_emojis             jsonb  {cat: emoji}
cat_rules              jsonb  array de auto-cat rules
fire_config            jsonb  {goal: {meta, extra, plazo, actual}}
                              ⚠️ Shape real: fire_config.goal.meta (número FIRE), .extra (ahorro/mes),
                              .plazo (años), .actual (patrimonio actual)
google_calendar_token  jsonb
closed_months          jsonb  array de "YYYY-MM" cerrados
wallet_order           jsonb  array
```

Numeric columns:
```
emergency_fund_base / _goal / ef_manual_base / ef_auto_contrib / ef_reset_date
subscription_status (text: 'free' | 'pro' | ...)
```

---

## METAS / GOALS — 3 fuentes (DECIDIR cuál usar)

| Fuente | Tipo | Estado | Uso |
|---|---|---|---|
| `metas` (tabla) | uuid + nombre + monto_meta + monto_actual + fecha_limite | 0 rows — **vacía** | Diseñada pero no adoptada |
| `config_usuario.metas_ahorro` | jsonb array | desconocido (verificar contenido) | Probable actual |
| `cuentas.meta_ahorro` | numeric per cuenta | algunas cuentas tienen valor | Target por cuenta — más simple |

**Pendiente confirmar con Anthony cuál es la fuente activa antes de wirear GoalsMini.**

---

## ESQUEMA — `fondo_emergencia`

```
id      uuid PK
user_id uuid NOT NULL
mes     text NOT NULL    "YYYY-MM"
monto   numeric NOT NULL
updated_at
```

Total EF = SUM(monto) por user/household. También influye `config_usuario.emergency_fund_base/goal/ef_manual_base/ef_auto_contrib`.

---

## ESQUEMA — `dinero_fuera` (deudas + préstamos)

```
id              text PK
household_id    uuid
user_id         uuid
tipo            text   debt | loan (a confirmar valores reales)
nombre / concepto text
monto_original  numeric
monto_abonado   numeric
abonos          jsonb  array de {fecha, monto}
fecha_inicio / fecha_vencimiento / fecha_pago  date
pagado          boolean
```

---

## QUERIES DE REFERENCIA — Dashboard

```sql
-- Ingresos mes actual (USD)
SELECT COALESCE(SUM(amount),0) FROM movimientos
WHERE household_id=$1 AND tipo='INCOME' AND mes=$2 AND deleted_at IS NULL;

-- Gastos mes actual
SELECT COALESCE(SUM(amount),0) FROM movimientos
WHERE household_id=$1 AND tipo='EXPENSE' AND mes=$2 AND deleted_at IS NULL;

-- Categorías mes (top 4 gasto)
SELECT cat, SUM(amount) AS total FROM movimientos
WHERE household_id=$1 AND tipo='EXPENSE' AND mes=$2 AND deleted_at IS NULL
GROUP BY cat ORDER BY total DESC LIMIT 4;

-- Flujo diario mes
SELECT fecha, tipo, SUM(amount) FROM movimientos
WHERE household_id=$1 AND mes=$2 AND deleted_at IS NULL
GROUP BY fecha, tipo ORDER BY fecha;

-- Movimientos recientes
SELECT * FROM movimientos
WHERE household_id=$1 AND deleted_at IS NULL
ORDER BY fecha DESC, created_at DESC LIMIT 8;

-- Cuentas activas (excluyendo DEBT — lógica en cliente)
SELECT * FROM cuentas WHERE household_id=$1 AND activa=true ORDER BY nombre;

-- Patrimonio histórico (12 meses) — derivado de movimientos + saldo_inicial
-- Lógica compleja en app-core.js / app-analytics.js
```

---

## EDGE FUNCTIONS

```
telegram-bot-webhook    v7
vapid-push              v4
google-oauth            v1
google-calendar-sync    v3
gmail-reports           v1
```

Worker Cloudflare: `telegramcron` (lee `scheduled_notifications`).
**Secrets en Worker, NUNCA frontend:** `TELEGRAM_BOT_TOKEN`, `SUPABASE_SERVICE_KEY`.

---

## ESQUEMA — `listas_compras`

```
id           text PK            generado client-side
user_id      uuid NOT NULL
household_id uuid NOT NULL
nombre       text default 'Lista'
items        jsonb NOT NULL     array de items — shape: [{id, nombre, cantidad, precio, checked}]
                                ⚠️ campo es 'checked' NO 'comprado'
activa       boolean default true
archivada    boolean default false
tasa_usada   numeric nullable
created_at, updated_at
```

**Patrón de uso:** una sola lista activa por household. Todas las mutations hacen UPDATE de `items` jsonb array completo (no rows individuales de items).

---

## CHANGELOG DEL SCHEMA

| Fecha | Cambio |
|---|---|
| 2026-04-25 | Doc inicial — captura de schema vivo via MCP |
| 2026-05-17 | Actualización: row counts, mes format ("Mayo"), tipo valores en español, user_id=householdId, fire_config shape real, listas_compras schema, project_files RLS fix (BUG-25/26) |
