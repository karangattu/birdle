import assert from 'node:assert/strict';
import test from 'node:test';

async function loadHelpers() {
  try {
    return await import('../js/fullscreen-utils.js');
  } catch (error) {
    assert.fail(`Fullscreen helpers are unavailable: ${error.message}`);
  }
}

test('fullscreen requester prefers the standard browser method', async () => {
  const { getFullscreenRequester } = await loadHelpers();
  const target = {
    requestFullscreen() {},
    webkitRequestFullscreen() {},
  };

  assert.equal(getFullscreenRequester(target), target.requestFullscreen);
});

test('fullscreen requester falls back to webkit method', async () => {
  const { getFullscreenRequester } = await loadHelpers();
  const target = {
    webkitRequestFullscreen() {},
  };

  assert.equal(getFullscreenRequester(target), target.webkitRequestFullscreen);
});

test('fullscreen active detects prefixed fullscreen state', async () => {
  const { isFullscreenActive } = await loadHelpers();

  assert.equal(isFullscreenActive({ webkitFullscreenElement: {} }), true);
});

test('fullscreen request returns false when unsupported', async () => {
  const { requestAppFullscreen } = await loadHelpers();

  assert.equal(await requestAppFullscreen({ target: {}, doc: {} }), false);
});

test('fullscreen request calls the target method and locks landscape when possible', async () => {
  const { requestAppFullscreen } = await loadHelpers();
  let requested = false;
  let locked = '';
  const target = {
    requestFullscreen() {
      requested = true;
      return Promise.resolve();
    },
  };
  const orientation = {
    lock(value) {
      locked = value;
      return Promise.resolve();
    },
  };

  assert.equal(await requestAppFullscreen({ target, doc: {}, orientation }), true);
  assert.equal(requested, true);
  assert.equal(locked, 'landscape');
});
