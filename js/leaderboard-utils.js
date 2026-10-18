export const LEADERBOARD_LIMIT = 5;
export const MAX_LEADERBOARD_NAME_LENGTH = 24;
export const PENDING_SCORES_KEY = 'birdle_pending_scores';
export const LEADERBOARD_CACHE_KEY = 'birdle_leaderboard_cache';
export const MAX_PENDING_SCORES = 20;

export function normalizeLeaderboardName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function validateLeaderboardName(value) {
  const normalized = normalizeLeaderboardName(value);
  if (!normalized) {
    return { ok: false, message: 'Enter a name to submit your score.' };
  }
  if (normalized.length > MAX_LEADERBOARD_NAME_LENGTH) {
    return {
      ok: false,
      message: `Use ${MAX_LEADERBOARD_NAME_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: normalized };
}

export function scoreQualifies(score, entries, limit = LEADERBOARD_LIMIT) {
  const safeScore = Number.isFinite(score) ? score : Number(score) || 0;
  const scores = getUniqueLeaderboardEntries(entries)
    .map((entry) => Number(entry?.score) || 0)
    .sort((left, right) => right - left);

  if (scores.length < limit) return true;
  return safeScore > scores[limit - 1];
}

export function sortLeaderboardEntries(entries) {
  return [...(entries || [])].sort((left, right) => {
    const scoreDelta = (Number(right?.score) || 0) - (Number(left?.score) || 0);
    if (scoreDelta !== 0) return scoreDelta;

    const leftTime = Date.parse(left?.created_at || '') || Number.MAX_SAFE_INTEGER;
    const rightTime = Date.parse(right?.created_at || '') || Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}

export function getUniqueLeaderboardEntries(entries) {
  const uniqueEntries = new Map();

  for (const [index, entry] of sortLeaderboardEntries(entries || []).entries()) {
    const playerName = entry?.player_name;
    const key = typeof playerName === 'string'
      ? normalizeLeaderboardName(playerName).toLowerCase()
      : `__entry_${index}`;

    if (!uniqueEntries.has(key)) {
      uniqueEntries.set(key, entry);
    }
  }

  return Array.from(uniqueEntries.values());
}

// ---------- Offline queue (Android WebView / flaky network) ----------
// Pending scores live in localStorage so a run played offline is never lost.
// They are merged into the displayed list and flushed to Supabase on reconnect.

function safeStorageRead(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch (_) {
    return null;
  }
}

function safeStorageWrite(storage, key, value) {
  try {
    storage?.setItem?.(key, value);
    return true;
  } catch (_) {
    return false;
  }
}

export function createPendingScore(input = {}) {
  const validation = validateLeaderboardName(input?.player_name ?? '');
  const playerName = validation.ok ? validation.value : 'Player';
  const rawScore = Number(input?.score);
  const difficulty = input?.difficulty === 'expert' ? 'expert' : 'regular';
  const createdAt = input?.created_at && !Number.isNaN(Date.parse(input.created_at))
    ? input.created_at
    : new Date().toISOString();
  const id = typeof input?.id === 'string' && input.id
    ? input.id
    : `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    player_name: playerName,
    score: Number.isFinite(rawScore) ? Math.max(0, Math.floor(rawScore)) : 0,
    difficulty,
    best_combo: Number.isFinite(Number(input?.best_combo)) ? Number(input.best_combo) : 1,
    hits: Number.isFinite(Number(input?.hits)) ? Number(input.hits) : 0,
    misses: Number.isFinite(Number(input?.misses)) ? Number(input.misses) : 0,
    created_at: createdAt,
    pending: true,
  };
}

export function loadPendingScores(storage) {
  const raw = safeStorageRead(storage, PENDING_SCORES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => createPendingScore(entry))
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_PENDING_SCORES);
  } catch (_) {
    return [];
  }
}

export function queuePendingScore(storage, input) {
  const pending = loadPendingScores(storage);
  pending.push(createPendingScore(input));
  const trimmed = sortLeaderboardEntries(pending).slice(0, MAX_PENDING_SCORES);
  safeStorageWrite(storage, PENDING_SCORES_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function removePendingScore(storage, id) {
  const remaining = loadPendingScores(storage).filter((entry) => entry?.id !== id);
  if (remaining.length === 0) {
    try { storage?.removeItem?.(PENDING_SCORES_KEY); } catch (_) {}
  } else {
    safeStorageWrite(storage, PENDING_SCORES_KEY, JSON.stringify(remaining));
  }
  return remaining;
}

export function clearPendingScores(storage) {
  try { storage?.removeItem?.(PENDING_SCORES_KEY); } catch (_) {}
  return [];
}

export function readCachedLeaderboard(storage) {
  const raw = safeStorageRead(storage, LEADERBOARD_CACHE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortLeaderboardEntries(parsed.filter((entry) => entry && typeof entry === 'object'));
  } catch (_) {
    return [];
  }
}

export function writeCachedLeaderboard(storage, entries) {
  const snapshot = sortLeaderboardEntries(
    (entries || []).filter((entry) => entry && typeof entry === 'object' && !entry.pending),
  ).slice(0, LEADERBOARD_LIMIT * 2);
  safeStorageWrite(storage, LEADERBOARD_CACHE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function getCombinedLeaderboardEntries(entries, pending) {
  return sortLeaderboardEntries([...(entries || []), ...(pending || [])]);
}

export function isOfflineError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (error?.name === 'TypeError' && message.includes('fetch')) return true;
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network error') ||
    message.includes('load failed') ||
    message.includes('offline') ||
    message.includes('internet')
  );
}