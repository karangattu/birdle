import {
  LEADERBOARD_LIMIT,
  MAX_LEADERBOARD_NAME_LENGTH,
  scoreQualifies,
  sortLeaderboardEntries,
  validateLeaderboardName,
} from './leaderboard-utils.js';
import {
  getIntroTimeoutMs,
  shouldShowIntro,
} from './intro-utils.js';
import { requestAppFullscreen } from './fullscreen-utils.js';

// Birdle — backyard bird spotting game
// Vanilla JS (no build step). Designed to be hosted on GitHub Pages.

const BIRDS = [
  { id: 'american_crow',     name: 'American Crow',     img: 'assets/american_crow.png',     sound: 'assets/american_crow.mp3' },
  { id: 'american_robin',    name: 'American Robin',    img: 'assets/american_robin.png',    sound: 'assets/american_robin.mp3' },
  { id: 'black_phoebe',      name: 'Black Phoebe',      img: 'assets/black_phoebe.png',      sound: 'assets/black_phoebe.mp3' },
  { id: 'california_towhee', name: 'California Towhee', img: 'assets/california_towhee.png', sound: 'assets/california_towhee.mp3' },
  { id: 'cedar_waxwing',     name: 'Cedar Waxwing',     img: 'assets/cedar_waxwing.png',     sound: 'assets/cedar_waxwing.mp3' },
  { id: 'dark_eyed_junco',   name: 'Dark-eyed Junco',   img: 'assets/dark_eyed_junco.png',   sound: 'assets/dark_eyed_junco.mp3' },
  { id: 'hermit_thrush',     name: 'Hermit Thrush',     img: 'assets/hermit_thrush.png',     sound: 'assets/hermit_thrush.mp3' },
  { id: 'house_finch',       name: 'House Finch',       img: 'assets/house_finch.png',       sound: 'assets/house_finch.mp3' },
  { id: 'scrub_jay',         name: 'Scrub Jay',         img: 'assets/scrub_jay.png',         sound: 'assets/scrub_jay.mp3' },
  { id: 'spotted_towhee',    name: 'Spotted Towhee',    img: 'assets/spotted_towhee.png',    sound: 'assets/spotted_towhee.mp3' },
];

const BIRD_CALL_VOLUME = 0.42;
const EXPIRED_GUESS_GRACE_MS = 250;
const POINTER_CLICK_SUPPRESS_MS = 700;
const LEADERBOARD_TABLE = 'birdle_leaderboad';
const LEADERBOARD_NAME_KEY = 'birdle_leaderboard_name';
const INTRO_FALLBACK_MS = 2600;
const SUPABASE_URL = 'https://ovwktjjeoowlktdfbuuu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_B2pz5WTA3UEVUeKACIgmBw_8_r0S3kU';
const LEADERBOARD_BADGE_ICONS = {
  regular: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10h4"/><path d="M19 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3"/><path d="M9 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3"/><path d="M5 7h14"/><path d="M19 7c1.5 2.5 2 5 2 7.5a4.5 4.5 0 1 1-9 0v-1a2 2 0 0 0-4 0v1a4.5 4.5 0 1 1-9 0C-1 12 -.5 9.5 1 7" transform="translate(2 0)"/></svg>',
  expert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
};

