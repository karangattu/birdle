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