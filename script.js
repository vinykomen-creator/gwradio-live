'use strict';

const STATION_ID   = 's0cc043163';
const RADIOCO_API  = `https://public.radio.co/api/v2/${STATION_ID}`;
const RADIOCO_TRACK = `${RADIOCO_API}/track/current`;
const RADIOCO_STATUS = `https://public.radio.co/stations/${STATION_ID}/status`;

const GWR = {
  audio: null,
  isPlaying: false,
  miniVisible: false,
  isLive: true,
  pauseAutoHideTimer: null,
  nowPlaying: {
    title:    'Global Worship Radio',
    artist:   'Global Street Team',
    artwork:  null,
  },
  history: [],
  nowPlayingInterval: null,
};

let EVENTS_CACHE = [];
let EVENTS_LOADED = false;
const SUPABASE_URL = "https://dieunopidtcxjsvjxpbs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZXVub3BpZHRjeGpzdmp4cGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjYxMzgsImV4cCI6MjA5NTEwMjEzOH0.LatWVvrUraIYeI8tAa9fMgiW12SIKO74KRrhx5GdBW0";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const STREAM_URL = "https://s5.radio.co/s0cc043163/listen";

// ─── Now Playing & Song History ───────────────────────────────────────────

async function fetchNowPlaying() {
  try {
    const [trackRes, statusRes] = await Promise.all([
      fetch(RADIOCO_TRACK),
      fetch(RADIOCO_STATUS),
    ]);

    if (trackRes.ok) {
      const track = await trackRes.json();
      const current = track.data || {};
      GWR.nowPlaying.title  = current.title  || 'Global Worship Radio';
      GWR.nowPlaying.artist = current.artist_name || 'Global Street Team';
      GWR.nowPlaying.artwork = (current.artwork_urls && current.artwork_urls.large)
        || (current.artwork_urls && current.artwork_urls.thumbnail)
        || null;
    }

    if (statusRes.ok) {
      const status = await statusRes.json();
      GWR.history = (status.history || []).slice(0, 6);
    }

    updateNowPlayingUI();
  } catch (err) {
    // Silently fail — keeps audio playing uninterrupted
    console.warn('Now-playing fetch failed:', err.message);
  }
}

function startNowPlayingPolling() {
  fetchNowPlaying();
  // Poll every 30 s — Radio.co updates ~every 30 s
  GWR.nowPlayingInterval = setInterval(fetchNowPlaying, 30000);
}

function updateNowPlayingUI() {
  const { title, artist, artwork } = GWR.nowPlaying;

  // Mini player
  const miniTitle    = document.getElementById('mini-title');
  const miniSubtitle = document.getElementById('mini-subtitle');
  const miniArtIcon  = document.querySelector('.mini-art-icon');
  const miniArtImg   = document.getElementById('mini-art-img');

  if (miniTitle)    miniTitle.textContent    = title;
  if (miniSubtitle) miniSubtitle.textContent = artist;

  if (artwork) {
    if (!miniArtImg) {
      // Replace emoji icon with real artwork image
      const artContainer = document.querySelector('.mini-art');
      if (artContainer) {
        const img = document.createElement('img');
        img.id = 'mini-art-img';
        img.src = artwork;
        img.alt = 'Album Art';
        img.style.cssText = 'width:38px;height:38px;border-radius:6px;object-fit:cover;z-index:2;position:relative;';
        if (miniArtIcon) miniArtIcon.style.display = 'none';
        artContainer.appendChild(img);
      }
    } else {
      miniArtImg.src = artwork;
    }
  }

  // Modal (if open)
  const modalTitle  = document.getElementById('modal-now-title');
  const modalArtist = document.getElementById('modal-now-artist');
  const modalArt    = document.getElementById('modal-artwork');

  if (modalTitle)  modalTitle.textContent  = title;
  if (modalArtist) modalArtist.textContent = artist;
  if (modalArt && artwork) {
    modalArt.src = artwork;
    modalArt.style.display = 'block';
  }

  // Song history panel (if open)
  renderHistoryList();
}

function renderHistoryList() {
  const container = document.getElementById('modal-history-list');
  if (!container || GWR.history.length === 0) return;

  container.innerHTML = GWR.history.map((track, i) => `
    <div class="history-track ${i === 0 ? 'history-track--current' : ''}">
      <div class="history-track-art">
        ${track.artwork_urls && track.artwork_urls.thumbnail
          ? `<img src="${track.artwork_urls.thumbnail}" alt="" />`
          : `<span>♪</span>`}
      </div>
      <div class="history-track-info">
        <span class="history-track-title">${track.title || 'Unknown'}</span>
        <span class="history-track-artist">${track.artist_name || ''}</span>
      </div>
      ${i === 0 ? '<span class="history-now-badge">NOW</span>' : ''}
    </div>
  `).join('');
}

