import { COLORS, type ColorId } from '../game/colors';

const PEAK = 0.25;
const ATTACK_S = 0.015;
const RELEASE_S = 0.02;

let ctx: AudioContext | null = null;
const active = new Set<OscillatorNode>();

type AudioContextCtor = typeof AudioContext;

// Must be called from a user gesture ("התחל משחק" / "המשך משחק")
export async function unlockAudio(): Promise<boolean> {
  try {
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return false;
    ctx ??= new Ctor();
    if (ctx.state !== 'running') await ctx.resume();
    return (ctx.state as string) === 'running';
  } catch {
    return false;
  }
}

function createVoice(freq: number, type: OscillatorType, startAt: number, peak: number) {
  const audio = ctx!;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  // Short envelope avoids clicks
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + ATTACK_S);
  osc.connect(gain).connect(audio.destination);
  osc.onended = () => {
    active.delete(osc);
    osc.disconnect();
    gain.disconnect();
  };
  active.add(osc);
  osc.start(startAt);
  return { osc, gain };
}

function safeStop(osc: OscillatorNode, at?: number) {
  try {
    osc.stop(at);
  } catch {
    // Already stopped
  }
}

function playNote(freq: number, type: OscillatorType, startAt: number, duration: number, peak = PEAK) {
  const { osc, gain } = createVoice(freq, type, startAt, peak);
  gain.gain.setValueAtTime(peak, startAt + duration - RELEASE_S);
  gain.gain.linearRampToValueAtTime(0, startAt + duration);
  safeStop(osc, startAt + duration + 0.01);
  return { osc, gain };
}

// Starts a color tone that lasts until the returned stop function is called
export function startTone(color: ColorId): () => void {
  if (!ctx || ctx.state !== 'running') return () => {};
  const freq = COLORS.find((c) => c.id === color)!.tone;
  const { osc, gain } = createVoice(freq, 'triangle', ctx.currentTime, PEAK);
  let stopped = false;
  return () => {
    if (stopped || !ctx) return;
    stopped = true;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + RELEASE_S);
    safeStop(osc, now + RELEASE_S + 0.01);
  };
}

export function playWin() {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  // Rising C-major arpeggio
  [523, 659, 784, 1047].forEach((freq, i) => {
    playNote(freq, 'triangle', now + i * 0.15, i === 3 ? 0.4 : 0.14);
  });
}

export function playLose() {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  // Low falling buzz
  const { osc } = playNote(196, 'sawtooth', now, 0.7, 0.15);
  osc.frequency.exponentialRampToValueAtTime(98, now + 0.7);
}

export function stopAll() {
  for (const osc of active) safeStop(osc);
  active.clear();
}