function createSupabaseClient() {
  if (!window.supabase?.createClient || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

  try {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch (_) {
    return null;
  }
}

const supabaseClient = createSupabaseClient();

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
  training:   $('#screen-training'),
  game:       $('#screen-game'),
  end:        $('#screen-end'),
};
const birdLayer  = $('#bird-layer');
const popupLayer = $('#popup-layer');
const buttonsEl  = $('#bird-buttons');
const scoreEl    = $('#score');
const comboEl    = $('#combo');
const timeEl     = $('#time');
const introEls = {
  overlay: $('#intro-overlay'),
  video: $('#intro-video'),
  skip: $('#btn-skip-intro'),
};
const leaderboardEls = {
  startHigh: $('#leaderboard-start-high'),
  endList: $('#leaderboard-end-list'),
  endStatus: $('#leaderboard-end-status'),
  submitCard: $('#leaderboard-submit'),
  submitButtons: $('#leaderboard-submit-buttons'),
  submitMessage: $('#leaderboard-submit-message'),
  submitForm: $('#leaderboard-form'),
  submitName: $('#leaderboard-name'),
  submitFeedback: $('#leaderboard-submit-feedback'),
  submitAction: $('#btn-submit-score'),
  skipAction: $('#btn-skip-score'),
  saveAction: $('#btn-save-score'),
  cancelAction: $('#btn-cancel-submit'),
};

// ---------- State ----------
const state = {
  level: 'regular',
  score: 0,
  combo: 1,
  bestCombo: 1,
  hits: 0,
  misses: 0,
  timeLeft: 60,
  active: new Map(),       // birdEl id -> { species, el, expireAt, call }
  recentlyExpired: [],     // birds that vanished during a just-started tap
  spawnTimer: null,
  tickTimer: null,
  endAt: 0,
  running: false,
};

const leaderboardState = {
  entries: [],
  phase: supabaseClient ? 'idle' : 'disabled',
  errorMessage: '',
  fetchPromise: null,
  submitting: false,
  formVisible: false,
  submittedThisGame: false,
  skippedThisGame: false,
  lastSubmittedName: '',
};

const introState = {
  timeoutId: 0,
  hideTimerId: 0,
  afterFinish: null,
  playing: false,
  wired: false,
};

let nextBirdId = 1;

// ---------- Screen control ----------
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {
    return false;
  }
}

function clearIntroTimers() {
  clearTimeout(introState.timeoutId);
  clearTimeout(introState.hideTimerId);
}

function scheduleIntroDismiss(durationSeconds) {
  clearTimeout(introState.timeoutId);
  introState.timeoutId = setTimeout(finishIntro, getIntroTimeoutMs(durationSeconds, INTRO_FALLBACK_MS));
}

function hideIntroOverlay() {
  if (!introEls.overlay || introEls.overlay.hidden) return;

  clearIntroTimers();
  introEls.overlay.classList.add('is-hiding');

  try {
    introEls.video?.pause();
  } catch (_) { /* ignore */ }

  introState.hideTimerId = setTimeout(() => {
    if (!introEls.overlay) return;
    introEls.overlay.hidden = true;
    introEls.overlay.classList.remove('is-hiding');
  }, 360);
}

function finishIntro() {
  introState.playing = false;
  const afterFinish = introState.afterFinish;
  introState.afterFinish = null;
  hideIntroOverlay();
  if (afterFinish) afterFinish();
}

function wireIntroEvents() {
  if (introState.wired || !introEls.overlay || !introEls.video) return;
  introState.wired = true;

  introEls.skip?.addEventListener('click', finishIntro);
  introEls.video.addEventListener('ended', finishIntro);
  introEls.video.addEventListener('error', finishIntro);
  introEls.video.addEventListener('loadedmetadata', () => {
    if (!introState.playing) return;
    scheduleIntroDismiss(introEls.video.duration);
  });
}

function playIntro(afterFinish) {
  if (!introEls.overlay || !introEls.video) {
    if (afterFinish) afterFinish();
    return;
  }

  wireIntroEvents();
  clearIntroTimers();
  introState.afterFinish = afterFinish || null;
  introState.playing = true;

  introEls.overlay.hidden = false;
  introEls.overlay.classList.remove('is-hiding');

  try {
    introEls.video.pause();
    introEls.video.currentTime = 0;
  } catch (_) { /* ignore */ }

  scheduleIntroDismiss(introEls.video.duration);

  const playAttempt = introEls.video.play();
  if (playAttempt && typeof playAttempt.catch === 'function') {
    playAttempt.catch(() => finishIntro());
  }
}

function initIntro() {
  if (!introEls.overlay || !introEls.video) return;
  wireIntroEvents();
  introEls.overlay.hidden = true;
}

