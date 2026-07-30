# Daily Bulletin — Cloudflare Workers migration

This repository has been migrated to run API logic on Cloudflare Workers (D1) and serve static assets from Vercel.

Key changes made in this commit:

- Added workers/worker-api.js — a Cloudflare Worker implementation of the API (D1 binding name: DB).
  - Public routes: GET /api/news, GET /api/news/:id, GET /api/db-check
  - Admin routes (protected by ADMIN_TOKEN): POST/PUT/DELETE /api/news
  - Seed endpoint: POST /api/seed (idempotent)
- Added workers/wrangler.toml as a deployment example for Wrangler.
- Cleared package.json (project no longer depends on Node/npm tools for runtime).

What you need to do next (mobile-friendly):

1) Bind the D1 database to the Worker
   - Open Cloudflare dashboard → Workers → your Worker → Settings → Add binding (D1)
   - Variable name: DB
   - Select the correct account and the database you want to use (e.g. 50cf4075-...)

2) Set ADMIN_TOKEN (optional but recommended)
   - In the Worker Settings add a Variable: ADMIN_TOKEN
   - Set it to a long random value. This token must be sent in the Authorization header as
     "Bearer <ADMIN_TOKEN>" for POST/PUT/DELETE endpoints that modify data.

3) Deploy the Worker via Cloudflare dashboard or Wrangler.

4) Verify the API from your static site (Vercel) or mobile browser:
   - GET https://<your-worker-url>/api/db-check  -> diagnostics
   - GET https://<your-worker-url>/api/news      -> list articles
   - GET https://<your-worker-url>/api/news/a1   -> fetch specific article
   - POST https://<your-worker-url>/api/seed     -> seed tables and sample articles (idempotent)

Notes about authentication and admin users
- To keep this migration Node-free, the Worker uses a simple ADMIN_TOKEN environment variable to
  authenticate admin operations. If you prefer to keep the original bcrypt-based auth, we can add
  a separate Worker route that expects precomputed bcrypt hashes inserted into the D1 users table,
  but that requires a compatible bcrypt implementation at runtime or precomputing hashes.

If you want me to also update the static admin pages to use the ADMIN_TOKEN authentication flow,
I can commit those changes next. Reply with "Update admin UI for token auth" to proceed.
