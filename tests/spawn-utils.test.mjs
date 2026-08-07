import assert from 'node:assert/strict';
import test from 'node:test';

async function loadHelpers() {
  try {
    return await import('../js/spawn-utils.js');
  } catch (error) {
    assert.fail(`Spawn helpers are unavailable: ${error.message}`);
  }
}

test('pickSpawnSpecies selects available bird or returns null when all active', async () => {
  const { pickSpawnSpecies } = await loadHelpers();
  const birds = [{ id: 'crow' }, { id: 'robin' }, { id: 'finch' }];

  const active = new Set(['crow']);
  const chosen = pickSpawnSpecies(birds, active, () => 0);
  assert.equal(chosen.id, 'robin');

  const allActive = new Set(['crow', 'robin', 'finch']);
  assert.equal(pickSpawnSpecies(birds, allActive), null);
  assert.equal(pickSpawnSpecies([], new Set()), null);
});

test('randomBetween interpolates min and max with rng', async () => {
  const { randomBetween } = await loadHelpers();

  assert.equal(randomBetween(10, 20, () => 0), 10);
  assert.equal(randomBetween(10, 20, () => 1), 20);
  assert.equal(randomBetween(10, 20, () => 0.5), 15);
});

test('getSpawnDelayMs and getBirdLifeMs compute ranges from config', async () => {
  const { getSpawnDelayMs, getBirdLifeMs } = await loadHelpers();
  const cfg = { spawnEveryMin: 1000, spawnEveryMax: 3000, birdLifeMin: 2000, birdLifeMax: 4000 };

  assert.equal(getSpawnDelayMs(cfg, () => 0.5), 2000);
  assert.equal(getBirdLifeMs(cfg, () => 0.25), 2500);
});

test('rectsOverlap detects overlapping bounding squares based on allowance', async () => {
  const { rectsOverlap } = await loadHelpers();
  const a = { x: 0, y: 0, size: 100 };
  const b = { x: 50, y: 50, size: 100 };
  const far = { x: 200, y: 200, size: 100 };

  assert.equal(rectsOverlap(a, b, 0.3), true);
  assert.equal(rectsOverlap(a, far, 0.3), false);
});

test('pickSpawnPosition finds valid non-overlapping coordinates inside zone', async () => {
  const { pickSpawnPosition } = await loadHelpers();
  const zone = { xMin: 0.1, xMax: 0.9, yMin: 0.1, yMax: 0.9 };
  const occupied = [{ x: 100, y: 100, size: 100 }];

  const pos = pickSpawnPosition({
    zone,
    width: 1000,
    height: 1000,
    size: 100,
    occupied,
    overlapAllowance: 0.3,
    attempts: 5,
    rng: () => 0.8,
  });

  assert.ok(pos.x >= 100 && pos.x <= 800);
  assert.ok(pos.y >= 100 && pos.y <= 800);
});
