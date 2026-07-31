// workers/worker-api.js
// Cloudflare Worker router implementing the API for Daily Bulletin using D1 (binding name: DB or DB_NEWS_BULLETIN).
// Adds CORS support and OPTIONS preflight handling so the static site can fetch the API from a different origin.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    const method = request.method.toUpperCase();

    // CORS headers (allowing cross-origin access). You can restrict Access-Control-Allow-Origin to your site.
    const corsHeaders = {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    function json(body, status = 200) {
      return new Response(JSON.stringify(body, null, 2), { status, headers: corsHeaders });
    }

    // Preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Resolve D1 binding: prefer env.DB, fallback to env.DB_NEWS_BULLETIN, then any DB_* binding.
    const DB = env.DB || env.DB_NEWS_BULLETIN || (() => {
      try {
        for (const k of Object.keys(env)) {
          if (/^DB(_|$)/.test(k) && env[k] && typeof env[k].prepare === 'function') return env[k];
        }
      } catch (e) {
        // ignore
      }
      return undefined;
    })();

    if (!DB) {
      return json({ ok: false, message: 'D1 binding not found. Available bindings: ' + Object.keys(env).join(',') }, 500);
    }

    async function queryAll(sql, params = []) {
      const r = await DB.prepare(sql).all(...params);
      return (r && r.results) || [];
    }

    async function run(sql, params = []) {
      return await DB.prepare(sql).run(...params);
    }

    function requireAdmin(req) {
      const auth = req.headers.get('authorization') || '';
      const token = auth.replace(/^Bearer\s+/i, '').trim();
      const adminToken = env.ADMIN_TOKEN || '';
      return token && adminToken && token === adminToken;
    }

    try {
      // GET /api/news -> list
      if (method === 'GET' && path === '/api/news') {
        const rows = await queryAll("SELECT id, title, published_at FROM articles ORDER BY published_at DESC");
        return json(rows);
      }

      // GET /api/news/:id
      if (method === 'GET' && path.startsWith('/api/news/')) {
        const id = decodeURIComponent(path.replace('/api/news/', ''));
        const rows = await queryAll('SELECT * FROM articles WHERE id = ? LIMIT 1', [id]);
        if (!rows || rows.length === 0) return json({ ok: false, code: 'NOT_FOUND' }, 404);
        return json(rows[0]);
      }

      // Diagnostics: GET /api/db-check
      if (method === 'GET' && path === '/api/db-check') {
        const tables = await queryAll("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        const tableNames = tables.map(r => r.name);
        let articles_count = 0;
        let sample = [];
        if (tableNames.includes('articles')) {
          const cnt = await queryAll('SELECT COUNT(*) AS cnt FROM articles');
          articles_count = Number(cnt && cnt[0] && cnt[0].cnt) || 0;
          if (articles_count > 0) {
            const rows = await queryAll('SELECT id, title, published_at FROM articles ORDER BY published_at DESC LIMIT 10');
            sample = rows.map(r => ({ id: r.id, title: r.title, published_at: r.published_at }));
          }
        }
        return json({ ok: true, tables: tableNames, articles_count, sample });
      }

      // POST /api/seed -> create schema + insert sample articles
      if (method === 'POST' && path === '/api/seed') {
        // idempotent SQL
        const stmts = [
`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT
);`,
`CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  embed TEXT,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);`,
`CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at DESC);`,
`INSERT OR REPLACE INTO articles (id, title, body, embed, published_at) VALUES
('a1', 'Local Startup Raises Seed Funding', 'A local startup announced it raised a seed round from angel investors. The company will use the funds to expand its engineering team and accelerate product development.\n\nCommunity response has been positive.', NULL, '2026-07-29T10:00:00Z'),
('a2', 'City Park Reopens After Renovation', 'After a six-month renovation, the city park has reopened to the public. The renovation included new walking paths, native plant landscaping, and improved accessibility features.', NULL, '2026-07-28T09:30:00Z'),
('a3', 'Viral Trick Shot Compilation', 'Check out this short compilation of viral trick shots from local athletes and creators. The video highlights precision and creativity in urban sports.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2026-07-27T16:45:00Z'),
('a4', 'Quick Dance Clip', 'A short dance clip trending on social media showcases new choreography. It is embedded below.', 'https://www.tiktok.com/@someuser/video/7150000000000000000', '2026-07-26T14:20:00Z');`
        ];

        for (const s of stmts) {
          await run(s);
        }

        const tables = await queryAll("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        const tableNames = tables.map(r => r.name);
        const cnt = tableNames.includes('articles') ? (await queryAll('SELECT COUNT(*) AS cnt FROM articles'))[0].cnt : 0;
        return json({ ok: true, message: 'Seed applied', tables: tableNames, articles_count: Number(cnt) || 0 });
      }

      // Admin-protected endpoints require ADMIN_TOKEN env variable
      // Create or replace article: POST /api/news
      if ((method === 'POST' && path === '/api/news') || (method === 'PUT' && path.startsWith('/api/news/'))) {
        if (!requireAdmin(request)) return json({ ok: false, message: 'Unauthorized' }, 401);
        const body = await request.json().catch(() => ({}));
        const articleId = body.id || (body.title ? 'a-' + Date.now().toString(36) : null);
        if (!articleId || !body.title || !body.body) return json({ ok: false, message: 'Missing fields' }, 400);
        const embed = body.embed || null;
        const published_at = body.published_at || new Date().toISOString();
        await run('INSERT OR REPLACE INTO articles (id, title, body, embed, published_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"))', [articleId, body.title, body.body, embed, published_at]);
        return json({ ok: true, id: articleId });
      }

      // DELETE /api/news/:id
      if (method === 'DELETE' && path.startsWith('/api/news/')) {
        if (!requireAdmin(request)) return json({ ok: false, message: 'Unauthorized' }, 401);
        const id = decodeURIComponent(path.replace('/api/news/', ''));
        await run('DELETE FROM articles WHERE id = ?', [id]);
        return json({ ok: true });
      }

      return json({ ok: false, message: 'Not found' }, 404);
    } catch (err) {
      return json({ ok: false, message: err.message }, 500);
    }
  }
};