function startFromLanding() {
  if (introState.playing) return;

  void requestAppFullscreen({
    target: $('#app') || document.documentElement,
    doc: document,
    orientation: window.screen?.orientation,
  });

  preloadBirdCalls();

  const shouldPlayIntro = shouldShowIntro({
    startRequested: true,
    prefersReducedMotion: prefersReducedMotion(),
  });

  if (!shouldPlayIntro) {
    showScreen('difficulty');
    return;
  }

  playIntro(() => showScreen('difficulty'));
}

function getDifficultyLabel(level) {
  return level === 'expert' ? 'Expert' : 'Regular';
}

function formatLeaderboardDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getStoredLeaderboardName() {
  try {
    return localStorage.getItem(LEADERBOARD_NAME_KEY) || '';
  } catch (_) {
    return '';
  }
}

function storeLeaderboardName(name) {
  try {
    localStorage.setItem(LEADERBOARD_NAME_KEY, name);
  } catch (_) { /* ignore */ }
}

function setLeaderboardControlsDisabled(disabled) {
  ['submitAction', 'skipAction', 'saveAction', 'cancelAction', 'submitName'].forEach((key) => {
    const el = leaderboardEls[key];
    if (el) el.disabled = disabled;
  });
}

function setSubmitFeedback(message = '', tone = '') {
  const el = leaderboardEls.submitFeedback;
  if (!el) return;
  el.textContent = message;
  el.classList.remove('info', 'success', 'error');
  if (tone) el.classList.add(tone);
}

function resetLeaderboardRoundState() {
  leaderboardState.submitting = false;
  leaderboardState.formVisible = false;
  leaderboardState.submittedThisGame = false;
  leaderboardState.skippedThisGame = false;
  leaderboardState.lastSubmittedName = '';
  setLeaderboardControlsDisabled(false);
  setSubmitFeedback('');
  if (leaderboardEls.submitName) leaderboardEls.submitName.value = getStoredLeaderboardName();
  if (leaderboardEls.submitCard) leaderboardEls.submitCard.hidden = true;
  if (leaderboardEls.submitButtons) leaderboardEls.submitButtons.hidden = false;
  if (leaderboardEls.submitForm) leaderboardEls.submitForm.hidden = true;
}

function createDifficultyBadge(level) {
  const badge = document.createElement('span');
  const kind = level === 'expert' ? 'expert' : 'regular';
  badge.className = `leaderboard-badge ${kind}`;

  const icon = document.createElement('span');
  icon.className = 'leaderboard-badge-icon';
  icon.innerHTML = LEADERBOARD_BADGE_ICONS[kind];

  const label = document.createElement('span');
  label.textContent = getDifficultyLabel(kind);

  badge.append(icon, label);
  return badge;
}

function createLeaderboardItem(entry, index) {
  const item = document.createElement('li');
  item.className = 'leaderboard-entry';

  const rank = document.createElement('div');
  rank.className = 'leaderboard-rank' + (index < 3 ? ` leaderboard-rank-${index + 1}` : '');
  rank.textContent = String(index + 1);

  const main = document.createElement('div');
  main.className = 'leaderboard-entry-main';

  const name = document.createElement('div');
  name.className = 'leaderboard-entry-name';
  name.textContent = entry.player_name || 'Player';

  const meta = document.createElement('div');
  meta.className = 'leaderboard-entry-meta';
  meta.append(createDifficultyBadge(entry.difficulty));

  const date = document.createElement('span');
  date.className = 'leaderboard-entry-date';
  date.textContent = formatLeaderboardDate(entry.created_at);
  meta.append(date);

  main.append(name, meta);

  const score = document.createElement('div');
  score.className = 'leaderboard-entry-score';
  score.textContent = String(entry.score || 0);

  item.append(rank, main, score);
  return item;
}

function leaderboardUnavailableMessage() {
  if (leaderboardState.errorMessage.includes('Could not find the table')) {
    return 'Run the Supabase leaderboard SQL setup to enable global scores.';
  }
  return 'Global leaderboard unavailable right now.';
}

