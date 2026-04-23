// Birdle — backyard bird spotting game
// Vanilla JS (no build step). Designed to be hosted on GitHub Pages.

const BIRDS = [
  { id: 'american_crow',     name: 'American Crow',     img: 'assets/american_crow.png' },
  { id: 'american_robin',    name: 'American Robin',    img: 'assets/american_robin.png' },
  { id: 'black_phoebe',      name: 'Black Phoebe',      img: 'assets/black_pheobe.png' },
  { id: 'california_towhee', name: 'California Towhee', img: 'assets/california_towhee.png' },
  { id: 'cedar_waxwing',     name: 'Cedar Waxwing',     img: 'assets/cedar_waxwing.png' },
  { id: 'dark_eyed_junco',   name: 'Dark-eyed Junco',   img: 'assets/dark_eyed_junco.png' },
  { id: 'hermit_thrush',     name: 'Hermit Thrush',     img: 'assets/hermit_thrush.png' },
  { id: 'house_finch',       name: 'House Finch',       img: 'assets/house_finch.png' },
  { id: 'scrub_jay',         name: 'Scrub Jay',         img: 'assets/scrub_jay.png' },
  { id: 'spotted_towhee',    name: 'Spotted Towhee',    img: 'assets/spotted_towhee.png' },
];

const DIFFICULTY = {
  regular: {
    duration: 60,            // seconds per game
    spawnEveryMin: 900,      // ms between spawn attempts (min)
    spawnEveryMax: 1500,     // ms (max)
    birdLifeMin: 2800,       // ms a bird stays on screen
    birdLifeMax: 3600,
    maxConcurrent: 4,
    pointsHit: 10,
    pointsMiss: -5,
  },
  expert: {
    duration: 60,
    spawnEveryMin: 450,
    spawnEveryMax: 900,
    birdLifeMin: 1500,
    birdLifeMax: 2200,
    maxConcurrent: 7,
    pointsHit: 15,
    pointsMiss: -8,
  },
};

// Tree-canopy zone of the backdrop (percent of game area)
// Empirically chosen to keep birds in the foliage area, above the binoculars + buttons.
const TREE_ZONE = { xMin: 0.04, xMax: 0.96, yMin: 0.06, yMax: 0.62 };

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);
const screens = {
  start:      $('#screen-start'),
  difficulty: $('#screen-difficulty'),
  howto:      $('#screen-howto'),
  game:       $('#screen-game'),
  end:        $('#screen-end'),
};
const birdLayer  = $('#bird-layer');
const popupLayer = $('#popup-layer');
const buttonsEl  = $('#bird-buttons');
const scoreEl    = $('#score');
const comboEl    = $('#combo');
const timeEl     = $('#time');

// ---------- State ----------
const state = {
  level: 'regular',
  score: 0,
  combo: 1,
  bestCombo: 1,
  hits: 0,
  misses: 0,
  timeLeft: 60,
  active: new Map(),       // birdEl id -> { species, el, expireAt }
  spawnTimer: null,
  tickTimer: null,
  endAt: 0,
  running: false,
};

let nextBirdId = 1;

// ---------- Screen control ----------
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ---------- Bird buttons ----------
function buildBirdButtons() {
  buttonsEl.innerHTML = '';
  for (const b of BIRDS) {
    const btn = document.createElement('button');
    btn.className = 'bird-btn';
    btn.dataset.species = b.id;
    btn.innerHTML = `<img src="${b.img}" alt="${b.name}" /><span>${b.name}</span>`;
    btn.addEventListener('click', () => onGuess(b.id, btn));
    buttonsEl.appendChild(btn);
  }
}

