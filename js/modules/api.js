// Simple API wrapper (IIFE). Adds Authorization header when present and respects a global API_BASE for cross-origin requests.
(function () {
  // Use window.API_BASE if provided (set this in your static site's HTML or Vercel env during build),
  // otherwise default to relative paths (same-origin).
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE.replace(/\/+$/, '') : '';

  function headers(token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  }

  async function request(method, path, body) {
    const token = window.AUTH && window.AUTH.getToken && window.AUTH.getToken();
    const url = API_BASE ? (API_BASE + path) : path;
    const credentials = API_BASE ? 'omit' : 'same-origin';
    const res = await fetch(url, {
      method,
      headers: headers(token),
      body: body ? JSON.stringify(body) : undefined,
      credentials
    });
    return res;
  }

  window.API = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    del: (path) => request('DELETE', path)
  };
})();
