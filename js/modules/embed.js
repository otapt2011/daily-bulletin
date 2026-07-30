// Embed helper (IIFE): supports YouTube and TikTok URLs -> returns an element (iframe wrapper)
(function () {
  function createEmbedNode(url) {
    try {
      const u = new URL(url);
      if (/youtube\.com|youtu\.be/.test(u.hostname)) {
        // normalize to youtube embed
        let id = null;
        if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
        else id = u.searchParams.get('v');
        if (!id) return null;
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${id}`;
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.loading = 'lazy';
        return iframe;
      } else if (/tiktok\.com/.test(u.hostname)) {
        // TikTok embed: use the standard tiktok embed url patterns
        const iframe = document.createElement('iframe');
        iframe.src = url.replace(/\/v\d+\/?$/, ''); // best-effort
        iframe.loading = 'lazy';
        return iframe;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  window.EMBED = { createEmbedNode };
})();
