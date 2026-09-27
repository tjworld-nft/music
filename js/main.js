/* TJ Official — main.js
   Player (30s chorus previews), UI, scroll effects, lazy WebGL ocean. No dependencies. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const mq = (q) => window.matchMedia(q).matches;
  const reduced = mq('(prefers-reduced-motion: reduce)');
  const conn = navigator.connection || {};
  const lowData = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');

  const DATA = JSON.parse(($('#uo-data') || { textContent: '{"tracks":[]}' }).textContent);
  const TRACKS = DATA.tracks;
  const ALBUM_APPLE = 'https://music.apple.com/jp/album/%E9%AD%9A%E6%AD%8C-uo-uta/6796327238';

  /* ---------------- Header ---------------- */
  const hd = $('#hd');
  const burger = $('.hd-burger');
  const onScrollHeader = () => hd.classList.toggle('is-solid', window.scrollY > 40);
  burger.addEventListener('click', () => {
    const open = !hd.classList.contains('is-open');
    hd.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#hd-nav a').forEach((a) => a.addEventListener('click', () => {
    if (!hd.classList.contains('is-open')) return;
    hd.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hd.classList.contains('is-open')) burger.click();
  });

  // current section → nav highlight
  const navMap = new Map($$('#hd-nav a').map((a) => [a.getAttribute('href').slice(1), a]));
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navMap.forEach((a) => a.classList.remove('is-on'));
      const a = navMap.get(en.target.id);
      if (a) a.classList.add('is-on');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['album', 'tracks', 'miura', 'discography', 'about'].forEach((id) => { const el = document.getElementById(id); if (el) secObs.observe(el); });

  /* ---------------- Reveal ---------------- */
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      revObs.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
    revObs.observe(el);
  });

  /* ---------------- Depth gauge ---------------- */
  const depth = $('#depth'), depthV = $('#depth-v'), depthDot = $('#depth-dot');
  let scrollQueued = false;
  const paintScroll = () => {
    scrollQueued = false;
    onScrollHeader();
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if (depth) {
      depth.classList.toggle('is-on', scrollY > innerHeight * 0.5);
      depthV.textContent = Math.round(p * 30);
      depthDot.style.transform = `translateY(${(p * 26 * innerHeight) / 100}px)`;
    }
  };
  addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(paintScroll); } }, { passive: true });
  paintScroll();

  /* ---------------- Track glyphs (radial waveform of each full song) ---------------- */
  const B64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  const decode = (s) => { const a = new Float32Array(s.length); for (let i = 0; i < s.length; i++) a[i] = B64.indexOf(s[i]) / 63; return a; };
  function shellPath(env) {
    const v = decode(env), n = v.length, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2, r = 26 + 18 * v[i];
      pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
    }
    const f = (x) => x.toFixed(1);
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)},${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)},${f(p2[0])},${f(p2[1])}`;
    }
    return d + 'Z';
  }
  TRACKS.forEach((t) => {
    const svg = document.querySelector(`.tr[data-no="${t.no}"] .tr-shell`);
    if (!svg || !t.env) return;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', shellPath(t.env));
    svg.insertBefore(path, svg.firstChild);
  });

  /* ---------------- Player ---------------- */
  const audio = $('#audio');
  const mp = $('#mp');
  const mpTitle = $('#mp-title'), mpSub = $('#mp-sub'), mpWave = $('#mp-wave'), mpBar = $('#mp-bar');
  const mpSpotify = $('#mp-spotify'), mpApple = $('#mp-apple');
  const rows = new Map($$('.tr').map((r) => [Number(r.dataset.no), r]));
  const cards = $$('.cr');
  let cur = -1;            // index into TRACKS
  let env = null, envLoading = null;
  const level = { b: 0, m: 0, h: 0, o: 0 };
  window.TJAudio = { level, get playing() { return !audio.paused && !audio.ended; } };

  const loadEnv = () => envLoading || (envLoading = fetch('audio/uo-uta/env.json?v=20260927')
    .then((r) => r.json())
    .then((j) => { env = {}; Object.keys(j).forEach((k) => { env[k] = { b: decode(j[k].b), m: decode(j[k].m), h: decode(j[k].h), o: decode(j[k].o) }; }); })
    .catch(() => { env = {}; }));

  const bars = (host, values) => {
    host.innerHTML = '';
    const frag = document.createDocumentFragment();
    values.forEach((v) => { const i = document.createElement('i'); i.style.height = `${Math.max(8, v * 100)}%`; frag.appendChild(i); });
    host.appendChild(frag);
    return [...host.children];
  };
  let mpBars = [], rowBars = [];
  const paintBars = (list, p) => {
    const n = list.length, lit = Math.round(p * n);
    for (let i = 0; i < n; i++) list[i].classList.toggle('on', i < lit);
  };

  const fmtWho = (t) => [t.c, 'TJ'].filter(Boolean).join(' · ');

  function setUI() {
    const t = TRACKS[cur];
    rows.forEach((r) => r.classList.remove('is-active'));
    cards.forEach((c) => c.classList.toggle('is-active', t && Number(c.dataset.no) === t.no));
    if (!t) return;
    const row = rows.get(t.no);
    if (row) {
      row.classList.add('is-active');
      const w = $('.tr-wave', row);
      rowBars = w ? bars(w, t.bars) : [];
    }
    mpTitle.textContent = t.t;
    mpSub.textContent = fmtWho(t);
    mpBars = bars(mpWave, t.bars);
    mpSpotify.href = `https://open.spotify.com/track/${t.sp}`;
    mpApple.href = `${ALBUM_APPLE}?i=${t.am}`;
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${t.t}（試聴）`, artist: 'TJ', album: '魚歌 - UO-UTA -',
          artwork: [{ src: 'image/covers/uo-uta-480.webp', sizes: '480x480', type: 'image/webp' }, { src: 'image/covers/uo-uta-960.webp', sizes: '960x960', type: 'image/webp' }],
        });
      } catch (_) { /* ignore */ }
    }
  }

  function showPlayer() {
    if (!mp.classList.contains('is-in')) {
      mp.hidden = false;
      requestAnimationFrame(() => mp.classList.add('is-in'));
      root.classList.add('has-mp');
    }
  }

  function play(i, from) {
    if (i < 0 || i >= TRACKS.length) return;
    loadEnv();
    if (i !== cur) {
      cur = i;
      audio.src = TRACKS[i].src;
      audio.currentTime = 0;
      setUI();
    }
    showPlayer();
    const p = audio.play();
    if (p && p.catch) p.catch(() => sync());
    if (from) ripple(from, 1);
  }
  function toggle(from) {
    if (cur < 0) { play(0, from); return; }
    if (audio.paused) { audio.play(); if (from) ripple(from, 0.8); } else audio.pause();
  }
  const next = () => (cur + 1 < TRACKS.length ? play(cur + 1) : (audio.pause(), audio.currentTime = 0));
  const prev = () => (audio.currentTime > 3 || cur <= 0 ? (audio.currentTime = 0) : play(cur - 1));

  function sync() {
    const playing = !audio.paused && !audio.ended;
    root.classList.toggle('is-playing', playing);
    mp.classList.toggle('is-paused', !playing);
    $('.mp-toggle').setAttribute('aria-label', playing ? '一時停止' : '再生');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    if (playing) loop();
  }
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('ended', () => { sync(); next(); });
  audio.addEventListener('error', () => { sync(); });

  let raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    const tick = () => {
      const d = audio.duration || 30;
      const p = Math.min(1, audio.currentTime / d);
      paintBars(mpBars, p);
      paintBars(rowBars, p);
      if (mpBar) mpBar.style.transform = `scaleX(${p})`;
      mpWave.setAttribute('aria-valuenow', Math.round(audio.currentTime));
      const e = env && TRACKS[cur] && env[TRACKS[cur].no];
      if (e) {
        const f = Math.min(e.b.length - 1, Math.floor(audio.currentTime * 30));
        level.b = e.b[f]; level.m = e.m[f]; level.h = e.h[f]; level.o = e.o[f];
      } else { level.b = level.m = level.h = level.o = 0; }
      mp.style.setProperty('--beat', (level.o * 0.7 + level.b * 0.3).toFixed(3));
      if (!audio.paused) raf = requestAnimationFrame(tick);
      else { level.b = level.m = level.h = level.o = 0; mp.style.setProperty('--beat', 0); }
    };
    raf = requestAnimationFrame(tick);
  }

  const seekFrom = (host, e) => {
    const r = host.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    if (audio.duration) audio.currentTime = p * audio.duration;
  };
  mpWave.addEventListener('click', (e) => seekFrom(mpWave, e));
  mpWave.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { audio.currentTime = Math.min((audio.duration || 30) - 0.1, audio.currentTime + 5); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { audio.currentTime = Math.max(0, audio.currentTime - 5); e.preventDefault(); }
  });

  // Controls
  $$('[data-play-all]').forEach((b) => b.addEventListener('click', (e) => toggle(e)));
  $$('.tr').forEach((row) => {
    const i = TRACKS.findIndex((t) => t.no === Number(row.dataset.no));
    $('.tr-btn', row).addEventListener('click', (e) => { if (i === cur) toggle(e); else play(i, e); });
    const w = $('.tr-wave', row);
    if (w) w.addEventListener('click', (e) => { if (i === cur) seekFrom(w, e); });
  });
  cards.forEach((card) => {
    const i = TRACKS.findIndex((t) => t.no === Number(card.dataset.no));
    const b = $('.cr-play', card);
    if (b) b.addEventListener('click', (e) => { e.stopPropagation(); if (i === cur) toggle(e); else play(i, e); });
  });
  mp.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mp]');
    if (!b) return;
    const a = b.dataset.mp;
    if (a === 'toggle') toggle(e);
    if (a === 'next') next();
    if (a === 'prev') prev();
    if (a === 'close') {
      audio.pause();
      mp.classList.remove('is-in');
      root.classList.remove('has-mp');
      setTimeout(() => { if (!mp.classList.contains('is-in')) mp.hidden = true; }, 800);
    }
  });
  $('[data-mp-jump]').addEventListener('click', () => {
    const t = TRACKS[cur]; const row = t && rows.get(t.no);
    if (row) row.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  });
  if ('mediaSession' in navigator) {
    const set = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (_) { /* unsupported */ } };
    set('play', () => audio.play()); set('pause', () => audio.pause());
    set('nexttrack', next); set('previoustrack', prev);
  }

  /* ---------------- Ripple bus (to the WebGL ocean) ---------------- */
  function ripple(e, s) {
    const x = e && e.clientX != null ? e.clientX : innerWidth / 2;
    const y = e && e.clientY != null ? e.clientY : innerHeight / 2;
    if (e && e.clientX === 0 && e.clientY === 0 && e.target && e.target.getBoundingClientRect) {
      const r = e.target.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent('tj:ripple', { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2, s } }));
      return;
    }
    window.dispatchEvent(new CustomEvent('tj:ripple', { detail: { x, y, s } }));
  }

  /* ---------------- Creatures reel ---------------- */
  const reel = $('.reel-track');
  if (reel) {
    $$('[data-reel]').forEach((b) => b.addEventListener('click', () => {
      const card = $('.cr', reel);
      const step = card ? card.getBoundingClientRect().width + 20 : 400;
      reel.scrollBy({ left: Number(b.dataset.reel) * step * (innerWidth > 1200 ? 2 : 1), behavior: reduced ? 'auto' : 'smooth' });
    }));
    // mouse drag-to-scroll
    let down = null;
    reel.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button, a')) return;
      down = { x: e.clientX, left: reel.scrollLeft, moved: false };
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (!down.moved && Math.abs(dx) > 6) { down.moved = true; reel.classList.add('is-drag'); }
      if (down.moved) reel.scrollLeft = down.left - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = null;
      requestAnimationFrame(() => reel.classList.remove('is-drag'));
    });
  }

  /* ---------------- Full-album embeds (click-to-load) ---------------- */
  const embed = $('#embed');
  const EMBEDS = {
    spotify: { label: 'Spotifyのプレーヤーを表示', html: '<iframe title="魚歌 - UO-UTA - を Spotify で聴く" src="https://open.spotify.com/embed/album/5G1wIyHQ07ciJe7HjAq37h?utm_source=generator&theme=0" height="452" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>' },
    apple: { label: 'Apple Musicのプレーヤーを表示', html: '<iframe title="魚歌 - UO-UTA - を Apple Music で聴く" src="https://embed.music.apple.com/jp/album/%E9%AD%9A%E6%AD%8C-uo-uta/6796327238?theme=dark" height="450" allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" loading="lazy"></iframe>' },
  };
  if (embed) {
    const facade = embed.innerHTML;
    let loaded = false;
    const mount = () => { loaded = true; if (!audio.paused) audio.pause(); embed.innerHTML = EMBEDS[embed.dataset.service].html; };
    embed.addEventListener('click', (e) => { if (e.target.closest('[data-embed-load]')) mount(); });
    $$('[data-embed-tab]').forEach((tab) => tab.addEventListener('click', () => {
      $$('[data-embed-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      embed.dataset.service = tab.dataset.embedTab;
      if (loaded) mount();
      else { embed.innerHTML = facade; const l = $('[data-embed-label]', embed); if (l) l.textContent = EMBEDS[embed.dataset.service].label; }
    }));
  }

  /* ---------------- WebGL ocean (lazy) ---------------- */
  // The ocean is progressive enhancement: it starts after load, on hardware WebGL2 only
  // (ocean.js asks for failIfMajorPerformanceCaveat and checks the renderer string).
  const params = new URLSearchParams(location.search);
  if ('WebGL2RenderingContext' in window && !reduced && !lowData && params.get('gl') !== 'off') {
    const start = () => import('./ocean.js?v=20260927')
      .then((m) => m.initOcean({ canvas: $('#ocean'), hero: $('#hero'), img: $('.hero-kv img'), level, isPlaying: () => window.TJAudio.playing }))
      .then((api) => { if (api) { window.TJOcean = api; root.classList.add('gl-on'); } })
      .catch((err) => console.warn('[TJ] ocean unavailable:', err && err.message));
    const go = () => setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 2500 }) : start()), 500);
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
  }
})();
