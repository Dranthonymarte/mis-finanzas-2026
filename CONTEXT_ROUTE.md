# CONTEXT_ROUTE — Ruta de lectura óptima por tarea

Protocolo único para iniciar sesión. Reemplaza lectura ciega de chat_*.txt.

## Obligatorio siempre (~4KB total)
1. `CLAUDE.md` — reglas del proyecto
2. `MORNING_BRIEF.md` — estado del día (si existe y es ≤24h)

## Opcional según tarea (leer SOLO lo pertinente)

| Si tarea implica… | Leer además |
|---|---|
| Depuración de duplicados | `nocturno/DUPLICADOS.md` |
| Scope bug / globals | `nocturno/DEPS.md` + `globals-init.js` |
| Seguridad / secretos | `nocturno/SECURITY.md` |
| UX / diseño / tokens | `nocturno/UX_GAPS.md` + `propuestas/ux-referencia/tokens.css` |
| Bugfix específico | `BUGS.md` + archivo del bug exacto |
| Deploy | nada extra |
| Refactor módulo X | `nocturno/DEPS.md` (fila de X) + archivo X |

## Nunca leer por defecto
- ❌ `context/chat_*.txt` anteriores (MORNING_BRIEF ya los resume)
- ❌ `versiones_anteriores/` (solo ante restauración)
- ❌ `nocturno/INVENTARIO.md` (raw, ya consumido por DEPS/DUPLICADOS)
- ❌ `app-core.js` completo (solo rangos específicos)

## Regla de oro
Antes de cualquier `Read`: ¿el dato ya está en contexto de esta sesión? Si sí → no leer.
