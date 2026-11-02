// Level 3: say "I have been good this year" out loud. The bars react to the real microphone
// level, measured in the browser only: nothing is recorded, stored or sent anywhere.
// Then a gentle roast.
import { el, shuffle, wait } from '../util.js';

export const id = 'voice';
export const title = 'Voice verification';

const ROASTS = [
  ['94% human, 6% fruitcake', 'Nobody sounds that confident about being good. Noted.'],
  ['67% human, 33% elf', 'Your voice cracked on "this year." We all heard it.'],
];
const ANALYSIS = ['Analyzing…', 'Removing background sighs…', 'Checking for sarcasm…', "Comparing with Santa's records…"];

export function run(stage, ctx) {
  const mic = el('div', { class: 'mic', 'aria-hidden': 'true' }, '🎙️');
  const bars = Array.from({ length: 18 }, () => el('span', { class: 'bar' }));
  const status = el('p', { class: 'voice-status', 'aria-live': 'polite' }, "Say it out loud when you're ready.");
  const verdictTitle = el('p', { class: 'verdict-title' });
  const verdictBody = el('p', { class: 'verdict-body' });
  const verdict = el('div', { class: 'verdict', hidden: true }, verdictTitle, verdictBody);
  const listen = el('button', { type: 'button', class: 'btn btn-primary' }, 'Start listening');
  const next = el('button', { type: 'button', class: 'btn btn-primary', hidden: true }, 'Continue');
  stage.append(el('div', { class: 'voice' },
    el('p', { class: 'muted small' }, 'Please say this out loud:'),
    el('p', { class: 'voice-phrase' }, '"I have been good this year."'),
    mic,
    el('div', { class: 'bars' }, bars),
    status,
    verdict,
    el('div', { class: 'btn-row center' }, listen, next)));

  const roasts = shuffle(ROASTS);
  const who = ctx.suspect || 'your uncle';
  let roastIndex = 0;
  let jokeUsed = false;
  let blockedShown = false;

  return new Promise(resolve => {
    next.onclick = () => resolve();
    listen.onclick = async () => {
      listen.hidden = true;
      next.hidden = true;
      verdict.hidden = true;

      // The audio context has to be created during the tap; iPhones won't start one later.
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audio = AudioCtx ? new AudioCtx() : null;
      let stream = null;
      let analyser = null;
      status.textContent = 'Asking for your microphone…';
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        analyser = audio.createAnalyser();
        analyser.fftSize = 512;
        audio.createMediaStreamSource(stream).connect(analyser);
        await audio.resume();
      } catch {
        analyser = null;
      }
      const blocked = !analyser;

      status.textContent = blocked ? "Listening… (your microphone is blocked, so we'll just assume)" : 'Listening…';
      mic.classList.add('live');
      const loudest = await animateBars(bars, mic, analyser, 4000);
      stream?.getTracks().forEach(t => t.stop());
      audio?.close();
      mic.classList.remove('live');
      mic.style.transform = '';
      for (const bar of bars) bar.style.height = '';

      for (const step of ANALYSIS) {
        status.textContent = step;
        await wait(850);
      }

      let result;
      if (blocked && !blockedShown) {
        blockedShown = true;
        jokeUsed = !!ctx.joke;
        result = ['Microphone blocked', ctx.joke
          ? `Very suspicious. That's exactly what a bot would do. But our records say you're the person who ${ctx.joke}, so we'll allow it.`
          : `Very suspicious. That's exactly what a bot would do. Or ${who}. Passing you anyway.`];
      } else if (!blocked && loudest < 0.12) {
        result = ["We didn't hear a thing", "Bold strategy. Robots always do what they're told, so you pass."];
      } else if (ctx.joke && !jokeUsed) {
        jokeUsed = true;
        result = ['Voiceprint match found', `It's the person who ${ctx.joke}. Welcome back.`];
      } else {
        const [score, line] = roasts[roastIndex++ % roasts.length];
        result = [`Voice analysis: ${score}`, line];
      }
      verdictTitle.textContent = result[0];
      verdictBody.textContent = result[1];
      verdict.hidden = false;
      status.textContent = 'Verified: human (mostly)';
      listen.textContent = 'Try again';
      listen.className = 'btn';
      listen.hidden = false;
      next.hidden = false;
      next.focus();
    };
  });
}

// Bounces the bars for `ms` and resolves with the loudest level heard (0 to 1).
// Without a microphone the bars just put on a convincing show.
function animateBars(bars, mic, analyser, ms) {
  const samples = analyser ? new Uint8Array(analyser.fftSize) : null;
  return new Promise(resolve => {
    let loudest = 0;
    let start = null;
    function frame(now) {
      start ??= now;
      let level;
      if (analyser) {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const s of samples) sum += ((s - 128) / 128) ** 2;
        level = Math.min(1, Math.sqrt(sum / samples.length) * 5);
      } else {
        level = 0.45 + 0.3 * Math.sin(now / 260) + 0.15 * (Math.random() - 0.5);
      }
      loudest = Math.max(loudest, level);
      bars.forEach((bar, i) => {
        const v = Math.max(0, Math.min(1, level * (0.55 + 0.45 * Math.abs(Math.sin(now / 140 + i * 0.9)))));
        bar.style.height = `${6 + v * 44}px`;
      });
      mic.style.transform = `scale(${(1 + level * 0.25).toFixed(3)})`;
      if (now - start < ms) requestAnimationFrame(frame);
      else resolve(loudest);
    }
    requestAnimationFrame(frame);
  });
}
