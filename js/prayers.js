'use strict';

const PRAYER_BLOCKED_TERMS = ["crypto", "loans", "investment", "suicide", "escort", "hookup"];
const PRAYER_AVATAR_COLORS = ["#f2503a", "#f2a33a", "#1a1a2e", "#d63d28", "#d88c2e", "#2d2d5e"];
const PRAYER_AVATARS = {};

function escapeHtml(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let prayerUserId = null;
let prayerList = []; // local cache, kept in sync via Supabase Realtime
let prayerChannel = null;
let prayerSelCat = 'Healing';
let prayerFilterActive = 'All';
let prayerMineMode = false;

function prayerAvatarColor(name) {
  if (!PRAYER_AVATARS[name]) {
    PRAYER_AVATARS[name] = PRAYER_AVATAR_COLORS[Object.keys(PRAYER_AVATARS).length % PRAYER_AVATAR_COLORS.length];
  }
  return PRAYER_AVATARS[name];
}

function prayerInitials(name) {
  return (name || '').split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
}

function prayerTimeAgo(ts) {
  const d = Date.now() - ts, m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function prayerIsBlocked(text) {
  if (typeof profanityCleaner === 'undefined') {
    console.warn('profanity-cleaner not loaded — check the CDN script tag in index.html. Falling back to the supplementary list only.');
  } else if (profanityCleaner.isProfane(text)) {
    return true;
  }

  const normalized = text.toLowerCase().replace(/[^a-z]/g, '');
  return PRAYER_BLOCKED_TERMS.some(word => normalized.includes(word));
}

function prayerGetReacted() {
  try { return JSON.parse(localStorage.getItem('gwr_reacted') || '{}'); } catch (e) { return {}; }
}
function prayerSaveReacted(r) {
  try { localStorage.setItem('gwr_reacted', JSON.stringify(r)); } catch (e) { /* ignore */ }
}

/* ---------- Supabase init ---------- */

async function initSupabasePrayers() {
  if (!supabaseClient) {
    console.error('Prayer wall: Supabase not configured — check SUPABASE_URL / SUPABASE_ANON_KEY in js/config.js');
    showPrayerWallError('Prayer wall is temporarily unavailable.');
    return;
  }

  try {
    let { data: { session }, error } = await supabaseClient.auth.getSession();

    if (!session) {
      const { data, error: signInError } = await supabaseClient.auth.signInAnonymously();
      if (signInError) throw signInError;
      session = data.session;
    }

    prayerUserId = session.user.id;
  } catch (err) {
    console.error('Prayer wall anonymous sign-in failed:', err.message);
    showPrayerWallError(
      err.message?.includes('Anonymous sign-ins are disabled')
        ? 'Prayer wall isn\u2019t set up yet — an admin needs to enable anonymous sign-ins in Supabase.'
        : 'Could not connect to the prayer wall — please refresh and try again.'
    );
    return;
  }

  await fetchPrayers();
  listenPrayers();
}

async function fetchPrayers() {
  try {
    const { data, error } = await supabaseClient
      .from('prayers')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    prayerList = data.map(p => ({
      ...p,
      ts: new Date(p.created_at).getTime(),
      reactions: { prayed: p.prayed_count, amen: p.amen_count, standing: p.standing_count },
    }));

    updatePrayerStats();
    renderPrayerList();
  } catch (err) {
    console.error('Prayer wall fetch failed:', err.message);
    showPrayerWallError('Could not load prayers right now — please refresh.');
  }
}

function listenPrayers() {
  if (prayerChannel) return; // already subscribed
  prayerChannel = supabaseClient
    .channel('prayers-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prayers' }, () => {
      fetchPrayers();
    })
    .subscribe();
}

function showPrayerWallError(message) {
  const box = document.getElementById('prayer-list');
  if (box) {
    box.innerHTML = `<div class="prayer-empty"><span class="material-symbols-outlined">error</span><p>${message}</p></div>`;
  }
}

/* ---------- Tabs / category / filter UI ---------- */

function switchPrayerTab(tab, el) {
  document.querySelectorAll('.prayer-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  const submitPanel = document.getElementById('prayer-submit-panel');
  const wallPanel = document.getElementById('prayer-wall-panel');

  prayerMineMode = (tab === 'mine');

  if (tab === 'submit') {
    submitPanel.classList.remove('hidden');
    wallPanel.classList.add('hidden');
  } else {
    submitPanel.classList.add('hidden');
    wallPanel.classList.remove('hidden');
    renderPrayerList();
  }
}

function selectPrayerCat(el, cat) {
  document.querySelectorAll('#cat-select .cat').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  prayerSelCat = cat;
}

function filterPrayerCat(cat, el) {
  document.querySelectorAll('.filter-cat').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  prayerFilterActive = cat;
  renderPrayerList();
}

function updatePrayerCharCount() {
  const el = document.getElementById('char-left');
  if (el) el.textContent = 400 - document.getElementById('p-prayer').value.length;
}

/* ---------- Submit / react ---------- */

async function submitPrayer() {
  const prayerText = document.getElementById('p-prayer').value.trim();
  const nameRaw = document.getElementById('p-name').value.trim();
  const anon = document.getElementById('anon-check').checked;
  const urgent = document.getElementById('urgent-check').checked;
  const msg = document.getElementById('form-msg');

  const lastPrayerTime = localStorage.getItem('gwr_last_prayer');
  if (lastPrayerTime) {
    const elapsed = Date.now() - parseInt(lastPrayerTime, 10);
    const cooldown = 5 * 60 * 1000;
    if (elapsed < cooldown) {
      const mins = Math.ceil((cooldown - elapsed) / 60000);
      msg.textContent = `Please wait ${mins} minute(s) before submitting another prayer.`;
      return;
    }
  }

  if (!prayerText) { msg.textContent = 'Please enter your prayer request.'; return; }
  if (prayerIsBlocked(prayerText)) {
    msg.textContent = 'Your prayer contains words that cannot be published. Please revise and try again.';
    return;
  }

  const name = (anon || !nameRaw) ? 'Anonymous' : nameRaw;

  try {
    // Filter already passed above, so this posts straight to the live wall —
    // no manual approval step.
    const { error } = await supabaseClient.from('prayers').insert({
      name,
      prayer: prayerText,
      cat: prayerSelCat,
      pinned: urgent,
      approved: true,
      owner: prayerUserId,
    });
    if (error) throw error;
  } catch (err) {
    console.error('Prayer submit error:', err.message);
    msg.textContent = 'Could not send your request — please try again.';
    return;
  }

  localStorage.setItem('gwr_last_prayer', Date.now().toString());

  msg.textContent = 'Your prayer has been shared. \uD83D\uDE4F';
  document.getElementById('p-prayer').value = '';
  document.getElementById('p-name').value = '';
  document.getElementById('char-left').textContent = 400;
  document.getElementById('anon-check').checked = false;
  document.getElementById('urgent-check').checked = false;
  setTimeout(() => { msg.textContent = ''; }, 3500);
}

async function reactToPrayer(id, type) {
  const r = prayerGetReacted();
  const key = id + ':' + type;
  if (r[key]) return; // already reacted on this device

  try {
    const { error } = await supabaseClient.rpc('react_to_prayer', { prayer_id: id, reaction_type: type });
    if (error) throw error;
  } catch (err) {
    console.error('Prayer reaction error:', err.message);
    return;
  }

  r[key] = true;
  prayerSaveReacted(r);
  // no manual re-render needed — the Realtime subscription refreshes the UI
}

/* ---------- Render ---------- */

function renderPrayerList() {
  const box = document.getElementById('prayer-list');
  if (!box) return;

  const q = document.getElementById('search-input')?.value.toLowerCase() || '';
  const sort = document.getElementById('sort-select')?.value || 'recent';
  const r = prayerGetReacted();
  let list = [...prayerList];

  if (prayerMineMode) list = list.filter(p => p.owner === prayerUserId);
  if (prayerFilterActive !== 'All') list = list.filter(p => p.cat === prayerFilterActive);
  if (q) list = list.filter(p => p.prayer.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  if (sort === 'praying') {
    list.sort((a, b) => (b.reactions.prayed + b.reactions.amen + b.reactions.standing) -
      (a.reactions.prayed + a.reactions.amen + a.reactions.standing));
  }
  if (sort === 'pinned') list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  if (!list.length) {
    const emptyMsg = prayerMineMode
      ? "You haven't posted a prayer yet."
      : (q ? 'No prayers match your search.' : 'No prayers yet. Be the first to share.');
    box.innerHTML = `<div class="prayer-empty"><span class="material-symbols-outlined">favorite</span><p>${emptyMsg}</p></div>`;
    return;
  }

  box.innerHTML = list.map(p => {
    const col = prayerAvatarColor(p.name);
    const rp = r[p.id + ':prayed'], ra = r[p.id + ':amen'], rs = r[p.id + ':standing'];
    return `<div class="prayer-card${p.pinned ? ' pinned' : ''}" role="listitem">
      <div class="prayer-card-top">
        <div class="prayer-avatar" style="background:${col}18;border:1.5px solid ${col}55;color:${col}">${prayerInitials(p.name)}</div>
        <div class="prayer-card-meta">
          <div class="prayer-card-name">${escapeHtml(p.name)}</div>
          <div class="prayer-card-time">${prayerTimeAgo(p.ts)} · ${escapeHtml(p.cat)}</div>
        </div>
        <div class="prayer-card-badges">
          ${p.pinned ? '<span class="prayer-badge prayer-badge-pinned"><span class="material-symbols-outlined">local_fire_department</span> Urgent</span>' : ''}
          <span class="prayer-badge">${escapeHtml(p.cat)}</span>
        </div>
      </div>
      <div class="prayer-card-text">${escapeHtml(p.prayer)}</div>
      <div class="prayer-card-actions">
        <button class="prayer-react-btn${rp ? ' reacted' : ''}" onclick="reactToPrayer('${p.id}','prayed')"><span class="material-symbols-outlined">front_hand</span>${p.reactions.prayed} Prayed</button>
        <button class="prayer-react-btn${ra ? ' reacted' : ''}" onclick="reactToPrayer('${p.id}','amen')"><span class="material-symbols-outlined">auto_awesome</span>${p.reactions.amen} Amen</button>
        <button class="prayer-react-btn${rs ? ' reacted' : ''}" onclick="reactToPrayer('${p.id}','standing')"><span class="material-symbols-outlined">groups</span>${p.reactions.standing} Standing</button>
      </div>
    </div>`;
  }).join('');
}

function updatePrayerStats() {
  const totalEl = document.getElementById('total-count');
  const prayingEl = document.getElementById('praying-count');
  const todayEl = document.getElementById('today-count');
  if (!totalEl) return;
  totalEl.textContent = prayerList.length;
  prayingEl.textContent = prayerList.reduce((s, p) => s + p.reactions.prayed + p.reactions.amen + p.reactions.standing, 0);
  todayEl.textContent = prayerList.filter(p => Date.now() - p.ts < 86400000).length;
}

/* ---------- Entry point (called from init.js) ---------- */

function initPrayersPage() {
  document.getElementById('prayer-list').innerHTML =
    '<div class="prayer-empty"><span class="material-symbols-outlined">favorite</span><p>Loading prayers…</p></div>';
  initSupabasePrayers();
}