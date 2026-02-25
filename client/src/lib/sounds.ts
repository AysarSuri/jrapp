let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
  }
}

export function playSuccessSound() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  playTone(523.25, 0.12, "sine", 0.12);
  setTimeout(() => playTone(659.25, 0.12, "sine", 0.12), 80);
  setTimeout(() => playTone(783.99, 0.18, "sine", 0.10), 160);
}

export function playDeleteSound() {
  playTone(440, 0.1, "triangle", 0.13);
  setTimeout(() => playTone(349.23, 0.1, "triangle", 0.11), 80);
  setTimeout(() => playTone(261.63, 0.2, "triangle", 0.09), 160);
}

export function playErrorSound() {
  playTone(200, 0.15, "square", 0.08);
  setTimeout(() => playTone(180, 0.25, "square", 0.06), 120);
}

export function playClickSound() {
  playTone(800, 0.05, "sine", 0.08);
}
