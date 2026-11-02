import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draw, shoppersFor } from '../js/draw.js';

// Seeded generator so a failing run can be reproduced.
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

// family([3, 2]) → household 0 with 3 people, household 1 with 2.
function family(sizes) {
  return sizes.flatMap((size, h) =>
    Array.from({ length: size }, (_, i) => ({ id: `h${h}p${i}`, household: `h${h}` })));
}

function assertFollowsRules(people, pairs, rules) {
  const household = Object.fromEntries(people.map(p => [p.id, p.household]));
  assert.equal(Object.keys(pairs).length, people.length, 'everyone gives');
  const shoppers = shoppersFor(pairs);
  for (const p of people) assert.equal(shoppers[p.id]?.length, 2, 'everyone gets two gifts');
  for (const [giver, receivers] of Object.entries(pairs)) {
    assert.equal(receivers.length, 2, 'everyone shops for two');
    assert.notEqual(receivers[0], receivers[1], 'two different people');
    for (const receiver of receivers) {
      assert.notEqual(giver, receiver, 'nobody draws themselves');
      if (rules.noHousehold) assert.notEqual(household[giver], household[receiver], 'household rule');
      if (rules.noSwaps) assert.ok(!pairs[receiver].includes(giver), 'swap rule');
      for (const [bg, br] of rules.blocked ?? []) assert.ok(!(giver === bg && receiver === br), 'blocked pair');
    }
  }
}

test('everyone shops for two and gets two, and nobody draws themselves', () => {
  const random = seeded(1);
  for (let run = 0; run < 300; run++) {
    const people = family([1 + Math.floor(random() * 4), 1 + Math.floor(random() * 4), 2 + Math.floor(random() * 3)]);
    const result = draw(people, {}, random);
    assert.ok(result.ok);
    assertFollowsRules(people, result.pairs, {});
  }
});

test('household, swap and blocked rules all hold together', () => {
  const random = seeded(2);
  const people = family([3, 3, 2, 4]);
  const rules = { noHousehold: true, noSwaps: true, blocked: [['h0p0', 'h1p0'], ['h2p1', 'h3p3'], ['h3p0', 'h0p2']] };
  for (let run = 0; run < 300; run++) {
    const result = draw(people, rules, random);
    assert.ok(result.ok);
    assertFollowsRules(people, result.pairs, rules);
  }
});

test('a ten-person family meets every "when possible" rule too', () => {
  // Three couples, a couple with a grown daughter at home, and one single.
  const random = seeded(3);
  const people = family([2, 2, 2, 3, 1]);
  const household = Object.fromEntries(people.map(p => [p.id, p.household]));
  const rules = { noHousehold: true, noSwaps: true };
  for (let run = 0; run < 200; run++) {
    const result = draw(people, rules, random);
    assert.ok(result.ok);
    assertFollowsRules(people, result.pairs, rules);
    assert.equal(result.misses, 0);

    const shoppers = shoppersFor(result.pairs);
    for (const [a, b] of Object.values(shoppers)) assert.notEqual(household[a], household[b], 'one household shares a person');
    for (const [giver, [a, b]] of Object.entries(result.pairs)) {
      assert.notEqual(household[a], household[b], 'both people from one household');
      const partner = r => shoppers[r].find(id => id !== giver);
      assert.notEqual(partner(a), partner(b), 'same co-shopper twice');
    }
  }
});

test('when the nice-to-haves are impossible it still draws, and says so', () => {
  // Two couples: each person can only shop for the other couple.
  const result = draw(family([2, 2]), { noHousehold: true });
  assert.ok(result.ok);
  assert.ok(result.misses > 0);
});

test('draws actually vary', () => {
  const people = family([2, 2, 2]);
  const seen = new Set();
  for (let run = 0; run < 50; run++) seen.add(JSON.stringify(draw(people, { noHousehold: true }).pairs));
  assert.ok(seen.size > 5);
});

test('someone without two people to draw is named', () => {
  assert.deepEqual(draw(family([2, 1]), { noHousehold: true }), { ok: false, reason: 'no-options', person: 'h0p0' });
  assert.deepEqual(draw(family([1, 1, 1]), { blocked: [['h1p0', 'h0p0']] }), { ok: false, reason: 'no-options', person: 'h1p0' });
});

test('someone fewer than two people are allowed to draw is named', () => {
  const result = draw(family([1, 1, 1, 1]), { blocked: [['h0p0', 'h3p0'], ['h1p0', 'h3p0']] });
  assert.deepEqual(result, { ok: false, reason: 'nobody-can-give', person: 'h3p0' });
});

test('rules that cannot all work together are caught', () => {
  // Three people in one house need six gifts' worth of the two people outside it.
  assert.equal(draw(family([3, 2]), { noHousehold: true }).reason, 'impossible');
  // With four people, the two you shop for and the two shopping for you have to overlap.
  assert.equal(draw(family([1, 1, 1, 1]), { noSwaps: true }).reason, 'impossible');
});

test('needs at least three people', () => {
  assert.equal(draw(family([1, 1])).reason, 'too-few');
});
