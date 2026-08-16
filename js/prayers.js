'use strict';

const PRAYER_BANNED_WORDS = ["shit", "kill", "murder", "hookup", "damn", "crypto", "loans", "investment",
  "suicide", "crap", "sex", "porn", "nude", "fuck", "fucking", "bitch", "asshole", "dick", "penis", "vagina",
  "escort", "naked"];
const PRAYER_AVATAR_COLORS = ["#f2503a", "#f2a33a", "#1a1a2e", "#d63d28", "#d88c2e", "#2d2d5e"];
const PRAYER_AVATARS = {};

let prayerDb = null;
let prayerAuth = null;
let prayerSelCat = 'Healing';
let prayerFilterActive = 'All';
let prayerMineMode = false;
let prayerList = []; // local cache, kept in sync by the Firestore listener

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

function prayerHasBanned(text) {
  const normalized = text.toLowerCase().replace(/[^a-z]/g, '');
  return PRAYER_BANNED_WORDS.some(word => normalized.includes(word));
}

function prayerGetReacted() {
  try { return JSON.parse(localStorage.getItem('gwr_reacted') || '{}'); } catch (e) { return {}; }
}
function prayerSaveReacted(r) {
  try { localStorage.setItem('gwr_reacted', JSON.stringify(r)); } catch (e) { /* ignore */ }
}

function prayerEscapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---------- Firebase init ---------- */

function initFirebasePrayers() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded — check the script tags in index.html');
    showPrayerWallError('Prayer wall is temporarily unavailable.');
    return;
  }

  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG.apiKey === 'YOUR_FIREBASE_API_KEY') {
    console.error('FIREBASE_CONFIG still has placeholder values — paste your real Firebase project config into js/config.js');
    showPrayerWallError('Prayer wall isn\u2019t connected yet — an admin needs to add the Firebase config.');
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    prayerDb = firebase.firestore();
    prayerAuth = firebase.auth();
  } catch (err) {
    console.error('Firebase init failed — check FIREBASE_CONFIG in js/config.js:', err.message);
    showPrayerWallError('Prayer wall is temporarily unavailable.');
    return;
  }

  prayerAuth.signInAnonymously()
    .then(() => listenPrayers())
    .catch(err => {
      console.error('Prayer wall anonymous sign-in failed:', err);
      showPrayerWallError('Could not connect to the prayer wall — please refresh and try again.');
    });
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

/* ---------- Submit / react / reply ---------- */

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
  if (prayerHasBanned(prayerText)) {
    msg.textContent = 'Your prayer contains words that cannot be published. Please revise and try again.';
    return;
  }

  const name = (anon || !nameRaw) ? 'Anonymous' : nameRaw;

  try {
    await prayerDb.collection('prayers').add({
      name,
      prayer: prayerText,
      cat: prayerSelCat,
      pinned: urgent,
      approved: true,
      ts: firebase.firestore.FieldValue.serverTimestamp(),
      owner: prayerAuth.currentUser?.uid || 'anon',
      reactions: { prayed: 0, amen: 0, standing: 0 }
    });
  } catch (err) {
    console.error('Prayer submit error:', err);
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
    await prayerDb.collection('prayers').doc(id).update({
      [`reactions.${type}`]: firebase.firestore.FieldValue.increment(1)
    });
  } catch (err) {
    console.error('Prayer reaction error:', err);
    return;
  }

  r[key] = true;
  prayerSaveReacted(r);
  // no manual re-render needed — the onSnapshot listener updates the UI
}

function togglePrayerReplies(id) {
  const el = document.getElementById('replies-' + id);
  if (el) el.classList.toggle('open');
}

