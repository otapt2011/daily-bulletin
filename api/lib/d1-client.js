// Minimal Cloudflare D1 REST helper for Edge Functions.
// Expects environment variables:
//   D1_REST_URL - full endpoint to send SQL commands (example placeholder).
//   D1_AUTH - Authorization token or API key for D1 REST access.
export async function d1Query(env, sql, params = []) {
  // NOTE: Set D1_REST_URL and D1_AUTH in Vercel environment variables.
  const url = env.D1_REST_URL;
  if (!url) throw new Error('D1_REST_URL not configured');

  const body = { sql, params };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.D1_AUTH || ''}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('D1 request failed: ' + text);
  }
  return res.json();
}
