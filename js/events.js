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
      page: event.giveaway_page || "giveaways"
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
        page: event.giveaway_page || "giveaways"
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
  <div class="event-card">

    <div class="event-card-date">
      ${event.date}
    </div>

    <div class="event-card-body">

      <span class="event-tag">
        ${event.tag || "Giveaway"}
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

      ${
        event.button_url
          ? `
            <div class="event-cta-group">
              <a href="${event.button_url}"
                 class="btn btn-primary btn-sm"
                 target="_blank"
                 rel="noopener"
                 onclick="logAnalyticsEvent('event_click', {refId:'${event.id}', page:'events'})">
                 Buy Tickets
              </a>
            </div>
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