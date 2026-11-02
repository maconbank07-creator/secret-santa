import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draw } from '../js/draw.js';
import { checkDraw } from '../js/check.js';

// Three couples, a couple with a grown daughter at home, and one single, like the real group.
const HOUSEHOLDS = [['Ann', 'Ben'], ['Cal', 'Dee'], ['Eve', 'Fay'], ['Gus', 'Hal', 'Ivy'], ['Jo']];
const people = HOUSEHOLDS.flatMap((names, h) => names.map(name => ({ id: name, name, household: `h${h}`, joke: '', mercy: false })));
people[0].joke = 'still has the bread maker';
people[9].mercy = true;
const rules = { noHousehold: true, noSwaps: true, blocked: [['Ann', 'Jo']] };

// Builds what each link carries, the same way the organizer does.
function payloadsFor(pairs) {
  const shoppers = {};
  for (const [g, rs] of Object.entries(pairs)) for (const r of rs) (shoppers[r] ??= []).push(g);
  return people.map(p => ({
    g: p.name,
    r: pairs[p.id].map(r => [r, shoppers[r].find(g => g !== p.id)]),
    ...(p.joke && { j: p.joke }),
    ...(p.mercy && { m: 1 }),
  }));
}

function failed(results) {
  return results.filter(r => !r.ok).map(r => r.label);
}

// Seeded so the tampering tests below always start from the same draw.
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
const good = draw(people, rules, seeded(7));

test('a real draw passes every check', () => {
  for (let run = 0; run < 100; run++) {
    const result = draw(people, rules);
    assert.deepEqual(failed(checkDraw(people, rules, payloadsFor(result.pairs))), []);
  }
});

test('lists every rule it checked', () => {
  const labels = checkDraw(people, rules, payloadsFor(good.pairs)).map(r => r.label);
  assert.equal(labels.length, 12);
  assert.ok(labels.includes('No swaps'));
  assert.ok(labels.includes("Can't-draw and last-year pairs were respected"));
});

// Copies the good draw's links so each test can break one thing.
function tampered(change) {
  const payloads = structuredClone(payloadsFor(good.pairs));
  change(payloads);
  return failed(checkDraw(people, rules, payloads));
}
const linkOf = (payloads, name) => payloads.find(d => d.g === name);

test('a missing or unreadable link is caught', () => {
  assert.deepEqual(tampered(p => p.pop()), ['There is one working link per person']);
  assert.deepEqual(tampered(p => { p[3] = null; }), ['There is one working link per person']);
});

test('someone with only one person, or the same person twice, is caught', () => {
  assert.deepEqual(tampered(p => p[0].r.pop()), ['Everyone is shopping for 2 different people']);
  assert.deepEqual(tampered(p => { p[0].r[1] = p[0].r[0]; }), ['Everyone is shopping for 2 different people']);
});

test('someone getting three gifts is caught', () => {
  // Ann's second person becomes whoever Ann's first person's other shopper isn't covering.
  const result = tampered(p => {
    const taken = new Set(p[0].r.map(([n]) => n));
    const extra = people.find(x => x.name !== 'Ann' && !taken.has(x.name)).name;
    p[0].r[1] = [extra, 'Ben'];
  });
  assert.deepEqual(result, ['Everyone is getting 2 gifts']);
});

test('drawing yourself, your household, a swap or a blocked pair is caught', () => {
  // Swap two receivers between givers so the counts still balance, then look for the rule.
  const swapInto = (payloads, giver, wanted) => {
    const mine = linkOf(payloads, giver);
    const holder = payloads.find(d => d.g !== giver && d.r.some(([n]) => n === wanted) && !d.r.some(([n]) => n === mine.r[0][0]));
    const slot = holder.r.findIndex(([n]) => n === wanted);
    [mine.r[0][0], holder.r[slot][0]] = [wanted, mine.r[0][0]];
  };
  assert.ok(tampered(p => swapInto(p, 'Ann', 'Ann')).includes('Nobody drew themselves'));
  assert.ok(tampered(p => swapInto(p, 'Ann', 'Ben')).includes('Nobody drew someone from their own household'));
  assert.ok(tampered(p => swapInto(p, 'Ann', 'Jo')).includes("Can't-draw and last-year pairs were respected"));
  // Ann starts shopping for someone who is already shopping for her.
  const annsShopper = payloadsFor(good.pairs).find(d => d.r.some(([n]) => n === 'Ann')).g;
  assert.ok(tampered(p => swapInto(p, 'Ann', annsShopper)).includes('No swaps'));
});

test('a wrong co-shopper name is caught', () => {
  assert.deepEqual(tampered(p => { p[0].r[0][1] = p[0].r[0][1] === 'Jo' ? 'Ivy' : 'Jo'; }).filter(l => !l.startsWith('When possible')),
    ['Every co-shopper name is right']);
});

test('the wrong inside joke or Easy mode on a link is caught', () => {
  assert.deepEqual(tampered(p => { delete p[0].j; }), ['Each link has the right name, inside joke and Easy mode']);
  assert.deepEqual(tampered(p => { delete p[9].m; }), ['Each link has the right name, inside joke and Easy mode']);
});

test('"when possible" misses are reported as soft, not as failures', () => {
  // Two couples: everyone can only shop for the other couple, so the nice-to-haves can't happen.
  const four = [['Ann', 'Ben'], ['Cal', 'Dee']].flatMap((names, h) => names.map(name => ({ id: name, name, household: `h${h}`, joke: '', mercy: false })));
  const result = draw(four, { noHousehold: true });
  const shoppers = {};
  for (const [g, rs] of Object.entries(result.pairs)) for (const r of rs) (shoppers[r] ??= []).push(g);
  const payloads = four.map(p => ({ g: p.name, r: result.pairs[p.id].map(r => [r, shoppers[r].find(g => g !== p.id)]) }));
  const results = checkDraw(four, { noHousehold: true }, payloads);
  assert.ok(results.some(r => !r.ok && r.soft));
  assert.ok(results.filter(r => !r.soft).every(r => r.ok));
});
