import assert from 'node:assert/strict';
import test from 'node:test';

async function loadHelpers() {
  try {
    return await import('../js/intro-utils.js');
  } catch (error) {
    assert.fail(`Intro helpers are unavailable: ${error.message}`);
  }
}

test('intro stays hidden until start is requested', async () => {
  const { shouldShowIntro } = await loadHelpers();

  assert.equal(
    shouldShowIntro({ startRequested: false, prefersReducedMotion: false }),
    false
  );
});

test('intro shows after start is requested when motion is allowed', async () => {
  const { shouldShowIntro } = await loadHelpers();

  assert.equal(
    shouldShowIntro({ startRequested: true, prefersReducedMotion: false }),
    true
  );
});

test('intro still shows on later start requests in the same session', async () => {
  const { shouldShowIntro } = await loadHelpers();

  assert.equal(
    shouldShowIntro({ startRequested: true, prefersReducedMotion: false }),
    true
  );
});

test('intro skips when reduced motion is preferred', async () => {
  const { shouldShowIntro } = await loadHelpers();

  assert.equal(
    shouldShowIntro({ startRequested: true, prefersReducedMotion: true }),
    false
  );
});

test('intro fallback duration uses the provided default when metadata is unusable', async () => {
  const { getIntroTimeoutMs } = await loadHelpers();

  assert.equal(getIntroTimeoutMs(Number.NaN, 2600), 2600);
  assert.equal(getIntroTimeoutMs(Infinity, 2600), 2600);
});

test('intro timeout adds a short buffer after the media duration', async () => {
  const { getIntroTimeoutMs } = await loadHelpers();

  assert.equal(getIntroTimeoutMs(2.9, 2600), 3400);
});