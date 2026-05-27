// ═══════════════════════════════════════════════════
// register-telegram-webhook — Cloudflare Pages Function
//
// Recibe: POST { bot_token: string }
// Acción: llama a api.telegram.org/setWebhook apuntando
//         al Edge Function telegram-bot-webhook de Supabase.
// Responde: { ok: boolean, description?: string }
//
// Seguridad: bot_token viene del body (del cliente autenticado).
//            Nunca se guarda aquí — ya está en config_usuario.
// ═══════════════════════════════════════════════════

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const SUPABASE_WEBHOOK_URL =
  'https://jcgoccaisemrfsuwwrrl.supabase.co/functions/v1/telegram-bot-webhook'

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS })
}

export async function onRequestPost(context) {
  try {
    const { bot_token } = await context.request.json()

    if (!bot_token || typeof bot_token !== 'string') {
      return json({ ok: false, description: 'bot_token requerido' }, 400)
    }

    // Validación básica de formato: NNN...NNN:AAAA...
    if (!/^\d{5,}:[A-Za-z0-9_-]{30,}$/.test(bot_token)) {
      return json({ ok: false, description: 'Formato de token inválido' }, 400)
    }

    // Registrar webhook en Telegram API
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${bot_token}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: SUPABASE_WEBHOOK_URL,
          // Sólo los tipos de update que el bot maneja
          allowed_updates: ['message', 'callback_query'],
        }),
      }
    )

    const result = await telegramRes.json()
    return json(result, telegramRes.ok ? 200 : 400)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return json({ ok: false, description: msg }, 500)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
