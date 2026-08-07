import assert from 'node:assert/strict';
import test from 'node:test';

async function loadHelpers() {
  try {
    return await import('../js/spawn-utils.js');
  } catch (error) {
    assert.fail(`Spawn helpers are unavailable: ${error.message}`);
  }
}

const BIRDS = [
  { id: 'crow' },
  { id: 'robin' },
  { id: 'jay' },
];

test('spawn species is never one already on screen', async () => {
  const { pickSpawnSpecies } = await loadHelpers();

  const active = new Set(['crow', 'jay']);
  for (const rngValue of [0, 0.25, 0.5, 0.75, 0.999]) {
    const species = pickSpawnSpecies(BIRDS, active, () => rngValue);
    assert.equal(species.id, 'robin');
  }
});

test('spawn species returns null when every species is active', async () => {
  const { pickSpawnSpecies } = await loadHelpers();

  const active = new Set(['crow', 'robin', 'jay']);
  assert.equal(pickSpawnSpecies(BIRDS, active), null);
  assert.equal(pickSpawnSpecies([], new Set()), null);
});

test('spawn delay and bird life stay within configured ranges', async () => {
  const { getSpawnDelayMs, getBirdLifeMs } = await loadHelpers();

  const cfg = {
    spawnEveryMin: 450,
    spawnEveryMax: 900,
    birdLifeMin: 1500,
    birdLifeMax: 2200,
  };

  assert.equal(getSpawnDelayMs(cfg, () => 0), 450);
  assert.equal(getSpawnDelayMs(cfg, () => 0.999), 899.55);
  assert.equal(getBirdLifeMs(cfg, () => 0), 1500);
  assert.equal(getBirdLifeMs(cfg, () => 0.999), 2199.3);
});

test('rects overlap only beyond the 30% allowance', async () => {
  const { rectsOverlap } = await loadHelpers();

  const a = { x: 0, y: 0, size: 100 };
  // 50px offset: heavy overlap (>30%) — collides.
  assert.equal(rectsOverlap(a, { x: 50, y: 0, size: 100 }), true);
  // 80px offset: only 20px overlap (20%) — allowed.
  assert.equal(rectsOverlap(a, { x: 80, y: 0, size: 100 }), false);
  // Fully separate — no overlap.
  assert.equal(rectsOverlap(a, { x: 200, y: 0, size: 100 }), false);
});

test('spawn positions stay inside the tree zone', async () => {
  const { pickSpawnPosition } = await loadHelpers();

  const zone = { xMin: 0.04, xMax: 0.96, yMin: 0.06, yMax: 0.62 };
  const width = 1000;
  const height = 500;
  const size = 100;

  // Cycle rng through the full range to sample many candidate spots.
  let tick = 0;
  const rng = () => { tick = (tick + 0.173) % 1; return tick; };

  for (let i = 0; i < 50; i++) {
    const pos = pickSpawnPosition({ zone, width, height, size, rng });
    assert.ok(pos.x >= zone.xMin * width, `x ${pos.x} below min`);
    assert.ok(pos.x <= zone.xMax * width - size, `x ${pos.x} above max`);
    assert.ok(pos.y >= zone.yMin * height, `y ${pos.y} below min`);
    assert.ok(pos.y <= zone.yMax * height - size, `y ${pos.y} above max`);
  }
});

test('spawn positions avoid occupied spots when a free spot exists', async () => {
  const { pickSpawnPosition } = await loadHelpers();

  const zone = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  // Fill the area with a grid of squares so only corners stay free.
  const occupied = [];
  for (let x = 100; x <= 700; x += 150) {
    for (let y = 100; y <= 700; y += 150) {
      occupied.push({ x, y, size: 100 });
    }
  }

  let calls = 0;
  const rng = () => { calls += 1; return (calls * 0.37) % 1; };
  const pos = pickSpawnPosition({
    zone, width: 800, height: 800, size: 100, occupied, rng,
  });

  const collides = occupied.some(other =>
    pos.x < other.x + other.size - 30 && pos.x + 100 > other.x + 30 &&
    pos.y < other.y + other.size - 30 && pos.y + 100 > other.y + 30
  );
  assert.equal(collides, false);
});
