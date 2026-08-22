'use strict';

// Fire-and-forget: never blocks or breaks the page if it fails (offline,
// misconfigured Supabase, etc.) — analytics should never be able to break
// the actual site.
function logAnalyticsEvent(eventType, { refId = null, page = null } = {}) {
  if (!supabaseClient) return;
  supabaseClient
    .from('analytics_events')
    .insert({
      event_type: eventType,
      ref_id: refId,
      page,
      referrer: document.referrer || null,
    })
    .then(({ error }) => {
      if (error) console.warn('Analytics log failed:', error.message);
    });
}

// Called once on initial page load, then again every time the SPA router
// switches pages (see the call added in nav.js's navigateTo()).
function trackPageView(page) {
  logAnalyticsEvent('page_view', { page });
}