// Level 4, "final processing": a progress bar pulled by one (1) reindeer who stops until
// you feed him, and whose last 1% keeps zooming into brand new progress bars.
import { el } from '../util.js';
import { continueButton } from '../ui.js';

export const id = 'loading';
export const title = 'Final processing';

const STEPS = [
  { p: 8, text: 'Warming up the elves…', eta: 'About 10 seconds', hold: 600 },
  { p: 17, text: 'Checking the naughty list…', eta: 'About 9 seconds', hold: 600 },
  { p: 24, text: 'Checking it twice…', eta: 'About 9 seconds', hold: 600 },
  { p: 33, text: 'Counting cookies you ate last December…', eta: 'About 3 hours', hold: 1000 },
  { p: 42, stall: true },
  { p: 58, text: 'Untangling the lights…', eta: 'About 5 seconds', hold: 700 },
  { p: 71, text: 'Consulting Grandma…', eta: 'Grandma says no rush', hold: 900 },
  { p: 82, text: 'Scanning for regifts…', eta: 'About 3 seconds', hold: 700 },
  { p: 90, text: "Pretending we didn't see that…", eta: 'About 2 seconds', hold: 800 },
  { p: 99, text: 'Almost there…', eta: 'Less than a second', hold: 900 },
  { p: 99, text: 'Still almost there…', eta: 'Less than a second (still)', hold: 1000 },
  { zoom: 1, label: 'The last 1%, zoomed in 100×', text: 'Zooming in on the last 1%…' },
  { p: 45, text: 'Loading the last 1%…', eta: 'About 2 seconds', hold: 600 },
  { p: 99, text: 'Almost there… again', eta: 'Less than a second', hold: 900 },
  { zoom: 2, label: 'The last 1% of the last 1%, zoomed in 10,000×', text: 'Zooming in further…' },
  { p: 50, text: 'Loading the last 1% of the last 1%…', eta: 'Mathematically, forever', hold: 800 },
  { p: 99, text: 'This could genuinely go on forever.', eta: 'Forever', hold: 1000 },
  { done: true, text: "We rounded up. You're eligible." },
];
const HURRY_NOTES = ['Hurry request noted. Adding 2 seconds.', 'The elves have unionized. Adding 2 more.', 'Hurry button confiscated.'];

export function run(stage) {
  const status = el('p', { class: 'load-status', 'aria-live': 'polite' }, 'Starting…');
  const zoomLabel = el('span', {}, 'Overall progress');
  const rider = el('span', { class: 'rider moving', 'aria-hidden': 'true' }, el('span', { class: 'rider-face' }, '🦌'));
  const fill = el('div', { class: 'bar-fill' });
  const pct = el('span', { class: 'load-pct' }, '0%');
  const eta = el('span', { class: 'load-eta' });
  const carrot = el('button', { type: 'button', class: 'btn btn-primary' }, '🥕 Give carrot');
  const yell = el('button', { type: 'button', class: 'btn' }, 'Yell at him');
  const stallRow = el('div', { class: 'btn-row center', hidden: true }, carrot, yell);
  const hurry = el('button', { type: 'button', class: 'btn btn-small' }, 'Hurry up');
  stage.append(
    status,
    el('p', { class: 'zoom-label' }, zoomLabel),
    el('div', { class: 'bar-wrap' }, rider, el('div', { class: 'bar-track' }, fill)),
    el('div', { class: 'load-meta' }, pct, eta),
    stallRow,
    el('div', { class: 'btn-row center' }, hurry));

  let timer = 0;
  let idx = 0;
  let current = 0;
  let zoom = 0;
  let hurries = 0;
  let yells = 0;

  const format = p => zoom === 0 ? `${Math.round(p)}%`
    : zoom === 1 ? `${(99 + p / 100).toFixed(2)}%`
    : `${(99.99 + p / 10000).toFixed(4)}%`;

  function setBar(p) {
    current = p;
    fill.style.width = `${p}%`;
    rider.style.left = `calc(${p}% - 14px)`;
    pct.textContent = format(p);
  }
  function snapTo(p) {
    fill.classList.add('snap');
    rider.classList.add('snap');
    setBar(p);
    void fill.offsetWidth;
    fill.classList.remove('snap');
    rider.classList.remove('snap');
  }
  return new Promise(resolve => {
    function step(i) {
      idx = i;
      const s = STEPS[i];

      if (s.zoom) {
        zoom = s.zoom;
        zoomLabel.textContent = `🔍 ${s.label}`;
        status.textContent = s.text;
        eta.textContent = '';
        snapTo(0);
        timer = setTimeout(() => step(i + 1), 700);
        return;
      }
      if (s.stall) {
        setBar(s.p);
        rider.classList.remove('moving');
        yells = 0;
        status.textContent = 'Progress is pulled by one (1) reindeer. He has stopped.';
        eta.textContent = 'ETA: unknown (reindeer)';
        hurry.hidden = true;
        stallRow.hidden = false;
        carrot.focus();
        return;
      }
      if (s.done) {
        zoom = 0;
        fill.style.width = '100%';
        rider.style.left = 'calc(100% - 14px)';
        pct.textContent = '100%';
        fill.classList.add('done');
        rider.classList.remove('moving');
        zoomLabel.textContent = 'Overall progress';
        status.textContent = s.text;
        eta.textContent = 'The reindeer would like a tip.';
        hurry.hidden = true;
        continueButton(stage).then(resolve);
        return;
      }
      setBar(s.p);
      status.textContent = s.text;
      eta.textContent = `ETA: ${s.eta}`;
      timer = setTimeout(() => step(i + 1), s.hold);
    }

    yell.onclick = () => {
      yells++;
      setBar(Math.max(20, current - 5));
      status.textContent = yells >= 2 ? "Yelling isn't working. Have you tried a carrot?" : "He's offended. Progress −5%. Still not moving.";
    };
    carrot.onclick = () => {
      stallRow.hidden = true;
      rider.classList.add('moving');
      status.textContent = "He's back. He'd like you to know this is a favor.";
      timer = setTimeout(() => {
        if (hurries < 3) hurry.hidden = false;
        step(idx + 1);
      }, 1300);
    };
    hurry.onclick = () => {
      hurries++;
      clearTimeout(timer);
      setBar(Math.max(0, current - 4));
      status.textContent = HURRY_NOTES[Math.min(hurries - 1, HURRY_NOTES.length - 1)];
      if (hurries >= 3) hurry.hidden = true;
      timer = setTimeout(() => step(idx), 2000);
    };

    timer = setTimeout(() => step(0), 400);
  });
}