// ---------- Spawning ----------
function rand(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function gameRect() {
  return screens.game.getBoundingClientRect();
}

function activeSpecies() {
  return new Set([...state.active.values()].map(b => b.species));
}

function trySpawn() {
  if (!state.running) return;
  const cfg = DIFFICULTY[state.level];
  if (state.active.size >= cfg.maxConcurrent) return scheduleNextSpawn();

  // Pick a species not currently on screen.
  const used = activeSpecies();
  const candidates = BIRDS.filter(b => !used.has(b.id));
  if (candidates.length === 0) return scheduleNextSpawn();

  const species = pick(candidates);
  spawnBird(species);
  scheduleNextSpawn();
}

function scheduleNextSpawn() {
  const cfg = DIFFICULTY[state.level];
  clearTimeout(state.spawnTimer);
  state.spawnTimer = setTimeout(trySpawn, rand(cfg.spawnEveryMin, cfg.spawnEveryMax));
}

function spawnBird(species) {
  const rect = gameRect();
  const cfg = DIFFICULTY[state.level];

  // Bird element sized relative to viewport
  const baseSize = Math.min(rect.width, rect.height);
  const size = Math.round(baseSize * rand(0.09, 0.14));
  const flip = Math.random() < 0.5;

  // Pick a position inside the tree zone, ensuring no overlap with same area
  const pos = pickPosition(rect, size);

  const el = document.createElement('div');
  el.className = 'bird' + (flip ? ' flip' : '');
  el.style.width  = size + 'px';
  el.style.height = size + 'px';
  el.style.left   = pos.x + 'px';
  el.style.top    = pos.y + 'px';
  el.innerHTML = `<img src="${species.img}" alt="${species.name}" draggable="false" />`;

  const id = nextBirdId++;
  el.dataset.id = id;
  el.dataset.species = species.id;

  // Birds are NOT directly clickable — players must use the name buttons.
  birdLayer.appendChild(el);

  const life = rand(cfg.birdLifeMin, cfg.birdLifeMax);
  const expireAt = performance.now() + life;
  const entry = { species: species.id, el, expireAt, timeoutId: 0 };
  entry.timeoutId = setTimeout(() => removeBird(id, false), life);
  state.active.set(id, entry);
}

// Try a few random spots; if all collide, accept the last one.
function pickPosition(rect, size) {
  const xMin = TREE_ZONE.xMin * rect.width;
  const xMax = TREE_ZONE.xMax * rect.width  - size;
  const yMin = TREE_ZONE.yMin * rect.height;
  const yMax = TREE_ZONE.yMax * rect.height - size;

  let best = { x: rand(xMin, xMax), y: rand(yMin, yMax) };
  for (let i = 0; i < 12; i++) {
    const cand = { x: rand(xMin, xMax), y: rand(yMin, yMax) };
    if (!collidesAny(cand, size)) return cand;
    best = cand;
  }
  return best;
}

function collidesAny(p, size) {
  for (const { el } of state.active.values()) {
    const x = parseFloat(el.style.left);
    const y = parseFloat(el.style.top);
    const w = parseFloat(el.style.width);
    const h = parseFloat(el.style.height);
    // Allow some overlap (30%) — birds can overlap, just not heavily stacked
    const pad = -0.3 * Math.min(w, size);
    if (p.x < x + w + pad && p.x + size > x - pad &&
        p.y < y + h + pad && p.y + size > y - pad) {
      return true;
    }
  }
  return false;
}

function removeBird(id, caught) {
  const entry = state.active.get(id);
  if (!entry) return;
  clearTimeout(entry.timeoutId);
  state.active.delete(id);

  entry.el.classList.add(caught ? 'caught' : 'leaving');
  setTimeout(() => entry.el.remove(), 450);
}

// ---------- Guessing ----------
function onGuess(speciesId, btnEl) {
  if (!state.running) return;
  const cfg = DIFFICULTY[state.level];

  // Find an active bird matching this species (closest to expiring first)
  let match = null;
  let matchId = null;
  for (const [id, entry] of state.active) {
    if (entry.species === speciesId) {
      if (!match || entry.expireAt < match.expireAt) {
        match = entry; matchId = id;
      }
    }
  }

  if (match) {
    state.hits++;
    state.combo += 1;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    const multiplier = Math.min(5, 1 + Math.floor((state.combo - 1) / 3));
    const gained = cfg.pointsHit * multiplier;
    state.score += gained;
    updateHUD();
    flashBtn(btnEl, 'flash-correct');
    spawnPopup(match.el, `+${gained}`, 'plus');
    beep(880, 0.07);
    vibrate([30, 20, 30]);
    removeBird(matchId, true);
  } else {
    state.misses++;
    state.combo = 1;
    state.score += cfg.pointsMiss;
    if (state.score < 0) state.score = 0;
    updateHUD();
    flashBtn(btnEl, 'flash-wrong');
    if (btnEl) {
      const r = btnEl.getBoundingClientRect();
      const gr = gameRect();
      spawnPopupAt(r.left - gr.left + r.width/2, r.top - gr.top, `${cfg.pointsMiss}`, 'minus');
    }
    beep(180, 0.12);
    vibrate(120);
  }
}

function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

// ---------- Ranks ----------
// Every player gets a fun, encouraging title — no zeros, no losers.
// Ranks are tiered by score, scaled per difficulty so Expert and Regular
// feel comparably rewarding. Each tier has a Lucide icon (inline SVG).
const RANK_ICONS = {
  egg:        '<circle cx="12" cy="13" r="7"/><path d="M12 6c-1 0-2-2-2-3"/>',
  feather:    '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>',
  binoculars: '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M10 16h4"/><path d="M5 8l1-4h3l1 4"/><path d="M14 8l1-4h3l1 4"/>',
  bird:       '<path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/><path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75V21"/><path d="M7 18a6 6 0 0 0 3.84-10.61"/>',
  award:      '<circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 22 12 19 17 22 15.79 13.88"/>',
  trophy:     '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  crown:      '<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>',
};

const RANK_TIERS = [
  // thresholds are in "score" units; multiplied by level multiplier
  { min: 0,   icon: 'egg',        title: 'Curious Hatchling',    sub: "Every legend starts with a single squint. You showed up — that counts!" },
  { min: 30,  icon: 'feather',    title: 'Backyard Apprentice',  sub: "You're picking up feathers fast. The birds are starting to notice you." },
  { min: 80,  icon: 'binoculars', title: 'Sharp-eyed Spotter',   sub: "Solid spotting. Your binoculars are starting to feel earned." },
  { min: 150, icon: 'bird',       title: 'Birder in Training',   sub: "Field-guide energy. You're calling birds before they land." },
  { min: 240, icon: 'award',      title: 'Field Guide Pro',      sub: "Confident IDs, clean combos. The trees fear you." },
  { min: 360, icon: 'trophy',     title: 'Audubon-tier Ace',     sub: "Top-shelf birding. You and the warblers go way back." },
  { min: 520, icon: 'crown',      title: 'Legendary Birdle Sage', sub: "Mythical. Birds form a queue to be identified by you." },
];

function applyRank(score, level) {
  const mult = level === 'expert' ? 0.7 : 1.0; // expert thresholds slightly easier
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (score >= t.min * mult) tier = t;
  }
  const next = RANK_TIERS.find(t => score < t.min * mult);

  const icon = $('#rank-icon');
  icon.innerHTML = RANK_ICONS[tier.icon];
  $('#rank-title').textContent = tier.title;
  let sub = tier.sub;
  if (next) {
    const need = Math.ceil(next.min * mult - score);
    sub += ` (Next: ${next.title} — ${need} more pts.)`;
  } else {
    sub += ' Maxed-out tier. Bow before the spotter.';
  }
  $('#rank-sub').textContent = sub;
}

