import assert from 'node:assert/strict';
import test from 'node:test';

async function loadHelpers() {
  try {
    return await import('../js/leaderboard-utils.js');
  } catch (error) {
    assert.fail(`Leaderboard helpers are unavailable: ${error.message}`);
  }
}

test('score qualifies when leaderboard has open slots', async () => {
  const { scoreQualifies } = await loadHelpers();

  assert.equal(scoreQualifies(42, [{ score: 100 }, { score: 75 }]), true);
});

test('score must beat the current fifth place when leaderboard is full', async () => {
  const { scoreQualifies } = await loadHelpers();

  const topFive = [
    { score: 300 },
    { score: 250 },
    { score: 200 },
    { score: 150 },
    { score: 125 },
  ];

  assert.equal(scoreQualifies(126, topFive), true);
  assert.equal(scoreQualifies(125, topFive), false);
});

test('score qualifies using unique player names only', async () => {
  const { scoreQualifies } = await loadHelpers();

  const entries = [
    { player_name: 'Karan', score: 500 },
    { player_name: 'Karan', score: 400 },
    { player_name: 'Nate', score: 450 },
    { player_name: 'The Man', score: 350 },
    { player_name: 'Bird', score: 250 },
    { player_name: 'Bee', score: 200 },
  ];

  assert.equal(scoreQualifies(260, entries, 5), true);
  assert.equal(scoreQualifies(190, entries, 5), false);
});

test('unique leaderboard entries keep only the highest score per player', async () => {
  const { getUniqueLeaderboardEntries } = await loadHelpers();

  const entries = [
    { player_name: 'Karan', score: 100 },
    { player_name: 'Karan', score: 60 },
    { player_name: 'Nate', score: 80 },
    { player_name: 'The Man', score: 50 },
  ];

  const unique = getUniqueLeaderboardEntries(entries);
  assert.deepEqual(unique.map((entry) => ({ player_name: entry.player_name, score: entry.score })), [
    { player_name: 'Karan', score: 100 },
    { player_name: 'Nate', score: 80 },
    { player_name: 'The Man', score: 50 },
  ]);
});

test('leaderboard names are trimmed and collapsed before submit', async () => {
  const { normalizeLeaderboardName } = await loadHelpers();

  assert.equal(normalizeLeaderboardName('  Blue   Jay  Fan  '), 'Blue Jay Fan');
});

test('leaderboard names reject blank or too-long values', async () => {
  const { validateLeaderboardName, MAX_LEADERBOARD_NAME_LENGTH } = await loadHelpers();

  assert.deepEqual(validateLeaderboardName('   '), {
    ok: false,
    message: 'Enter a name to submit your score.',
  });

  assert.deepEqual(validateLeaderboardName('B'.repeat(MAX_LEADERBOARD_NAME_LENGTH + 1)), {
    ok: false,
    message: `Use ${MAX_LEADERBOARD_NAME_LENGTH} characters or fewer.`,
  });

  assert.deepEqual(validateLeaderboardName('Bird Nerd'), {
    ok: true,
    value: 'Bird Nerd',
  });
});