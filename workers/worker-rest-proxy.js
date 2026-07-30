// Cloudflare Worker that proxies SQL queries to Cloudflare D1 REST API.
// Useful if you cannot bind D1 directly. Requires env.D1_REST_URL and env.D1_AUTH.
// Uses env.JWT_SECRET for admin JWT verification.

async function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function base64UrlToUint8Array(b64u) {
  b64u = b64u.replace(/-/g, '+').replace(/_/g, '/');
  while (b64u.length % 4) b64u += '=';
  const str = atob(b64u);
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

async function verifyHS256(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = base64UrlToUint8Array(sigB64);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify('HMAC', key, sig, data);
  if (!valid) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(payloadB64)));
  } catch {
    return null;
  }
}

async function d1Query(env, sql, params = []) {
  const url = env.D1_REST_URL;
  if (!url) throw new Error('D1_REST_URL not configured');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.D1_AUTH || ''}`
    },
    body: JSON.stringify({ sql, params })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 request failed: ${res.status} ${text}`);
  }
  return res.json();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    try {
      if (request.method === 'GET' && path === '/api/news') {
        const rows = await d1Query(env, 'SELECT id, title, body, embed, published_at FROM articles ORDER BY published_at DESC LIMIT 100');
        return jsonResponse(rows.results || []);
      }

      const m = path.match(/^\/api\/news\/(.+)$/);
      if (request.method === 'GET' && m) {
        const id = decodeURIComponent(m[1]);
        const rows = await d1Query(env, 'SELECT id, title, body, embed, published_at FROM articles WHERE id = ? LIMIT 1', [id]);
        const item = (rows.results && rows.results[0]) || null;
        if (!item) return jsonResponse({ message: 'Not found' }, 404);
        return jsonResponse(item);
      }

      // Admin - require JWT
      const auth = request.headers.get('authorization') || '';
      const tokenMatch = auth.match(/^Bearer (.+)$/);
      if (!tokenMatch) return jsonResponse({ message: 'Unauthorized' }, 401);
      const token = tokenMatch[1];
      const payload = await verifyHS256(token, env.JWT_SECRET || '');
      if (!payload) return jsonResponse({ message: 'Unauthorized' }, 401);

      if (request.method === 'POST' && path === '/api/news') {
        const body = await request.json();
        const id = body.id || crypto.randomUUID();
        const published_at = body.published_at || new Date().toISOString();
        await d1Query(env, 'INSERT INTO articles (id, title, body, embed, published_at, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', [id, body.title, body.body, body.embed, published_at]);
        return jsonResponse({ ok: true, id }, 201);
      }

      if (request.method === 'PUT' && m) {
        const id = decodeURIComponent(m[1]);
        const body = await request.json();
        await d1Query(env, 'UPDATE articles SET title = ?, body = ?, embed = ? WHERE id = ?', [body.title, body.body, body.embed, id]);
        return jsonResponse({ ok: true });
      }

      if (request.method === 'DELETE' && m) {
        const id = decodeURIComponent(m[1]);
        await d1Query(env, 'DELETE FROM articles WHERE id = ?', [id]);
        return jsonResponse({ ok: true });
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      return jsonResponse({ message: err.message || 'Internal' }, 500);
    }
  }
};
