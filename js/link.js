// Each person's link carries their assignment after the # in the URL. Browsers never send
// that part to the server, so the host never sees it, and there's no database to keep.
//
// The payload is scrambled so a glance at the link doesn't give it away. It is NOT real
// encryption: someone determined, with developer tools, could unscramble it. It's family.

const VERSION = 1;

export function encode(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const salt = crypto.getRandomValues(new Uint8Array(4));
  const out = new Uint8Array(5 + bytes.length);
  out[0] = VERSION;
  out.set(salt, 1);
  const next = keystream(salt);
  bytes.forEach((b, i) => { out[5 + i] = b ^ next(); });
  return toBase64Url(out);
}

export function decode(text) {
  try {
    const raw = fromBase64Url(String(text).trim());
    if (raw.length < 6 || raw[0] !== VERSION) return null;
    const next = keystream(raw.subarray(1, 5));
    const bytes = raw.subarray(5).map(b => b ^ next());
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

// Short, stable id for a link, used to remember which links this browser has finished.
export function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// xorshift32 seeded from the per-link salt, so the same assignment scrambles differently every time.
function keystream(salt) {
  let x = (salt[0] | salt[1] << 8 | salt[2] << 16 | salt[3] << 24) ^ 0x5a17c1a5;
  if (x === 0) x = 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return x & 0xff;
  };
}

function toBase64Url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}
