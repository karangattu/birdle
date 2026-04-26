export function shouldShowIntro({ startRequested = false, hasSeenIntro = false, prefersReducedMotion = false } = {}) {
  return startRequested && !hasSeenIntro && !prefersReducedMotion;
}

export function getIntroTimeoutMs(durationSeconds, fallbackMs = 2600, bufferMs = 500) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return fallbackMs;
  return Math.round(durationSeconds * 1000) + bufferMs;
}