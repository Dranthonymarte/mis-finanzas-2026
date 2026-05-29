// Cloudflare Pages Function — POST /api/sugerencia-notify
// Sends email via Resend when a user submits a suggestion
// Requires: RESEND_API_KEY env var in CF Pages settings (Runtime)

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const { mensaje, userId } = await request.json()

    if (!mensaje || typeof mensaje !== 'string') {
      return new Response(JSON.stringify({ error: 'mensaje requerido' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = env.RESEND_API_KEY
    if (!apiKey) {
      // Key not configured — return distinct warn so client can diagnose
      return new Response(JSON.stringify({ ok: false, warn: 'no_key' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mis Finanzas <onboarding@resend.dev>',
        to: ['anthonymarte12@gmail.com'],
        subject: '💬 Nueva sugerencia — Mis Finanzas',
        html: `
          <h2 style="font-family:sans-serif;color:#1a1a2e">Nueva sugerencia</h2>
          <p style="font-family:sans-serif;font-size:16px;color:#333;white-space:pre-wrap">${mensaje.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="font-family:sans-serif;font-size:12px;color:#999">Usuario: ${userId ?? 'desconocido'} · Mis Finanzas App</p>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, data }), {
      status: res.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
