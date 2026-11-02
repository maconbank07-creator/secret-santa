// The organizer page: add households and people, set rules, draw, and send out links.
// Everything stays in this browser's localStorage. Nothing is uploaded anywhere.
import { el, shuffle, download, loadJson, saveJson } from './util.js';
import { draw, shoppersFor } from './draw.js';
import { checkDraw } from './check.js';
import { encode, decode } from './link.js';
import { startSnow } from './effects.js';
import { practiceLink } from './practice.js';

const SETUP_KEY = 'ss.setup';
const DRAW_KEY = 'ss.draw';
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.protocol === 'file:';

const app = document.getElementById('app');
let state = loadJson(SETUP_KEY) ?? blankSetup();
let drawn = loadJson(DRAW_KEY);
let rulesEl;
let drawEl;
let checkEl;
let cameosEl;

startSnow(document.getElementById('snow'));
render();

function blankSetup() {
  return {
    event: `Family Secret Santa ${new Date().getFullYear()}`,
    date: '',
    note: '',
    sweater: '',
    suspect: '',
    households: [newHousehold('Household 1'), newHousehold('Household 2')],
    rules: { noHousehold: true, noSwaps: true, blocked: [], lastYear: [], sealed: null },
  };
}
function newHousehold(name) { return { id: makeId(), name, people: [newPerson(), newPerson()] }; }
function newPerson() { return { id: makeId(), name: '', joke: '', mercy: false }; }
function makeId() { return Math.random().toString(36).slice(2, 10); }

function changed() {
  saveJson(SETUP_KEY, state);
  const stale = document.getElementById('stale');
  if (stale && drawn) stale.hidden = drawn.signature === signature();
  refreshCheck();
}

function everyone() { return state.households.flatMap(h => h.people.map(p => ({ ...p, household: h.id }))); }
function named() { return everyone().filter(p => p.name.trim()); }
function nameOf(id) { return everyone().find(p => p.id === id)?.name.trim() || 'Someone removed'; }

// Anything that would change what the links say. Used to warn about edits after a draw.
function signature() {
  return JSON.stringify({
    e: state.event, d: state.date, n: state.note, s: state.sweater ?? '', v: state.suspect ?? '', r: state.rules,
    p: named().map(p => [p.id, p.name.trim(), p.household, p.joke.trim(), p.mercy]),
  });
}

// ---------- Rendering ----------

function render() {
  rulesEl = rulesSection();
  drawEl = drawSection();
  app.replaceChildren(introCard(), eventSection(), peopleSection(), rulesEl, drawEl, footer());
}
function refreshRules() { const next = rulesSection(); rulesEl.replaceWith(next); rulesEl = next; }
function refreshDraw() { const next = drawSection(); drawEl.replaceWith(next); drawEl = next; }

function card(title, ...children) {
  return el('section', { class: 'card' }, el('h2', {}, title), ...children);
}
function field(label, control) {
  return el('label', { class: 'field' }, el('span', {}, label), control);
}
function textInput(value, onInput, props = {}) {
  return el('input', { type: 'text', value, ...props, oninput: e => { onInput(e.target.value); changed(); } });
}
function checkbox(label, checked, onChange, className = 'check') {
  return el('label', { class: className },
    el('input', { type: 'checkbox', checked, onchange: e => { onChange(e.target.checked); changed(); } }),
    el('span', {}, label));
}

function introCard() {
  return card('Set up your Secret Santa',
    el('ol', { class: 'steps' },
      el('li', {}, 'Add everyone, grouped by household.'),
      el('li', {}, 'Set any rules.'),
      el('li', {}, 'Draw names. Everyone shops for two people, so everyone gets two gifts.'),
      el('li', {}, 'Send each person their own secret link.')),
    el('p', { class: 'hint' }, "Nobody sees who got who, including you. Everything you type stays in this browser; nothing is uploaded."),
    el('p', { class: 'hint' }, 'Want to see what everyone goes through first? ',
      practice('Practice run', false), ' · ', practice('Easy mode practice', true),
      ' (opens in a new tab; everyone in it is made up except your picks for the jokes)'));
}
function practice(label, easy) {
  return el('a', {
    href: practiceLink({ easy }), target: '_blank', rel: 'noopener',
    // Rebuilt on click so it picks up the current reindeer sweater choice.
    onclick: e => { e.currentTarget.href = practiceLink({ easy, sweater: cameoName('sweater'), suspect: cameoName('suspect') }); },
  }, label);
}

