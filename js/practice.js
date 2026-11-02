// A made-up link for trying the levels without drawing names. Nobody real is in it.
import { encode } from './link.js';

// `sweater` and `suspect` put the organizer's picks for the jokes in, so the practice matches.
export function practiceLink({ easy = false, sweater, suspect } = {}) {
  return `./#${encode({
    e: 'Practice run',
    g: 'Practice Human',
    r: [['Cousin Greg', 'Aunt Linda'], ['Uncle Bob', 'Grandma June']],
    d: `${new Date().getFullYear()}-12-24`,
    n: 'This was a practice run. Nobody here is real. Real links come from your organizer.',
    o: ['Aunt Linda', 'Grandma June', 'Cousin Pam'],
    s: sweater || undefined,
    v: suspect || undefined,
    j: 'still has the bread maker from 2019',
    m: easy ? 1 : 0,
  })}`;
}
