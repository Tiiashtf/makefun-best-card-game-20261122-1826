// Cinder & Tide — sound.
//
// Every sound is synthesized with WebAudio at play time: no audio files,
// nothing to download, nothing to load over the network. A short pad loop
// hums underneath the duel once the player has clicked anything (browsers
// need a gesture before audio starts), and each effect is a small phrase
// of oscillators and filtered noise.

let context = null;
let master = null;
let musicNodes = null;
let muted = false;

function ensureContext() {
  if (context) return context;
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) return null;
  context = new AudioContext();
  master = context.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(context.destination);
  return context;
}

/** Call from the first user gesture; starts the pad loop. */
export function unlockAudio() {
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  startMusic();
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
}

export function isMuted() {
  return muted;
}

function tone({ frequency, endFrequency = null, duration, type = 'sine', volume = 0.2, delay = 0, attack = 0.005 }) {
  const ctx = ensureContext();
  if (!ctx || muted) return;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency !== null) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function noise({ duration, volume = 0.15, delay = 0, frequency = 1200 }) {
  const ctx = ensureContext();
  if (!ctx || muted) return;
  const start = ctx.currentTime + delay;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(start);
}

export const sfx = {
  click() { tone({ frequency: 660, duration: 0.07, type: 'triangle', volume: 0.12 }); },
  deal() { noise({ duration: 0.12, volume: 0.1, frequency: 2400 }); },
  playCard() {
    noise({ duration: 0.18, volume: 0.14, frequency: 1800 });
    tone({ frequency: 392, endFrequency: 523, duration: 0.16, type: 'triangle', volume: 0.14 });
  },
  strike() {
    tone({ frequency: 180, endFrequency: 60, duration: 0.2, type: 'sawtooth', volume: 0.2 });
    noise({ duration: 0.1, volume: 0.12, frequency: 800 });
  },
  heal() {
    tone({ frequency: 523, duration: 0.25, type: 'sine', volume: 0.14 });
    tone({ frequency: 784, duration: 0.3, type: 'sine', volume: 0.12, delay: 0.08 });
  },
  freeze() {
    tone({ frequency: 1200, endFrequency: 500, duration: 0.3, type: 'sine', volume: 0.12 });
    tone({ frequency: 900, endFrequency: 400, duration: 0.3, type: 'sine', volume: 0.08, delay: 0.05 });
  },
  draw() { tone({ frequency: 520, endFrequency: 760, duration: 0.09, type: 'triangle', volume: 0.1 }); },
  turn() { tone({ frequency: 440, duration: 0.12, type: 'triangle', volume: 0.12 }); },
  win() {
    [523, 659, 784, 1047].forEach((frequency, i) => {
      tone({ frequency, duration: 0.5, type: 'triangle', volume: 0.16, delay: i * 0.12 });
    });
  },
  lose() {
    [392, 330, 262, 196].forEach((frequency, i) => {
      tone({ frequency, duration: 0.45, type: 'sine', volume: 0.14, delay: i * 0.14 });
    });
  },
};

/** A slow two-chord pad that loops under the duel. */
function startMusic() {
  const ctx = ensureContext();
  if (!ctx || musicNodes) return;
  const gain = ctx.createGain();
  gain.gain.value = 0.05;
  gain.connect(master);
  const chords = [
    [110, 164.81, 220], // A minor
    [87.31, 130.81, 174.61], // F major
  ];
  let chordIndex = 0;
  const oscillators = [];
  function playChord() {
    for (const osc of oscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
      osc.disconnect();
    }
    oscillators.length = 0;
    for (const frequency of chords[chordIndex % chords.length]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.33;
      osc.connect(oscGain);
      oscGain.connect(gain);
      osc.start();
      oscillators.push(osc);
    }
    chordIndex += 1;
  }
  playChord();
  const timer = window.setInterval(playChord, 8000);
  musicNodes = { gain, timer, oscillators };
}
