import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

async function setup() {
  let initializeFieldGuide, BIRDS;
  try {
    ({ initializeFieldGuide } = await import('../js/field-guide.js'));
    ({ BIRDS } = await import('../js/birds.js'));
  } catch (error) {
    assert.fail(`The playable scrapbook guide is unavailable: ${error.message}`);
  }
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { url: 'https://birdle.test/' });
  const { document, HTMLMediaElement, Event } = dom.window;
  const playing = new WeakSet();
  HTMLMediaElement.prototype.play = function () { playing.add(this); return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () { playing.delete(this); };
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', { get() { return !playing.has(this); } });
  const modal = document.getElementById('field-guide-modal');
  assert.ok(modal, 'The guide has a dialog');
  modal.showModal = () => modal.setAttribute('open', '');
  modal.close = () => { modal.removeAttribute('open'); modal.dispatchEvent(new Event('close')); };
  initializeFieldGuide(document, { birds: BIRDS });
  document.getElementById('field-guide-btn').click();
  return { document, modal, Event, BIRDS };
}

const card = (document, id) => document.querySelector(`[data-bird-call="${id}"]`);
const call = (document, id) => document.querySelector(`audio[data-bird="${id}"]`);

test('the guide has a labeled illustrated sound button for every playable bird', async () => {
  const { document, BIRDS } = await setup();
  assert.equal(BIRDS.length, 10);
  for (const bird of BIRDS) {
    const button = card(document, bird.id);
    assert.equal(button.tagName, 'BUTTON');
    assert.ok(button.textContent.includes(bird.name));
    assert.equal(button.querySelector('img').getAttribute('src'), bird.img);
    assert.equal(call(document, bird.id).getAttribute('src'), bird.sound);
  }
});

test('each guide bird starts its corresponding call at the game playback level', async () => {
  const { document, BIRDS } = await setup();
  for (const bird of BIRDS) {
    card(document, bird.id).click();
    assert.equal(call(document, bird.id).paused, false);
    assert.equal(call(document, bird.id).volume, 0.72);
    assert.equal(card(document, bird.id).getAttribute('aria-pressed'), 'true');
    assert.ok(document.getElementById('field-guide-status').textContent.includes(bird.name));
  }
});

test('switching birds stops and rewinds the previous recording', async () => {
  const { document } = await setup();
  card(document, 'american_crow').click();
  call(document, 'american_crow').currentTime = 2;
  card(document, 'house_finch').click();
  assert.equal(call(document, 'american_crow').paused, true);
  assert.equal(call(document, 'american_crow').currentTime, 0);
  assert.equal(card(document, 'american_crow').getAttribute('aria-pressed'), 'false');
  assert.equal(call(document, 'house_finch').paused, false);
});

test('tapping the playing bird again stops its call', async () => {
  const { document } = await setup();
  card(document, 'scrub_jay').click();
  card(document, 'scrub_jay').click();
  assert.equal(call(document, 'scrub_jay').paused, true);
  assert.equal(card(document, 'scrub_jay').getAttribute('aria-pressed'), 'false');
});

test('finishing a call clears the selected card', async () => {
  const { document, Event } = await setup();
  card(document, 'american_robin').click();
  call(document, 'american_robin').dispatchEvent(new Event('ended'));
  assert.equal(card(document, 'american_robin').getAttribute('aria-pressed'), 'false');
  assert.match(document.getElementById('field-guide-status').textContent, /Tap a bird/);
});

test('closing the guide stops sound and returns focus to its launcher', async () => {
  const { document, modal } = await setup();
  assert.equal(document.activeElement.id, 'field-guide-close-btn');
  card(document, 'hermit_thrush').click();
  document.getElementById('field-guide-close-btn').click();
  assert.equal(modal.open, false);
  assert.equal(call(document, 'hermit_thrush').paused, true);
  assert.equal(document.activeElement.id, 'field-guide-btn');
});

test('a blocked recording reports failure and clears its playback state', async () => {
  const { document } = await setup();
  call(document, 'black_phoebe').play = () => Promise.reject(new Error('blocked'));
  card(document, 'black_phoebe').click();
  await Promise.resolve();
  assert.equal(card(document, 'black_phoebe').getAttribute('aria-pressed'), 'false');
  assert.match(document.getElementById('field-guide-status').textContent, /could not be played/);
});
