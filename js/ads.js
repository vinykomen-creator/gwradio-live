'use strict';

const AD_ROTATE_SECONDS = 6;

let adSlides = [];       // the active ads, fetched from Supabase
let adCurrentIndex = 0;  // which one is showing right now
let adRotateTimer = null;

async function initAdCarousel() {
  const container = document.getElementById('adSpace');
  if (!container) return; // not on this page

  if (!supabaseClient) {
    console.warn('Ad carousel: Supabase not configured, leaving default content in place.');
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('ads')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      // No active ads — leave whatever default content is already in the
      // HTML, same as before.
      return;
    }

    adSlides = data;
    renderAdSlide(0);

    // Only start the rotation timer if there's more than one ad to rotate
    // through — no point running a timer for a single slide.
    if (adSlides.length > 1) {
      startAdRotation();
    }
  } catch (err) {
    console.error('Ad carousel fetch failed:', err.message);
    // Leave the default placeholder content in the HTML on failure.
  }
}

function startAdRotation() {
  if (adRotateTimer) clearInterval(adRotateTimer);
  adRotateTimer = setInterval(() => {
    adCurrentIndex = (adCurrentIndex + 1) % adSlides.length;
    renderAdSlide(adCurrentIndex);
  }, AD_ROTATE_SECONDS * 1000);
}

function renderAdSlide(index) {
  const container = document.getElementById('adSpace');
  if (!container) return;

  const ad = adSlides[index];
  logAnalyticsEvent('ad_impression', { refId: ad.id, page: 'giveaways' });

  let mediaHtml = '';
  if (ad.type === 'image' && ad.media_url) {
    mediaHtml = `<img src="${escapeHtml(ad.media_url)}" alt="${escapeHtml(ad.headline || 'Advertisement')}">`;
  } else if (ad.type === 'video' && ad.media_url) {
    const poster = ad.poster_url ? ` poster="${escapeHtml(ad.poster_url)}"` : '';
    mediaHtml = `
      <video controls${poster}>
        <source src="${escapeHtml(ad.media_url)}" type="video/mp4">
      </video>`;
  }

  const bodyHtml = `
    <span class="ad-space-label">Advertisement</span>
    ${mediaHtml ? `<div class="ad-space-media">${mediaHtml}</div>` : ''}
    ${ad.headline ? `<p class="ad-space-text">${escapeHtml(ad.headline)}</p>` : ''}
    ${(ad.link_url && ad.button_text) ? `<span class="btn btn-outline-sm">${escapeHtml(ad.button_text)}</span>` : ''}
  `;

  // If the ad has a link, the whole slide is clickable (wrapped in <a>).
  // Otherwise it's just a plain <div> — no link, nothing to click.
  container.innerHTML = ad.link_url
    ? `<a href="${escapeHtml(ad.link_url)}" target="_blank" rel="noopener" class="ad-slide" onclick="logAnalyticsEvent('ad_click', {refId:'${ad.id}', page:'giveaways'})">${bodyHtml}</a>`
    : `<div class="ad-slide">${bodyHtml}</div>`;
}