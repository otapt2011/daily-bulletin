// workers/worker-d1-binding.js
// Cloudflare Worker using a D1 binding named `DB`.
// Bind your D1 database to the worker as `DB` in wrangler.toml or the Cloudflare dashboard.
// Exposes: GET /api/news, GET /api/news/:id (public)
// Protected: POST /api/news, PUT /api/news/:id, DELETE /api/news/:id require Authorization: Bearer <jwt>
// JWT HS256 verification uses env.JWT_SECRET (UTF-8 string)

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

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(payloadB64));
    return JSON.parse(payloadJson);
  } catch (e) {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, ''); // trim trailing slash

    try {
      // GET /api/news
      if (request.method === 'GET' && path === '/api/news') {
        const res = await env.DB.prepare('SELECT id, title, body, embed, published_at FROM articles ORDER BY published_at DESC LIMIT 100').all();
        return jsonResponse(res.results || []);
      }

      // GET /api/news/:id
      const m = path.match(/^\/api\/news\/(.+)$/);
      if (request.method === 'GET' && m) {
        const id = decodeURIComponent(m[1]);
        const res = await env.DB.prepare('SELECT id, title, body, embed, published_at FROM articles WHERE id = ? LIMIT 1').bind(id).all();
        const item = (res.results && res.results[0]) || null;
        if (!item) return jsonResponse({ message: 'Not found' }, 404);
        return jsonResponse(item);
      }

      // Admin endpoints - verify JWT
      if (!request.headers.has('authorization')) return jsonResponse({ message: 'Unauthorized' }, 401);
      const auth = request.headers.get('authorization') || '';
      const tokenMatch = auth.match(/^Bearer (.+)$/);
      if (!tokenMatch) return jsonResponse({ message: 'Unauthorized' }, 401);
      const token = tokenMatch[1];
      const payload = await verifyHS256(token, env.JWT_SECRET || '');
      if (!payload) return jsonResponse({ message: 'Unauthorized' }, 401);

      // POST /api/news -> create
      if (request.method === 'POST' && path === '/api/news') {
        const body = await request.json();
        const id = body.id || crypto.randomUUID();
        const published_at = body.published_at || new Date().toISOString();
        await env.DB.prepare('INSERT INTO articles (id, title, body, embed, published_at, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').bind(id, body.title, body.body, body.embed, published_at).run();
        return jsonResponse({ ok: true, id }, 201);
      }

      // PUT /api/news/:id -> update
      if (request.method === 'PUT' && m) {
        const id = decodeURIComponent(m[1]);
        const body = await request.json();
        await env.DB.prepare('UPDATE articles SET title = ?, body = ?, embed = ? WHERE id = ?').bind(body.title, body.body, body.embed, id).run();
        return jsonResponse({ ok: true });
      }

      // DELETE /api/news/:id
      if (request.method === 'DELETE' && m) {
        const id = decodeURIComponent(m[1]);
        await env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(id).run();
        return jsonResponse({ ok: true });
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      return jsonResponse({ message: err.message || 'Internal error' }, 500);
    }
  }
};
