// Level 1: an "I'm not a robot" checkbox that runs away, fakes a check once, shrinks,
// and finally asks for a SantaPay tip. SantaPay is made up; no money ever moves.
import { el } from '../util.js';
import { continueButton } from '../ui.js';

export const id = 'checkbox';
export const title = 'Basic human check';

const TAUNTS = [
  'Whoa. Too fast. Very robotic.',
  'Nope. Human hands are warmer than that.',
  'The checkbox is shy. Approach slowly.',
  'Try sneaking up on it.',
  'Suspicious. A real human would have given up by now.',
  'Shrinking the target for security reasons.',
  'Have you tried believing in yourself?',
  'Recalibrating your humanity…',
];
const FAKE_TAUNT = 'Too confident. Humans hesitate. Unchecking.';
const LAST_TAUNT = 'Hmm. There is one other option.';

export function run(stage, ctx) {
  const max = ctx.mercy ? 5 : 10;
  const fakeAt = ctx.mercy ? 2 : 4;
  const shrinkAt = ctx.mercy ? Infinity : 7;

  const box = el('button', { type: 'button', class: 'captcha-box', 'aria-label': "I'm not a robot" });
  const label = el('span', { class: 'captcha-label' }, "I'm not a robot");
  const widget = el('div', { class: 'captcha' }, box, label,
    el('span', { class: 'captcha-brand', 'aria-hidden': 'true' }, el('span', { class: 'captcha-logo' }, '🎄'), 'reCLAUS'));
  const msg = el('p', { class: 'arena-msg', 'aria-live': 'polite' }, 'Check the box to continue.');
  const arena = el('div', { class: 'arena' }, widget, msg);
  stage.append(arena);

  const center = () => {
    widget.style.left = `${(arena.clientWidth - widget.offsetWidth) / 2}px`;
    widget.style.top = `${(arena.clientHeight - widget.offsetHeight) / 2 - 14}px`;
  };
  const move = () => {
    const w = arena.clientWidth - widget.offsetWidth - 16;
    const h = arena.clientHeight - widget.offsetHeight - 56;
    widget.style.left = `${8 + Math.random() * w}px`;
    widget.style.top = `${8 + Math.random() * h}px`;
  };
  requestAnimationFrame(center);
  addEventListener('resize', center);

  let tries = 0;
  let tauntIndex = 0;
  let busy = false;
  let done = false;
  let lastDodge = 0;

  return new Promise(resolve => {
    function after(text) {
      msg.textContent = text;
      tries++;
      label.textContent = tries >= 8 ? 'I might be a robot, honestly' : tries >= 5 ? "I'm probably not a robot" : "I'm not a robot";
      if (tries >= shrinkAt) box.classList.add('tiny');
      if (tries >= max) setTimeout(showPay, 700);
    }
    function dodge() {
      const now = Date.now();
      if (busy || now - lastDodge < 250) return;
      lastDodge = now;
      move();
      after(tries === max - 1 ? LAST_TAUNT : TAUNTS[Math.min(tauntIndex++, TAUNTS.length - 1)]);
    }
    function fakeCheck() {
      busy = true;
      box.classList.add('checked');
      msg.textContent = 'Verifying…';
      setTimeout(() => {
        box.classList.remove('checked');
        busy = false;
        move();
        after(FAKE_TAUNT);
      }, 1100);
    }
    function attempt() {
      if (done || busy || tries >= max) return;
      if (tries === fakeAt) fakeCheck();
      else dodge();
    }

    // On a computer it also dodges when the mouse gets close. Except on the fake-out turn,
    // which has to be catchable.
    box.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse' && !done && tries < max && tries !== fakeAt && Math.random() < 0.55) dodge();
    });
    box.addEventListener('pointerdown', e => { e.preventDefault(); attempt(); });
    // Keyboard presses (Enter or Space) arrive as clicks with no pointer; they count too.
    box.addEventListener('click', e => { if (e.detail === 0) attempt(); });

    function showPay() {
      if (done) return;
      const send = el('button', { type: 'button', class: 'btn btn-primary' }, 'Send tip');
      const broke = el('button', { type: 'button', class: 'btn' }, "I'm broke");
      const card = el('div', { class: 'pay-card', role: 'dialog', 'aria-label': 'SantaPay' },
        el('p', { class: 'pay-brand' }, '🎁 SantaPay'),
        el('p', { class: 'pay-label' }, 'Humanity verification fee'),
        el('p', { class: 'pay-amount' }, '$4.99'),
        el('p', { class: 'pay-to' }, 'To: North Pole Workshop LLC'),
        el('div', { class: 'btn-row center' }, send, broke));
      const overlay = el('div', { class: 'overlay' }, card);
      arena.append(overlay);
      send.focus();

      send.onclick = () => {
        send.textContent = 'Processing…';
        send.disabled = true;
        broke.disabled = true;
        setTimeout(() => {
          card.replaceChildren(
            el('p', { class: 'pay-icon', 'aria-hidden': 'true' }, '⚠️'),
            el('p', { class: 'pay-brand' }, 'Payment declined'),
            el('p', { class: 'pay-label' }, 'Reason: insufficient holiday spirit.'));
          setTimeout(() => finish(overlay, 'Fee waived. Santa admires your generosity, if not your judgment.'), 1900);
        }, 1300);
      };
      broke.onclick = () => finish(overlay, 'Verified. Only a real human is that broke.');
    }

    function finish(overlay, text) {
      overlay.remove();
      done = true;
      removeEventListener('resize', center);
      box.classList.remove('tiny');
      box.classList.add('checked', 'verified');
      center();
      msg.textContent = text;
      continueButton(stage).then(resolve);
    }
  });
}
