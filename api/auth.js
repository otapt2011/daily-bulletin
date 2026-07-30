// Edge Function: /api/auth
// POST: { username, password } -> returns { token }
// This uses bcryptjs to compare password against stored hash in D1.
// NOTE: For production, ensure user table exists and passwords are hashed.

import { d1Query } from './lib/d1-client.js';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

export default async function handler(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const username = body.username;
    const password = body.password;

    // fetch user from D1
    const rows = await d1Query(env, 'SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1', [username]);
    const user = (rows.results && rows.results[0]) || null;
    if (!user) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'content-type': 'application/json' } });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'content-type': 'application/json' } });

    // Sign JWT with jose (using JWKS or symmetric secret)
    const secret = new TextEncoder().encode(env.JWT_SECRET || '');
    const jwt = await new SignJWT({ sub: String(user.id), username: user.username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secret);

    return new Response(JSON.stringify({ token: jwt }), { status: 200, headers: { 'content-type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
