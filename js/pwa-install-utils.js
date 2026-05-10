export const INSTALL_PROMPT_DISMISSED_KEY = 'birdle_install_prompt_dismissed';
export const INSTALL_PROMPT_DISMISSED_VALUE = '1';

const INSTALLED_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];

export function isInstalledDisplayMode({
  navigatorLike = globalThis.navigator,
  matchMedia = globalThis.matchMedia?.bind(globalThis),
} = {}) {
  if (navigatorLike?.standalone) return true;
  if (typeof matchMedia !== 'function') return false;

  return INSTALLED_DISPLAY_MODES.some((mode) => {
    try {
      return Boolean(matchMedia(`(display-mode: ${mode})`)?.matches);
    } catch (_) {
      return false;
    }
  });
}

export function hasDismissedInstallPrompt({
  storage = globalThis.localStorage,
  key = INSTALL_PROMPT_DISMISSED_KEY,
} = {}) {
  try {
    return storage?.getItem(key) === INSTALL_PROMPT_DISMISSED_VALUE;
  } catch (_) {
    return false;
  }
}

export function dismissInstallPrompt({
  storage = globalThis.localStorage,
  key = INSTALL_PROMPT_DISMISSED_KEY,
} = {}) {
  try {
    storage?.setItem(key, INSTALL_PROMPT_DISMISSED_VALUE);
  } catch (_) { /* storage may be unavailable */ }
}

export function shouldShowInstallPrompt({
  isInstalledDisplayMode = false,
  dismissed = false,
  canInstall = false,
  fallbackReady = false,
} = {}) {
  return !isInstalledDisplayMode && !dismissed && (canInstall || fallbackReady);
}
