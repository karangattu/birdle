import assert from 'node:assert/strict';
import test from 'node:test';

async function loadHelpers() {
  try {
    return await import('../js/audio-utils.js');
  } catch (error) {
    assert.fail(`Audio helpers are unavailable: ${error.message}`);
  }
}

test('audio status is ok for a normal audible media element', async () => {
  const { AUDIO_STATUS, getMediaAudioStatus } = await loadHelpers();

  assert.equal(getMediaAudioStatus({ muted: false, volume: 0.8 }), AUDIO_STATUS.OK);
});

test('audio status detects muted and zero-volume media', async () => {
  const { AUDIO_STATUS, getMediaAudioStatus } = await loadHelpers();

  assert.equal(getMediaAudioStatus({ muted: true, volume: 0.8 }), AUDIO_STATUS.MUTED);
  assert.equal(getMediaAudioStatus({ muted: false, volume: 0 }), AUDIO_STATUS.MUTED);
});

test('audio status detects quiet media below the recommended threshold', async () => {
  const { AUDIO_STATUS, getMediaAudioStatus } = await loadHelpers();

  assert.equal(getMediaAudioStatus({ muted: false, volume: 0.1 }), AUDIO_STATUS.LOW);
  assert.equal(getMediaAudioStatus({ muted: false, volume: 0.3 }), AUDIO_STATUS.OK);
});

test('audio status detects blocked or unsupported playback paths', async () => {
  const { AUDIO_STATUS, getMediaAudioStatus } = await loadHelpers();

  assert.equal(getMediaAudioStatus(null, { playBlocked: true }), AUDIO_STATUS.BLOCKED);
  assert.equal(getMediaAudioStatus(null, { audioContextState: 'suspended' }), AUDIO_STATUS.BLOCKED);
  assert.equal(getMediaAudioStatus(null, { audioSupported: false }), AUDIO_STATUS.UNSUPPORTED);
});

test('audio status messages are available for visible tooltip states', async () => {
  const { AUDIO_STATUS, audioStatusMessage } = await loadHelpers();

  assert.match(audioStatusMessage(AUDIO_STATUS.RECOMMENDED), /Turn up sound/);
  assert.match(audioStatusMessage(AUDIO_STATUS.BLOCKED), /Tap the speaker/);
  assert.equal(audioStatusMessage(AUDIO_STATUS.OK), '');
});
