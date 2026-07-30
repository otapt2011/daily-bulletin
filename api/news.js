// api/news.js
// Edge-style handler (Request, env) wrapped to run on Node serverless via api/_adapter.js

import { d1Query } from './lib/d1-client.js';
import { jwtVerify } from 'jose';
import { runHandlerUniversal } from './_adapter.js';

// Simple helper to check JWT (expects env.JWT_SECRET)
async function verifyAuth(request, env) {
  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return null;
  const token = m[1];
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET || '');
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (e) {
    return null;
  }
}

async function edgeHandler(request, env) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  const id = parts.length >= 2 ? parts[1] : null;

  try {
    if (request.method === 'GET' && !id) {
      const rows = await d1Query(env, 'SELECT id, title, body, embed, published_at FROM articles ORDER BY published_at DESC LIMIT 100');
      return new Response(JSON.stringify(rows.results || []), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    if (request.method === 'GET' && id) {
      const rows = await d1Query(env, 'SELECT id, title, body, embed, published_at FROM articles WHERE id = ? LIMIT 1', [id]);
      const item = (rows.results && rows.results[0]) || null;
      if (!item) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      return new Response(JSON.stringify(item), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    // Protected routes - require admin JWT
    const user = await verifyAuth(request, env);
    if (!user) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });

    if (request.method === 'POST') {
      const data = await request.json();
      const sql = 'INSERT INTO articles (title, body, embed, published_at) VALUES (?, ?, ?, ?)';
      const published_at = new Date().toISOString();
      await d1Query(env, sql, [data.title, data.body, data.embed, published_at]);
      return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { 'content-type': 'application/json' } });
    }

    if (request.method === 'PUT' && id) {
      const data = await request.json();
      const sql = 'UPDATE articles SET title = ?, body = ?, embed = ? WHERE id = ?';
      await d1Query(env, sql, [data.title, data.body, data.embed, id]);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    if (request.method === 'DELETE' && id) {
      const sql = 'DELETE FROM articles WHERE id = ?';
      await d1Query(env, sql, [id]);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

// Export universal wrapper for Node serverless (req,res) and Edge (Request, env)
export default function handler(nodeReq, nodeRes) {
  return runHandlerUniversal(edgeHandler, nodeReq, nodeRes);
}
