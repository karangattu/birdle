let wakeLock = null;
let isEnabled = false;

export async function requestWakeLock() {
  isEnabled = true;
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return false;
  }
  if (wakeLock) {
    return true;
  }
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
    return true;
  } catch (_) {
    return false;
  }
}

export async function releaseWakeLock() {
  isEnabled = false;
  if (wakeLock) {
    try {
      await wakeLock.release();
    } catch (_) {}
    wakeLock = null;
  }
}

export function getWakeLockSentinel() {
  return wakeLock;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && isEnabled) {
      await requestWakeLock();
    }
  });
}
