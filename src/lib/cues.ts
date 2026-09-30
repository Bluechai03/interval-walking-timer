import type { Phase } from "./plan";

export type Cue = Phase["type"] | "done";

const CUE_TONE_HZ: Record<Cue, number> = {
  fast: 880,
  slow: 440,
  done: 660,
};

const CUE_TEXT: Record<Cue, string> = {
  fast: "Fast",
  slow: "Slow",
  done: "Done",
};

const BEEP_SECONDS = 0.25;

export const createAudioContext = (): AudioContext | null =>
  typeof AudioContext === "undefined" ? null : new AudioContext();

const beep = (ctx: AudioContext, frequency: number, startOffset = 0) => {
  const start = ctx.currentTime + startOffset;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.4, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + BEEP_SECONDS);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + BEEP_SECONDS);
};

export const playCue = (cue: Cue, ctx: AudioContext | null) => {
  if (ctx) {
    void ctx.resume();
    const frequency = CUE_TONE_HZ[cue];
    beep(ctx, frequency);
    if (cue === "done") beep(ctx, frequency, 0.35);
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(cue === "done" ? [200, 100, 200] : 300);
  }

  if (typeof speechSynthesis !== "undefined") {
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(CUE_TEXT[cue]));
  }
};