function eventSection() {
  cameosEl = cameoFields();
  return card('Your exchange',
    field('Name', textInput(state.event, v => { state.event = v; }, { placeholder: 'Family Secret Santa' })),
    field('Exchange date', textInput(state.date, v => { state.date = v; }, { type: 'date' })),
    field('Note for everyone (optional)',
      el('textarea', { placeholder: "Bring wrapped gifts to Grandma's by 2pm.", oninput: e => { state.note = e.target.value; changed(); } }, state.note)),
    cameosEl);
}

// Real names that show up in the jokes. They list people, so they're rebuilt when names change.
function cameoFields() {
  const pick = (key, label, unset, hint) => el('div', {},
    field(label,
      el('select', { onchange: e => { state[key] = e.target.value; changed(); } },
        el('option', { value: '' }, unset),
        named().map(p => el('option', { value: p.id, selected: p.id === state[key] }, p.name.trim())))),
    el('p', { class: 'hint' }, hint));
  return el('div', {},
    pick('sweater', 'Reindeer sweater star', 'Someone different for each person',
      'Everyone sees this person in a reindeer sweater during the image check.'),
    pick('suspect', 'Blocked microphone suspect', 'Same as the reindeer sweater star',
      'If someone\'s microphone is blocked, the voice check says "That\'s exactly what a bot would do. Or [this person]."'));
}
function refreshCameos() { const next = cameoFields(); cameosEl.replaceWith(next); cameosEl = next; }
function cameoName(key) { return named().find(p => p.id === state[key])?.name.trim(); }

function peopleSection() {
  return card("Who's in",
    el('p', { class: 'hint' },
      "Put spouses in the same household, along with anyone else living there who shouldn't draw them, like a grown kid at home."),
    el('p', { class: 'hint' },
      el('strong', {}, 'Inside joke'), ' is optional. It finishes the sentence "It\'s the person who…" during their voice check. ',
      el('strong', {}, 'Easy mode'), ' gives a shorter run, good for grandparents and little kids.'),
    state.households.map(householdBlock),
    el('button', {
      type: 'button', class: 'btn',
      onclick: () => {
        const h = newHousehold(`Household ${state.households.length + 1}`);
        state.households.push(h);
        changed();
        render();
        focusPerson(h.people[0].id);
      },
    }, '+ Add household'));
}

function householdBlock(h) {
  return el('div', { class: 'household' },
    el('div', { class: 'household-head' },
      textInput(h.name, v => { h.name = v; }, { 'aria-label': 'Household name', placeholder: 'Household name' }),
      el('button', {
        type: 'button', class: 'btn-icon', 'aria-label': `Remove ${h.name || 'household'}`, title: 'Remove household',
        onclick: () => {
          if (h.people.some(p => p.name.trim()) && !confirm(`Remove ${h.name || 'this household'} and everyone in it?`)) return;
          state.households = state.households.filter(x => x !== h);
          cleanRules();
          changed();
          render();
        },
      }, '✕')),
    h.people.map(p => personRow(h, p)),
    el('button', {
      type: 'button', class: 'btn btn-small',
      onclick: () => {
        const p = newPerson();
        h.people.push(p);
        changed();
        render();
        focusPerson(p.id);
      },
    }, '+ Add person'));
}

function personRow(h, p) {
  return el('div', { class: 'person' },
    textInput(p.name, v => { p.name = v; }, { placeholder: 'Name', 'aria-label': 'Name', 'data-person': p.id, onchange: () => { refreshRules(); refreshCameos(); } }),
    textInput(p.joke, v => { p.joke = v; }, { class: 'person-joke', placeholder: 'Inside joke: burned the rolls in 2019', 'aria-label': `Inside joke for ${p.name || 'this person'}` }),
    checkbox('Easy mode', p.mercy, v => { p.mercy = v; }, 'check small'),
    el('button', {
      type: 'button', class: 'btn-icon', 'aria-label': `Remove ${p.name || 'person'}`, title: 'Remove person',
      onclick: () => {
        h.people = h.people.filter(x => x !== p);
        cleanRules();
        changed();
        render();
      },
    }, '✕'));
}

function focusPerson(id) {
  document.querySelector(`[data-person="${id}"]`)?.focus();
}

