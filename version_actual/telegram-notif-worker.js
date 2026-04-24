/**
 * telegram-notif-worker.js
 * Cloudflare Worker — despacha notificaciones pendientes
 * Lee de: scheduled_notifications (tabla única/maestra)
 * Corre cada hora vía Cron Trigger
 */

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendPendingNotifs(env));
  },
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/ping') return new Response('ok');
    // Trigger manual para pruebas: GET /dispatch
    if (path === '/dispatch') {
      await sendPendingNotifs(env);
      return new Response('dispatched', { status: 200 });
    }
    return new Response('Telegram Notif Worker v2', { status: 200 });
  }
};

async function sbFetch(env, path, options = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(options.headers || {})
    }
  });
  return res;
}

async function sendTelegram(env, chatId, text) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
}

async function sendPendingNotifs(env) {
  const now = new Date().toISOString();

  // 1. Obtener notificaciones pendientes de enviar por Telegram
  const res = await sbFetch(env,
    `scheduled_notifications` +
    `?activo=eq.true` +
    `&canal_telegram=eq.true` +
    `&enviado_telegram=eq.false` +
    `&send_at=lte.${now}` +
    `&select=id,user_id,user_email,titulo,mensaje,recurrente,recurrencia_dias,send_at`,
    { headers: { Prefer: 'return=representation' } }
  );

  if (!res.ok) {
    console.error('Error fetching notifications:', await res.text());
    return;
  }

  const notifs = await res.json();
  if (!notifs.length) {
    console.log('No pending notifications at', now);
    return;
  }

  console.log(`Processing ${notifs.length} notification(s)`);

  for (const n of notifs) {
    // 2. Buscar conexión Telegram del usuario por user_id
    const connRes = await sbFetch(env,
      `telegram_connections` +
      `?user_id=eq.${n.user_id}` +
      `&is_active=eq.true` +
      `&select=chat_id,telegram_chat_id`,
      { headers: { Prefer: 'return=representation' } }
    );

    const conns = connRes.ok ? await connRes.json() : [];

    // Fallback: buscar por email si no hay user_id
    let chatId = conns[0]?.chat_id ?? conns[0]?.telegram_chat_id ?? null;

    if (!chatId && n.user_email) {
      const connByEmail = await sbFetch(env,
        `telegram_connections` +
        `?email=eq.${encodeURIComponent(n.user_email)}` +
        `&is_active=eq.true` +
        `&select=chat_id,telegram_chat_id`,
        { headers: { Prefer: 'return=representation' } }
      );
      const byEmail = connByEmail.ok ? await connByEmail.json() : [];
      chatId = byEmail[0]?.chat_id ?? byEmail[0]?.telegram_chat_id ?? null;
    }

    if (!chatId) {
      console.warn(`No Telegram connection for user ${n.user_id} (${n.user_email})`);
      continue;
    }

    // 3. Enviar mensaje
    const text = `🔔 <b>${n.titulo}</b>${n.mensaje ? '\n' + n.mensaje : ''}`;
    await sendTelegram(env, chatId, text);
    console.log(`Sent to chat ${chatId}: ${n.titulo}`);

    // 4. Actualizar registro: recurrente → nueva fecha | único → marcar enviado
    const updateBody = n.recurrente && n.recurrencia_dias
      ? {
          last_sent_at: now,
          enviado_telegram: false, // sigue activo para el próximo ciclo
          send_at: new Date(
            new Date(n.send_at).getTime() + n.recurrencia_dias * 86400000
          ).toISOString()
        }
      : {
          enviado_telegram: true,
          last_sent_at: now,
          activo: false
        };

    await sbFetch(env,
      `scheduled_notifications?id=eq.${n.id}`,
      { method: 'PATCH', body: JSON.stringify(updateBody) }
    );
  }
}
