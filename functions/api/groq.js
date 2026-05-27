export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

export async function onRequestPost(context) {
  const key = context.env.GROQ_API_KEY ?? context.env.VITE_GROQ_API_KEY
  if (!key) {
    return new Response(JSON.stringify({ error: { message: 'Groq API key not configured on server', type: 'server_error', code: 'missing_key' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  const body = await context.request.json()
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' }
  })
}
