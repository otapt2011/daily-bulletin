// UI helpers (IIFE)
(function () {
  function renderList(items, containerSelector) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = '';
    if (!items || items.length === 0) {
      container.innerHTML = '<p class="muted">No articles</p>';
      return;
    }
    items.forEach(item => {
      const el = document.createElement('article');
      el.className = 'card';
      el.innerHTML = `
        <h2><a href="/article.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.title)}</a></h2>
        <p>${truncate(escapeHTML(item.body), 140)}</p>
        <div class="meta"><span>${escapeHTML(item.published_at || '')}</span></div>
      `;
      container.appendChild(el);
    });
  }

  function renderArticle(item, containerSelector) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = '';
    const el = document.createElement('div');
    el.innerHTML = `
      <h2>${escapeHTML(item.title)}</h2>
      <div class="meta">${escapeHTML(item.published_at || '')}</div>
      <div class="content">${escapeHTML(item.body).replace(/\n/g, '<br>')}</div>
    `;
    container.appendChild(el);

    if (item.embed) {
      const embedNode = createEmbedNode(item.embed);
      if (embedNode) container.appendChild(embedNode);
    }
  }

  function renderAdminList(items, containerSelector) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML = `
        <div>
          <div style="font-weight:600">${escapeHTML(item.title)}</div>
          <div class="meta">${escapeHTML(item.published_at || '')}</div>
        </div>
        <div class="admin-actions">
          <a href="/admin/edit.html?id=${encodeURIComponent(item.id)}" class="btn"><i class="fa-solid fa-pen-to-square"></i></a>
          <button data-id="${escapeHTML(item.id)}" class="btn delete-btn"><i class="fa-solid fa-trash" style="color:#ef4444"></i></button>
        </div>
      `;
      container.appendChild(row);
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!window.AUTH.isAuthenticated()) { location.href='/admin/login.html'; return; }
        const id = btn.getAttribute('data-id');
        const res = await window.API.del('/api/news/' + encodeURIComponent(id));
        if (res.ok) {
          btn.closest('.admin-row').remove();
        } else {
          alert('Delete failed');
        }
      });
    });
  }

  // small helpers
  function escapeHTML(s='') { return String(s).replace(/[&<>"']/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function truncate(s, n) { return s.length>n ? s.slice(0,n-1) + '…' : s; }

  // Expose a small API for embed creation (uses embed.js createEmbedNode if present)
  function createEmbedNode(url) {
    if (window.EMBED && typeof window.EMBED.createEmbedNode === 'function') {
      return window.EMBED.createEmbedNode(url);
    }
    return null;
  }

  window.UI = { renderList, renderArticle, renderAdminList };
})();
