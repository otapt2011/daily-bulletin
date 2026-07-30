// Auth module (IIFE) - manages JWT in localStorage
(function () {
  const KEY = 'db:token';
  function getToken() { return localStorage.getItem(KEY); }
  function setToken(t) { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); }
  function isAuthenticated() { return !!getToken(); }

  async function signIn({ username, password }) {
    return fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      }
      return res;
    });
  }

  function signOut() { setToken(null); }

  window.AUTH = { getToken, setToken, isAuthenticated, signIn, signOut };
})();
