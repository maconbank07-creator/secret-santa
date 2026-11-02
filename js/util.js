// Small helpers shared by every page.
export { shuffle } from './draw.js';

// el('button', { class: 'btn', onclick }, 'Label') — builds DOM without innerHTML, so names
// from links and the organizer's typing are always treated as text, never markup.
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : String(child));
  }
  return node;
}

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export const pick = items => items[Math.floor(Math.random() * items.length)];

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function download(filename, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function loadJson(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

export function saveJson(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* private browsing or storage blocked: carry on without saving */ }
}