function flashBtn(btn, cls) {
  if (!btn) return;
  btn.classList.remove('flash-correct','flash-wrong');
  // force reflow so the animation restarts
  void btn.offsetWidth;
  btn.classList.add(cls);
  setTimeout(() => btn.classList.remove(cls), 400);
}

function spawnPopup(birdEl, text, kind) {
  const r = birdEl.getBoundingClientRect();
  const gr = gameRect();
  spawnPopupAt(r.left - gr.left + r.width/2, r.top - gr.top, text, kind);
}
function spawnPopupAt(x, y, text, kind) {
  const p = document.createElement('div');
  p.className = `popup ${kind}`;
  p.textContent = text;
  p.style.left = x + 'px';
  p.style.top  = y + 'px';
  popupLayer.appendChild(p);
  setTimeout(() => p.remove(), 950);
}

// ---------- HUD ----------
function updateHUD() {
  scoreEl.textContent = state.score;
  comboEl.textContent = 'x' + state.combo;
  comboEl.classList.toggle('hot', state.combo >= 4);
  timeEl.textContent  = state.timeLeft;
}

// ---------- Tick ----------
function startTicker() {
  clearInterval(state.tickTimer);
  state.tickTimer = setInterval(() => {
    if (!state.running) return;
    state.timeLeft = Math.max(0, Math.ceil((state.endAt - performance.now()) / 1000));
    updateHUD();
    if (state.timeLeft <= 0) endGame();
  }, 200);
}