function leaderboardStatusText() {
  if (leaderboardState.phase === 'disabled') return 'Global leaderboard is unavailable right now.';
  if (leaderboardState.phase === 'loading') {
    return leaderboardState.entries.length ? 'Refreshing global high scores...' : 'Loading global high scores...';
  }
  if (leaderboardState.phase === 'error') {
    return leaderboardState.entries.length
      ? 'Showing the last loaded scores.'
      : leaderboardUnavailableMessage();
  }
  if (leaderboardState.entries.length === 0) return 'No scores submitted yet.';
  return 'Top 5 high scores';
}

function renderLeaderboardList(listEl, statusEl) {
  if (!listEl || !statusEl) return;

  statusEl.textContent = leaderboardStatusText();
  listEl.textContent = '';

  const entries = sortLeaderboardEntries(leaderboardState.entries).slice(0, LEADERBOARD_LIMIT);
  for (const [index, entry] of entries.entries()) {
    listEl.appendChild(createLeaderboardItem(entry, index));
  }
}

function startLeaderboardHighText() {
  const topEntry = sortLeaderboardEntries(leaderboardState.entries)[0];
  if (topEntry) {
    const playerName = topEntry.player_name || 'Player';
    return `Global leaderboard high score: ${topEntry.score} by ${playerName}`;
  }

  if (leaderboardState.phase === 'loading') return 'Global leaderboard high score: loading...';
  if (leaderboardState.phase === 'disabled' || leaderboardState.phase === 'error') {
    return 'Global leaderboard high score unavailable right now.';
  }

  return 'Global leaderboard high score: no scores submitted yet.';
}

function renderLeaderboardLists() {
  if (leaderboardEls.startHigh) {
    leaderboardEls.startHigh.textContent = startLeaderboardHighText();
  }
  renderLeaderboardList(leaderboardEls.endList, leaderboardEls.endStatus);
}

function syncLeaderboardSubmitCard() {
  const card = leaderboardEls.submitCard;
  if (!card) return;

  if (leaderboardState.phase === 'disabled') {
    card.hidden = false;
    leaderboardEls.submitButtons.hidden = true;
    leaderboardEls.submitForm.hidden = true;
    leaderboardEls.submitMessage.textContent = 'Global score submission is unavailable right now.';
    return;
  }

  if (leaderboardState.submittedThisGame) {
    card.hidden = false;
    leaderboardEls.submitButtons.hidden = true;
    leaderboardEls.submitForm.hidden = true;
    leaderboardEls.submitMessage.textContent = `Score submitted as ${leaderboardState.lastSubmittedName}.`;
    setSubmitFeedback('Saved to the live leaderboard.', 'success');
    return;
  }

  if (leaderboardState.phase === 'loading' && leaderboardState.entries.length === 0) {
    card.hidden = false;
    leaderboardEls.submitButtons.hidden = true;
    leaderboardEls.submitForm.hidden = true;
    leaderboardEls.submitMessage.textContent = 'Checking whether this run made the global top 5...';
    return;
  }

  if (leaderboardState.phase === 'error' && leaderboardState.entries.length === 0) {
    card.hidden = false;
    leaderboardEls.submitButtons.hidden = true;
    leaderboardEls.submitForm.hidden = true;
    leaderboardEls.submitMessage.textContent = leaderboardUnavailableMessage();
    return;
  }

  const qualifies = scoreQualifies(state.score, leaderboardState.entries, LEADERBOARD_LIMIT);
  const cutoff = leaderboardState.entries.length >= LEADERBOARD_LIMIT
    ? leaderboardState.entries[LEADERBOARD_LIMIT - 1].score
    : null;

  if (!qualifies) {
    card.hidden = false;
    leaderboardEls.submitButtons.hidden = true;
    leaderboardEls.submitForm.hidden = true;
    leaderboardEls.submitMessage.textContent = cutoff === null
      ? 'Global score submission opens once the leaderboard is available.'
      : `Beat ${cutoff} to reach the global top ${LEADERBOARD_LIMIT}.`;
    if (!leaderboardState.submitting) setSubmitFeedback('');
    return;
  }

  if (leaderboardState.skippedThisGame) {
    card.hidden = true;
    if (!leaderboardState.submitting) setSubmitFeedback('');
    return;
  }

  card.hidden = false;
  leaderboardEls.submitMessage.textContent = leaderboardState.entries.length < LEADERBOARD_LIMIT
    ? 'You opened a new spot on the global leaderboard. Submit your score?'
    : `You cracked the global top ${LEADERBOARD_LIMIT}. Submit your score?`;
  leaderboardEls.submitButtons.hidden = leaderboardState.formVisible;
  leaderboardEls.submitForm.hidden = !leaderboardState.formVisible;
  if (!leaderboardState.formVisible && !leaderboardState.submitting) setSubmitFeedback('');
}

