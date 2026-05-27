// Cloudflare Worker — actualiza tasa BCV diariamente
// Trigger: Cron 0 19 * * * (3pm VET = 19:00 UTC)
// Env vars necesarios: SUPABASE_URL, SUPABASE_SERVICE_KEY

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(updateRate(env))
  },
  async fetch(request, env) {
    // Manual trigger via GET /update
    if (new URL(request.url).pathname === '/update') {
      await updateRate(env)
      return new Response('OK', { status: 200 })
    }
    return new Response('BCV Rate Worker', { status: 200 })
  }
}

async function updateRate(env) {
  // Obtener tasa BCV desde dolarapi.com
  const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
    headers: { 'User-Agent': 'mis-finanzas/1.0' }
  })
  if (!res.ok) throw new Error(`dolarapi ${res.status}`)
  const json = await res.json()
  const rate = json.promedio ?? json.precio
  if (!rate || rate <= 0) throw new Error('invalid rate')

  const today = new Date().toISOString().slice(0, 10)

  // UPSERT en tasas_historicas
  await fetch(`${env.SUPABASE_URL}/rest/v1/tasas_historicas`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      household_key: 'anthony-isabel-2026',
      fecha: today,
      rate_bcv: rate,
    })
  })

  // UPDATE en tasas_cambio mes='global'
  await fetch(`${env.SUPABASE_URL}/rest/v1/tasas_cambio?mes=eq.global`, {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bcv: rate, updated_at: new Date().toISOString() })
  })
}
