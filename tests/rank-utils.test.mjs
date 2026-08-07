import assert from 'node:assert/strict';
import test from 'node:test';

async function loadHelpers() {
  try {
    return await import('../js/rank-utils.js');
  } catch (error) {
    assert.fail(`Rank helpers are unavailable: ${error.message}`);
  }
}

test('every score earns a rank, starting at Curious Hatchling', async () => {
  const { getRankProgress, RANK_TIERS } = await loadHelpers();

  const { tier } = getRankProgress(0, 'regular');
  assert.equal(tier.title, 'Curious Hatchling');
  assert.equal(tier, RANK_TIERS[0]);
});

test('tiers advance at their score thresholds', async () => {
  const { getRankProgress } = await loadHelpers();

  assert.equal(getRankProgress(29, 'regular').tier.title, 'Curious Hatchling');
  assert.equal(getRankProgress(30, 'regular').tier.title, 'Backyard Apprentice');
  assert.equal(getRankProgress(519, 'regular').tier.title, 'Audubon-tier Ace');
  assert.equal(getRankProgress(520, 'regular').tier.title, 'Legendary Birdle Sage');
});

test('expert thresholds are scaled by the expert multiplier', async () => {
  const { getRankProgress, EXPERT_THRESHOLD_MULTIPLIER } = await loadHelpers();

  assert.equal(EXPERT_THRESHOLD_MULTIPLIER, 0.7);
  // 30 * 0.7 = 21: an expert score of 21 matches a regular score of 30.
  assert.equal(getRankProgress(20, 'expert').tier.title, 'Curious Hatchling');
  assert.equal(getRankProgress(21, 'expert').tier.title, 'Backyard Apprentice');
});

test('progress reports points needed for the next tier', async () => {
  const { getRankProgress } = await loadHelpers();

  const { next, pointsToNext } = getRankProgress(10, 'regular');
  assert.equal(next.title, 'Backyard Apprentice');
  assert.equal(pointsToNext, 20);
});

test('the top tier has no next rank', async () => {
  const { getRankProgress } = await loadHelpers();

  const { tier, next, pointsToNext } = getRankProgress(9999, 'regular');
  assert.equal(tier.title, 'Legendary Birdle Sage');
  assert.equal(next, null);
  assert.equal(pointsToNext, 0);
});
