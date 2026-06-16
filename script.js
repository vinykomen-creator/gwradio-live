'use strict';
const GWR = {
  audio: null,
  isPlaying: false,
  miniVisible: false,
  isLive: true,
  pauseAutoHideTimer: null
};

const STREAM_URL = "https://s5.radio.co/s0cc043163/listen";


function initRadioPlayer() {
  if (GWR.audio) return; 

  GWR.audio = new Audio(STREAM_URL);
  GWR.audio.crossOrigin = "anonymous";
  GWR.audio.preload = "none"; 
  GWR.audio.addEventListener("play", () => {
    GWR.isPlaying = true;
    clearAutoHideTimer();
    syncAllPlayerUI();
  });

  GWR.audio.addEventListener("pause", () => {
    GWR.isPlaying = false;
    syncAllPlayerUI();
    scheduleMiniPlayerAutoHide();
  });

  GWR.audio.addEventListener("waiting", () => {
    setMiniPlayerBuffering(true);
  });

  GWR.audio.addEventListener("playing", () => {
    setMiniPlayerBuffering(false);
  });

  GWR.audio.addEventListener("error", () => {
    showToast("⚠️ Stream connection issue. Please retry.", "");
    setMiniPlayerBuffering(false);
    GWR.isPlaying = false;
    syncAllPlayerUI();
  });
}


function playStream() {
  initRadioPlayer();
  clearAutoHideTimer();

  if (!GWR.isPlaying) {
    GWR.audio.play().catch(err => {
      console.warn("Playback blocked by browser:", err);
      showToast("Tap Play to start streaming", "");
    });
  }
}

function pauseStream() {
  if (GWR.audio && GWR.isPlaying) {
    GWR.audio.pause();
  }
}


function toggleRadio() {
  GWR.isPlaying ? pauseStream() : playStream();
}


function showMiniPlayer() {
  const mp = document.getElementById('gwr-mini-player');
  if (!mp || GWR.miniVisible) return;

  GWR.miniVisible = true;
  mp.getBoundingClientRect();
  mp.classList.add('visible');
  document.body.classList.add('mini-player-active');

  syncMiniPlayerUI();
}

function hideMiniPlayer() {
  const mp = document.getElementById('gwr-mini-player');
  if (!mp) return;

  GWR.miniVisible = false;
  mp.classList.remove('visible');
  document.body.classList.remove('mini-player-active');
}

function scheduleMiniPlayerAutoHide() {
  clearAutoHideTimer();
  GWR.pauseAutoHideTimer = setTimeout(() => {
    if (!GWR.isPlaying && GWR.miniVisible) {
      hideMiniPlayer();
    }
  }, 8000);
}

function clearAutoHideTimer() {
  if (GWR.pauseAutoHideTimer) {
    clearTimeout(GWR.pauseAutoHideTimer);
    GWR.pauseAutoHideTimer = null;
  }
}

function syncAllPlayerUI() {
  syncMiniPlayerUI();
  syncModalUI();
}

function syncMiniPlayerUI() {
  const playIcon  = document.getElementById('mini-play-icon');
  const pauseIcon = document.getElementById('mini-pause-icon');
  const mp        = document.getElementById('gwr-mini-player');
  if (!mp) return;

  if (playIcon)  playIcon.style.display  = GWR.isPlaying ? 'none'  : 'block';
  if (pauseIcon) pauseIcon.style.display = GWR.isPlaying ? 'block' : 'none';
  mp.classList.toggle('paused', !GWR.isPlaying);
}

function syncModalUI() {
  const modalToggleBtn = document.querySelector('#listen-overlay .btn-listen.btn-full');
  if (modalToggleBtn && !modalToggleBtn.href) { // not the "Open Full Player" link
    modalToggleBtn.textContent = GWR.isPlaying ? '⏸ Pause' : '▶ Play';
  }
}

function setMiniPlayerBuffering(isBuffering) {
  const art = document.querySelector('.mini-art-icon');
  if (art) art.textContent = isBuffering ? '⏳' : '📻';
}


function miniTogglePlayback() {
  toggleRadio();
}

function miniExpandToFull() {
  hideMiniPlayer();
  showListenModal();
}

