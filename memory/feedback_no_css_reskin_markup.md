# ERROR REGISTRADO: CSS Re-skin ≠ Markup Rebuild

**Fecha:** 2026-05-16  
**Sesión:** batch60-batch63 (10 commits revertidos)  
**Severidad:** CRÍTICA — toda la implementación tuvo que rehacerse desde cero

---

## ¿Qué pasó?

Se recibió la instrucción: **"implementar el MARKUP/estructura del bundle, NO re-skinear"**  
Lo que se hizo en cambio: aplicar clases CSS y reglas nuevas sobre el markup HTML **viejo/legacy** que ya existía en `index.html`.

### Commits erróneos (revertidos):
```
82a9aa0  SW bump batch62 -> batch63
50f4676  Pixel-perfect F7+F8: una sola gramatica
a9c3fa7  SW bump batch61 -> batch62
8cc130e  Pixel-perfect F6: ScreenMore + Settings
06b326a  Pixel-perfect F5: ScreenAI
0e95571  Pixel-perfect F4: ScreenAccounts
c0acfef  Pixel-perfect F3: ScreenTxn
2d800b3  SW bump batch60 -> batch61
b10bd08  Pixel-perfect F2: user bar ScreenHome
d86820e  Pixel-perfect F1: TabBar bundle
```
Base correcta: `5d2d3f9` (bundle asegurado en propuestas/)

---

## Por qué está mal

El markup viejo tenía:
- IDs, grids y nesting diferentes al bundle
- Estructura semántica incompatible con el diseño nuevo
- CSS por capas encima = visual completamente diferente al bundle referencia

El resultado fue: **"NO SE PARECE en nada"** — tamaños, estética, paneles, todo incorrecto.

---

## Regla absoluta para implementaciones de UIX de bundle

### ✅ CORRECTO — Markup Rebuild
1. Leer el JSX del bundle (`m-shell.jsx`, `m-main.jsx`, etc.)
2. Identificar la estructura DOM exacta: contenedores, grids, clases, jerarquía
3. Reescribir el HTML (`index.html`) con esa estructura exacta
4. Aplicar CSS nuevo en capa dedicada (`mobile-uix.css`) que estiliza el nuevo markup
5. Preservar IDs críticos de datos (`hero-int`, `k-ingresos`, etc.) para que `app-*.js` siga funcionando

### ❌ INCORRECTO — CSS Re-skin
1. Dejar el markup viejo intacto
2. Añadir clases CSS encima intentando "parecer" al bundle
3. Ajustar padding/margin/color sin cambiar la estructura
→ **NUNCA produce el resultado visual correcto. Siempre falla.**

---

## Arquitectura correcta (capas)

```
index.html          ← estructura HTML fiel al JSX del bundle
                      (markup reconstruido, no re-skinned)
├── tokens.css      ← variables/tokens (NO TOCAR, ya es superior al bundle)
├── styles.css      ← estilos base globales (NO TOCAR)
├── mobile-uix.css  ← NUEVA capa dedicada: todo el CSS mobile UIX aquí
│                      No parchear shell.css / dashboard.css / pages.css
app-*.js            ← lógica JS (NO TOCAR, se alimenta de IDs en HTML)
```

---

## IDs críticos que DEBEN preservarse en el nuevo markup

`hero-int`, `hero-dec`, `hero-bs`, `hero-pills`, `pill-USD`, `pill-BS`, `pill-EUR`,  
`k-ingresos`, `k-gastos`, `k-ahorros`, `k-balance`, `k-score`, `k-emergency`, `k-forecast`,  
`k-ingresos-sub`, `k-gastos-sub`, `k-ahorros-sub`, `k-balance-sub`,  
`wallet-cards-container`, `mobile-recent-list`, `metas-cards-container`,  
`alertas-container`, `forecast-card-content`, `chart-overview`

---

## Validación antes de continuar

**Stop at 30%** (shell + TabBar + ScreenHome) para validación visual con el usuario antes de continuar.  
Un ojo humano viendo la app real detecta discrepancias que el código solo no puede garantizar.