async function loadGlobalLeaderboard(force = false) {
  if (!supabaseClient) {
    leaderboardState.phase = 'disabled';
    renderLeaderboardLists();
    syncLeaderboardSubmitCard();
    return [];
  }

  if (leaderboardState.fetchPromise && !force) return leaderboardState.fetchPromise;

  leaderboardState.phase = 'loading';
  leaderboardState.errorMessage = '';
  renderLeaderboardLists();
  syncLeaderboardSubmitCard();

  leaderboardState.fetchPromise = supabaseClient
    .from(LEADERBOARD_TABLE)
    .select('id, player_name, score, difficulty, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(LEADERBOARD_LIMIT)
    .then(({ data, error }) => {
      if (error) throw error;
      leaderboardState.entries = sortLeaderboardEntries(data || []).slice(0, LEADERBOARD_LIMIT);
      leaderboardState.phase = 'ready';
      return leaderboardState.entries;
    })
    .catch((error) => {
      leaderboardState.phase = 'error';
      leaderboardState.errorMessage = error?.message || 'Global leaderboard unavailable right now.';
      return leaderboardState.entries;
    })
    .finally(() => {
      leaderboardState.fetchPromise = null;
      renderLeaderboardLists();
      syncLeaderboardSubmitCard();
    });

  return leaderboardState.fetchPromise;
}

function openLeaderboardForm() {
  if (leaderboardState.submitting) return;
  leaderboardState.formVisible = true;
  leaderboardState.skippedThisGame = false;
  syncLeaderboardSubmitCard();
  setSubmitFeedback('');
  if (leaderboardEls.submitName) {
    leaderboardEls.submitName.focus();
    leaderboardEls.submitName.select();
  }
}

function closeLeaderboardForm() {
  if (leaderboardState.submitting) return;
  leaderboardState.formVisible = false;
  syncLeaderboardSubmitCard();
  setSubmitFeedback('');
}

function skipLeaderboardSubmission() {
  if (leaderboardState.submitting) return;
  leaderboardState.formVisible = false;
  leaderboardState.skippedThisGame = true;
  syncLeaderboardSubmitCard();
  setSubmitFeedback('');
}

async function submitLeaderboardScore(event) {
  event.preventDefault();
  if (leaderboardState.submitting || !supabaseClient) return;

  const validation = validateLeaderboardName(leaderboardEls.submitName.value);
  if (!validation.ok) {
    setSubmitFeedback(validation.message, 'error');
    return;
  }

  leaderboardState.submitting = true;
  setLeaderboardControlsDisabled(true);
  setSubmitFeedback('Saving score...', 'info');

  try {
    const { error } = await supabaseClient.from(LEADERBOARD_TABLE).insert({
      player_name: validation.value,
      score: state.score,
      difficulty: state.level,
      best_combo: state.bestCombo,
      hits: state.hits,
      misses: state.misses,
    });

    if (error) throw error;

    storeLeaderboardName(validation.value);
    leaderboardState.lastSubmittedName = validation.value;
    leaderboardState.submittedThisGame = true;
    leaderboardState.skippedThisGame = false;
    leaderboardState.formVisible = false;
    await loadGlobalLeaderboard(true);
  } catch (error) {
    setSubmitFeedback(
      error?.message ? `Could not submit score: ${error.message}` : 'Could not submit score right now.',
      'error'
    );
  } finally {
    leaderboardState.submitting = false;
    setLeaderboardControlsDisabled(false);
    syncLeaderboardSubmitCard();
  }
}

// ---------- Bird buttons ----------
function buildBirdButtons() {
  buttonsEl.innerHTML = '';
  for (const b of BIRDS) {
    const btn = document.createElement('button');
    btn.className = 'bird-btn';
    btn.dataset.species = b.id;
    btn.innerHTML = `<img src="${b.img}" alt="${b.name}" /><span>${b.name}</span>`;
    bindInstantPress(btn, () => onGuess(b.id, btn));
    buttonsEl.appendChild(btn);
  }
}

function bindInstantPress(button, handler) {
  let suppressClickUntil = 0;

  button.addEventListener('pointerdown', (event) => {
    if (event.isPrimary === false || event.button > 0) return;
    suppressClickUntil = performance.now() + POINTER_CLICK_SUPPRESS_MS;
    try { button.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
    event.preventDefault();
    handler(event);
  });

  button.addEventListener('click', (event) => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      return;
    }
    handler(event);
  });
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
  const entry = { species: species.id, el, expireAt, timeoutId: 0, call: playBirdCall(species) };
  entry.timeoutId = setTimeout(() => removeBird(id, false, true), life);
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

function removeBird(id, caught, allowGrace = false) {
  const entry = state.active.get(id);
  if (!entry) return;
  clearTimeout(entry.timeoutId);
  stopBirdCall(entry.call);
  const shouldRemember = allowGrace && !caught && state.running;
  state.active.delete(id);

  entry.el.classList.add(caught ? 'caught' : 'leaving');
  const removalTimeoutId = setTimeout(() => entry.el.remove(), 450);
  if (shouldRemember) rememberRecentlyExpiredBird(entry, removalTimeoutId);
}

function rememberRecentlyExpiredBird(entry, removalTimeoutId) {
  const now = performance.now();
  pruneRecentlyExpiredBirds(now);
  state.recentlyExpired.push({
    species: entry.species,
    el: entry.el,
    removalTimeoutId,
    expiredAt: now,
    graceUntil: now + EXPIRED_GUESS_GRACE_MS,
  });
}

function pruneRecentlyExpiredBirds(now = performance.now()) {
  state.recentlyExpired = state.recentlyExpired.filter(entry =>
    entry.graceUntil >= now && entry.el.isConnected
  );
}

function claimRecentlyExpiredBird(speciesId) {
  const now = performance.now();
  pruneRecentlyExpiredBirds(now);

  let match = null;
  let matchIndex = -1;
  for (let index = 0; index < state.recentlyExpired.length; index++) {
    const entry = state.recentlyExpired[index];
    if (entry.species !== speciesId) continue;
    if (!match || entry.expiredAt > match.expiredAt) {
      match = entry;
      matchIndex = index;
    }
  }

  if (matchIndex >= 0) state.recentlyExpired.splice(matchIndex, 1);
  return match;
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

  if (!match) match = claimRecentlyExpiredBird(speciesId);

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
    if (matchId !== null) {
      removeBird(matchId, true);
    } else {
      clearTimeout(match.removalTimeoutId);
      match.el.classList.remove('leaving');
      match.el.classList.add('caught');
      setTimeout(() => match.el.remove(), 450);
    }
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
  stopAllBirdCalls();
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
  state.recentlyExpired = [];
  resetLeaderboardRoundState();

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
  state.recentlyExpired = [];
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

  refreshBestPreview();
  showScreen('end');
  syncLeaderboardSubmitCard();
  void loadGlobalLeaderboard(true);
}

function quitToHome() {
  state.running = false;
  clearTimeout(state.spawnTimer);
  clearInterval(state.tickTimer);
  stopAllBirdCalls();
  birdLayer.innerHTML = '';
  popupLayer.innerHTML = '';
  state.active.clear();
  state.recentlyExpired = [];
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

// ---------- Bird calls ----------
const birdCallPreloads = new Map();
const activeBirdCalls = new Set();

function preloadBirdCalls() {
  for (const bird of BIRDS) {
    if (birdCallPreloads.has(bird.id)) continue;
    try {
      const audio = new Audio(bird.sound);
      audio.preload = 'auto';
      audio.load();
      birdCallPreloads.set(bird.id, audio);
    } catch (_) { /* no audio */ }
  }
}

function playBirdCall(species) {
  if (!species || !species.sound) return null;

  try {
    const preload = birdCallPreloads.get(species.id);
    const audio = preload ? preload.cloneNode(true) : new Audio(species.sound);
    const call = { audio, stopped: false };
    const markDone = () => {
      call.stopped = true;
      activeBirdCalls.delete(call);
    };

    audio.preload = 'auto';
    audio.volume = BIRD_CALL_VOLUME;
    audio.addEventListener('ended', markDone, { once: true });
    audio.addEventListener('error', markDone, { once: true });
    activeBirdCalls.add(call);

    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => stopBirdCall(call));
    }

    return call;
  } catch (_) {
    return null;
  }
}

