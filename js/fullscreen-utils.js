export function getFullscreenRequester(target) {
  if (!target) return null;
  return target.requestFullscreen
    || target.webkitRequestFullscreen
    || target.mozRequestFullScreen
    || target.msRequestFullscreen
    || null;
}

export function isFullscreenActive(doc = globalThis.document) {
  if (!doc) return false;
  return Boolean(
    doc.fullscreenElement
    || doc.webkitFullscreenElement
    || doc.mozFullScreenElement
    || doc.msFullscreenElement
  );
}

export async function requestAppFullscreen({ target, doc, orientation } = {}) {
  if (!target) return false;
  const resolvedDoc = doc || target.ownerDocument || globalThis.document;
  if (isFullscreenActive(resolvedDoc)) return true;

  const requestFullscreen = getFullscreenRequester(target);
  if (!requestFullscreen) return false;

  try {
    await requestFullscreen.call(target);
    try {
      await orientation?.lock?.('landscape');
    } catch (_) { /* orientation lock is best-effort */ }
    return true;
  } catch (_) {
    return false;
  }
}
