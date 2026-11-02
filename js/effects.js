// Falling snow behind every page, and confetti for the big reveal.
import { el, prefersReducedMotion } from './util.js';

export function startSnow(canvas) {
  if (!canvas || prefersReducedMotion()) return;
  const g = canvas.getContext('2d');
  const flakes = [];
  let w = 0;
  let h = 0;

  const make = anywhere => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : -6,
    r: 0.8 + Math.random() * 2.2,
    speed: 0.25 + Math.random() * 0.8,
    drift: Math.random() * Math.PI * 2,
  });

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth;
    h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round((w * h) / 12000);
    while (flakes.length < target) flakes.push(make(true));
    flakes.length = Math.min(flakes.length, target);
  }

  function frame() {
    g.clearRect(0, 0, w, h);
    for (const f of flakes) {
      f.y += f.speed;
      f.drift += 0.01;
      f.x += Math.sin(f.drift) * 0.3;
      if (f.y > h + 6) Object.assign(f, make(false));
      g.fillStyle = `rgba(255,255,255,${0.35 + f.r / 5})`;
      g.beginPath();
      g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      g.fill();
    }
    requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
}

export function confetti() {
  if (prefersReducedMotion()) return;
  const canvas = el('canvas', { class: 'confetti', 'aria-hidden': 'true' });
  document.body.append(canvas);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = innerWidth;
  const h = innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);

  const colors = ['#d63a3a', '#2f9e5f', '#f2c14e', '#ffffff', '#5aa9e6'];
  const bits = Array.from({ length: 150 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * 80,
    y: h * 0.4,
    vx: (Math.random() - 0.5) * 13,
    vy: -6 - Math.random() * 10,
    spin: Math.random() * Math.PI,
    vspin: (Math.random() - 0.5) * 0.3,
    size: 6 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  const life = 3200;
  const start = performance.now();
  (function frame(now) {
    const t = now - start;
    g.clearRect(0, 0, w, h);
    g.globalAlpha = Math.max(0, 1 - t / life);
    for (const b of bits) {
      b.vy += 0.25;
      b.vx *= 0.99;
      b.x += b.vx;
      b.y += b.vy;
      b.spin += b.vspin;
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.spin);
      g.fillStyle = b.color;
      g.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
      g.restore();
    }
    if (t < life) requestAnimationFrame(frame);
    else canvas.remove();
  })(start);
}