function stopBirdCall(call) {
  if (!call || call.stopped) return;
  call.stopped = true;
  activeBirdCalls.delete(call);

  try {
    call.audio.pause();
    call.audio.currentTime = 0;
    call.audio.removeAttribute('src');
    call.audio.load();
  } catch (_) { /* no audio */ }
}

function stopAllBirdCalls() {
  for (const call of [...activeBirdCalls]) stopBirdCall(call);
}

// ---------- High-score / settings persistence ----------
const BEST_KEYS = ['birdle_best_regular', 'birdle_best_expert'];

function refreshBestPreview() {
  const el = $('#start-bests');
  if (!el) return;
  let r = 0, e = 0;
  try {
    r = parseInt(localStorage.getItem('birdle_best_regular') || '0', 10);
    e = parseInt(localStorage.getItem('birdle_best_expert')  || '0', 10);
  } catch (_) { /* ignore */ }
  el.textContent = (r || e) ? `Best — Regular: ${r}  ·  Expert: ${e}` : '';
}

let _feedbackTimer = 0;
function flashStartFeedback(msg) {
  const el = $('#start-feedback');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_feedbackTimer);
  _feedbackTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function resetBestScores() {
  if (!confirm('Clear your best scores for both Regular and Expert? This cannot be undone.')) return;
  try { BEST_KEYS.forEach(k => localStorage.removeItem(k)); } catch (_) { /* ignore */ }
  refreshBestPreview();
  flashStartFeedback('Best scores cleared.');
}


