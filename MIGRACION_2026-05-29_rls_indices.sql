-- ═══════════════════════════════════════════════════════════════════
-- MIGRACIÓN 2026-05-29 — Optimización RLS + índices FK (Mis Finanzas)
-- ═══════════════════════════════════════════════════════════════════
-- Origen: auditoría layer-by-layer (get_advisors performance + security).
--
-- QUÉ HACE (solo tablas de Mis Finanzas, NO toca tablas de la clínica):
--   1. CREATE INDEX en 7 foreign keys sin índice  → joins/RLS más rápidos
--   2. ALTER POLICY: envuelve auth.uid() en (select auth.uid())
--      → corrige warning auth_rls_initplan (evita re-evaluar auth.uid()
--        por cada fila; lo evalúa UNA vez por query — InitPlan)
--   3. Nota sobre policy duplicada en push_subscriptions (opcional, abajo)
--
-- NO TOCA: movimientos, cuentas, dinero_fuera, config_usuario
--   (usan active_household_id() — ya optimizadas, fuera de scope).
--
-- CÓMO APLICAR: Supabase Dashboard → SQL Editor → pegar y RUN.
--   Idempotente: índices con IF NOT EXISTS; ALTER POLICY se puede
--   re-ejecutar sin efecto adverso. Cero downtime (CREATE INDEX en
--   tablas pequeñas; si alguna creciera, usar CREATE INDEX CONCURRENTLY).
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────
-- 1. ÍNDICES EN FOREIGN KEYS SIN ÍNDICE
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_household_members_user_id
  ON public.household_members (user_id);

CREATE INDEX IF NOT EXISTS idx_households_owner_user_id
  ON public.households (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_metas_user_id
  ON public.metas (user_id);

CREATE INDEX IF NOT EXISTS idx_plantillas_usuario_user_id
  ON public.plantillas_usuario (user_id);

CREATE INDEX IF NOT EXISTS idx_registro_conexiones_user_id
  ON public.registro_conexiones (user_id);

CREATE INDEX IF NOT EXISTS idx_registro_movimientos_user_id
  ON public.registro_movimientos (user_id);

CREATE INDEX IF NOT EXISTS idx_sugerencias_user_id
  ON public.sugerencias (user_id);


-- ─────────────────────────────────────────────────────────────────
-- 2. RLS — auth.uid() → (select auth.uid())  [auth_rls_initplan]
-- ─────────────────────────────────────────────────────────────────

-- household_members ────────────────────────────────────────────────
ALTER POLICY hm_insert_own ON public.household_members
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY members_owner_manage ON public.household_members
  USING (household_id IN (
    SELECT households.id FROM households
    WHERE (households.owner_user_id = (select auth.uid()))
  ));

ALTER POLICY members_self_accept ON public.household_members
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY members_self_view ON public.household_members
  USING (user_id = (select auth.uid()));

-- households ────────────────────────────────────────────────────────
ALTER POLICY households_insert_own ON public.households
  WITH CHECK (owner_user_id = (select auth.uid()));

ALTER POLICY households_owner ON public.households
  USING (owner_user_id = (select auth.uid()))
  WITH CHECK (owner_user_id = (select auth.uid()));

ALTER POLICY households_select_own ON public.households
  USING (owner_user_id = (select auth.uid()));

-- metas ─────────────────────────────────────────────────────────────
ALTER POLICY "user owns metas" ON public.metas
  USING ((select auth.uid()) = user_id);

-- plantillas_usuario ────────────────────────────────────────────────
ALTER POLICY "plantillas_usuario: solo owner" ON public.plantillas_usuario
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- push_subscriptions ────────────────────────────────────────────────
ALTER POLICY "Users manage own subscriptions" ON public.push_subscriptions
  USING (user_id = ((select auth.uid()))::text)
  WITH CHECK (user_id = ((select auth.uid()))::text);

ALTER POLICY own_push ON public.push_subscriptions
  USING (user_id = ((select auth.uid()))::text)
  WITH CHECK (user_id = ((select auth.uid()))::text);

-- registro_conexiones ───────────────────────────────────────────────
ALTER POLICY "conexiones: usuario ve las suyas" ON public.registro_conexiones
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- scheduled_notifications ───────────────────────────────────────────
ALTER POLICY notifications_own_user ON public.scheduled_notifications
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- sugerencias ───────────────────────────────────────────────────────
ALTER POLICY insert_own ON public.sugerencias
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY owner_read ON public.sugerencias
  USING ((select auth.uid()) = 'fa3f7b3b-148b-4dea-8e2a-37f740c08b3d'::uuid);

-- telegram_connections ──────────────────────────────────────────────
ALTER POLICY telegram_own_user ON public.telegram_connections
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));


-- ─────────────────────────────────────────────────────────────────
-- 3. (OPCIONAL) POLICY DUPLICADA EN push_subscriptions
-- ─────────────────────────────────────────────────────────────────
-- "Users manage own subscriptions" y "own_push" son IDÉNTICAS →
-- generan warning multiple_permissive_policies (Postgres evalúa AMBAS
-- en cada query). Conservar UNA sola. Descomenta para eliminar la
-- redundante (revisa antes cuál nombre prefieres conservar):
--
-- DROP POLICY IF EXISTS own_push ON public.push_subscriptions;
-- ═══════════════════════════════════════════════════════════════════
