// Pure scoring & combo logic for Birdle (no DOM, fully testable).

export const MAX_COMBO_MULTIPLIER = 5;
export const COMBO_STEP = 3; // consecutive hits per multiplier step

export function getComboMultiplier(combo) {
  const safeCombo = Math.max(1, Math.floor(Number(combo) || 1));
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.floor((safeCombo - 1) / COMBO_STEP));
}

export function getHitPoints(combo, pointsHit) {
  return pointsHit * getComboMultiplier(combo);
}

// Scores never go below zero — every player keeps an encouraging total.
export function clampScore(score) {
  return Math.max(0, score);
}
