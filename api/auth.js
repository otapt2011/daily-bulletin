// api/auth.js
// Edge-style auth handler wrapped to run on Node serverless via api/_adapter.js

import { d1Query } from './lib/d1-client.js';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { runHandlerUniversal } from './_adapter.js';

async function edgeHandler(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const username = body.username;
    const password = body.password;

    const rows = await d1Query(env, 'SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1', [username]);
    const user = (rows.results && rows.results[0]) || null;
    if (!user) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'content-type': 'application/json' } });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'content-type': 'application/json' } });

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

export default function handler(nodeReq, nodeRes) {
  return runHandlerUniversal(edgeHandler, nodeReq, nodeRes);
}
