function filterResources(query) {
  const cards = document.querySelectorAll('.resource-card');
  const q = query.toLowerCase();

  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.classList.toggle('hidden', q.length > 0 && !text.includes(q));
  });
}

function filterByType(type, btn) {

  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const cards = document.querySelectorAll('.resource-card');
  cards.forEach(card => {
    const cardType = card.getAttribute('data-type');
    card.classList.toggle('hidden', type !== 'all' && cardType !== type);
  });
}

(function () {

  function isExternalLink(url) {
    try {
      return url.startsWith('http') && !url.includes(window.location.hostname);
    } catch (e) {
      return false;
    }
  }


  function isPDF(url) {
    return url && url.toLowerCase().includes('.pdf');
  }

  function enhanceAllLinks() {
    const links = document.querySelectorAll('a[href]');

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#')) return;
      if (isExternalLink(href)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }

      if (isPDF(href)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }

      if (link.hasAttribute('download')) {
        link.setAttribute('target', '_blank');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', enhanceAllLinks);

  const observer = new MutationObserver(() => {
    enhanceAllLinks();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();