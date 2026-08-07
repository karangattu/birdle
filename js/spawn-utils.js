// Pure spawn logic for Birdle (no DOM, fully testable).
// All functions take an injectable rng so tests can be deterministic.

// Pick a random species that is not currently on screen.
// Returns null when every species is already active.
export function pickSpawnSpecies(birds, activeSpeciesIds, rng = Math.random) {
  const candidates = (birds || []).filter(b => !activeSpeciesIds.has(b.id));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

export function randomBetween(min, max, rng = Math.random) {
  return min + rng() * (max - min);
}

export function getSpawnDelayMs(cfg, rng = Math.random) {
  return randomBetween(cfg.spawnEveryMin, cfg.spawnEveryMax, rng);
}

export function getBirdLifeMs(cfg, rng = Math.random) {
  return randomBetween(cfg.birdLifeMin, cfg.birdLifeMax, rng);
}

// Rects are { x, y, size } squares. overlapAllowance of 0.3 permits birds to
// overlap up to 30% — they can overlap, just not be heavily stacked.
export function rectsOverlap(a, b, overlapAllowance = 0.3) {
  const pad = -overlapAllowance * Math.min(a.size, b.size);
  return a.x < b.x + b.size + pad && a.x + a.size > b.x - pad &&
         a.y < b.y + b.size + pad && a.y + a.size > b.y - pad;
}

// Try a few random spots inside the zone; if all collide, accept the last one.
export function pickSpawnPosition({
  zone,
  width,
  height,
  size,
  occupied = [],
  overlapAllowance = 0.3,
  attempts = 12,
  rng = Math.random,
}) {
  const xMin = zone.xMin * width;
  const xMax = zone.xMax * width - size;
  const yMin = zone.yMin * height;
  const yMax = zone.yMax * height - size;
  const randomPos = () => ({
    x: randomBetween(xMin, xMax, rng),
    y: randomBetween(yMin, yMax, rng),
  });

  let best = randomPos();
  for (let i = 0; i < attempts; i++) {
    const cand = randomPos();
    const collides = occupied.some(other =>
      rectsOverlap({ x: cand.x, y: cand.y, size }, other, overlapAllowance)
    );
    if (!collides) return cand;
    best = cand;
  }
  return best;
}
