import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode, fingerprint } from '../js/link.js';

test('round trip keeps every field, including accents and emoji', () => {
  const data = { e: 'Navidad 2026 🎄', g: 'José', r: [['Zoë', 'Ana'], ['Rick', 'Leo']], o: ['Ana', 'Leo'], j: 'burned the rolls in 2019', m: 1 };
  assert.deepEqual(decode(encode(data)), data);
});

test('links are URL-safe and do not show names in plain sight', () => {
  const code = encode({ g: 'Pat', r: 'Rudolph' });
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.ok(!Buffer.from(code, 'base64url').toString('latin1').includes('Rudolph'));
});

test('the same assignment scrambles differently each time', () => {
  assert.notEqual(encode({ g: 'Pat', r: 'Sam' }), encode({ g: 'Pat', r: 'Sam' }));
});

test('damaged links come back as null instead of throwing', () => {
  const code = encode({ g: 'Pat', r: 'Sam' });
  assert.equal(decode(''), null);
  assert.equal(decode('not a link!'), null);
  assert.equal(decode(code.slice(0, -4)), null);
  assert.equal(decode('AAAAAAAAAA'), null);
});

test('fingerprints are stable and distinct', () => {
  assert.equal(fingerprint('abc'), fingerprint('abc'));
  assert.notEqual(fingerprint('abc'), fingerprint('abd'));
});
