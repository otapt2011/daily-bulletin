// api/diag.js
// Lightweight diagnostic endpoint (safe) to show which D1 endpoint & secrets the deployed function sees.
// It does NOT expose secret values, only presence and lengths.

import { runHandlerUniversal } from './_adapter.js';

async function edgeHandler(request, env) {
  // Build diagnostic info using env (Edge) or process.env (Node via adapter)
  const d1 = env && env.D1_REST_URL ? env.D1_REST_URL : process.env.D1_REST_URL;
  let d1_path = null;
  try {
    if (d1) {
      const u = new URL(d1);
      d1_path = u.origin + u.pathname;
    }
  } catch (e) {
    d1_path = String(d1).slice(0, 200);
  }

  const hasAuth = !!(env && env.D1_AUTH) || !!process.env.D1_AUTH;
  const authLen = (env && env.D1_AUTH ? env.D1_AUTH.length : (process.env.D1_AUTH ? process.env.D1_AUTH.length : 0));
  const hasJwt = !!(env && env.JWT_SECRET) || !!process.env.JWT_SECRET;
  const jwtLen = (env && env.JWT_SECRET ? env.JWT_SECRET.length : (process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0));

  const body = {
    ok: true,
    d1_endpoint: d1_path,
    has_D1_AUTH: hasAuth,
    D1_AUTH_length: authLen,
    has_JWT_SECRET: hasJwt,
    JWT_SECRET_length: jwtLen
  };

  return new Response(JSON.stringify(body, null, 2), { status: 200, headers: { 'content-type': 'application/json' } });
}

export default function handler(nodeReq, nodeRes) {
  return runHandlerUniversal(edgeHandler, nodeReq, nodeRes);
}
