# Daily Bulletin

A lightweight static news website with a minimal admin dashboard. Frontend is pure HTML/CSS/JS (IIFE modules); backend APIs are Vercel Edge Functions that execute SQL against a Cloudflare D1 database via the D1 REST API.

Contents added to this repository:
- Static frontend: index.html, article.html, admin/*.html, css/, js/
- Vercel Edge functions: api/*.js (api/news.js, api/auth.js) using api/lib/d1-client.js
- Cloudflare D1 migrations: migrations/schema.sql, migrations/seed.sql
- User seed script: migrations/users.js

Quick setup
-----------
1. Set environment variables (Vercel project settings or local .env for testing):
   - D1_REST_URL (see .env.example)
   - D1_AUTH (Cloudflare API token with D1 permissions)
   - JWT_SECRET (random secret used to sign HS256 JWTs)

2. Apply database schema and sample data (example using curl + jq):

   # Export the REST endpoint and token locally (replace with your token)
   export D1_REST_URL="https://api.cloudflare.com/client/v4/accounts/5b1bd000cd4af0cedf95a25940a8d53f/d1/database/50cf4075-3383-4700-9dae-736c308e419f/queries"
   export D1_AUTH="<YOUR_CLOUDFLARE_API_TOKEN>"

   # Run schema (requires jq to safely wrap SQL)
   SQL=$(jq -Rs . migrations/schema.sql)
   curl -s -X POST "$D1_REST_URL" \
     -H "Authorization: Bearer $D1_AUTH" \
     -H "Content-Type: application/json" \
     -d "{\"sql\":$SQL,\"params\":[] }"

   # Run seed (sample articles)
   SQL=$(jq -Rs . migrations/seed.sql)
   curl -s -X POST "$D1_REST_URL" \
     -H "Authorization: Bearer $D1_AUTH" \
     -H "Content-Type: application/json" \
     -d "{\"sql\":$SQL,\"params\":[] }"

3. Create an admin user (recommended: use the Node seeding helper which hashes the password):

   # Install dependencies locally if you haven't already
   npm install

   # Create admin user (example: username=admin password=changeme)
   D1_REST_URL="$D1_REST_URL" D1_AUTH="$D1_AUTH" npm run seed:user -- admin changeme

   # After first successful login, change the password and remove/restrict the migration script.

4. Configure Vercel environment variables
   Add the same variables to your Vercel project (Project Settings → Environment Variables):
   - D1_REST_URL
   - D1_AUTH
   - JWT_SECRET

5. Deploy
   - Locally: vercel dev
   - Production: git push to main (already configured), then deploy from Vercel dashboard or via vercel CLI.

Security notes
--------------
- DO NOT commit secrets into the repository. Use .env.example for reference only.
- Restrict the Cloudflare API token (D1_AUTH) to the minimum required D1 permissions.
- Rotate JWT_SECRET periodically and ensure tokens are short-lived.
- Remove or restrict migration and seeding scripts after initial setup.

Files added/updated by this commit
----------------------------------
- .env.example (this file)
- README.md (this file)
- .gitignore
- package.json (added npm script `seed:user`)

If you want, I can also:
- Add a short CI workflow to prevent committing secrets.
- Add a wrangler.toml and worker script if you prefer Cloudflare Workers + D1 binding instead of Vercel.
