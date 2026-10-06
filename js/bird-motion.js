export function showTakeoff(element, bird) {
  element.querySelector('img').src = bird.takeoff;
  element.classList.add('taking-off');
}
