// Page initializer (IIFE) - minimal routing by presence of DOM elements
(function () {
  async function init() {
    // Home page list
    if (document.getElementById('news-list')) {
      const res = await window.API.get('/api/news');
      if (res.ok) {
        const items = await res.json();
        window.UI.renderList(items, '#news-list');
      } else {
        document.getElementById('news-list').textContent = 'Failed to load';
      }
    }

    // Article page
    if (document.getElementById('article')) {
      const params = new URLSearchParams(location.search);
      const id = params.get('id');
      if (!id) {
        document.getElementById('article').textContent = 'Article not found';
        return;
      }
      const res = await window.API.get('/api/news/' + encodeURIComponent(id));
      if (res.ok) {
        const data = await res.json();
        window.UI.renderArticle(data, '#article');
      } else {
        document.getElementById('article').textContent = 'Failed to load article';
      }
    }
  }

  // Start
  init();
})();