const eventsData = [
  
  {
    date: "May 26",
    tag: "Momentum Radio Conference",
    title: "Global Worship Radio: At Momentum Radio Conference",
    description:
      "This year, four members of our team will be attending the Momentum Radio Conference. This gathering brings together voices from across Christian radio, including artists, leaders, and ministries who are passionate about reaching people through music and media.",
    time: "🕗 8:00 AM – 8:00 PM",
    location: "📍 Florida, Orlando",
    buttonText: "Register Slot",
    buttonPage: "signup"
  },

  {
    date: "Jun 17",
    tag: "Worship Event",
    title: "Big Daddy Weave Let It Begin Tour Brainerd MN",
    description:
      "Join Big Daddy Weave on the Let It Begin Tour, alongside special guests Megan Woods and David Leonard. Together, they will lead a night filled with powerful music and a message that speaks directly to your heart.",
    time: "🕕 6:00 PM – 10:00 PM UTC+0",
    location: "📍 Gichi-ziibi Center for the Arts",
    buttonText: "Register Free",
    buttonPage: "signup"
  },

  {
    date: "Jun 28",
    tag: "Worship Event",
    title: "Solid Rock in the Park",
    description:
      "What makes Solid Rock in the Park in Pine City MN truly special is that it is completely free. Because of that, everyone is invited.",
    time: "🕙 1:00 PM – 7:00 PM UTC+0",
    location: "📍 Robinson Park in Pine City",
    buttonText: "Register Free",
    buttonPage: "signup"
  },

  {
    date: "Jul 31",
    tag: "Worship Event",
    title: "Festival: ThriveFest North",
    description:
      "Join us in Jamestown, North Dakota, for Thrivefest North. Experience incredible live music, inspiring messages, and community.",
    time: "🕘 12:00 PM – 10:00 PM",
    location: "📍 Stutsman County Fairgrounds",
    buttonText: "Register Free",
    buttonPage: "signup"
  },

  {
    date: "Aug 28",
    tag: "Music Festival",
    title: "Rural Music Festival",
    description:
      "Join us in Isle, Minnesota, for the Rural Music Festival, where music, energy, and connection come together.",
    time: "🕙 11:00 AM – 10:00 PM",
    location: "📍 Redemption Hill",
    buttonText: "Register Free",
    buttonPage: "signup"
  },

  {
    date: "Aug 31",
    tag: "Minnesota State Fair",
    title: "Meet Global Worship Radio at the Minnesota State Fair",
    description:
      "Stop by our booth at the CrossRoads Chapel to connect with our team, receive prayer, and pick up a free Bible.",
    time: "🕕 3:00 PM – 9:00 PM",
    location: "📍 Minnesota State Fair",
    buttonText: "Register Free",
    buttonPage: "signup"
  }
  
];

function parseEventDate(dateStr) {
  const months = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
  };

  const [month, day] = dateStr.split(" ");
  const currentYear = new Date().getFullYear();

  const date = new Date(
    currentYear,
    months[month],
    parseInt(day, 10)
  );

  if (isNaN(date.getTime())) {
    console.warn("Invalid date:", dateStr);
    return new Date();
  }

  return date;
}

function getSortedEvents() {
  return [...eventsData].sort((a, b) => {
    return parseEventDate(a.date) - parseEventDate(b.date);
  });
}

function getUpcomingSortedEvents() {
  return getSortedEvents().filter(event => {
    const eventDate = parseEventDate(event.date);
    return eventDate >= new Date();
  });
}

function getPastEvents() {
  const now = new Date();

  return getSortedEvents().filter(event => {
    const eventDate = parseEventDate(event.date);
    return eventDate < now;
  });
}

function renderEventsGrid() {
  const container = document.getElementById("eventsGrid");

  if (!container) return;

  container.innerHTML = "";

  getUpcomingSortedEvents().forEach(event => {
    container.innerHTML += `
      <div class="event-card fade-in">
        <div class="event-card-date">${event.date}</div>

        <div class="event-card-body">
          <span class="event-tag">${event.tag}</span>

          <h4>${event.title}</h4>

          <p>${event.description}</p>

          <div class="event-card-meta">
            <span>${event.time}</span>
            <span>${event.location}</span>
          </div>

          <a href="#" class="btn btn-outline-sm"
             data-page="${event.buttonPage}">
             ${event.buttonText}
          </a>
        </div>
      </div>
    `;
  });
}

function renderHomeEvents() {
  const container = document.getElementById("homeEventsList");
  if (!container) return;

  container.innerHTML = "";

  const featured = getUpcomingSortedEvents().slice(0, 3);

  featured.forEach(event => {
    const dayMonth = event.date.split(" ");
    const day = dayMonth[0] || "";
    const month = dayMonth[1] || "";

    container.innerHTML += `
      <div class="event-item fade-in">
        <div class="event-date">
          <span class="event-day">${day}</span>
          <span class="event-month">${month}</span>
        </div>

        <div class="event-info">
          <h4>${event.title}</h4>
          <p>${event.time} | ${event.location}</p>
        </div>

        <a href="#" class="btn btn-sm" data-page="${event.buttonPage}">
          ${event.buttonText}
        </a>
      </div>
    `;
  });
}