// ---------- Training (interactive walkthrough) ----------
const TRAINING_STEPS = [
  {
    species: 'american_robin',
    msg: 'A bird appeared in the trees! Tap the matching button below to identify it.',
    hint: true,
  },
  {
    species: 'scrub_jay',
    msg: 'Nice! One more — try this one without a hint. (In the real game, wrong taps cost points.)',
    hint: false,
  },
];

const trainingState = { step: 0, birdEl: null, buttonsBuilt: false, call: null };

function buildTrainingButtons() {
  const root = $('#training-buttons');
  root.innerHTML = '';
  for (const b of BIRDS) {
    const btn = document.createElement('button');
    btn.className = 'bird-btn';
    btn.dataset.species = b.id;
    btn.innerHTML = `<img src="${b.img}" alt="${b.name}" /><span>${b.name}</span>`;
    bindInstantPress(btn, () => onTrainingGuess(b.id, btn));
    root.appendChild(btn);
  }
}

function startTraining() {
  stopAllBirdCalls();
  if (!trainingState.buttonsBuilt) {
    buildTrainingButtons();
    trainingState.buttonsBuilt = true;
  }
  trainingState.step = 0;
  $('#training-bird-layer').innerHTML = '';
  showScreen('training');
  // Wait one frame so the screen has its final size before placing the bird.
  requestAnimationFrame(presentTrainingStep);
}

