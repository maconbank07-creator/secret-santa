// The payoff: a scratch-off card for each person they're shopping for, with who else has
// that person so the two of them can compare notes, plus the date and note.
import { el } from './util.js';
import { screen, typeLines } from './ui.js';
import { confetti } from './effects.js';

export async function reveal(app, data, ctx, { quick = false } = {}) {
  const cards = data.r.map(([name, partner]) => scratchCard(name, partner));
  const fallback = el('button', { type: 'button', class: 'link-btn', hidden: true }, "Can't scratch? Reveal them");
  const term = !quick && el('div', { class: 'terminal short' });
  const details = el('div', { class: 'reveal-details', hidden: true },
    el('ul', {},
      data.d && el('li', {}, `📅 Exchange: ${formatDate(data.d)}`),
      data.n && el('li', {}, `📝 ${data.n}`),
      el('li', {}, '🤫 Keep it secret. KRAMPUS.exe is still out there.')),
    el('p', { class: 'hint' }, 'Forget later? Open this same link again.'));

  app.replaceChildren(screen(
    !quick && el('p', { class: 'eyebrow' }, 'Threat neutralized'),
    term,
    el('h2', {}, 'Your Secret Santa assignments'),
    el('p', { class: 'muted' }, `${ctx.event}. You're shopping for ${['one person', 'two people'][cards.length - 1] ?? `${cards.length} people`}. Scratch each card to see who.`),
    cards.map(c => c.node),
    fallback,
    details));
  scrollTo({ top: 0 });
  if (term) typeLines(term, ['> KRAMPUS.exe was defeated by: a carrot']);

  await document.fonts?.ready;
  let hidden = cards.length;
  const uncovers = cards.map(c => setupScratch(c.cover, c.area, () => {
    c.partnerLine.hidden = false;
    confetti();
    if (--hidden > 0) return;
    fallback.hidden = true;
    details.hidden = false;
  }));
  fallback.onclick = () => uncovers.forEach(uncover => uncover());
  setTimeout(() => { if (!details.hidden) return; fallback.hidden = false; }, 6000);
}

function scratchCard(name, partner) {
  const cover = el('canvas', { class: 'scratch-cover', 'aria-hidden': 'true' });
  const area = el('div', { class: 'scratch' }, el('p', { class: 'scratch-name' }, name), cover);
  const partnerLine = el('p', { class: 'co-shopper', hidden: true },
    partner && ['🤝 ', el('strong', {}, partner), ` is also shopping for ${name}. Compare notes so you don't buy the same thing.`]);
  return { node: el('div', {}, area, partnerLine), cover, area, partnerLine };
}

// Paints a silver cover over the name and lets fingers or the mouse rub it away.
// Returns a function that uncovers everything at once.
function setupScratch(canvas, area, onReveal) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = area.clientWidth;
  const h = area.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.scale(dpr, dpr);

  g.fillStyle = '#bdb6aa';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.4})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  g.fillStyle = '#5d574e';
  g.font = '600 22px Fredoka, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Scratch here ✨', w / 2, h / 2);

  g.globalCompositeOperation = 'destination-out';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 40;

  let down = false;
  let last = null;
  let moves = 0;
  let revealed = false;

  const point = e => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const scratch = (a, b) => {
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x + 0.01, b.y);
    g.stroke();
  };
  const uncover = () => {
    if (revealed) return;
    revealed = true;
    canvas.classList.add('gone');
    onReveal();
  };
  const check = () => {
    if (revealed) return;
    const pixels = g.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    let total = 0;
    for (let i = 3; i < pixels.length; i += 16) {
      total++;
      if (pixels[i] === 0) clear++;
    }
    if (clear / total > 0.5) uncover();
  };

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    down = true;
    canvas.setPointerCapture(e.pointerId);
    last = point(e);
    scratch(last, last);
  });
  canvas.addEventListener('pointermove', e => {
    if (!down) return;
    const p = point(e);
    scratch(last, p);
    last = p;
    if (++moves % 8 === 0) check();
  });
  for (const type of ['pointerup', 'pointercancel']) {
    canvas.addEventListener(type, () => { down = false; check(); });
  }
  return uncover;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