function rulesSection() {
  const r = state.rules;
  const people = named();
  const removable = (text, onRemove) => el('li', {}, el('span', {}, text),
    el('button', { type: 'button', class: 'btn-icon', 'aria-label': `Remove rule: ${text}`, onclick: () => { onRemove(); changed(); refreshRules(); } }, '✕'));

  return card('Rules',
    checkbox('No one draws someone from their own household', r.noHousehold, v => { r.noHousehold = v; }),
    el('br'),
    checkbox("No swaps: if Pat shops for Sam, Sam doesn't shop for Pat", r.noSwaps, v => { r.noSwaps = v; }),
    el('p', { class: 'hint' }, 'When possible, the draw also makes sure that:'),
    el('ul', { class: 'hint' },
      el('li', {}, "two people from the same household aren't shopping for the same person"),
      el('li', {}, 'nobody gets both people from one household'),
      el('li', {}, 'everyone teams up with two different co-shoppers, one for each of their people')),

    el('h3', {}, "Can't draw"),
    el('p', { class: 'hint' }, 'Anything else, like a couple living in different households.'),
    el('ul', { class: 'rule-list' }, r.blocked.map(b => removable(
      `${nameOf(b.giver)} can't draw ${nameOf(b.receiver)}${b.both ? ', and the other way around' : ''}`,
      () => { r.blocked = r.blocked.filter(x => x !== b); }))),
    pairAdder(people, "can't draw", true, (giver, receiver, both) => r.blocked.push({ giver, receiver, both })),

    el('h3', {}, 'Last year'),
    el('p', { class: 'hint' }, "Nobody gets someone they had last year. Load last year's sealed file, or add pairs by hand."),
    sealedControls(),
    el('ul', { class: 'rule-list' }, r.lastYear.map(x => removable(
      `${nameOf(x.giver)} had ${nameOf(x.receiver)}`,
      () => { r.lastYear = r.lastYear.filter(y => y !== x); }))),
    pairAdder(people, 'had', false, (giver, receiver) => r.lastYear.push({ giver, receiver })));
}

function pairAdder(people, verb, withBoth, onAdd) {
  if (people.length < 2) return el('p', { class: 'hint' }, 'Add names above first.');
  const options = () => [el('option', { value: '' }, 'Choose…'), people.map(p => el('option', { value: p.id }, p.name.trim()))];
  const a = el('select', { 'aria-label': 'Person' }, options());
  const b = el('select', { 'aria-label': 'Other person' }, options());
  const both = withBoth && el('input', { type: 'checkbox', checked: true });
  const error = el('span', { class: 'field-error', role: 'alert' });
  for (const s of [a, b]) s.addEventListener('change', () => { error.textContent = ''; });
  const add = el('button', {
    type: 'button', class: 'btn btn-small',
    onclick: () => {
      if (!a.value || !b.value) { error.textContent = 'Pick two people first.'; return; }
      if (a.value === b.value) { error.textContent = 'Pick two different people.'; return; }
      onAdd(a.value, b.value, both ? both.checked : false);
      changed();
      refreshRules();
    },
  }, 'Add');
  return el('div', { class: 'pair-adder' },
    a, el('span', { class: 'verb' }, verb), b,
    both && el('label', { class: 'check small' }, both, el('span', {}, 'Both ways')),
    add, error);
}

function sealedControls() {
  const sealed = state.rules.sealed;
  if (sealed) {
    return el('div', { class: 'sealed' },
      el('span', {}, `🔒 ${sealed.count} pairings loaded from ${sealed.event || 'last year'}. They stay secret.`),
      el('button', { type: 'button', class: 'btn btn-small', onclick: () => { state.rules.sealed = null; changed(); refreshRules(); } }, 'Remove'));
  }
  const error = el('span', { class: 'field-error', role: 'alert' });
  const input = el('input', {
    type: 'file', accept: '.json,application/json', class: 'sr-only',
    onchange: async e => {
      const file = e.target.files[0];
      if (!file) return;
      const parsed = parseSealed(await file.text());
      if (!parsed) { error.textContent = "That file doesn't look like a sealed Secret Santa file."; return; }
      state.rules.sealed = parsed;
      changed();
      refreshRules();
    },
  });
  return el('div', { class: 'sealed' }, el('label', { class: 'btn btn-small' }, input, "Load last year's sealed file"), error);
}

// Keeps the scrambled data as-is, so last year's pairs never sit readable in storage.
function parseSealed(text) {
  try {
    const file = JSON.parse(text);
    if (file.kind !== 'secret-santa-sealed') return null;
    const pairs = decode(file.data)?.pairs;
    if (!Array.isArray(pairs)) return null;
    return { event: file.event, count: pairs.length, data: file.data };
  } catch {
    return null;
  }
}

function cleanRules() {
  const ids = new Set(everyone().map(p => p.id));
  const r = state.rules;
  r.blocked = r.blocked.filter(x => ids.has(x.giver) && ids.has(x.receiver));
  r.lastYear = r.lastYear.filter(x => ids.has(x.giver) && ids.has(x.receiver));
  if (!ids.has(state.sweater)) state.sweater = '';
  if (!ids.has(state.suspect)) state.suspect = '';
}