// ---------- Lifecycle ----------
function startGame(level) {
  state.level = level;
  state.score = 0;
  state.combo = 1;
  state.bestCombo = 1;
  state.hits = 0;
  state.misses = 0;
  state.timeLeft = DIFFICULTY[level].duration;
  state.running = false; // remains false during countdown

  birdLayer.innerHTML = '';
  popupLayer.innerHTML = '';
  state.active.clear();

  updateHUD();
  showScreen('game');
  screens.game.classList.toggle('expert', level === 'expert');
  runCountdown(3, () => {
    state.endAt = performance.now() + DIFFICULTY[level].duration * 1000;
    state.running = true;
    scheduleNextSpawn();
    startTicker();
  });
}

function runCountdown(from, done) {
  const overlay = $('#countdown');
  const numEl   = $('#countdown-num');
  screens.game.classList.add('countdown');
  overlay.classList.remove('hidden');

  let n = from;
  const tick = () => {
    if (n <= 0) {
      overlay.classList.add('hidden');
      screens.game.classList.remove('countdown');
      done();
      return;
    }
    numEl.textContent = n === 0 ? 'Go!' : n;
    // Restart the pop animation
    numEl.style.animation = 'none';
    void numEl.offsetWidth;
    numEl.style.animation = '';
    vibrate(40);
    beep(n === 1 ? 660 : 440, 0.08);
    n--;
    setTimeout(tick, 1000);
  };
  tick();
}

function endGame() {
  state.running = false;
  clearTimeout(state.spawnTimer);
  clearInterval(state.tickTimer);

  // Clear remaining birds
  for (const [id] of state.active) removeBird(id, false);

  $('#final-score').textContent = state.score;
  $('#best-combo').textContent  = 'x' + state.bestCombo;
  $('#hits').textContent        = state.hits;
  $('#misses').textContent      = state.misses;

  applyRank(state.score, state.level);

  // Best score per level (localStorage)
  try {
    const key = `birdle_best_${state.level}`;
    const prev = parseInt(localStorage.getItem(key) || '0', 10);
    const isNew = state.score > prev;
    if (isNew) localStorage.setItem(key, String(state.score));
    const best = Math.max(prev, state.score);
    $('#best-record').textContent =
      `${state.level === 'expert' ? 'Expert' : 'Regular'} best: ${best}` + (isNew ? ' — NEW!' : '');
  } catch (_) { /* ignore */ }

  showScreen('end');
}

function quitToHome() {
  state.running = false;
  clearTimeout(state.spawnTimer);
  clearInterval(state.tickTimer);
  birdLayer.innerHTML = '';
  popupLayer.innerHTML = '';
  state.active.clear();
  showScreen('start');
}

// ---------- Tiny sound (Web Audio) ----------
let audioCtx = null;
function beep(freq, dur) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = 0.06;
    o.connect(g).connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur + 0.02);
  } catch (_) { /* no audio */ }
}

// ---------- Wire up ----------
function init() {
  buildBirdButtons();

  $('#btn-start').addEventListener('click', () => showScreen('difficulty'));
  $('#btn-back-start').addEventListener('click', () => showScreen('start'));
  $('#btn-quit').addEventListener('click', quitToHome);
  $('#btn-replay').addEventListener('click', () => startGame(state.level));
  $('#btn-home').addEventListener('click', () => showScreen('start'));

  document.querySelectorAll('.diff-btn').forEach(b => {
    b.addEventListener('click', () => {
      state.level = b.dataset.level;
      showScreen('howto');
    });
  });

  $('#btn-howto-play').addEventListener('click', () => startGame(state.level));
  $('#btn-howto-back').addEventListener('click', () => showScreen('difficulty'));

  // Register service worker for offline play
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
    });
  }

  // Keep birds inside bounds on resize
  window.addEventListener('resize', () => {
    const rect = gameRect();
    for (const { el } of state.active.values()) {
      const w = parseFloat(el.style.width);
      const h = parseFloat(el.style.height);
      const x = Math.min(parseFloat(el.style.left), TREE_ZONE.xMax * rect.width  - w);
      const y = Math.min(parseFloat(el.style.top),  TREE_ZONE.yMax * rect.height - h);
      el.style.left = Math.max(TREE_ZONE.xMin * rect.width,  x) + 'px';
      el.style.top  = Math.max(TREE_ZONE.yMin * rect.height, y) + 'px';
    }
  });
}

init();
