// api/_adapter.js
// Universal adapter to allow Edge-style handlers (Request, env) to run on both Edge and Node serverless.

export async function runHandlerUniversal(handler, nodeReq, nodeRes) {
  // If `nodeReq` is already a Request (Edge environment), call directly.
  if (typeof Request !== 'undefined' && nodeReq instanceof Request) {
    // Edge runtime — `nodeReq` is actually the Request and nodeRes is env
    return handler(nodeReq, nodeRes);
  }

  // Node serverless path: nodeReq (IncomingMessage), nodeRes (ServerResponse)
  try {
    const { method, url: reqUrl, headers } = nodeReq;
    // Build a full URL (Vercel provides host header)
    const host = headers.host || 'localhost';
    const url = `https://${host}${reqUrl}`;

    const init = { method, headers };
    if (method !== 'GET' && method !== 'HEAD') {
      init.body = nodeReq;
    }

    const request = new Request(url, init);

    // Build env object from process.env
    const env = {
      D1_REST_URL: process.env.D1_REST_URL,
      D1_AUTH: process.env.D1_AUTH,
      JWT_SECRET: process.env.JWT_SECRET
    };

    const response = await handler(request, env);

    // Map Response -> nodeRes
    nodeRes.statusCode = response.status;
    response.headers.forEach((v, k) => nodeRes.setHeader(k, v));
    const body = await response.arrayBuffer();
    nodeRes.end(Buffer.from(body));
  } catch (err) {
    nodeRes.statusCode = 500;
    nodeRes.setHeader('content-type', 'application/json');
    nodeRes.end(JSON.stringify({ message: err.message }));
  }
}
