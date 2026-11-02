// Building blocks for the security-check screens.
import { el, wait, prefersReducedMotion } from './util.js';

export function screen(...children) {
  return el('section', { class: 'card screen' }, ...children);
}

export function clicked(button) {
  return new Promise(resolve => button.addEventListener('click', () => resolve(), { once: true }));
}

// Adds a Continue button under a level and resolves when it's pressed.
export function continueButton(parent, label = 'Continue') {
  const button = el('button', { class: 'btn btn-primary' }, label);
  parent.append(el('div', { class: 'btn-row' }, button));
  button.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return clicked(button);
}

// Types lines into a terminal box one character at a time.
// A line is a string, or { text, bad: true } to show it in red.
export async function typeLines(term, lines, speed = 28) {
  term.replaceChildren();
  const cursor = el('span', { class: 'cursor', 'aria-hidden': 'true' }, '_');
  for (const line of lines) {
    const { text, bad } = typeof line === 'string' ? { text: line } : line;
    const span = el('span');
    term.append(el('div', { class: bad ? 'bad' : null }, span, cursor));
    if (prefersReducedMotion()) {
      span.textContent = text;
      continue;
    }
    for (const ch of text) {
      span.textContent += ch;
      await wait(speed);
    }
    await wait(400);
  }
}
