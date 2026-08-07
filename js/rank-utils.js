// Pure rank-tier logic for Birdle (no DOM, fully testable).
// Every player gets a fun, encouraging title — no zeros, no losers.
// Ranks are tiered by score, scaled per difficulty so Expert and Regular
// feel comparably rewarding.

export const EXPERT_THRESHOLD_MULTIPLIER = 0.7; // expert thresholds slightly easier

export const RANK_TIERS = [
  // thresholds are in "score" units; multiplied by level multiplier
  { min: 0,   icon: 'egg',        title: 'Curious Hatchling',    sub: "Every legend starts with a single squint. You showed up — that counts!" },
  { min: 30,  icon: 'feather',    title: 'Backyard Apprentice',  sub: "You're picking up feathers fast. The birds are starting to notice you." },
  { min: 80,  icon: 'binoculars', title: 'Sharp-eyed Spotter',   sub: "Solid spotting. Your binoculars are starting to feel earned." },
  { min: 150, icon: 'bird',       title: 'Birder in Training',   sub: "Field-guide energy. You're calling birds before they land." },
  { min: 240, icon: 'award',      title: 'Field Guide Pro',      sub: "Confident IDs, clean combos. The trees fear you." },
  { min: 360, icon: 'trophy',     title: 'Audubon-tier Ace',     sub: "Top-shelf birding. You and the warblers go way back." },
  { min: 520, icon: 'crown',      title: 'Legendary Birdle Sage', sub: "Mythical. Birds form a queue to be identified by you." },
];

export function getRankThresholdMultiplier(level) {
  return level === 'expert' ? EXPERT_THRESHOLD_MULTIPLIER : 1;
}

export function getRankProgress(score, level) {
  const safeScore = Number.isFinite(score) ? score : 0;
  const mult = getRankThresholdMultiplier(level);

  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (safeScore >= t.min * mult) tier = t;
  }
  const next = RANK_TIERS.find(t => safeScore < t.min * mult) || null;
  const pointsToNext = next ? Math.ceil(next.min * mult - safeScore) : 0;

  return { tier, next, pointsToNext };
}
