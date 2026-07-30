// Simple API wrapper (IIFE). Adds Authorization header when present.
(function () {
  const API_BASE = '';

  function headers(token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  }

  async function request(method, path, body) {
    const token = window.AUTH && window.AUTH.getToken && window.AUTH.getToken();
    const res = await fetch(API_BASE + path, {
      method,
      headers: headers(token),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin'
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
