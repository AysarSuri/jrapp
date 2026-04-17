export const SOUND_SETTINGS_KEY = "erp_sound_settings";

export interface SoundSettings {
  clickEnabled: boolean;
  hoverEnabled: boolean;
}

export const defaultSoundSettings: SoundSettings = {
  clickEnabled: true,
  hoverEnabled: true,
};

export function loadSoundSettings(): SoundSettings {
  try {
    const saved = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (saved) return { ...defaultSoundSettings, ...JSON.parse(saved) };
  } catch {}
  return defaultSoundSettings;
}

export function saveSoundSettings(settings: SoundSettings) {
  localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
}

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

function emitHoverTone(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(1800, now + 0.06);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

let lastHoverTime = 0;
export function playHoverSound() {
  try {
    if (!loadSoundSettings().hoverEnabled) return;
    const nowMs = performance.now();
    if (nowMs - lastHoverTime < 60) return;
    lastHoverTime = nowMs;

    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().then(() => emitHoverTone(ctx)).catch(() => {});
    } else {
      emitHoverTone(ctx);
    }
  } catch {
  }
}

export function playSidebarClickSound() {
  try {
    if (!loadSoundSettings().clickEnabled) return;
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1760, now + 0.02);
    gain2.gain.setValueAtTime(0.0001, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.02);
    osc2.stop(now + 0.12);
  } catch {
  }
}