async function loadPrayerReplies(prayerId) {
  const snapshot = await prayerDb.collection('prayers').doc(prayerId).collection('replies').orderBy('ts', 'asc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function refreshPrayerReplies(prayerId) {
  const replies = await loadPrayerReplies(prayerId);
  const prayer = prayerList.find(p => p.id === prayerId);
  if (prayer) prayer.replies = replies;
}

async function sendPrayerReply(id) {
  const inp = document.getElementById('reply-inp-' + id);
  if (!inp?.value.trim()) return;
  if (prayerHasBanned(inp.value)) {
    showToast('Please keep replies respectful', 'error');
    return;
  }

  const lastReply = localStorage.getItem('gwr_last_reply');
  if (lastReply) {
    const elapsed = Date.now() - parseInt(lastReply, 10);
    if (elapsed < 30 * 1000) {
      showToast('Please wait a few seconds before replying again', 'error');
      return;
    }
  }

  try {
    await prayerDb.collection('prayers').doc(id).collection('replies').add({
      name: 'Community Member',
      text: inp.value.trim(),
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('Prayer reply error:', err);
    showToast('Could not send your reply — please try again', 'error');
    return;
  }

  localStorage.setItem('gwr_last_reply', Date.now().toString());
  inp.value = '';
  await refreshPrayerReplies(id);
  renderPrayerList();
}

/* ---------- Render ---------- */

function renderPrayerList() {
  const box = document.getElementById('prayer-list');
  if (!box) return;

  const q = document.getElementById('search-input')?.value.toLowerCase() || '';
  const sort = document.getElementById('sort-select')?.value || 'recent';
  const r = prayerGetReacted();
  let list = [...prayerList];

  if (prayerMineMode) list = list.filter(p => p.owner === prayerAuth.currentUser?.uid);
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
    const rlist = p.replies
      ? p.replies.map(rep => `<div class="prayer-reply"><span class="prayer-reply-name">${prayerEscapeHtml(rep.name)}</span>${prayerEscapeHtml(rep.text)}</div>`).join('')
      : '';
    return `<div class="prayer-card${p.pinned ? ' pinned' : ''}" role="listitem">
      <div class="prayer-card-top">
        <div class="prayer-avatar" style="background:${col}18;border:1.5px solid ${col}55;color:${col}">${prayerInitials(p.name)}</div>
        <div class="prayer-card-meta">
          <div class="prayer-card-name">${prayerEscapeHtml(p.name)}</div>
          <div class="prayer-card-time">${prayerTimeAgo(p.ts)} · ${prayerEscapeHtml(p.cat)}</div>
        </div>
        <div class="prayer-card-badges">
          ${p.pinned ? '<span class="prayer-badge prayer-badge-pinned"><span class="material-symbols-outlined">local_fire_department</span> Urgent</span>' : ''}
          <span class="prayer-badge">${prayerEscapeHtml(p.cat)}</span>
        </div>
      </div>
      <div class="prayer-card-text">${prayerEscapeHtml(p.prayer)}</div>
      <div class="prayer-card-actions">
        <button class="prayer-react-btn${rp ? ' reacted' : ''}" onclick="reactToPrayer('${p.id}','prayed')"><span class="material-symbols-outlined">front_hand</span>${p.reactions.prayed} Prayed</button>
        <button class="prayer-react-btn${ra ? ' reacted' : ''}" onclick="reactToPrayer('${p.id}','amen')"><span class="material-symbols-outlined">auto_awesome</span>${p.reactions.amen} Amen</button>
        <button class="prayer-react-btn${rs ? ' reacted' : ''}" onclick="reactToPrayer('${p.id}','standing')"><span class="material-symbols-outlined">groups</span>${p.reactions.standing} Standing</button>
        <button class="prayer-reply-toggle" onclick="togglePrayerReplies('${p.id}')"><span class="material-symbols-outlined">chat_bubble</span>${p.replies ? p.replies.length : 0} Reply</button>
      </div>
      <div class="prayer-replies" id="replies-${p.id}">
        ${rlist}
        <div class="prayer-reply-input-row">
          <input type="text" id="reply-inp-${p.id}" placeholder="A word of encouragement…" onkeydown="if(event.key==='Enter')sendPrayerReply('${p.id}')">
          <button onclick="sendPrayerReply('${p.id}')">Send</button>
        </div>
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

function listenPrayers() {
  prayerDb.collection('prayers')
    .where('approved', '==', true)
    .orderBy('ts', 'desc')
    .limit(50)
    .onSnapshot(async snapshot => {
      const loaded = await Promise.all(snapshot.docs.map(async doc => {
        const replies = await loadPrayerReplies(doc.id);
        return {
          id: doc.id,
          ...doc.data(),
          ts: doc.data().ts?.toMillis() || Date.now(),
          replies
        };
      }));
      prayerList = loaded;
      updatePrayerStats();
      renderPrayerList();
    }, err => console.error('Prayer wall listener error:', err));
}

/* ---------- Entry point (called from init.js) ---------- */

function initPrayersPage() {
  document.getElementById('prayer-list').innerHTML =
    '<div class="prayer-empty"><span class="material-symbols-outlined">favorite</span><p>Loading prayers…</p></div>';
  initFirebasePrayers();
}