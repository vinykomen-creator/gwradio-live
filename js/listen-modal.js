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

      <!-- Artwork + Station info (side by side, compact) -->
      <div class="listen-modal-top">
        <div class="modal-artwork-wrap">
          ${artworkHTML}
        </div>
        <div class="listen-modal-header">
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

        <!-- Play/Pause + Volume, side by side -->
        <div class="modal-controls-row">
          <button onclick="toggleRadio()" class="modal-play-btn" id="modal-play-btn" aria-label="Play or pause">
            <svg id="modal-play-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" ${GWR.isPlaying ? 'style="display:none"' : ''}>
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg id="modal-pause-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" ${GWR.isPlaying ? '' : 'style="display:none"'}>
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>

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
      max-height: calc(100vh - 40px);
      margin: auto;
    }
    
    .listen-modal.compact-art {
      max-width: 420px;
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

    /* ── Artwork + Station info (compact, side by side) ── */
    .listen-modal-top {
      display: flex; align-items: center; gap: 16px;
      padding: 22px 44px 16px 24px;
      flex-shrink: 0;
    }
    .modal-artwork-wrap {
      width: 84px; height: 84px; flex-shrink: 0;
      border-radius: 16px; overflow: hidden;
      background: linear-gradient(135deg, #1a1a2e, #2d2d5e);
      display: flex; align-items: center; justify-content: center;
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
    .modal-artwork-placeholder .r1 { width: 60px; height: 60px; }
    .modal-artwork-placeholder .r2 { width: 40px; height: 40px; animation-delay: .4s; }
    .listen-modal-icon { font-size: 1.6rem; z-index: 2; }

    /* ── Station info ── */
    .listen-modal-header {
      min-width: 0; flex: 1;
    }
    .listen-modal-badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: #f2503a; color: white;
      font-size: .65rem; font-weight: 700; padding: 4px 12px;
      border-radius: 50px; margin-bottom: 6px; letter-spacing: .08em;
    }
    .listen-modal-header h3 {
      font-family:'Playfair Display',serif; font-size: 1.1rem; font-weight: 600;
      color: #1a1a2e; margin: 0 0 4px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .listen-modal-header p {
      font-size: .85rem; color: #6b6b80; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* ── Controls ── */
    .listen-controls {
      background: transparent; border-radius: 0; padding: 12px 24px 16px;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      border-top: 1px solid rgba(26,26,46,0.06);
      flex-shrink: 0;
    }
    .listen-bars {
      display: flex; align-items: flex-end; justify-content: center;
      gap: 3px; height: 28px;
    }
    /* Play/Pause + Volume slider side by side */
    .modal-controls-row {
      display: flex; align-items: center; gap: 16px;
      width: 100%;
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
      width: 56px; height: 56px; border-radius: 50%;
      flex-shrink: 0;
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
      display: flex; align-items: center; gap: 10px;
      flex: 1; min-width: 0;
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
      flex: 1;
      /* Guarantees room for ~5 tracks (58px each) before this area
         has to scroll, instead of collapsing to fit whatever space
         the artwork/controls left behind. */
      min-height: 310px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .modal-history-title {
      font-size: .75rem; font-weight: 700; color: #999;
      text-transform: uppercase; letter-spacing: .1em; margin: 0;
      flex-shrink: 0;
    }
    .modal-history-list {
      display: flex; flex-direction: column; gap: 6px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      flex: 1;
    }
    .history-track {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: 10px;
      background: #faf9f7; transition: all .15s ease;
      cursor: pointer;
      flex-shrink: 0;
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

    /* ── Request Widget Modal ── */
    #request-overlay {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(26,26,46,0.75);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 16px; box-sizing: border-box;
      animation: fadeIn .25s ease;
      overflow-y: auto;
    }

    .request-modal {
      background: #ffffff; border-radius: 28px; padding: 0;
      width: 100%; max-width: 460px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.08);
      position: relative;
      animation: slideUp .3s cubic-bezier(.34,1.56,.64,1);
      box-sizing: border-box; overflow: hidden;
      display: flex; flex-direction: column;
      max-height: calc(100vh - 40px);
      margin: auto;
    }

    .request-modal-close {
      position: absolute; top: 16px; right: 16px;
      background: rgba(26,26,46,0.08); border: none; cursor: pointer;
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #6b6b80; transition: all .2s ease; z-index: 2;
    }
    .request-modal-close:hover { background: #f2503a; color: white; transform: scale(1.08); }
    .request-modal-close:active { transform: scale(0.95); }

    .request-modal-header {
      padding: 16px 24px;
      border-bottom: 1px solid rgba(26,26,46,0.06);
      display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
    }

    .request-modal-header h3 {
      font-family: 'Playfair Display', serif;
      font-size: 1.2rem;
      font-weight: 600;
      color: #1a1a2e;
      margin: 0;
      flex: 1;
    }

    .request-modal-content {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .request-now-playing {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px;
      background: #faf9f7;
      border-radius: 12px;
    }

    .request-now-playing-art {
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background: linear-gradient(135deg, #1a1a2e, #2d2d5e);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-size: 1.5rem;
    }

    .request-now-playing-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .request-now-playing-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .request-now-playing-label {
      font-size: .7rem;
      font-weight: 700;
      color: #f2503a;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .request-now-playing-title {
      font-size: .9rem;
      font-weight: 600;
      color: #1a1a2e;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .request-now-playing-artist {
      font-size: .8rem;
      color: #6b6b80;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .request-controls-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 12px 0;
      border-top: 1px solid rgba(26,26,46,0.06);
      border-bottom: 1px solid rgba(26,26,46,0.06);
    }

    .request-control-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: rgba(242, 80, 58, 0.1);
      color: #f2503a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .2s ease;
      flex-shrink: 0;
    }

    .request-control-btn:hover {
      background: rgba(242, 80, 58, 0.2);
      transform: scale(1.08);
    }

    .request-control-btn:active {
      transform: scale(0.95);
    }

    .request-volume-control {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }

    .request-volume-icon {
      color: #999;
      flex-shrink: 0;
      font-size: 1.2rem;
    }

    .request-volume-slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 6px;
      border-radius: 3px;
      background: #e8e4de;
      outline: none;
      cursor: pointer;
      transition: background .15s;
    }

    .request-volume-slider:hover {
      background: #ddd;
    }

    .request-volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f2503a, #f2a33a);
      box-shadow: 0 2px 8px rgba(242, 80, 58, 0.4), inset 0 -1px 2px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all .15s ease;
      margin-top: -5px;
    }

    .request-volume-slider::-webkit-slider-thumb:hover {
      box-shadow: 0 3px 12px rgba(242, 80, 58, 0.5), inset 0 -1px 2px rgba(0,0,0,0.1);
      transform: scale(1.1);
    }

    .request-volume-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border: none;
      border-radius: 50%;
      background: linear-gradient(135deg, #f2503a, #f2a33a);
      box-shadow: 0 2px 8px rgba(242, 80, 58, 0.4), inset 0 -1px 2px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all .15s ease;
    }

    .request-widget-container {
      border-radius: 12px;
      overflow: hidden;
      background: #faf9f7;
    }

    .request-widget-container > * {
      width: 100% !important;
    }

    /* Hide default radioco branding if needed */
    .request-widget-container .request-widget-header {
      display: none;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .request-modal {
        border-radius: 24px;
        max-height: calc(100vh - 32px);
      }
      .request-modal-close {
        width: 32px;
        height: 32px;
        top: 12px;
        right: 12px;
      }
      .request-modal-header {
        padding: 14px 20px;
      }
      .request-modal-header h3 {
        font-size: 1.1rem;
      }
      .request-modal-content {
        padding: 16px 20px;
        gap: 14px;
      }
      .request-now-playing-art {
        width: 48px;
        height: 48px;
      }
      .request-controls-row {
        gap: 14px;
        padding: 10px 0;
      }
      .request-control-btn {
        width: 44px;
        height: 44px;
      }
    }

    /* Mobile responsive — Listen/Player modal */
    @media (max-width: 480px) {
      .listen-modal {
        border-radius: 24px;
        max-height: calc(100vh - 24px);
      }
      .listen-modal-close {
        width: 32px; height: 32px; top: 12px; right: 12px;
      }
      .listen-modal-top {
        padding: 18px 40px 12px 18px;
        gap: 12px;
      }
      .modal-artwork-wrap {
        width: 64px; height: 64px; border-radius: 12px;
      }
      .listen-modal-header h3 {
        font-size: 1rem;
      }
      .listen-controls {
        padding: 10px 18px 14px;
        gap: 10px;
      }
      .listen-bars {
        height: 22px;
      }
      .modal-controls-row {
        gap: 12px;
      }
      .modal-play-btn {
        width: 50px; height: 50px;
      }
      .modal-volume-row {
        gap: 8px;
      }
      .modal-history {
        padding: 14px 18px;
        min-height: 270px;
      }
      .listen-footnote {
        padding: 12px 18px;
        font-size: .7rem;
      }
    }

    /* Short viewports (e.g. landscape phones) — keep history readable,
       trim the parts around it instead of letting the section collapse. */
    @media (max-height: 700px) {
      .listen-modal-top {
        padding-top: 14px;
        padding-bottom: 10px;
      }
      .modal-artwork-wrap {
        width: 56px; height: 56px;
      }
      .listen-controls {
        padding-top: 8px;
        padding-bottom: 10px;
        gap: 8px;
      }
      .listen-bars { height: 0; margin: 0; overflow: hidden; }
      .modal-play-btn { width: 48px; height: 48px; }
      .modal-history { min-height: 260px; }
      .listen-footnote { display: none; }
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