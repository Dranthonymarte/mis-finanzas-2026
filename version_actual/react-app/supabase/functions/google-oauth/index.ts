// google-oauth v5 — authorize + callback (OAuth2 Google Calendar + Gmail)
// FIX v5: callback redirects to React /calendar route so window.opener.postMessage fires
// DEPLOY: supabase functions deploy google-oauth --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLIENT_ID       = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const CLIENT_SECRET   = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const CF_ORIGIN       = Deno.env.get('CF_PAGES_URL') ?? 'https://misfinanzasapp2026.pages.dev';
const REDIRECT_URI    = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth`;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url    = new URL(req.url);
  const code   = url.searchParams.get('code');
  const state  = url.searchParams.get('state');   // v5: "userId|encodedRedirect"
  const error  = url.searchParams.get('error');
  const userId = url.searchParams.get('user_id');
  const redirectParam = url.searchParams.get('redirect');

  // ── CALLBACK desde Google (tiene ?code=...) ───────────────────────────────
  if (code) {
    // Intercambiar code por tokens
    let tokens: Record<string,unknown> = {};
    try {
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI, grant_type: 'authorization_code'
        }).toString()
      });
      tokens = await resp.json();
    } catch (_e) {
      const fallback = CF_ORIGIN + '/calendar';
      return Response.redirect(`${fallback}?gcal_status=error&msg=token_exchange_failed`);
    }

    // Parse state: v5 format "userId|encodedRedirect", v4 legacy "userId:householdId"
    const pipeIdx = (state ?? '').indexOf('|');
    const uid = pipeIdx >= 0 ? state!.slice(0, pipeIdx) : (state ?? '').split(':')[0];
    const rawRedirect = pipeIdx >= 0 ? decodeURIComponent(state!.slice(pipeIdx + 1)) : null;
    const callbackBase = rawRedirect ?? (CF_ORIGIN + '/calendar');

    if (tokens.error || !tokens.access_token) {
      return Response.redirect(`${callbackBase}?gcal_status=error&msg=${tokens.error}`);
    }

    if (!uid) return Response.redirect(`${callbackBase}?gcal_status=error&msg=missing_user_id`);

    // Obtener email del usuario de Google
    let googleEmail = '';
    try {
      const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const udata = await ui.json();
      googleEmail = udata.email ?? '';
    } catch (_) {}

    const expiresAt = new Date(Date.now() + Number(tokens.expires_in ?? 3600) * 1000).toISOString();

    const { error: dbErr } = await sb.from('google_oauth_tokens').upsert({
      user_id:       uid,
      access_token:  tokens.access_token as string,
      refresh_token: (tokens.refresh_token as string) ?? '',
      expires_at:    expiresAt,
      google_email:  googleEmail,
      scopes:        SCOPES,
      updated_at:    new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (dbErr) return Response.redirect(`${callbackBase}?gcal_status=error&msg=db_error`);

    return Response.redirect(`${callbackBase}?gcal_status=success&email=${encodeURIComponent(googleEmail)}`);
  }

  // ── Error de Google ───────────────────────────────────────────────────────
  if (error) {
    const fallback = CF_ORIGIN + '/calendar';
    return Response.redirect(`${fallback}?gcal_status=error&msg=${error}`);
  }

  // ── AUTHORIZE — Construir URL de Google OAuth ─────────────────────────────
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Missing user_id' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!CLIENT_ID) {
    return new Response(JSON.stringify({ error: 'GOOGLE_CLIENT_ID not configured in secrets' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // State v5: "userId|encodedRedirectUrl"
  const redirectBase = redirectParam ?? (CF_ORIGIN + '/calendar');
  const stateParam = `${userId}|${encodeURIComponent(redirectBase)}`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('access_type', 'offline');   // para refresh_token
  authUrl.searchParams.set('prompt', 'consent');          // fuerza refresh_token
  authUrl.searchParams.set('state', stateParam);

  return Response.redirect(authUrl.toString());
});
