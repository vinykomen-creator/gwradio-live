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