// The page each person lands on from their link: a "security check" against bots, four
// silly levels, then the scratch-off reveal. With no link, it shows a small landing page.
import { el, pick, shuffle, loadJson, saveJson } from './util.js';
import { decode, fingerprint } from './link.js';
import { startSnow } from './effects.js';
import { screen, clicked, typeLines } from './ui.js';
import { reveal } from './reveal.js';
import { practiceLink } from './practice.js';
import * as checkbox from './trials/checkbox.js';
import * as reindeer from './trials/reindeer.js';
import * as voice from './trials/voice.js';
import * as loading from './trials/loading.js';

const app = document.getElementById('app');
const pipsEl = document.getElementById('pips');

startSnow(document.getElementById('snow'));
addEventListener('hashchange', () => location.reload());

const code = location.hash.slice(1);
const data = code && decode(code);
if (!code) landing();
else if (!data?.g || !Array.isArray(data.r) || !data.r.length) damaged();
else main(data, code);

async function main(data, code) {
  const others = shuffle(data.o ?? []);
  const ctx = {
    me: data.g,
    event: data.e || 'Secret Santa',
    joke: data.j || '',
    mercy: !!data.m,
    sweaterName: data.s || others[0] || null,
    suspect: data.v || data.s || others[0] || null,
    impostor: others[1] ?? others[0] ?? null,
  };
  document.title = `${ctx.event} · Security check`;

  const doneKey = `ss.done.${fingerprint(code)}`;
  if (loadJson(doneKey) && (await welcomeBack(ctx)) === 'reveal') {
    setPips(0);
    await reveal(app, data, ctx, { quick: true });
    return;
  }

  const levels = ctx.mercy ? [checkbox, reindeer] : [checkbox, reindeer, voice, loading];
  setPips(levels.length, 0, -1);
  await intro(ctx);
  for (let i = 0; i < levels.length; i++) {
    setPips(levels.length, i, i);
    await level(levels[i], i, levels.length, ctx);
    setPips(levels.length, i + 1, -1);
    await between(levels, i, ctx);
  }
  saveJson(doneKey, true);
  await reveal(app, data, ctx);
}

function setPips(total, done = 0, current = -1) {
  pipsEl.replaceChildren(...Array.from({ length: total }, (_, i) =>
    el('span', { class: i < done ? 'pip done' : i === current ? 'pip current' : 'pip' })));
}

function show(...children) {
  app.replaceChildren(screen(...children));
  scrollTo({ top: 0 });
}

async function intro(ctx) {
  let count = 4000 + Math.floor(Math.random() * 900);
  const counter = el('p', { class: 'metric-value' }, count.toLocaleString());
  const timer = setInterval(() => {
    count += 1 + Math.floor(Math.random() * 7);
    counter.textContent = count.toLocaleString();
  }, 700);
  const begin = el('button', { class: 'btn btn-primary' }, 'Begin verification');
  show(
    el('div', { class: 'alert-head' },
      el('span', { class: 'alert-icon', 'aria-hidden': 'true' }, '⚠️'),
      el('div', {}, el('p', { class: 'alert-label' }, 'Security alert'), el('h2', {}, 'Beware! Bots are attacking!'))),
    el('p', {}, `Hi, ${ctx.me}. Bots have been trying to break into the Secret Santa vault. In fact, multiple sightings of `,
      el('span', { class: 'krampus' }, 'KRAMPUS.exe'), ' have been reported!'),
    el('div', { class: 'metric' }, el('p', { class: 'metric-label' }, 'Bot attempts blocked today'), counter),
    ctx.impostor && el('p', { class: 'incident' },
      el('strong', {}, 'Latest incident: '), `KRAMPUS.exe tried to sign in as ${ctx.impostor}. Honestly, it was pretty convincing.`),
    el('p', {}, "Before we show you who you're shopping for (and since I thought this would be funny), we need you to confirm you're human. It only takes a moment.*"),
    el('div', { class: 'btn-row spread' }, el('small', { class: 'muted' }, '*It does not take a moment.'), begin));
  await clicked(begin);
  clearInterval(timer);
}

async function level(trial, i, total, ctx) {
  const stage = el('div', { class: 'stage' });
  show(el('p', { class: 'eyebrow' }, `Level ${i + 1} of ${total}`), el('h2', {}, trial.title), stage);
  await trial.run(stage, ctx);
}

