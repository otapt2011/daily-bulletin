// api/lib/d1-client.js
// Cloudflare D1 REST helper with automatic fallback between /query and /queries paths.
// Expects env.D1_REST_URL and env.D1_AUTH. If the initial request returns a Route not found
// error (Cloudflare returning success:false with errors including "Route not found" or an HTTP 404),
// the function will retry with the alternate path (/query <-> /queries).

export async function d1Query(env, sql, params = []) {
  const configured = env && env.D1_REST_URL ? env.D1_REST_URL : (typeof process !== 'undefined' && process.env && process.env.D1_REST_URL ? process.env.D1_REST_URL : null);
  const token = env && env.D1_AUTH ? env.D1_AUTH : (typeof process !== 'undefined' && process.env && process.env.D1_AUTH ? process.env.D1_AUTH : '');
  if (!configured) throw new Error('D1_REST_URL not configured');

  const body = { sql, params };

  async function doFetch(url) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { /* not JSON */ }
    return { ok: res.ok, status: res.status, text, json };
  }

  // Try the configured URL first
  let result = await doFetch(configured);

  // If not OK and either 404 or Cloudflare returns JSON with errors mentioning Route not found,
  // attempt alternate path: swap /query <-> /queries in the path portion.
  function buildAlternate(u) {
    try {
      const url = new URL(u);
      if (url.pathname.endsWith('/query')) url.pathname = url.pathname.replace(/\/query$/, '/queries');
      else if (url.pathname.endsWith('/queries')) url.pathname = url.pathname.replace(/\/queries$/, '/query');
      else {
        // If neither suffix present, try appending /query
        url.pathname = url.pathname.replace(/\/+$/, '') + '/query';
      }
      return url.toString();
    } catch (e) {
      // Fallback: string replace
      if (u.endsWith('/query')) return u.replace(/\/query$/, '/queries');
      if (u.endsWith('/queries')) return u.replace(/\/queries$/, '/query');
      return u + '/query';
    }
  }

  const needsRetry = (!result.ok && (result.status === 404)) || (result.json && result.json.errors && result.json.errors.some && result.json.errors.some(e => String(e).toLowerCase().includes('route not found')));

  if (needsRetry) {
    const alt = buildAlternate(configured);
    result = await doFetch(alt);
    if (!result.ok) {
      // Return the alt response error text to keep previous behavior
      throw new Error('D1 request failed: ' + (result.text || JSON.stringify(result.json || {})));
    }
  }

  if (!result.ok) {
    throw new Error('D1 request failed: ' + (result.text || JSON.stringify(result.json || {})));
  }

  return result.json; // parsed JSON
}