function initRadioPlayer() {
  if (GWR.audio) return;

  GWR.audio = new Audio(STREAM_URL);
  GWR.audio.crossOrigin = "anonymous";
  GWR.audio.preload = "none";
  GWR.audio.addEventListener("play", () => {
    GWR.isPlaying = true;
    clearAutoHideTimer();
    syncAllPlayerUI();
    if (!GWR.nowPlayingInterval) startNowPlayingPolling();
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
    showToast("⚠️ Stream connection issue. Please retry.", "error");
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
      showToast("Tap Play to start streaming", "info");
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
  const playIcon = document.getElementById('mini-play-icon');
  const pauseIcon = document.getElementById('mini-pause-icon');
  const mp = document.getElementById('gwr-mini-player');
  if (!mp) return;

  if (playIcon) playIcon.style.display = GWR.isPlaying ? 'none' : 'block';
  if (pauseIcon) pauseIcon.style.display = GWR.isPlaying ? 'block' : 'none';
  mp.classList.toggle('paused', !GWR.isPlaying);
}

function syncModalUI() {
  const playIcon  = document.getElementById('modal-play-icon');
  const pauseIcon = document.getElementById('modal-pause-icon');
  const bars      = document.getElementById('modal-listen-bars');

  if (playIcon)  playIcon.style.display  = GWR.isPlaying ? 'none'  : 'block';
  if (pauseIcon) pauseIcon.style.display = GWR.isPlaying ? 'block' : 'none';
  if (bars)      bars.style.animationPlayState = GWR.isPlaying ? 'running' : 'paused';
}

function setVolume(val) {
  if (GWR.audio) {
    GWR.audio.volume = val / 100;
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

function parseEventDateTime(event) {

  if (!event) {
    return {
      start: new Date(),
      end: new Date()
    };
  }

  const currentYear = new Date().getFullYear();

  const dateStr = event.date || "";
  const startStr = event.start_time || "00:00";
  const endStr = event.end_time || "00:00";

  const baseDate = new Date(`${dateStr} ${currentYear}`);

  const [startHour, startMin] = startStr.split(":").map(Number);
  const [endHour, endMin] = endStr.split(":").map(Number);

  const start = new Date(baseDate);
  start.setHours(startHour || 0, startMin || 0, 0);

  const end = new Date(baseDate);
  end.setHours(endHour || 0, endMin || 0, 0);

  return { start, end };
}

function getEventStatus(event) {
  const now = new Date();
  const { start, end } = parseEventDateTime(event);

  if (now < start) {
    return "upcoming";
  }

  if (now >= start && now <= end) {
    return "live";
  }

  return "ended";
}

function getEventCTA(event) {

  if (!event) {
    return {
      text: "View Events",
      page: "events"
    };
  }

  const status = getEventStatus(event);

  /*
   LIVE EVENTS
  */
  if (status === "live") {
    return {
      text: "Contact Us",
      page: event.contact_page || "contact"
    };
  }

  /*
   GIVEAWAYS
  */
  if (event.is_giveaway === true) {
    return {
      text: "Enter Giveaway",
      page: event.giveaway_page || "ticket-giveaway"
    };
  }

  /*
   NORMAL EVENTS
  */
  return {
    text: event.button_text || "Buy Tickets",
    url: event.button_url || "#"
  };
}

function getEventActions(event) {

  if (!event) {
    return {};
  }

  const status = getEventStatus(event);

  /*
   * LIVE EVENT
   * Contact only
   */
  if (status === "live") {
    return {
      primary: {
        text: "Contact Us",
        page: event.contact_page || "contact"
      }
    };
  }

  /*
   * GIVEAWAY EVENTS
   * Giveaway + Tickets/Contact
   */
  if (event.is_giveaway === true) {

    const actions = {
      primary: {
        text: "Enter Giveaway",
        page: event.giveaway_page || "ticket-giveaway"
      }
    };

    if (event.button_url && event.button_url !== "#") {
      actions.secondary = {
        text: "Buy Tickets",
        url: event.button_url
      };
    } else {
      actions.secondary = {
        text: "Contact Us",
        page: event.contact_page || "contact"
      };
    }

    return actions;
  }

  if (event.button_url && event.button_url !== "#") {
    return {
      primary: {
        text: "Buy Tickets",
        url: event.button_url
      }
    };
  }

  return {
    primary: {
      text: "Contact Us",
      page: event.contact_page || "contact"
    }
  };
}

function getEventBrain(events = []) {

  const sorted = [...events].sort(
    (a, b) =>
      parseEventDateTime(a).start -
      parseEventDateTime(b).start
  );

  const live = sorted.find(e => getEventStatus(e) === "live") || null;

  const giveawayLive = sorted.find(
    e => e.is_giveaway === true && getEventStatus(e) === "live"
  ) || null;

  const featuredPinned = sorted.find(
    e => e.is_featured === true && getEventStatus(e) !== "ended"
  ) || null;

  const giveawayUpcoming = sorted.find(
    e => e.is_giveaway === true && getEventStatus(e) === "upcoming"
  ) || null;

  const upcoming = sorted.find(
    e => getEventStatus(e) === "upcoming"
  ) || null;

  const featured =
    giveawayLive ||     // highest priority (live giveaway overrides everything)
    live ||             // live event fallback
    featuredPinned ||   // admin pinned featured
    giveawayUpcoming || // upcoming giveaway
    upcoming ||         // fallback
    null;

  return {
    all: sorted,
    live,
    giveawayLive,
    featured,
    upcoming
  };
}

async function getFeaturedEvent() {
  const { data, error } = await supabaseClient
    .from('events')
    .select('*');

  if (error || !data || data.length === 0) {
    console.error("No Supabase events found:", error);
    return null;
  }

  const upcoming = data
    .filter(e => getEventStatus(e) !== "ended")
    .sort((a, b) => {
      const aTime = parseEventDateTime(a).start;
      const bTime = parseEventDateTime(b).start;
      return aTime - bTime;
    });

  return upcoming[0] || null;
}

async function fetchEvents(force = false) {
  if (EVENTS_LOADED && !force) {
    return EVENTS_CACHE;
  }

  const { data, error } = await supabaseClient
    .from('events')
    .select('*');

  if (error) {
    console.error("Supabase fetch error:", error);
    return [];
  }

  EVENTS_CACHE = data || [];
  EVENTS_LOADED = true;

  return EVENTS_CACHE;
}

function getLiveBadge(event) {
  return getEventStatus(event) === "live"
    ? '<span class="live-badge">🔴 LIVE</span>'
    : '';
}

async function renderFeaturedEvent() {
  const events = EVENTS_CACHE;

  if (!events || events.length === 0) return;

  const brain = getEventBrain(events);
  const event = brain?.featured;

  if (!event) return;

  const title = document.getElementById("featuredTitle");
  const description = document.getElementById("featuredDescription");
  const dateTime = document.getElementById("featuredDateTime");
  const location = document.getElementById("featuredLocation");
  const button = document.getElementById("featuredButton");
  const badge = document.getElementById("featuredBadge");

  if (title) title.textContent = event.title;
  if (description) description.textContent = event.description;
  if (dateTime) {
    dateTime.textContent =
      `${event.date} • ${event.start_time} - ${event.end_time}`;
  }
  if (location) location.textContent = event.location;

  if (button) {
    const cta = getEventCTA(event);

    button.textContent = cta.text || "View Events";

    button.onclick = null;
    button.removeAttribute("href");

    if (cta.page) {
      button.onclick = (e) => {
        e.preventDefault();
        navigateTo(cta.page);
      };
    } else if (cta.url) {
      button.href = cta.url;
      button.target = "_blank";
      button.rel = "noopener";
    }
  }

  if (badge) {
    if (brain.live) {
  badge.textContent = "🔴 LIVE NOW";
}
else if (event.is_featured) {
  badge.textContent = "⭐ FEATURED";
}
else if (event.is_giveaway) {
  badge.textContent = "🎁 GIVEAWAY";
}
else {
  badge.textContent = "📅 UPCOMING";
}
  }
}

function renderGiveawayPromo() {

  const promo = document.getElementById("giveawayPromoCard");
  const hiddenEvent = document.getElementById("selectedGiveawayEvent");

  if (!promo) return;

  const brain = getEventBrain(EVENTS_CACHE || []);

  const event = brain.featured;

  if (!event) {

    promo.innerHTML = `
      <p>No active giveaways at the moment.</p>
    `;

    if (hiddenEvent) {
      hiddenEvent.value = "";
    }

    return;
  }

  promo.innerHTML = `
  <div class="event-card giveaway-promo-card">

    <div class="event-card-date">
      ${event.date}
    </div>

    <div class="event-card-body">

      <span class="event-tag">
        ${event.tag || "Giveaway"}
      </span>

      <h4>
        ${event.title}
      </h4>

      <p>
        ${event.description}
      </p>

      <div class="event-card-meta">

        <span>
          🕒 ${event.start_time} – ${event.end_time}
        </span>

        <span>
          ${event.location}
        </span>

      </div>

      ${
        event.button_url
          ? `
            <a href="${event.button_url}"
               class="btn btn-outline-sm"
               target="_blank"
               rel="noopener">
               Buy Tickets
            </a>
          `
          : ""
      }

    </div>

  </div>
`;

  if (hiddenEvent) {
    hiddenEvent.value = event.title;
  }
}

async function renderEventsGrid() {
  const container = document.getElementById("eventsGrid");

  if (!container) return;

  const events = EVENTS_CACHE || [];

  container.innerHTML = "";

  const upcoming = events
    .filter(event => getEventStatus(event) !== "ended")
    .sort((a, b) => {
      return (
        parseEventDateTime(a).start -
        parseEventDateTime(b).start
      );
    });

  if (upcoming.length === 0) {
    container.innerHTML = `
      <div class="event-empty-state">
        <p>No upcoming events at the moment.</p>
      </div>
    `;
    return;
  }

  upcoming.forEach(event => {
    container.innerHTML += `
      <div class="event-card fade-in">
        <div class="event-card-date">
          ${event.date}
        </div>

        <div class="event-card-body">
          <span class="event-tag">
            ${event.tag}
          </span>

          <h4>
            ${event.title}
            ${getLiveBadge(event)}
          </h4>

          <p>
            ${event.description}
          </p>

          <div class="event-card-meta">
            <span>
              🕒 ${event.start_time} – ${event.end_time}
            </span>

            <span>
              ${event.location}
            </span>
          </div>

          ${(() => {

  const actions = getEventActions(event);

  let html = `<div class="event-cta-group">`;

  // PRIMARY CTA
  if (actions.primary) {
    if (actions.primary.page) {
      html += `
        <a href="#"
           class="btn btn-primary btn-sm"
           data-page="${actions.primary.page}">
           ${actions.primary.text}
        </a>
      `;
    } else {
      html += `
        <a href="${actions.primary.url}"
           class="btn btn-primary btn-sm"
           target="_blank"
           rel="noopener">
           ${actions.primary.text}
        </a>
      `;
    }
  }

  // SECONDARY CTA (only for giveaway)
  if (actions.secondary) {
    if (actions.secondary.page) {
      html += `
        <a href="#"
           class="btn btn-outline-sm"
           data-page="${actions.secondary.page}">
           ${actions.secondary.text}
        </a>
      `;
    } else {
      html += `
        <a href="${actions.secondary.url}"
           class="btn btn-outline-sm"
           target="_blank"
           rel="noopener">
           ${actions.secondary.text}
        </a>
      `;
    }
  }

  return html + `</div>`;

})()}
        </div>
      </div>
    `;
  });

  observeFadeIns();
}

async function renderHomeEvents() {
  const container = document.getElementById("homeEventsList");
  if (!container) return;

  const events = EVENTS_CACHE;

  container.innerHTML = "";

  const brain = getEventBrain(events);
  const featured = brain.all
    .filter(e => getEventStatus(e) !== "ended")
    .slice(0, 3);

  featured.forEach(event => {
    const [day, month] = event.date.split(" ");

    container.innerHTML += `
      <div class="event-item fade-in">
        <div class="event-date">
          <span class="event-day">${day}</span>
          <span class="event-month">${month}</span>
        </div>

        <div class="event-info">
          <h4>${event.title}</h4>
          <p>${event.start_time} | ${event.location}</p>
        </div>

        ${(() => {

  const actions = getEventActions(event);
  const primary = actions.primary;

  if (!primary) return "";

  if (primary.page) {
    return `
      <a href="#"
         class="btn btn-outline-sm btn-home-primary"
         data-page="${primary.page}">
         ${primary.text}
      </a>
    `;
  }

  return `
    <a href="${primary.url}"
       class="btn btn-outline-sm btn-home-primary"
       target="_blank"
       rel="noopener">
       ${primary.text}
    </a>
  `;

})()}
      </div>
    `;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initHamburger();
  initScrollEffects();
  initFadeInObserver();
  initCountdown();
  initListenLive();

  initGiveawayForm();


  await fetchEvents(true);

  await renderEventsGrid();
  await renderHomeEvents();
  await renderFeaturedEvent();

  renderGiveawayPromo();

  checkInitialPage();

  const signupForm = document.getElementById('signupForm');
  if (signupForm) signupForm.addEventListener('submit', (e) => handleFormSubmit(e, 'signup'));

  const contactForm = document.getElementById('contactForm');
  if (contactForm) contactForm.addEventListener('submit', (e) => handleFormSubmit(e, 'contact'));

  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) newsletterForm.addEventListener('submit', handleNewsletterSubmit);

 function initGiveawayForm() {
  const form = document.getElementById("giveawayForm");

  if (!form) return;

  form.addEventListener("submit", handleGiveawaySubmit);

  console.log("✅ Giveaway form initialized");
}  
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
    contact: 'Contact Us | Global Worship Radio',
    'ticket-giveaway': 'Ticket Giveaway | Global Worship Radio'
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

  async function updateCountdown() {

    const brain = getEventBrain(EVENTS_CACHE);
    const featuredEvent = brain.featured;
    const statusEl = document.getElementById("countdownStatus");
    const countdownEl = document.getElementById("countdown");

    if (!featuredEvent) {
      ["cd-days", "cd-hours", "cd-mins", "cd-secs"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "00";
      });
      return;
    }

    const { start } = parseEventDateTime(featuredEvent);

    const status = getEventStatus(featuredEvent);

    if (status === "live") {

      if (statusEl) {
        statusEl.textContent = "🔴 LIVE NOW • Join the experience";
      }

      if (countdownEl) {
        countdownEl.style.display = "none";
      }

      return;
    }

    if (statusEl) {
      statusEl.textContent = "Starts In";
    }

    if (countdownEl) {
      countdownEl.style.display = "flex";
    }

    const now = new Date();
    const diff = start - now;

    if (diff <= 0) {
      ["cd-days", "cd-hours", "cd-mins", "cd-secs"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "00";
      });
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) /
      (1000 * 60 * 60)
    );

    const mins = Math.floor(
      (diff % (1000 * 60 * 60)) /
      (1000 * 60)
    );

    const secs = Math.floor(
      (diff % (1000 * 60)) /
      1000
    );

    const set = (id, value) => {
      const el = document.getElementById(id);

      if (el) {
        el.textContent = String(value).padStart(2, "0");
      }
    };

    set("cd-days", days);
    set("cd-hours", hours);
    set("cd-mins", mins);
    set("cd-secs", secs);
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

  // Fetch fresh now-playing data and render history
  fetchNowPlaying().then(() => {
    renderHistoryList();
    updateNowPlayingUI();
  });
}

function buildModalHTML() {
  const { title, artist, artwork } = GWR.nowPlaying;
  const artworkHTML = artwork
    ? `<img id="modal-artwork" src="${artwork}" alt="Album Art" class="modal-artwork-img" />`
    : `<div id="modal-artwork-placeholder" class="modal-artwork-placeholder">
        <div class="wave-ring r1"></div>
        <div class="wave-ring r2"></div>
        <span class="listen-modal-icon" id="modal-art-emoji">📻</span>
       </div>`;

  return `
    <div class="listen-modal">
      <button class="listen-modal-close" onclick="closeListenModal()" aria-label="Close player">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <!-- Artwork -->
      <div class="modal-artwork-wrap">
        ${artworkHTML}
      </div>

      <!-- Station info -->
      <div class="listen-modal-header">
        <div>
          <div class="listen-modal-badge">🔴 LIVE</div>
          <h3 id="modal-now-title">${title}</h3>
          <p id="modal-now-artist">${artist}</p>
        </div>
      </div>

      <!-- Visualizer + controls -->
      <div class="listen-controls">
        <div class="listen-bars" id="modal-listen-bars">
          <div class="bar"></div><div class="bar"></div><div class="bar"></div>
          <div class="bar"></div><div class="bar"></div><div class="bar"></div>
          <div class="bar"></div><div class="bar"></div>
        </div>

        <!-- Play / Pause button -->
        <button onclick="toggleRadio()" class="modal-play-btn" id="modal-play-btn" aria-label="Play or pause">
          <svg id="modal-play-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" ${GWR.isPlaying ? 'style="display:none"' : ''}>
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg id="modal-pause-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" ${GWR.isPlaying ? '' : 'style="display:none"'}>
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>

        <!-- Volume slider -->
        <div class="modal-volume-row">
          <svg class="volume-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
          <input type="range" id="modal-volume" class="modal-volume-slider"
            min="0" max="100" value="${GWR.audio ? Math.round(GWR.audio.volume * 100) : 80}"
            oninput="setVolume(this.value)"
            aria-label="Volume" />
          <svg class="volume-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </div>
      </div>

      <!-- Song History -->
      <div class="modal-history">
        <h4 class="modal-history-title">Recently Played</h4>
        <div id="modal-history-list" class="modal-history-list">
          <p class="history-empty">Loading history…</p>
        </div>
      </div>

      <p class="listen-footnote">Close this window — audio keeps playing below.</p>
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
      background: rgba(26,26,46,0.75);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 16px; box-sizing: border-box;
      animation: fadeIn .25s ease;
      overflow-y: auto;
    }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }

    .listen-modal {
      background: #ffffff; border-radius: 28px; padding: 0;
      width: 100%; max-width: 460px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.08);
      position: relative;
      animation: slideUp .3s cubic-bezier(.34,1.56,.64,1);
      box-sizing: border-box; overflow: hidden;
      display: flex; flex-direction: column;
      max-height: 90vh;
      margin: auto;
    }
    @keyframes slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }

    .listen-modal-close {
      position: absolute; top: 16px; right: 16px;
      background: rgba(26,26,46,0.08); border: none; cursor: pointer;
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #6b6b80; transition: all .2s ease; z-index: 2;
    }
    .listen-modal-close:hover { background: #f2503a; color: white; transform: scale(1.08); }
    .listen-modal-close:active { transform: scale(0.95); }

    /* ── Artwork ── */
    .modal-artwork-wrap {
      width: 100%; aspect-ratio: 1/1;
      border-radius: 0; overflow: hidden;
      background: linear-gradient(135deg, #1a1a2e, #2d2d5e);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      position: relative;
    }
    .modal-artwork-img {
      width: 100%; height: 100%; object-fit: cover;
      display: block;
    }
    .modal-artwork-placeholder {
      position: relative; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
    }
    .modal-artwork-placeholder .wave-ring {
      position: absolute; border-radius: 50%;
      border: 2px solid rgba(242,80,58,0.3);
      animation: ring-pulse 2s ease infinite;
    }
    .modal-artwork-placeholder .r1 { width: 100px; height: 100px; }
    .modal-artwork-placeholder .r2 { width: 70px; height: 70px; animation-delay: .4s; }
    .listen-modal-icon { font-size: 2.5rem; z-index: 2; }

    /* ── Station info ── */
    .listen-modal-header { 
      display: flex; align-items: center; gap: 12px; 
      padding: 20px 24px 16px;
    }
    .listen-modal-badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: #f2503a; color: white;
      font-size: .65rem; font-weight: 700; padding: 4px 12px;
      border-radius: 50px; margin-bottom: 4px; letter-spacing: .08em;
    }
    .listen-modal-header h3 {
      font-family:'Playfair Display',serif; font-size: 1.2rem; font-weight: 600;
      color: #1a1a2e; margin: 0 0 4px;
      word-break: break-word;
    }
    .listen-modal-header p { font-size: .85rem; color: #6b6b80; margin: 0; }

    /* ── Controls ── */
    .listen-controls {
      background: transparent; border-radius: 0; padding: 16px 24px;
      display: flex; flex-direction: column; align-items: center; gap: 18px;
      border-top: 1px solid rgba(26,26,46,0.06);
    }
    .listen-bars {
      display: flex; align-items: flex-end; justify-content: center;
      gap: 3px; height: 40px;
    }
    .bar {
      width: 4px; border-radius: 2px;
      background: linear-gradient(to top, #f2503a, #f2a33a);
      animation: bar-bounce 1s ease infinite;
    }
    .bar:nth-child(1){height:20px;animation-delay:0s}
    .bar:nth-child(2){height:34px;animation-delay:.1s}
    .bar:nth-child(3){height:24px;animation-delay:.2s}
    .bar:nth-child(4){height:38px;animation-delay:.3s}
    .bar:nth-child(5){height:30px;animation-delay:.15s}
    .bar:nth-child(6){height:22px;animation-delay:.25s}
    .bar:nth-child(7){height:36px;animation-delay:.05s}
    .bar:nth-child(8){height:18px;animation-delay:.35s}
    @keyframes bar-bounce { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(.35)} }

    /* ── Play/Pause button ── */
    .modal-play-btn {
      width: 70px; height: 70px; border-radius: 50%;
      background: linear-gradient(135deg, #f2503a, #f2a33a);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #fff; box-shadow: 0 8px 28px rgba(242,80,58,0.35);
      transition: all .2s ease;
    }
    .modal-play-btn:hover  { transform: scale(1.08); box-shadow: 0 12px 36px rgba(242,80,58,0.45); }
    .modal-play-btn:active { transform: scale(0.93); }

    /* ── Volume ── */
    .modal-volume-row {
      display: flex; align-items: center; gap: 12px; width: 100%;
      padding: 8px 0;
    }
    .volume-icon { color: #999; flex-shrink: 0; transition: color .2s; }
    .modal-volume-slider {
      flex: 1; -webkit-appearance: none; appearance: none;
      height: 6px; border-radius: 3px;
      background: #e8e4de;
      outline: none; cursor: pointer;
      transition: background .15s;
      position: relative;
    }
    .modal-volume-slider:hover { background: #ddd; }
    .modal-volume-slider::-webkit-slider-runnable-track {
      background: #e8e4de;
      height: 6px;
      border-radius: 3px;
    }
    .modal-volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none; 
      width: 18px; height: 18px;
      border-radius: 50%; 
      background: linear-gradient(135deg, #f2503a, #f2a33a);
      box-shadow: 0 2px 8px rgba(242,80,58,0.4), inset 0 -1px 2px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all .15s ease;
      margin-top: -6px;
    }
    .modal-volume-slider::-webkit-slider-thumb:hover {
      box-shadow: 0 3px 12px rgba(242,80,58,0.5), inset 0 -1px 2px rgba(0,0,0,0.1);
      transform: scale(1.1);
    }
    .modal-volume-slider::-webkit-slider-thumb:active {
      transform: scale(0.95);
    }
    .modal-volume-slider::-moz-range-track {
      background: #e8e4de;
      height: 6px;
      border-radius: 3px;
      border: none;
    }
    .modal-volume-slider::-moz-range-thumb {
      width: 18px; height: 18px; border: none;
      border-radius: 50%; 
      background: linear-gradient(135deg, #f2503a, #f2a33a); 
      box-shadow: 0 2px 8px rgba(242,80,58,0.4), inset 0 -1px 2px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all .15s ease;
    }
    .modal-volume-slider::-moz-range-thumb:hover {
      box-shadow: 0 3px 12px rgba(242,80,58,0.5), inset 0 -1px 2px rgba(0,0,0,0.1);
      transform: scale(1.1);
    }
    .modal-volume-slider::-moz-range-thumb:active {
      transform: scale(0.95);
    }

    /* ── History ── */
    .modal-history { 
      display: flex; flex-direction: column; gap: 10px; 
      padding: 16px 24px;
      border-top: 1px solid rgba(26,26,46,0.06);
    }
    .modal-history-title {
      font-size: .75rem; font-weight: 700; color: #999;
      text-transform: uppercase; letter-spacing: .1em; margin: 0;
    }
    .modal-history-list {
      display: flex; flex-direction: column; gap: 6px;
      max-height: 200px; overflow-y: auto;
    }
    .history-track {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: 10px;
      background: #faf9f7; transition: all .15s ease;
      cursor: pointer;
    }
    .history-track:hover { background: rgba(242,80,58,0.06); }
    .history-track--current { background: rgba(242,80,58,0.1); }
    .history-track-art {
      width: 36px; height: 36px; border-radius: 6px; flex-shrink: 0;
      overflow: hidden; background: linear-gradient(135deg, #1a1a2e, #2d2d5e);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; color: rgba(255,255,255,0.6);
    }
    .history-track-art img { width: 100%; height: 100%; object-fit: cover; }
    .history-track-info {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 2px;
    }
    .history-track-title {
      font-size: .84rem; font-weight: 500; color: #1a1a2e;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .history-track-artist {
      font-size: .74rem; color: #6b6b80;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .history-now-badge {
      font-size: .62rem; font-weight: 700; color: #f2503a;
      background: rgba(242,80,58,0.12); padding: 3px 8px;
      border-radius: 50px; flex-shrink: 0;
    }
    .history-empty { font-size: .82rem; color: #999; text-align: center; margin: 12px 0; }

    .listen-footnote {
      font-size: .74rem; color: #999; text-align: center; line-height: 1.6; margin: 0;
      padding: 16px 24px;
      border-top: 1px solid rgba(26,26,46,0.06);
    }

    @keyframes ring-pulse {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50%       { transform: scale(1.12); opacity: 0.6; }
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .listen-modal {
        border-radius: 24px;
        max-height: calc(100vh - 32px);
      }
      .listen-modal-close {
        width: 32px; height: 32px; top: 12px; right: 12px;
      }
      .listen-modal-header {
        padding: 16px 20px 12px;
      }
      .listen-modal-header h3 {
        font-size: 1rem;
      }
      .listen-controls {
        padding: 14px 20px;
        gap: 16px;
      }
      .modal-play-btn {
        width: 64px; height: 64px;
      }
      .modal-volume-row {
        gap: 10px;
        padding: 6px 0;
      }
      .modal-history {
        padding: 14px 20px;
      }
      .listen-footnote {
        padding: 14px 20px;
      }
    }

    @media (min-width: 768px) {
      .listen-modal {
        border-radius: 32px;
      }
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
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
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

/* ========== TOAST NOTIFICATION FUNCTION (UPDATED - NO DUPLICATES) ========== */
function showToast(message, type = 'info') {
  // Remove any existing toasts first
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  });

  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease forwards';
  }, 10);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ========== NEWSLETTER SUBMIT HANDLER (UPDATED WITH SPINNER) ========== */
async function handleNewsletterSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const emailInput = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');
  const btnText = button.querySelector('.btn-text');
  const btnSpinner = button.querySelector('.btn-spinner');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    showToast('Please enter a valid email', 'error');
    return;
  }

  // Show loading state
  button.disabled = true;
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline-flex';

  try {
    const response = await fetch('https://gwradio-live.onrender.com/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        source: 'footer'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Subscription failed');
    }

    showToast(data.message || 'Successfully subscribed!', 'success');
    form.reset();
  } catch (error) {
    console.error('Newsletter Error:', error);
    showToast(error.message || 'Server connection error', 'error');
  } finally {
    // Hide loading state
    button.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }
}

async function handleGiveawaySubmit(e) {
  e.preventDefault();

  console.log("🎟 Giveaway form submitted");

  const form = e.target;

  const button = form.querySelector("button[type='submit']");
  const btnText = button.querySelector(".btn-text");
  const spinner = button.querySelector(".btn-spinner");

  button.disabled = true;

  btnText.style.display = "none";
  spinner.style.display = "inline-flex";

 try {

  const formData = new FormData(form);

  const selectedEvent =
    formData.get("selectedGiveawayEvent");

  const emojiParticipation =
    formData.get("emojiParticipation");

  const bonusCode =
    formData.get("bonusCode");

  console.log({
  firstName: formData.get("firstName"),
  lastName: formData.get("lastName"),
  email: formData.get("email"),
  phone: formData.get("phone"),
  selectedEvent,
  listenerStatus: formData.get("listenerStatus"),
  source: formData.get("source"),
  emojiParticipation,
  bonusCode
});

// Validate emoji code if listener participated

if (
  emojiParticipation === "Yes" &&
  bonusCode
) {

  const { data: codeRecord, error: codeError } =
  await supabaseClient
    .from("emoji_codes")
    .select("*")
    .eq("code", bonusCode)
    .eq("active", true)
    .maybeSingle();

  console.log("Code lookup:", codeRecord);

  if (!codeRecord) {

  alert("Invalid Emoji Challenge Code");

  button.disabled = false;
  btnText.style.display = "";
  spinner.style.display = "none";

  return;

}

}

  const payload = {
    first_name: formData.get("firstName"),
    last_name: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    selected_event: selectedEvent,
    listener_status: formData.get("listenerStatus"),
    source: formData.get("source"),
    emoji_participation: emojiParticipation === "Yes",
    emoji_code: bonusCode || null,
    bonus_entries: bonusCode ? 1 : 0
  };

  console.log("Payload:", payload);

  const { data, error } = await supabaseClient
    .from("giveaway_entries")
    .insert([payload])
    .select();

  console.log("Inserted:", data);

  if (error) {
    throw error;
  }

  console.log("✅ Supabase insert successful", data);

  showToast(
  "🎟 Entry submitted successfully!",
  "success"
);

  form.reset();

  document.getElementById("selectedGiveawayEvent").value =
    selectedEvent;

} catch (err) {

  console.error("❌ Supabase Error:", err);

  showToast(
  err.message || "Something went wrong.",
  "error"
);

  } finally {

    button.disabled = false;

    btnText.style.display = "";
    spinner.style.display = "none";

  }
}

/* ========== FORM SUBMIT HANDLER (UPDATED WITH SPINNER) ========== */
async function handleFormSubmit(event, type) {
  event.preventDefault();

  const button = event.target.querySelector('button[type="submit"]');
  const btnText = button.querySelector('.btn-text');
  const btnSpinner = button.querySelector('.btn-spinner');
  const form = event.target;

  // Show loading state
  button.disabled = true;
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline-flex';

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
        showToast(data.message || 'Account created successfully!', 'success');
        form.reset();
      } else {
        showToast(data.message || 'Signup failed', 'error');
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
        showToast(data.message || 'Message sent successfully!', 'success');
        form.reset();
      } else {
        showToast(data.message || 'Failed to send message', 'error');
      }
    }
  } catch (error) {
    console.error('Form Error:', error);
    showToast('Unable to connect to server', 'error');
  } finally {
    // Hide loading state
    button.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
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