function presentTrainingStep() {
  const step = TRAINING_STEPS[trainingState.step];
  if (!step) return finishTraining();

  $('#training-step-num').textContent = trainingState.step + 1;
  $('#training-msg').textContent = step.msg;

  // Reset hint highlights
  document.querySelectorAll('#training-buttons .bird-btn').forEach(b => b.classList.remove('hint-glow'));
  if (step.hint) {
    const btn = document.querySelector(`#training-buttons .bird-btn[data-species="${step.species}"]`);
    if (btn) btn.classList.add('hint-glow');
  }

  spawnTrainingBird(step.species);
}

function spawnTrainingBird(speciesId) {
  const species = BIRDS.find(b => b.id === speciesId);
  if (!species) return;
  const layer = $('#training-bird-layer');
  stopBirdCall(trainingState.call);
  trainingState.call = null;
  layer.innerHTML = '';

  const rect = screens.training.getBoundingClientRect();
  const baseSize = Math.min(rect.width, rect.height);
  const size = Math.round(baseSize * 0.16);

  const xMin = TREE_ZONE.xMin * rect.width;
  const xMax = TREE_ZONE.xMax * rect.width  - size;
  const yMin = TREE_ZONE.yMin * rect.height + 60; // leave room for banner
  const yMax = TREE_ZONE.yMax * rect.height - size;

  const el = document.createElement('div');
  el.className = 'bird training-bird';
  el.style.width  = size + 'px';
  el.style.height = size + 'px';
  el.style.left   = rand(xMin, xMax) + 'px';
  el.style.top    = rand(yMin, yMax) + 'px';
  el.innerHTML = `<img src="${species.img}" alt="${species.name}" draggable="false" />`;
  layer.appendChild(el);
  trainingState.birdEl = el;
  trainingState.call = playBirdCall(species);
}

function onTrainingGuess(speciesId, btnEl) {
  const step = TRAINING_STEPS[trainingState.step];
  if (!step) return;

  if (speciesId === step.species) {
    flashBtn(btnEl, 'flash-correct');
    btnEl.classList.remove('hint-glow');
    stopBirdCall(trainingState.call);
    trainingState.call = null;
    if (trainingState.birdEl) {
      const dying = trainingState.birdEl;
      dying.classList.add('caught');
      setTimeout(() => dying.remove(), 450);
    }
    beep(880, 0.07);
    vibrate([30, 20, 30]);
    trainingState.step++;
    setTimeout(presentTrainingStep, 700);
  } else {
    flashBtn(btnEl, 'flash-wrong');
    beep(180, 0.12);
    vibrate(120);
    $('#training-msg').textContent = "Not quite — that's a different bird. Try again!";
  }
}

function finishTraining() {
  $('#training-step-num').textContent = '✓';
  $('#training-msg').textContent = "You're ready. Good luck out there!";
  setTimeout(() => startGame(state.level), 900);
}

function skipTraining() {
  stopAllBirdCalls();
  startGame(state.level);
}

function beginPlay() {
  preloadBirdCalls();
  startTraining();
}

// ---------- Wire up ----------
function init() {
  buildBirdButtons();
  resetLeaderboardRoundState();
  initIntro();

  if (leaderboardEls.submitName) {
    leaderboardEls.submitName.maxLength = MAX_LEADERBOARD_NAME_LENGTH;
    leaderboardEls.submitName.value = getStoredLeaderboardName();
    leaderboardEls.submitName.addEventListener('input', () => {
      if (!leaderboardState.submitting) setSubmitFeedback('');
    });
  }

  $('#btn-start').addEventListener('click', startFromLanding);
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

  $('#btn-howto-play').addEventListener('click', beginPlay);
  $('#btn-howto-back').addEventListener('click', () => showScreen('difficulty'));

  $('#btn-training-skip').addEventListener('click', skipTraining);
  $('#btn-reset-scores').addEventListener('click', resetBestScores);
  leaderboardEls.submitAction?.addEventListener('click', openLeaderboardForm);
  leaderboardEls.skipAction?.addEventListener('click', skipLeaderboardSubmission);
  leaderboardEls.cancelAction?.addEventListener('click', closeLeaderboardForm);
  leaderboardEls.submitForm?.addEventListener('submit', submitLeaderboardScore);

  refreshBestPreview();
  renderLeaderboardLists();
  void loadGlobalLeaderboard();

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
