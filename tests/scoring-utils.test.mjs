import assert from 'node:assert/strict';
import test from 'node:test';

async function loadHelpers() {
  try {
    return await import('../js/scoring-utils.js');
  } catch (error) {
    assert.fail(`Scoring helpers are unavailable: ${error.message}`);
  }
}

test('combo multiplier steps up every 3 combo points', async () => {
  const { getComboMultiplier } = await loadHelpers();

  assert.equal(getComboMultiplier(1), 1);
  assert.equal(getComboMultiplier(2), 1);
  assert.equal(getComboMultiplier(3), 1);
  assert.equal(getComboMultiplier(4), 2);
  assert.equal(getComboMultiplier(6), 2);
  assert.equal(getComboMultiplier(7), 3);
  assert.equal(getComboMultiplier(10), 4);
  assert.equal(getComboMultiplier(13), 5);
});

test('combo multiplier is capped at 5x', async () => {
  const { getComboMultiplier, MAX_COMBO_MULTIPLIER } = await loadHelpers();

  assert.equal(MAX_COMBO_MULTIPLIER, 5);
  assert.equal(getComboMultiplier(16), 5);
  assert.equal(getComboMultiplier(99), 5);
});

test('combo multiplier tolerates junk input', async () => {
  const { getComboMultiplier } = await loadHelpers();

  assert.equal(getComboMultiplier(0), 1);
  assert.equal(getComboMultiplier(-4), 1);
  assert.equal(getComboMultiplier(undefined), 1);
  assert.equal(getComboMultiplier(4.9), 2);
});

test('hit points scale with the combo multiplier', async () => {
  const { getHitPoints } = await loadHelpers();

  assert.equal(getHitPoints(1, 10), 10);
  assert.equal(getHitPoints(4, 10), 20);
  assert.equal(getHitPoints(13, 15), 75);
});

test('scores never drop below zero', async () => {
  const { clampScore } = await loadHelpers();

  assert.equal(clampScore(42), 42);
  assert.equal(clampScore(0), 0);
  assert.equal(clampScore(-8), 0);
});
