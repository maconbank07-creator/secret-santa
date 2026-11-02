// Decides who buys for whom. Pure logic with no DOM, so the tests can run it in Node.
// Everyone shops for two people, so everyone also gets two gifts.

export const PER_PERSON = 2;
const MAX_STEPS = 200_000;
const ATTEMPTS = 400;

/**
 * people: [{ id, household }]
 * rules:  { noHousehold, noSwaps, blocked: [[giverId, receiverId], ...] }
 *
 * Returns { ok: true, pairs: { [giverId]: [receiverId, receiverId] }, misses }
 *      or { ok: false, reason, person? } where reason is one of:
 *         'too-few'          not enough people for everyone to have two
 *         'no-options'       `person` isn't allowed to draw two people
 *         'nobody-can-give'  fewer than two people are allowed to draw `person`
 *         'impossible'       every combination breaks a rule
 *         'too-hard'         gave up searching (only with huge, tangled rule sets)
 *
 * The rules above always hold. The "when possible" ones in countMisses() are met whenever
 * this can find a way; `misses` says how many it couldn't avoid (usually 0).
 */
export function draw(people, rules = {}, random = Math.random) {
  if (people.length <= PER_PERSON) return { ok: false, reason: 'too-few' };

  const homeOf = Object.fromEntries(people.map(p => [p.id, p.household ?? p.id]));
  const blocked = new Set((rules.blocked ?? []).map(([g, r]) => `${g}>${r}`));
  const canDraw = (g, r) => g.id !== r.id
    && !(rules.noHousehold && homeOf[g.id] === homeOf[r.id])
    && !blocked.has(`${g.id}>${r.id}`);

  const options = new Map(people.map(g => [g.id, people.filter(r => canDraw(g, r)).map(r => r.id)]));
  for (const g of people) {
    if (options.get(g.id).length < PER_PERSON) return { ok: false, reason: 'no-options', person: g.id };
  }
  for (const r of people) {
    if (people.filter(g => canDraw(g, r)).length < PER_PERSON) return { ok: false, reason: 'nobody-can-give', person: r.id };
  }

  // First look for a draw that meets the "when possible" rules too. If there isn't one, or
  // it's too tangled to find, settle for the best of a few hundred ordinary draws.
  try {
    const pairs = search(people, options, rules, random, homeOf);
    if (pairs) return { ok: true, pairs, misses: 0 };
  } catch (e) {
    if (!(e instanceof GaveUp)) throw e;
  }

  let best = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    let pairs;
    try {
      pairs = search(people, options, rules, random);
    } catch (e) {
      if (!(e instanceof GaveUp)) throw e;
      return best ?? { ok: false, reason: 'too-hard' };
    }
    // The search tries every combination before saying no, so another attempt won't help.
    if (!pairs) return { ok: false, reason: 'impossible' };
    const misses = countMisses(pairs, homeOf);
    if (!best || misses < best.misses) best = { ok: true, pairs, misses };
    if (misses === 0) break;
  }
  return best;
}

// Pass homeOf to also hold every pick to the "when possible" rules (see countMisses).
function search(people, options, rules, random, homeOf = null) {
  // Seat the pickiest givers first so dead ends show up early. Shuffling before the
  // (stable) sort means ties still come out in a random order.
  const order = shuffle(people.map(p => p.id), random)
    .sort((a, b) => options.get(a).length - options.get(b).length);
  const lists = order.map(id => shuffle(options.get(id), random));
  const gives = new Map(order.map(id => [id, []]));
  const shoppers = new Map(order.map(id => [id, []]));
  const slots = order.length * PER_PERSON;
  let steps = 0;

  function nice(giver, receiver) {
    const mine = gives.get(giver);
    if (mine.some(r => homeOf[r] === homeOf[receiver])) return false;
    return shoppers.get(receiver).every(other =>
      homeOf[other] !== homeOf[giver] && !gives.get(other).some(r => mine.includes(r)));
  }

  // Fills one slot at a time. A giver's later picks only look further down their own list,
  // so the same two people are never tried twice in the other order.
  function place(slot, from) {
    if (slot === slots) return true;
    if (++steps > MAX_STEPS) throw new GaveUp();
    const g = Math.floor(slot / PER_PERSON);
    const giver = order[g];
    const list = lists[g];
    for (let k = slot % PER_PERSON === 0 ? 0 : from; k < list.length; k++) {
      const receiver = list[k];
      if (shoppers.get(receiver).length === PER_PERSON) continue;
      if (rules.noSwaps && gives.get(receiver).includes(giver)) continue;
      if (homeOf && !nice(giver, receiver)) continue;
      gives.get(giver).push(receiver);
      shoppers.get(receiver).push(giver);
      if (place(slot + 1, k + 1)) return true;
      gives.get(giver).pop();
      shoppers.get(receiver).pop();
    }
    return false;
  }

  return place(0, 0) ? Object.fromEntries(gives) : null;
}

// { [receiverId]: [giverId, ...] }: everyone shopping for each person.
export function shoppersFor(pairs) {
  const shoppers = {};
  for (const [giver, receivers] of Object.entries(pairs)) {
    for (const r of receivers) (shoppers[r] ??= []).push(giver);
  }
  return shoppers;
}

// Counts the "when possible" rules a draw breaks:
//  - two people from one household (like spouses) shopping for the same person
//  - someone's two people both from one household (both halves of a couple)
//  - someone teaming up with the same co-shopper for both of their people
export function countMisses(pairs, homeOf) {
  const shoppers = shoppersFor(pairs);
  const repeats = list => list.length - new Set(list).size;
  let misses = 0;
  for (const givers of Object.values(shoppers)) misses += repeats(givers.map(id => homeOf[id]));
  for (const [giver, receivers] of Object.entries(pairs)) {
    misses += repeats(receivers.map(id => homeOf[id]));
    misses += repeats(receivers.flatMap(r => shoppers[r].filter(id => id !== giver)));
  }
  return misses;
}

class GaveUp extends Error {}

export function shuffle(items, random = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