// ---------- Drawing and sending ----------

function drawSection() {
  const errorBox = el('div', { class: 'error', role: 'alert', hidden: true });
  if (!drawn) {
    return card('Draw names',
      el('p', {}, "Names stay secret, even from you. You'll get one link per person to send them. Each link shows that person's two people, and who else is shopping for each one so they can compare notes."),
      errorBox,
      el('div', { class: 'btn-row start' },
        el('button', { type: 'button', class: 'btn btn-primary', onclick: () => doDraw(errorBox) }, '🎲 Draw names')));
  }
  const when = new Date(drawn.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return card('Send the links',
    el('p', {}, `Drawn ${when} for ${drawn.links.length} people. Send each person only their own link.`),
    isLocal && el('div', { class: 'notice' },
      "Heads up: you're running this on your own computer, so these links only open here. Draw again from the hosted site before sending real links."),
    el('div', { class: 'notice', id: 'stale', hidden: drawn.signature === signature() },
      "You've changed things since the draw. Redraw to use the changes. Links you already sent will keep showing the old assignment."),
    checkEl = rulesCheck(),
    el('ul', { class: 'link-list' }, drawn.links.map(linkRow)),
    errorBox,
    el('div', { class: 'btn-row start' },
      el('button', { type: 'button', class: 'btn btn-small', onclick: downloadLinks }, 'Download all links'),
      el('button', { type: 'button', class: 'btn btn-small', onclick: downloadSealed }, 'Save sealed copy for next year'),
      el('button', {
        type: 'button', class: 'btn btn-small',
        onclick: () => {
          if (confirm("Redraw? Everyone gets a new assignment and a new link. Links you've already sent still open, but show the old assignment.")) doDraw(errorBox);
        },
      }, 'Redraw')));
}

// Re-checks the finished links against the setup. Shows only pass or fail, never who got whom.
function rulesCheck() {
  const people = drawPeople();
  const results = checkDraw(people, drawRules(people), drawn.links.map(l => decode(l.code)));
  const broken = results.some(r => !r.ok && !r.soft);
  const missed = results.some(r => !r.ok && r.soft);
  return el('div', { class: 'rules-check' },
    el('h3', {}, broken ? '❌ Rules check failed' : '✅ Rules check passed'),
    el('p', { class: 'hint' }, 'Checked from the links themselves, which is exactly what everyone will open. It never shows who got whom.'),
    el('ul', {}, results.map(r => el('li', { class: r.ok ? null : r.soft ? 'soft' : 'bad' },
      el('span', { 'aria-hidden': 'true' }, r.ok ? '✅' : r.soft ? '⚠️' : '❌'),
      el('span', { class: 'sr-only' }, r.ok ? 'Passed: ' : r.soft ? 'Not met: ' : 'Failed: '),
      r.label))),
    broken && el('div', { class: 'error', role: 'alert' }, "Something didn't check out. Redraw before sending any links."),
    !broken && missed && el('p', { class: 'hint' }, "The ⚠️ ones couldn't be met with this group. These links are fine to send."));
}
function refreshCheck() {
  if (!drawn || !checkEl?.isConnected) return;
  const next = rulesCheck();
  checkEl.replaceWith(next);
  checkEl = next;
}

// Everyone as they go into the draw, and into the check afterward.
function drawPeople() {
  return named().map(p => ({ ...p, name: p.name.trim(), joke: p.joke.trim() }));
}
function drawRules(people) {
  return { noHousehold: state.rules.noHousehold, noSwaps: state.rules.noSwaps, blocked: blockedPairs(people) };
}

function doDraw(errorBox) {
  const fail = text => { errorBox.textContent = text; errorBox.hidden = false; };
  errorBox.hidden = true;

  const people = drawPeople();
  if (people.length < 3) return fail('Add at least three people. Everyone shops for two others.');
  if (state.rules.noSwaps && people.length < 5) {
    return fail('With fewer than five people, someone is always shopping for a person who is shopping for them. Add people, or turn off No swaps.');
  }
  const seen = new Set();
  for (const p of people) {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return fail(`Two people are named ${p.name}. Add a last initial so the links can tell them apart.`);
    seen.add(key);
  }

  const result = draw(people, drawRules(people));
  if (!result.ok) return fail(explain(result, people));

  const byId = new Map(people.map(p => [p.id, p]));
  const shoppers = shoppersFor(result.pairs);
  const event = state.event.trim() || 'Secret Santa';
  const links = people.map(p => {
    const receivers = result.pairs[p.id].map(id => byId.get(id));
    // Each of their people, plus whoever else is shopping for that person.
    const picks = receivers.map(r => [r.name, byId.get(shoppers[r.id].find(id => id !== p.id)).name]);
    // A few other names for the jokes (KRAMPUS.exe impersonations, the reindeer sweater).
    const others = shuffle(people.filter(x => x !== p && !receivers.includes(x))).slice(0, 4).map(x => x.name);
    return {
      id: p.id,
      name: p.name,
      code: encode(compact({ e: event, g: p.name, r: picks, d: state.date, n: state.note.trim(), o: others, s: cameoName('sweater'), v: cameoName('suspect'), j: p.joke, m: p.mercy ? 1 : 0 })),
    };
  });
  drawn = {
    at: Date.now(),
    event,
    signature: signature(),
    links,
    sealed: encode({ pairs: people.flatMap(p => result.pairs[p.id].map(id => [p.name, byId.get(id).name])) }),
  };
  saveJson(DRAW_KEY, drawn);
  refreshDraw();
  drawEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function blockedPairs(people) {
  const r = state.rules;
  const pairs = [];
  for (const b of r.blocked) {
    pairs.push([b.giver, b.receiver]);
    if (b.both) pairs.push([b.receiver, b.giver]);
  }
  for (const x of r.lastYear) pairs.push([x.giver, x.receiver]);
  if (r.sealed) {
    const idByName = new Map(people.map(p => [p.name.toLowerCase(), p.id]));
    for (const [giver, receiver] of decode(r.sealed.data)?.pairs ?? []) {
      const g = idByName.get(String(giver).trim().toLowerCase());
      const rec = idByName.get(String(receiver).trim().toLowerCase());
      if (g && rec) pairs.push([g, rec]);
    }
  }
  return pairs;
}

function explain(result, people) {
  const name = people.find(p => p.id === result.person)?.name;
  switch (result.reason) {
    case 'no-options': return `With these rules, ${name} doesn't have two people they're allowed to draw. Loosen a rule for them.`;
    case 'nobody-can-give': return `With these rules, fewer than two people are allowed to draw ${name}. Loosen a rule for them.`;
    case 'impossible': return "These rules can't all work at once. Usually it's one big household with only a few people outside it. Try turning off a rule.";
    default: return "Couldn't find a draw that fits every rule. Try loosening one.";
  }
}

// Drops empty fields so the links stay short.
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== 0 && v != null && !(Array.isArray(v) && v.length === 0)));
}

