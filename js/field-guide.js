import { BIRD_CALL_VOLUME } from './audio-utils.js';

const IDLE_STATUS = 'Tap a bird to hear its call.';

export function initializeFieldGuide(document, { birds }) {
  const modal = document.getElementById('field-guide-modal');
  const openButton = document.getElementById('field-guide-btn');
  const closeButton = document.getElementById('field-guide-close-btn');
  const status = document.getElementById('field-guide-status');
  const cards = document.getElementById('field-guide-cards');
  const calls = document.getElementById('field-guide-calls');
  let current = null;

  function reset() {
    if (current) {
      current.audio.pause();
      current.audio.currentTime = 0;
      current.button.classList.remove('active');
      current.button.setAttribute('aria-pressed', 'false');
      current = null;
    }
    status.textContent = IDLE_STATUS;
  }

  for (const [index, bird] of birds.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'field-guide-hotspot';
    button.dataset.birdCall = bird.id;
    button.setAttribute('aria-label', `Play ${bird.name} call`);
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `
      <span class="field-guide-photo"><span class="field-guide-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><img src="${bird.img}" alt="" loading="lazy" /></span>
      <span class="field-guide-bird-name">${bird.name}</span>
      <span class="field-guide-call-note">${bird.callNote}</span>
      <span class="field-guide-note">${bird.note}</span>
      <span class="field-guide-listen" aria-hidden="true"><span class="field-guide-play-icon">▶</span> Listen to the call</span>`;
    cards.appendChild(button);

    const audio = document.createElement('audio');
    audio.dataset.bird = bird.id;
    audio.src = bird.sound;
    audio.preload = 'none';
    audio.volume = BIRD_CALL_VOLUME;
    calls.appendChild(audio);
    const entry = { button, audio };

    function playbackFailed() {
      if (current !== entry) return;
      reset();
      status.textContent = 'That call could not be played. Tap the bird to retry.';
    }

    button.addEventListener('click', () => {
      const wasPlaying = current === entry;
      reset();
      if (wasPlaying) return;
      current = entry;
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      status.textContent = `Playing: ${bird.name} call.`;
      try {
        audio.play()?.catch(playbackFailed);
      } catch {
        playbackFailed();
      }
    });
    audio.addEventListener('error', playbackFailed);
    audio.addEventListener('ended', () => {
      if (current === entry) reset();
    });
  }

  openButton.addEventListener('click', () => {
    modal.showModal();
    closeButton.focus();
  });
  closeButton.addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    if (event.target === modal) modal.close();
  });
  modal.addEventListener('close', () => {
    reset();
    openButton.focus();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') reset();
  });
}
