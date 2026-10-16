import assert from 'node:assert/strict';
import test from 'node:test';

const { shouldUseSunlightMode, isHighAmbientLight, isWashedOutDisplay, prefersHighContrast, getAmbientLux } =
  await import('../js/sunlight-utils.js');

test('ambient light above threshold recommends sunlight mode', () => {
  assert.equal(isHighAmbientLight(12000, 10000), true);
  assert.equal(isHighAmbientLight(5000, 10000), false);
  assert.equal(getAmbientLux({ illuminance: 15000 }), 15000);
});

test('manual dark preference overrides ambient light', () => {
  assert.equal(shouldUseSunlightMode({ ambientLight: 20000, manualPreference: 'dark' }), false);
  assert.equal(shouldUseSunlightMode({ ambientLight: 20000, manualPreference: 'light' }), true);
});

test('washed-out and high-contrast media queries recommend sunlight mode', () => {
  const mm = (q) => ({ matches: q.includes('washed') || q.includes('more') });
  assert.equal(isWashedOutDisplay(mm), true);
  assert.equal(prefersHighContrast(mm), true);
  assert.equal(shouldUseSunlightMode({ matchMedia: mm }), true);
});