function linkUrl(code) { return `${new URL('./', location.href).href}#${code}`; }

function inviteText(name, url) {
  return `🎅 ${drawn.event}\n\nHi ${name}! Here's your top-secret Secret Santa link. Don't share it, and don't let anyone see your screen.\n\nThis year you're shopping for two people.\n\nFair warning: security is tight this year.\n\n${url}`;
}

function linkRow(link) {
  const url = linkUrl(link.code);
  const message = inviteText(link.name, url);
  return el('li', { class: 'link-row' },
    el('span', { class: 'name' }, link.name),
    copyButton('Copy link', url),
    copyButton('Copy message', message),
    navigator.share && el('button', { type: 'button', class: 'btn btn-small', onclick: () => navigator.share({ text: message }).catch(() => {}) }, 'Share'));
}

function copyButton(label, text) {
  const button = el('button', {
    type: 'button', class: 'btn btn-small',
    onclick: async () => {
      await copy(text);
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = label; }, 1500);
    },
  }, label);
  return button;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = el('textarea', { style: { position: 'fixed', opacity: '0' } }, text);
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

function downloadLinks() {
  const text = drawn.links.map(l => inviteText(l.name, linkUrl(l.code))).join('\n\n- - - - - - - - - -\n\n');
  download('secret-santa-links.txt', text);
}

function downloadSealed() {
  const year = new Date(drawn.at).getFullYear();
  const file = { kind: 'secret-santa-sealed', version: 1, event: drawn.event, drawnAt: new Date(drawn.at).toISOString(), data: drawn.sealed };
  download(`secret-santa-${year}-sealed.json`, JSON.stringify(file, null, 2), 'application/json');
}

function footer() {
  return el('div', { class: 'footer-actions' },
    el('button', {
      type: 'button', class: 'link-btn',
      onclick: () => {
        if (!confirm('Clear everything, including the current draw? Links already sent will still open.')) return;
        state = blankSetup();
        drawn = null;
        saveJson(SETUP_KEY, null);
        saveJson(DRAW_KEY, null);
        render();
      },
    }, 'Clear everything and start over'));
}
