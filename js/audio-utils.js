export const AUDIO_STATUS = Object.freeze({
  OK: 'ok',
  RECOMMENDED: 'recommended',
  LOW: 'low',
  MUTED: 'muted',
  BLOCKED: 'blocked',
  UNSUPPORTED: 'unsupported',
});

export const MIN_RECOMMENDED_MEDIA_VOLUME = 0.25;

export function getMediaAudioStatus(mediaElement, {
  audioSupported = true,
  audioContextState = '',
  minVolume = MIN_RECOMMENDED_MEDIA_VOLUME,
  playBlocked = false,
} = {}) {
  if (!audioSupported) return AUDIO_STATUS.UNSUPPORTED;
  if (playBlocked || audioContextState === 'suspended' || audioContextState === 'interrupted') {
    return AUDIO_STATUS.BLOCKED;
  }
  if (!mediaElement) return AUDIO_STATUS.OK;

  if (mediaElement.muted) return AUDIO_STATUS.MUTED;

  const volume = Number(mediaElement.volume);
  if (Number.isFinite(volume)) {
    if (volume <= 0) return AUDIO_STATUS.MUTED;
    if (volume < minVolume) return AUDIO_STATUS.LOW;
  }

  return AUDIO_STATUS.OK;
}

export function audioStatusMessage(status) {
  switch (status) {
    case AUDIO_STATUS.RECOMMENDED:
      return 'Turn up sound for bird calls.';
    case AUDIO_STATUS.LOW:
      return 'Bird calls were turned up. Raise device volume if they still sound quiet.';
    case AUDIO_STATUS.MUTED:
      return 'Sound is off. Tap the speaker, then raise device volume if needed.';
    case AUDIO_STATUS.BLOCKED:
      return 'Tap the speaker to enable bird calls.';
    case AUDIO_STATUS.UNSUPPORTED:
      return 'Audio is unavailable in this browser.';
    default:
      return '';
  }
}
