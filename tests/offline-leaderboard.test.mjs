import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LEADERBOARD_CACHE_KEY,
  MAX_PENDING_SCORES,
  PENDING_SCORES_KEY,
  createPendingScore,
  getCombinedLeaderboardEntries,
  isOfflineError,
  loadPendingScores,
  queuePendingScore,
  readCachedLeaderboard,
  removePendingScore,
  clearPendingScores,
  writeCachedLeaderboard,
} from '../js/leaderboard-utils.js';

function memoryStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
  };
}

test('offline scores are queued locally with device metadata', () => {
  const storage = memoryStorage();
  const queued = queuePendingScore(storage, {
    player_name: '  Offline   Bird  ',
    score: 120,
    difficulty: 'expert',
    best_combo: 4,
    hits: 10,
    misses: 2,
  });

  assert.equal(queued.length, 1);
  assert.equal(queued[0].player_name, 'Offline Bird');
  assert.equal(queued[0].pending, true);
  assert.equal(queued[0].difficulty, 'expert');
  assert.ok(queued[0].id.startsWith('pending_'));
  assert.deepEqual(loadPendingScores(storage), queued);
});

test('pending queue survives reload and is capped', () => {
  const storage = memoryStorage();
  for (let i = 0; i < MAX_PENDING_SCORES + 5; i++) {
    queuePendingScore(storage, { player_name: `Bird ${i}`, score: i });
  }
  const pending = loadPendingScores(storage);
  assert.equal(pending.length, MAX_PENDING_SCORES);
  // Highest scores win the cap.
  assert.equal(pending[0].score, MAX_PENDING_SCORES + 4);
});

test('corrupt offline storage reads as empty instead of throwing', () => {
  const storage = memoryStorage({ [PENDING_SCORES_KEY]: 'not-json{{{' });
  assert.deepEqual(loadPendingScores(storage), []);
  const badCache = memoryStorage({ [LEADERBOARD_CACHE_KEY]: 'oops' });
  assert.deepEqual(readCachedLeaderboard(badCache), []);
});

test('pending scores can be removed after a successful sync', () => {
  const storage = memoryStorage();
  queuePendingScore(storage, { player_name: 'A', score: 10, id: 'pending_1' });
  queuePendingScore(storage, { player_name: 'B', score: 20, id: 'pending_2' });
  const remaining = removePendingScore(storage, 'pending_1');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].player_name, 'B');
  assert.deepEqual(clearPendingScores(storage), []);
  assert.deepEqual(loadPendingScores(storage), []);
});

test('cached leaderboard round-trips the last good global scores', () => {
  const storage = memoryStorage();
  writeCachedLeaderboard(storage, [
    { player_name: 'Karan', score: 300, difficulty: 'regular', created_at: new Date().toISOString() },
    { player_name: 'Nate', score: 100, difficulty: 'expert', created_at: new Date().toISOString(), pending: true },
  ]);
  const cached = readCachedLeaderboard(storage);
  // Pending rows are never written into the global cache.
  assert.equal(cached.length, 1);
  assert.equal(cached[0].player_name, 'Karan');
});

test('combined entries merge offline and global scores in rank order', () => {
  const combined = getCombinedLeaderboardEntries(
    [{ player_name: 'Global', score: 200, created_at: '2026-01-01T00:00:00.000Z' }],
    [createPendingScore({ player_name: 'Offline', score: 500 })],
  );
  assert.equal(combined[0].player_name, 'Offline');
  assert.equal(combined[1].player_name, 'Global');
});

test('network failures are detected as offline errors', () => {
  assert.equal(isOfflineError(new TypeError('Failed to fetch')), true);
  assert.equal(isOfflineError(new Error('Load failed')), true);
  assert.equal(isOfflineError(new Error('You are offline')), true);
  assert.equal(isOfflineError(new Error('duplicate key value violates unique constraint')), false);
});
