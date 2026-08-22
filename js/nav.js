function initNavigation() {
  // All [data-page] links
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-page]');
    if (trigger) {
      e.preventDefault();
      const page = trigger.getAttribute('data-page');
      navigateTo(page);
    }
  });
}

function navigateTo(page, options = {}) {
  const { pushState = true } = options;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));


  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateNavLinks(page);
    closeMenu();
    updateTitle(page);
    setTimeout(observeFadeIns, 50);
    trackPageView(page);

    if (pushState) {
      const path = page === 'home' ? '/' : `/${page}`;
      if (location.pathname !== path) {
        history.pushState({ page }, '', path);
      }
    }
  }
}

function updateNavLinks(page) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-page') === page);
  });
}

function updateTitle(page) {
  const titles = {
    home: 'Global Worship Radio | Global Street Team',
    prayers: 'Prayer Requests | Global Worship Radio',
    events: 'Events | Global Worship Radio',
    giveaways: 'Giveaways | Global Worship Radio',
    resources: 'Resources | Global Worship Radio',
    contact: 'Contact Us | Global Worship Radio',
  };
  document.title = titles[page] || 'Global Worship Radio';
}

// Reads the page id out of a URL path like "/prayers" or "/prayers/",
// falling back to "home" for anything blank or unrecognized.
function pageFromPath() {
  const raw = location.pathname.replace(/^\/|\/$/g, '');
  return GWR_PAGES.includes(raw) ? raw : 'home';
}

function checkInitialPage() {
  const page = pageFromPath();
  navigateTo(page, { pushState: false });
  // Normalize the URL (e.g. a trailing slash) without adding an extra
  // history entry.
  const path = page === 'home' ? '/' : `/${page}`;
  if (location.pathname !== path) {
    history.replaceState({ page }, '', path);
  }
}

// Browser back/forward buttons
window.addEventListener('popstate', (e) => {
  const page = e.state?.page || pageFromPath();
  navigateTo(page, { pushState: false });
});


function initHamburger() {
  const btn = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  btn.addEventListener('click', () => {
    const isOpen = btn.classList.toggle('open');
    navLinks.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', isOpen);
  });
}

function closeMenu() {
  const btn = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  btn.classList.remove('open');
  navLinks.classList.remove('open');
  btn.setAttribute('aria-expanded', false);
}

function initScrollEffects() {
  const header = document.getElementById('site-header');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;


    header.classList.toggle('scrolled', scrollY > 20);

    lastScroll = scrollY;
  }, { passive: true });
}

function initFadeInObserver() {
  observeFadeIns();
}

function observeFadeIns() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger siblings
        const siblings = entry.target.parentElement
          ? [...entry.target.parentElement.querySelectorAll('.fade-in')]
          : [];
        const idx = siblings.indexOf(entry.target);
        const delay = idx * 80;

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);

        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-in:not(.visible)').forEach(el => {
    observer.observe(el);
  });
}