document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initHamburger();
  initScrollEffects();
  initFadeInObserver();
  initCountdown();
  initListenLive();
  checkInitialPage();


  renderEventsGrid();
  renderHomeEvents();


const signupForm = document.getElementById('signupForm');
  if (signupForm) signupForm.addEventListener('submit', (e) => handleFormSubmit(e, 'signup'));

  const contactForm = document.getElementById('contactForm');
  if (contactForm) contactForm.addEventListener('submit', (e) => handleFormSubmit(e, 'contact'));
});

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

function navigateTo(page) {

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));


  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateNavLinks(page);
    closeMenu();
    updateTitle(page);
    setTimeout(observeFadeIns, 50);
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
    signup: 'Join Us | Global Worship Radio',
    training: 'Training Programs | Global Worship Radio',
    events: 'Events | Global Worship Radio',
    resources: 'Resources | Global Worship Radio',
    contact: 'Contact Us | Global Worship Radio'
  };
  document.title = titles[page] || 'Global Worship Radio';
}

function checkInitialPage() {
  
  navigateTo('home');
}


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

function initCountdown() {
  const target = new Date('2026-06-18T09:00:00');

  function updateCountdown() {
    const now = new Date();
    const diff = target - now;

    if (diff <= 0) {
      ['cd-days', 'cd-hours', 'cd-mins', 'cd-secs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val).padStart(2, '0');
    };

    set('cd-days', days);
    set('cd-hours', hours);
    set('cd-mins', mins);
    set('cd-secs', secs);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function initListenLive() {
  document.querySelectorAll('.btn-listen, .btn-listen-mobile').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      initRadioPlayer();
      playStream();
      showListenModal();
    });
  });
}

function showListenModal() {
  hideMiniPlayer(); 

  let overlay = document.getElementById('listen-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'listen-overlay';
    overlay.innerHTML = buildModalHTML();
    injectModalStyles();
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeListenModal();
    });
  } else {
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
  }

  syncModalUI();
}

function buildModalHTML() {
  return `
    <div class="listen-modal">
      <button class="listen-modal-close" onclick="closeListenModal()">✕</button>
      <div class="listen-modal-header">
        <div class="listen-modal-pulse">
          <div class="wave-ring r1"></div>
          <div class="wave-ring r2"></div>
          <div class="listen-modal-icon">📻</div>
        </div>
        <div>
          <div class="listen-modal-badge">🔴 LIVE</div>
          <h3>Global Worship Radio</h3>
          <p>Global Street Team</p>
        </div>
      </div>
      <div class="listen-controls">
        <div class="listen-bars">
          <div class="bar"></div><div class="bar"></div><div class="bar"></div>
          <div class="bar"></div><div class="bar"></div><div class="bar"></div>
          <div class="bar"></div><div class="bar"></div>
        </div>
        <p class="listen-now">${GWR.isPlaying ? "Now Playing Live 🎧" : "Ready to Play"}</p>
        <button onclick="toggleRadio()" class="btn btn-listen btn-full">
          ${GWR.isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>
      <a href="#" target="_blank" rel="noopener"
         class="btn btn-listen btn-full"
         style="justify-content:center; margin-top:10px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        Open Full Player ↗
      </a>
      <p class="listen-footnote">
        Close this window — audio keeps playing below.
      </p>
    </div>
  `;
}

function closeListenModal() {
  const overlay = document.getElementById('listen-overlay');
  if (!overlay) return;

  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.2s ease';

  setTimeout(() => {
    overlay.remove();
    if (GWR.audio) {
      showMiniPlayer();
    }
  }, 200);
}