const CHEERS = ['Nicely done. Mostly.', 'Impressive. For a human.', 'Security is mildly impressed.', 'That was almost graceful.'];

async function between(levels, i, ctx) {
  const next = levels[i + 1];
  const term = el('div', { class: 'terminal' });
  const teaser = el('p', { class: 'later' }, teaserFor(next, ctx));
  const button = el('button', { class: 'btn btn-primary' }, next ? `Continue to level ${i + 2}` : 'See who you got');
  show(
    el('div', { class: 'cleared' },
      el('div', { class: 'big-icon', 'aria-hidden': 'true' }, '✅'),
      el('h2', {}, `Level ${i + 1} cleared`),
      el('p', { class: 'muted' }, pick(CHEERS))),
    el('p', { class: 'eyebrow' }, 'Bot activity'),
    term,
    teaser,
    el('div', { class: 'btn-row' }, button));
  // Impatient people can skip the typing; everyone else gets the teaser once it finishes.
  const pressed = clicked(button);
  await Promise.race([typeLines(term, krampusAfter(levels[i].id, ctx)), pressed]);
  teaser.classList.add('shown');
  await pressed;
}

function krampusAfter(id, ctx) {
  const sweater = ctx.sweaterName || 'your uncle';
  switch (id) {
    case 'checkbox': return ['> KRAMPUS.exe has also cleared level 1', { text: '> method: paid the $4.99', bad: true }, `> see you at level 2, ${ctx.me}`];
    case 'reindeer': return ['> KRAMPUS.exe attempted level 2', { text: `> selected every square, including ${sweater}`, bad: true }, `> ${sweater} has been notified`];
    case 'voice': return ['> KRAMPUS.exe attempted level 3', { text: '> said: "I have been naughty this year"', bad: true }, '> honest, at least. access denied'];
    default: return ['> KRAMPUS.exe attempted final processing', { text: '> yelled at the reindeer', bad: true }, '> KRAMPUS.exe has been banned for life'];
  }
}

function teaserFor(next, ctx) {
  if (!next) {
    return ctx.mercy
      ? "Security waived. You've clearly suffered enough. Your assignments are ready."
      : 'Threat neutralized. Your assignments are ready.';
  }
  switch (next.id) {
    case 'reindeer': return 'Raising the security level. Next up: identifying reindeer. Bots are famously bad at reindeer.';
    case 'voice': return 'Next up: voice verification. Bots can fake a lot of things, but not sincerity.';
    default: return 'Last step: processing your results. Please remain calm and keep your hands where the reindeer can see them.';
  }
}

function welcomeBack(ctx) {
  return new Promise(resolve => {
    show(
      el('div', { class: 'big-icon', 'aria-hidden': 'true' }, '🕵️'),
      el('h2', { class: 'center' }, `Back already, ${ctx.me}?`),
      el('p', { class: 'center' }, "Forgot who you got, didn't you. It's fine. Security remembers you."),
      el('div', { class: 'btn-row center' },
        el('button', { class: 'btn', onclick: () => resolve('again') }, 'Run security again'),
        el('button', { class: 'btn btn-primary', onclick: () => resolve('reveal') }, 'Show me again')));
  });
}

function landing() {
  show(
    el('div', { class: 'big-icon', 'aria-hidden': 'true' }, '🎁'),
    el('h2', { class: 'center' }, 'Secret Santa Security'),
    el('p', {}, 'Got a link from your organizer? Open it straight from your text or email. This page needs the secret part at the end of the link.'),
    el('p', { class: 'muted' }, 'Running the exchange this year?'),
    el('div', { class: 'btn-row start' },
      el('a', { class: 'btn btn-primary', href: 'organize.html' }, 'Set up a Secret Santa'),
      el('a', { class: 'btn', href: practiceLink() }, 'Try a practice run')));
}

function damaged() {
  show(
    el('div', { class: 'big-icon', 'aria-hidden': 'true' }, '🦷'),
    el('h2', { class: 'center' }, 'This link looks chewed up'),
    el('p', {}, 'Part of it is missing, or KRAMPUS.exe got to it first. Ask your organizer to send it again, and make sure you copy the whole thing.'));
}
