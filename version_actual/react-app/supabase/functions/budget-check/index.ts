// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  budget-check v2 · Supabase Edge Function · Mis Finanzas 2026           ║
// ║  FIX v2: include owner (invite_status='owner') in members query          ║
// ║  DEPLOY: supabase functions deploy budget-check --no-verify-jwt          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET') ?? '';

// Espejo exacto de txnGroup() del front: gasto = todo tipo que NO sea ingreso/ahorro/ajuste.
const NON_GASTO = new Set([
  'Ingreso Fijo', 'Ingreso Variable', 'Prestamo recibido',
  'Ahorro en efectivo', 'Ajuste',
]);
const isGasto = (tipo: string | null | undefined): boolean =>
  !tipo ? true : !NON_GASTO.has(tipo);

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'not found' }, 404);
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── Auth: secreto compartido (app_secrets) o INTERNAL_SECRET de respaldo ──
  const provided = req.headers.get('x-internal-secret') ?? '';
  const { data: secretRow } = await sb
    .from('app_secrets').select('value').eq('name', 'budget_check_secret').maybeSingle();
  const expected = (secretRow?.value as string | undefined) ?? '';
  if (!provided || (provided !== expected && provided !== INTERNAL_SECRET))
    return json({ error: 'forbidden' }, 403);

  // ── Payload (webhook pg_net): { record: { household_id, mes, cat, tipo } } ──
  const payload = await req.json().catch(() => ({} as Record<string, unknown>));
  const rec = (payload.record ?? payload) as Record<string, unknown>;
  const household_id = (rec.household_id as string | null) ?? null;
  const mes = (rec.mes as string | null) ?? null;
  const cat = (rec.cat as string | null) ?? null;
  const tipo = (rec.tipo as string | null) ?? null;
  if (!household_id || !mes || !cat || !isGasto(tipo))
    return json({ skipped: true });

  // ── 1. Miembros del hogar (accepted + owner) ──────────────────────────────
  const { data: members } = await sb
    .from('household_members').select('user_id')
    .eq('household_id', household_id)
    .in('invite_status', ['accepted', 'owner']);
  const userIds = (members ?? []).map((m) => m.user_id as string);
  if (!userIds.length) return json({ skipped: 'no-members' });

  // ── 2. Configs con budget_push_enabled ────────────────────────────────────
  const { data: configs } = await sb
    .from('config_usuario').select('user_id, budget_push_enabled, presupuestos')
    .in('user_id', userIds);
  const enabled = (configs ?? []).filter((c) => c.budget_push_enabled === true);
  if (!enabled.length) return json({ skipped: 'none-enabled' });

  // ── 3. Gasto del mes (hogar) ──────────────────────────────────────────────
  const { data: movs } = await sb
    .from('movimientos').select('cat, amount, tipo')
    .eq('household_id', household_id).eq('mes', mes).is('deleted_at', null);
  let catSpent = 0, totalSpent = 0;
  for (const m of movs ?? []) {
    if (!isGasto(m.tipo as string | null)) continue;
    const a = Math.abs(Number(m.amount) || 0);
    totalSpent += a;
    if (m.cat === cat) catSpent += a;
  }

  // ── 4. Evaluar por miembro, dedup (insert PK) y push ─────────────────────
  let pushed = 0;
  for (const c of enabled) {
    const pres = (c.presupuestos ?? {}) as Record<string, number>;
    const cands: { logCat: string; label: string; spent: number; limit: number; isTotal: boolean }[] = [];

    const catLimit = Number(pres[cat] ?? 0);
    if (catLimit > 0 && catSpent >= catLimit)
      cands.push({ logCat: cat, label: cat, spent: catSpent, limit: catLimit, isTotal: false });

    const totalLimit = Number(pres['gastos'] ?? 0);
    if (totalLimit > 0 && totalSpent >= totalLimit)
      cands.push({ logCat: '__total__', label: 'tu presupuesto mensual', spent: totalSpent, limit: totalLimit, isTotal: true });

    for (const k of cands) {
      // dedup: PK (user_id, mes, cat) → sólo empuja si la fila es nueva
      const { data: ins, error: insErr } = await sb
        .from('budget_alert_log')
        .insert({ user_id: c.user_id, mes, cat: k.logCat })
        .select('user_id').maybeSingle();
      if (insErr || !ins) continue;

      const title = '🎯 Presupuesto excedido';
      const body = k.isTotal
        ? `Superaste ${k.label}: $${k.spent.toFixed(0)} de $${k.limit.toFixed(0)} en ${mes}.`
        : `Superaste el presupuesto de ${k.label}: $${k.spent.toFixed(0)} de $${k.limit.toFixed(0)} en ${mes}.`;
      await fetch(`${SUPABASE_URL}/functions/v1/vapid-push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
        body: JSON.stringify({ user_id: c.user_id, title, body, tag: `budget-${mes}-${k.logCat}`, url: '/analisis' }),
      }).catch((e) => console.error('[budget-check] push', e));
      pushed++;
    }
  }

  return json({ ok: true, pushed });
});
