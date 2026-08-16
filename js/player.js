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
      GWR.nowPlaying.artist = current.artist_name || 'Global Worship Radio';
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

function showRequestModal() {
  let overlay = document.getElementById('request-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'request-overlay';
    
    const { title, artist, artwork } = GWR.nowPlaying;
    const artHTML = artwork 
      ? `<img src="${artwork}" alt="Album Art" />`
      : `<span>📻</span>`;

    overlay.innerHTML = `
      <div class="request-modal">
        <button class="request-modal-close" onclick="closeRequestModal()" aria-label="Close request widget">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div class="request-modal-header">
          <h3>Request a Song</h3>
        </div>

        <div class="request-modal-content">
          <div class="request-now-playing">
            <div class="request-now-playing-art">
              ${artHTML}
            </div>
            <div class="request-now-playing-info">
              <span class="request-now-playing-label">Now Playing</span>
              <div class="request-now-playing-title" id="request-now-title">${title}</div>
              <div class="request-now-playing-artist" id="request-now-artist">${artist}</div>
            </div>
          </div>

          <div class="request-controls-row">
            <button class="request-control-btn" onclick="toggleRadio()" title="Play/Pause" aria-label="Play or pause">
              <svg id="request-play-icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" ${GWR.isPlaying ? 'style="display:none"' : ''}>
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg id="request-pause-icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" ${GWR.isPlaying ? '' : 'style="display:none"'}>
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>

            <div class="request-volume-control">
              <svg class="request-volume-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <input type="range" id="request-volume" class="request-volume-slider"
                min="0" max="100" value="${GWR.audio ? Math.round(GWR.audio.volume * 100) : 80}"
                oninput="setVolume(this.value)"
                aria-label="Volume" />
            </div>

            <button class="request-control-btn" onclick="toggleMute()" title="Mute" aria-label="Mute audio">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.6915026,12.4744748 L21.0151496,8.15065138 C21.5717539,7.59404706 21.5717539,6.67392416 21.0151496,6.11731984 C20.4585453,5.56071552 19.5417841,5.56071552 18.9851798,6.11731984 L14.6615328,10.4411433 L10.3378859,6.11731984 C9.78148153,5.56071552 8.86472034,5.56071552 8.3081160,6.11731984 C7.75151168,6.67392416 7.75151168,7.59404706 8.3081160,8.15065138 L12.6317629,12.4744748 L8.3081160,16.7982983 C7.75151168,17.3548026 7.75151168,18.2749255 8.3081160,18.8315298 C8.86472034,19.3881341 9.78148153,19.3881341 10.3378859,18.8315298 L14.6615328,14.5077064 L18.9851798,18.8315298 C19.5417841,19.3881341 20.4585453,19.3881341 21.0151496,18.8315298 C21.5717539,18.2749255 21.5717539,17.3548026 21.0151496,16.7982983 L16.6915026,12.4744748 Z"/>
              </svg>
            </button>
          </div>

          <div class="request-widget-container" id="request-widget-container">
            <!-- Radio.co request widget will load here -->
          </div>
        </div>
      </div>
    `;

    injectRequestModalStyles();
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeRequestModal();
    });

    // Load the Radio.co request widget
    loadRequestWidget();
  } else {
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
  }

  // Update now playing info
  updateRequestModalUI();
}

function closeRequestModal() {
  const overlay = document.getElementById('request-overlay');
  if (!overlay) return;

  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.2s ease';

  setTimeout(() => {
    overlay.remove();
  }, 200);
}

function updateRequestModalUI() {
  const { title, artist, artwork } = GWR.nowPlaying;
  
  const reqTitle = document.getElementById('request-now-title');
  const reqArtist = document.getElementById('request-now-artist');
  const reqArt = document.querySelector('.request-now-playing-art');

  if (reqTitle) reqTitle.textContent = title;
  if (reqArtist) reqArtist.textContent = artist;

  if (artwork && reqArt) {
    let img = reqArt.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = 'Album Art';
      const span = reqArt.querySelector('span');
      if (span) span.remove();
      reqArt.appendChild(img);
    }
    img.src = artwork;
  }

  // Update play/pause icons
  const playIcon = document.getElementById('request-play-icon');
  const pauseIcon = document.getElementById('request-pause-icon');
  if (playIcon && pauseIcon) {
    if (GWR.isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }
}

function loadRequestWidget() {
  const container = document.getElementById('request-widget-container');
  if (!container) return;

  // Remove existing script if any
  const existing = container.querySelector('script');
  if (existing) existing.remove();

  // Load Radio.co request widget
  const script = document.createElement('script');
  script.src = 'https://embed.radio.co/request/w07940dc.js';
  script.async = true;
  container.appendChild(script);
}

function injectRequestModalStyles() {
  if (document.getElementById('request-modal-styles')) return;

  const style = document.createElement('style');
  style.id = 'request-modal-styles';
  style.textContent = `
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

    .request-volume-slider::-moz-range-track {
      background: #e8e4de;
      height: 6px;
      border-radius: 3px;
      border: none;
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

    .request-volume-slider::-moz-range-thumb:hover {
      box-shadow: 0 3px 12px rgba(242, 80, 58, 0.5), inset 0 -1px 2px rgba(0,0,0,0.1);
      transform: scale(1.1);
    }

    .request-widget-container {
      border-radius: 12px;
      overflow: hidden;
      background: #faf9f7;
      padding: 12px;
    }

    .request-widget-container form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .request-widget-container input,
    .request-widget-container textarea,
    .request-widget-container select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e8e4de;
      border-radius: 8px;
      font-size: 0.9rem;
      font-family: 'Roboto', sans-serif;
      box-sizing: border-box;
    }

    .request-widget-container input:focus,
    .request-widget-container textarea:focus,
    .request-widget-container select:focus {
      outline: none;
      border-color: #f2503a;
      box-shadow: 0 0 0 3px rgba(242, 80, 58, 0.1);
    }

    .request-widget-container button {
      background: linear-gradient(135deg, #f2503a, #f2a33a);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s ease;
      width: 100%;
      font-size: 0.95rem;
    }

    .request-widget-container button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(242, 80, 58, 0.3);
    }

    .request-widget-container button:active {
      transform: translateY(0);
    }

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
  `;
  document.head.appendChild(style);
}

function toggleMute() {
  if (GWR.audio) {
    if (GWR.audio.volume > 0) {
      GWR.audio.dataset.previousVolume = GWR.audio.volume;
      GWR.audio.volume = 0;
    } else {
      GWR.audio.volume = parseFloat(GWR.audio.dataset.previousVolume || 0.8);
    }
    updateVolumeSliders();
  }
}

function updateVolumeSliders() {
  const modalSlider = document.getElementById('modal-volume');
  const requestSlider = document.getElementById('request-volume');
  const volume = GWR.audio ? Math.round(GWR.audio.volume * 100) : 80;
  
  if (modalSlider) modalSlider.value = volume;
  if (requestSlider) requestSlider.value = volume;
}