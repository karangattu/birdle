import assert from 'node:assert/strict';
import test from 'node:test';

async function loadHelpers() {
  try {
    return await import('../js/pwa-install-utils.js');
  } catch (error) {
    assert.fail(`PWA install helpers are unavailable: ${error.message}`);
  }
}

test('install prompt is hidden when already running as an installed app', async () => {
  const { shouldShowInstallPrompt } = await loadHelpers();

  assert.equal(
    shouldShowInstallPrompt({ isInstalledDisplayMode: true, dismissed: false, canInstall: true }),
    false
  );
});

test('install prompt is hidden after local dismissal', async () => {
  const { shouldShowInstallPrompt } = await loadHelpers();

  assert.equal(
    shouldShowInstallPrompt({ isInstalledDisplayMode: false, dismissed: true, canInstall: true }),
    false
  );
});

test('install prompt shows in a browser tab when installation is available', async () => {
  const { shouldShowInstallPrompt } = await loadHelpers();

  assert.equal(
    shouldShowInstallPrompt({
      isInstalledDisplayMode: false,
      dismissed: false,
      canInstall: true,
      fallbackReady: false,
    }),
    true
  );
});

test('install prompt can show without native install support after fallback delay', async () => {
  const { shouldShowInstallPrompt } = await loadHelpers();

  assert.equal(
    shouldShowInstallPrompt({
      isInstalledDisplayMode: false,
      dismissed: false,
      canInstall: false,
      fallbackReady: true,
    }),
    true
  );
});

test('installed display mode detects standalone navigator and display media modes', async () => {
  const { isInstalledDisplayMode } = await loadHelpers();

  assert.equal(isInstalledDisplayMode({ navigatorLike: { standalone: true } }), true);
  assert.equal(
    isInstalledDisplayMode({
      matchMedia: (query) => ({ matches: query.includes('display-mode: fullscreen') }),
    }),
    true
  );
});

test('dismissed install prompt is read from storage defensively', async () => {
  const { hasDismissedInstallPrompt, INSTALL_PROMPT_DISMISSED_VALUE } = await loadHelpers();

  assert.equal(
    hasDismissedInstallPrompt({
      storage: { getItem: () => INSTALL_PROMPT_DISMISSED_VALUE },
    }),
    true
  );
  assert.equal(
    hasDismissedInstallPrompt({
      storage: { getItem: () => { throw new Error('blocked'); } },
    }),
    false
  );
});
