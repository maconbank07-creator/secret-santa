// Re-checks a finished draw from the links themselves, which is exactly what people will open.
// Written separately from draw.js on purpose, so a mistake there can't also hide here.
// Reports pass or fail per rule and never says who got whom.

/**
 * people:   [{ id, name, household, joke, mercy }] as the organizer drew them
 * rules:    { noHousehold, noSwaps, blocked: [[giverId, receiverId], ...] }
 * payloads: each link decoded ({ g, r: [[name, coShopper], ...], j, m }), or null if it didn't decode
 *
 * Returns [{ label, ok, soft }]. Soft rules are the "when possible" ones: missing one isn't a
 * reason to redraw.
 */
export function checkDraw(people, rules, payloads) {
  const results = [];
  const add = (label, ok, soft = false) => { results.push({ label, ok, soft }); return ok; };
  const byName = new Map(people.map(p => [p.name.toLowerCase(), p]));
  const find = name => byName.get(String(name ?? '').toLowerCase());
  const home = p => p.household ?? p.id;

  const links = payloads.filter(Boolean);
  const givers = links.map(d => find(d.g));
  const onePerPerson = payloads.length === people.length && links.length === people.length
    && givers.every(Boolean) && new Set(givers).size === people.length;
  if (!add('There is one working link per person', onePerPerson)) return results;

  // Everything below leans on the shape being right, so stop at the first broken piece.
  const gives = new Map(links.map((d, i) => [givers[i], (Array.isArray(d.r) ? d.r : []).map(pick => find(pick?.[0]))]));
  const shapeOk = [...gives.values()].every(rs => rs.length === 2 && rs.every(Boolean) && rs[0] !== rs[1]);
  if (!add('Everyone is shopping for 2 different people', shapeOk)) return results;

  const shoppers = new Map(people.map(p => [p, []]));
  for (const [giver, receivers] of gives) for (const r of receivers) shoppers.get(r).push(giver);
  if (!add('Everyone is getting 2 gifts', [...shoppers.values()].every(list => list.length === 2))) return results;

  const pairs = [...gives].flatMap(([giver, receivers]) => receivers.map(r => [giver, r]));
  add('Nobody drew themselves', pairs.every(([g, r]) => g !== r));
  if (rules.noHousehold) add('Nobody drew someone from their own household', pairs.every(([g, r]) => home(g) !== home(r)));
  if (rules.noSwaps) add('No swaps', pairs.every(([g, r]) => !gives.get(r).includes(g)));
  if (rules.blocked?.length) {
    const blocked = new Set(rules.blocked.map(([g, r]) => `${g}>${r}`));
    add("Can't-draw and last-year pairs were respected", pairs.every(([g, r]) => !blocked.has(`${g.id}>${r.id}`)));
  }
  add('Every co-shopper name is right', links.every((d, i) => d.r.every(([name, partner]) => {
    const others = shoppers.get(find(name)).filter(g => g !== givers[i]);
    return others.length === 1 && find(partner) === others[0];
  })));
  add('Each link has the right name, inside joke and Easy mode', links.every((d, i) =>
    d.g === givers[i].name && (d.j ?? '') === (givers[i].joke ?? '') && !!d.m === !!givers[i].mercy));

  add('When possible: no household is shopping for the same person',
    [...shoppers.values()].every(([a, b]) => home(a) !== home(b)), true);
  add('When possible: nobody has both people from one household',
    [...gives.values()].every(([a, b]) => home(a) !== home(b)), true);
  add('When possible: everyone has 2 different co-shoppers',
    links.every(d => find(d.r[0][1]) !== find(d.r[1][1])), true);
  return results;
}
