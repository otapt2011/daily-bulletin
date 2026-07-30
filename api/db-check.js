// api/db-check.js
// Read-only diagnostic endpoint to inspect the D1 database tables and a sample of articles.
// Safe: does not expose any secrets or tokens. Returns only table names, articles count, and up to 10 article rows.

import { d1Query } from './lib/d1-client.js';
import { runHandlerUniversal } from './_adapter.js';

async function edgeHandler(request, env) {
  try {
    // List tables
    const tablesRes = await d1Query(env, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const tables = (tablesRes.results || []).map(r => r.name);

    // Check if articles table exists
    let articles_count = 0;
    let sample = [];
    if (tables.includes('articles')) {
      const countRes = await d1Query(env, 'SELECT COUNT(*) as cnt FROM articles');
      articles_count = (countRes.results && countRes.results[0] && Number(countRes.results[0].cnt)) || 0;

      if (articles_count > 0) {
        const sampleRes = await d1Query(env, 'SELECT id, title, published_at FROM articles ORDER BY published_at DESC LIMIT 10');
        sample = (sampleRes.results || []).map(r => ({ id: r.id, title: r.title, published_at: r.published_at }));
      }
    }

    const body = {
      ok: true,
      tables,
      articles_count,
      sample
    };

    return new Response(JSON.stringify(body, null, 2), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, message: err.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

export default function handler(nodeReq, nodeRes) {
  return runHandlerUniversal(edgeHandler, nodeReq, nodeRes);
}
