// Level 2: "Select all squares with reindeer." The squares are ambiguous on purpose,
// one of them is a family member in a sweater, and the first try always fails.
import { el, shuffle } from '../util.js';
import { continueButton } from '../ui.js';

export const id = 'reindeer';
export const title = 'Image verification';

export function run(stage, ctx) {
  const who = ctx.sweaterName || 'your uncle';
  const tiles = [
    { key: 'deer', emoji: '🦌', caption: 'Reindeer' },
    { key: 'dog', emoji: '🐕', caption: 'Dog in antlers' },
    { key: 'moose', emoji: '🦌', caption: 'Moose, probably' },
    { key: 'sweater', emoji: '🧔', caption: ctx.sweaterName ? `${ctx.sweaterName} in a reindeer sweater` : 'Uncle in a reindeer sweater' },
    { key: 'cat', emoji: '🐈', caption: 'Cat, unwilling' },
    { key: 'deer2', emoji: '🦌', caption: 'Reindeer, off duty' },
    { key: 'box', emoji: '📦', caption: 'Box labeled "reindeer"' },
    { key: 'tree', emoji: '🎄', caption: 'Tree with antler ornaments' },
    { key: 'randy', emoji: '🦌', caption: "Rudolph's cousin Randy" },
  ];

  let order = tiles.slice();
  const picked = new Set();
  let attempts = 0;
  let done = false;

  const grid = el('div', { class: 'tile-grid' });
  const note = el('p', { class: 'captcha-note', hidden: true, 'aria-live': 'polite' });
  const error = el('span', { class: 'field-error', role: 'alert' });
  const refresh = el('button', { type: 'button', class: 'btn btn-small', 'aria-label': 'New images', title: 'New images' }, '↻');
  const verify = el('button', { type: 'button', class: 'btn btn-primary btn-small' }, 'Verify');
  const foot = el('div', { class: 'captcha-foot' }, refresh, error, verify);
  stage.append(el('div', { class: 'captcha-frame' },
    el('div', { class: 'captcha-head' },
      el('p', {}, 'Select all squares with'),
      el('p', { class: 'captcha-target' }, 'reindeer'),
      el('p', {}, 'If there are none, click skip. Oops, we seem to have misplaced the skip button.')),
    grid,
    note,
    foot));

  function render() {
    grid.replaceChildren(...order.map(tile => {
      const on = picked.has(tile.key);
      return el('button', {
        type: 'button', class: on ? 'tile on' : 'tile', 'aria-pressed': String(on),
        onclick: () => {
          if (done) return;
          error.textContent = '';
          if (on) picked.delete(tile.key);
          else picked.add(tile.key);
          render();
        },
      }, el('span', { class: 'tile-emoji', 'aria-hidden': 'true' }, tile.emoji), el('span', { class: 'tile-caption' }, tile.caption));
    }));
  }
  function say(text, kind) {
    note.hidden = false;
    note.textContent = text;
    note.className = `captcha-note ${kind}`;
  }
  render();

  return new Promise(resolve => {
    refresh.onclick = () => {
      if (done) return;
      picked.clear();
      order = shuffle(order);
      error.textContent = '';
      render();
      say('New images. Same reindeer.', 'info');
    };

    verify.onclick = () => {
      if (done) return;
      if (picked.size === 0) { error.textContent = 'Select at least one square first.'; return; }
      attempts++;
      if (attempts === 1) {
        say(!picked.has('sweater') ? `Incorrect. You missed one. Look closer at ${who}.`
          : picked.has('cat') ? 'Incorrect. The cat has been informed and is offended.'
          : !picked.has('dog') ? 'Incorrect. The dog worked very hard on that costume.'
          : "Incorrect. Reindeer can tell when you're guessing.", 'bad');
        picked.clear();
        order = shuffle(order);
        render();
        return;
      }
      done = true;
      say(picked.has('sweater')
        ? `Verified. ${who[0].toUpperCase()}${who.slice(1)} has been notified that they count as a reindeer.`
        : 'Close enough. Reindeer are hard.', 'ok');
      foot.hidden = true;
      continueButton(stage).then(resolve);
    };
  });
}
