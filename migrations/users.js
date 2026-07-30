// migrations/users.js
// Node ESM script to insert an admin user into Cloudflare D1 via the D1 REST endpoint.
// Usage:
//   D1_REST_URL="https://api.cloudflare.com/client/v4/accounts/.../d1/queries" D1_AUTH="<key>" node migrations/users.js admin mySecretPassword
// If username/password are omitted, defaults are: admin / changeme

import bcrypt from 'bcryptjs';

const D1_REST_URL = process.env.D1_REST_URL;
const D1_AUTH = process.env.D1_AUTH;

if (!D1_REST_URL || !D1_AUTH) {
  console.error('Error: D1_REST_URL and D1_AUTH environment variables must be set.');
  console.error('Example: D1_REST_URL="https://..." D1_AUTH="<token>" node migrations/users.js admin password');
  process.exit(1);
}

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'changeme';

async function run() {
  try {
    console.log(`Creating user '${username}' (password: '${password}')`);
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const sql = 'INSERT INTO users (username, password_hash) VALUES (?, ?)';
    const body = { sql, params: [username, hash] };

    const res = await fetch(D1_REST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${D1_AUTH}`
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('D1 REST error:', res.status, res.statusText);
      console.error('Response body:', text);
      process.exit(1);
    }

    console.log('User created successfully. D1 response:');
    console.log(text);
    console.log('\nIMPORTANT: For security, change the password after first login and delete or restrict this migration script if not needed.');
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

run();
