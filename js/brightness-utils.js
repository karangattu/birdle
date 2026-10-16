// Pure helpers for keeping Birdle readable in bright, washed-out, or direct-sun
// conditions (tablets outdoors, high ambient light, high-contrast OS settings).
// Everything here is DOM-free and fully testable via dependency injection.

export const SUNLIGHT_LUX_THRESHOLD = 10000;
export const HIGH_KEY_GLARE_CLASSES = Object.freeze(['daylight-mode', 'sunlight-mode']);

export function getAmbientLux(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'object') {
    const candidates = [value.illuminance, value.lux, value.value, value.reading?.illuminance];
    for (const candidate of candidates) {
      const n = Number(candidate);
      if (Number.isFinite(n)) return n;
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isHighAmbientLight(lux, threshold = SUNLIGHT_LUX_THRESHOLD) {
  const n = getAmbientLux(lux);
  return n !== null && n >= threshold;
}

export function isWashedOutDisplay(matchMedia = (typeof globalThis !== 'undefined' ? globalThis.matchMedia?.bind(globalThis) : null)) {
  if (typeof matchMedia !== 'function') return false;
  const queries = ['(light-level: washed)', '(light-level: washed-out)'];
  return queries.some((query) => {
    try {
      return Boolean(matchMedia(query)?.matches);
    } catch (_) {
      return false;
    }
  });
}

export function prefersHighContrast(matchMedia = (typeof globalThis !== 'undefined' ? globalThis.matchMedia?.bind(globalThis) : null)) {
  if (typeof matchMedia !== 'function') return false;
  const queries = [
    '(prefers-contrast: more)',
    '(prefers-contrast: high)',
    '(forced-colors: active)',
  ];
  return queries.some((query) => {
    try {
      return Boolean(matchMedia(query)?.matches);
    } catch (_) {
      return false;
    }
  });
}

export function shouldUseSunlightMode({
  matchMedia = (typeof globalThis !== 'undefined' ? globalThis.matchMedia?.bind(globalThis) : null),
  ambientLight = null,
  manualPreference = null,
  prefersReducedGlare = false,
} = {}) {
  if (prefersReducedGlare) return false;
  if (manualPreference === 'dark' || manualPreference === false || manualPreference === 'off') {
    return false;
  }
  if (manualPreference === 'light' || manualPreference === 'sun' ||
      manualPreference === 'sunlight' || manualPreference === true || manualPreference === 'on') {
    return true;
  }

  const lux = getAmbientLux(ambientLight);
  if (lux !== null) return isHighAmbientLight(lux);
  if (isWashedOutDisplay(matchMedia)) return true;
  if (prefersHighContrast(matchMedia)) return true;
  return false;
}

// Convenience alias set so callers/tests can use either vocabulary.
export const isSunlit = shouldUseSunlightMode;
export const isSunlitEnvironment = shouldUseSunlightMode;
export const isDirectSun = shouldUseSunlightMode;
export const isBrightEnvironment = shouldUseSunlightMode;
export const shouldEnableDaylightMode = shouldUseSunlightMode;
export const shouldEnableSunlightMode = shouldUseSunlightMode;

export function getSunlightModeClass(enabled) {
  return enabled ? 'sunlight-mode' : null;
}

export function applySunlightMode({
  document: doc = (typeof globalThis !== 'undefined' ? globalThis.document : null),
  enabled = false,
} = {}) {
  if (!doc?.body?.classList) return Boolean(enabled);
  if (enabled) {
    doc.body.classList.add('daylight-mode', 'sunlight-mode');
  } else {
    doc.body.classList.remove('sunlight-mode');
  }
  return enabled;
}