function injectModalStyles() {
  if (document.getElementById('listen-modal-styles')) return;

  const style = document.createElement('style');
  style.id = 'listen-modal-styles';
  style.textContent = `
    #listen-overlay {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(26,26,46,0.7);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px; box-sizing: border-box;
      animation: fadeIn .25s ease;
    }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    .listen-modal {
      background: white; border-radius: 20px; padding: 36px;
      width: 90%; max-width: 420px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.35);
      position: relative;
      animation: slideUp .3s cubic-bezier(.34,1.56,.64,1);
      box-sizing: border-box; overflow: hidden;
      display: flex; flex-direction: column; gap: 18px;
    }
    @keyframes slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
    .listen-modal-close {
      position: absolute; top: 16px; right: 16px;
      background: #f5f3ef; border: none; cursor: pointer;
      width: 32px; height: 32px; border-radius: 50%;
      font-size: 0.9rem; color: #6b6b80;
      display: flex; align-items: center; justify-content: center;
      transition: .2s;
    }
    .listen-modal-close:hover { background: #f2503a; color: white; }
    .listen-modal-header { display: flex; align-items: center; gap: 16px; }
    .listen-modal-pulse {
      position: relative; width: 56px; height: 56px;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .listen-modal-pulse .wave-ring {
      position:absolute; border-radius:50%;
      border:2px solid rgba(242,80,58,0.3);
      animation: ring-pulse 2s ease infinite;
    }
    .listen-modal-pulse .r1 { width:56px; height:56px; }
    .listen-modal-pulse .r2 { width:38px; height:38px; animation-delay:.4s; }
    .listen-modal-icon { font-size:1.5rem; z-index:2; }
    .listen-modal-badge {
      display:inline-block; background:#f2503a; color:white;
      font-size:.72rem; font-weight:700; padding:3px 10px;
      border-radius:50px; margin-bottom:6px; letter-spacing:.08em;
    }
    .listen-modal-header h3 {
      font-family:'Playfair Display',serif; font-size:1.1rem;
      color:#1a1a2e; margin-bottom:3px;
    }
    .listen-modal-header p { font-size:.83rem; color:#6b6b80; }
    .listen-controls {
      background: #faf9f7; border-radius: 12px; padding: 20px;
      text-align: center; display: flex; flex-direction: column;
      align-items: center; gap: 16px;
    }
    .listen-bars {
      display:flex; align-items:flex-end; justify-content:center;
      gap:4px; height:40px;
    }
    .bar {
      width:6px; border-radius:3px;
      background: linear-gradient(to top, #f2503a, #f2a33a);
      animation: bar-bounce 1s ease infinite;
    }
    .bar:nth-child(1){height:20px;animation-delay:0s}
    .bar:nth-child(2){height:35px;animation-delay:.1s}
    .bar:nth-child(3){height:25px;animation-delay:.2s}
    .bar:nth-child(4){height:40px;animation-delay:.3s}
    .bar:nth-child(5){height:30px;animation-delay:.15s}
    .bar:nth-child(6){height:22px;animation-delay:.25s}
    .bar:nth-child(7){height:38px;animation-delay:.05s}
    .bar:nth-child(8){height:18px;animation-delay:.35s}
    @keyframes bar-bounce {
      0%,100%{transform:scaleY(1)} 50%{transform:scaleY(.4)}
    }
    .listen-now { font-size:.85rem; color:#6b6b80; }
    .listen-footnote {
      font-size:.75rem; color:#aaa; text-align:center; line-height:1.5;
    }
  `;
  document.head.appendChild(style);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMenu();
    closeListenModal();
  }
  // Spacebar toggle when mini player is visible + no input focused
  if (e.code === 'Space' && GWR.miniVisible &&
      !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    toggleRadio();
  }
});


function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-answer.open').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-question.open').forEach(q => q.classList.remove('open'));

  if (!isOpen) {
    answer.classList.add('open');
    btn.classList.add('open');
  }
}

function handleNewsletterSubmit(event) {
  event.preventDefault();

  const emailInput = event.target.querySelector('input[type="email"]');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    showToast('Please enter a valid email', 'error');
    return;
  }

  fetch('https://gwradio-live.onrender.com/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      source: 'footer'
    })
  })
  .then(async (res) => {
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Subscription failed');
    }

    return data;
  })
  .then((data) => {
    showToast(data.message || 'Successfully subscribed!', 'success');
    event.target.reset();
  })
  .catch((err) => {
    console.error(err);
    showToast(err.message || 'Server connection error', 'error');
  });
}

async function handleFormSubmit(event, type) {
  event.preventDefault();

  try {

    if (type === 'signup') {

      const payload = {
        first_name: document.getElementById('signupFirstName').value.trim(),
        last_name: document.getElementById('signupLastName').value.trim(),
        email: document.getElementById('signupEmail').value.trim(),
        phone: document.getElementById('signupPhone').value.trim(),
        interest: document.getElementById('signupInterest').value,
        about: document.getElementById('signupAbout').value.trim(),
        agreed_terms: document.getElementById('terms').checked
      };

      const response = await fetch('https://gwradio-live.onrender.com/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Account created successfully!');
        document.getElementById('signupForm').reset();
      } else {
        alert(data.message || 'Signup failed');
      }
    }

    if (type === 'contact') {

      const payload = {
        first_name: document.getElementById('contactFirstName').value.trim(),
        last_name: document.getElementById('contactLastName').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value.trim()
      };

      const response = await fetch('https://gwradio-live.onrender.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Message sent successfully!');
        document.getElementById('contactForm').reset();
      } else {
        alert(data.message || 'Failed to send message');
      }
    }

  } catch (error) {
    console.error('Form Error:', error);
    alert('Unable to connect to server.');
  }
}

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

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMenu();
    closeListenModal();
  }
});

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