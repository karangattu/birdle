export const LEADERBOARD_LIMIT = 5;
export const MAX_LEADERBOARD_NAME_LENGTH = 24;

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
  const scores = (entries || [])
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