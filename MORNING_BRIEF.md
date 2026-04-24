# MORNING_BRIEF — Mis Finanzas 2026

**Última actualización:** pendiente primera corrida nocturna (noche 2026-04-17 → 2026-04-18)

---

## 🌙 Estado última noche
_Este bloque lo regenera el trigger `T06_cierre_nocturno` al final de cada corrida._

- Triggers completados: —
- Triggers fallidos: —
- Tokens consumidos aprox: —
- Contexto acumulado: —

## 📋 Reportes disponibles
_Cada trigger genera uno. Links relativos a `nocturno/`._

- [ ] `INVENTARIO.md` — archivos vivos vs muertos (T01)
- [ ] `DEPS.md` — mapa de globals y dependencias (T02)
- [ ] `DUPLICADOS.md` — funciones duplicadas a consolidar (T03)
- [ ] `SECURITY.md` — secretos detectados en código (T04)
- [ ] `UX_GAPS.md` — brecha vs zip de referencia (T05)

## 🎯 Decisiones pendientes para Anthony
_El trigger T06 lista aquí lo que necesita tu OK._

- _(vacío hasta primera corrida)_

## ⚡ Próximo paso concreto
**Prompt listo para pegar al abrir Claude Code:**
```
Contexto: MORNING_BRIEF.md + CONTEXT_ROUTE.md
Tarea: Revisar reportes nocturnos, decidir Fase 4 (destino app-core.js)
```

## 🧹 Higiene de sesión
- Si este archivo tiene >24h → los reportes están stale, revalidar
- Al iniciar: **no leas** `context/chat_*.txt` — este archivo es suficiente
- Si durante el día pasa del 25% de contexto → cerrar sesión con `/close`
