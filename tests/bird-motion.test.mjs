import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';

test('departure switches each species to its own flying pose', async () => {
  let BIRDS, showTakeoff;
  try {
    ({ BIRDS } = await import('../js/birds.js'));
    ({ showTakeoff } = await import('../js/bird-motion.js'));
  } catch (error) {
    assert.fail(`Bird takeoff is unavailable: ${error.message}`);
  }
  for (const bird of BIRDS) {
    const { document } = new JSDOM('<div class="bird flip"><img alt="" /></div>').window;
    const el = document.querySelector('.bird');
    showTakeoff(el, bird);
    assert.equal(el.querySelector('img').getAttribute('src'), bird.takeoff);
    assert.ok(el.classList.contains('taking-off'));
    assert.ok(el.classList.contains('flip'));
    assert.ok(fs.existsSync(bird.takeoff), `Missing flying image for ${bird.name}`);
  }
});
