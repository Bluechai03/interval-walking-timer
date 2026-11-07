import { heartRateTarget } from "./heart-rate";
import { pickVoice } from "./pick-voice";
import type { Phase } from "./plan";

export type Cue = Phase["type"] | "done";

const CUE_TONE_HZ: Record<Cue, number> = {
  fast: 880,
  slow: 440,
  done: 660,
};

const PACE_TEXT = { fast: "Fast", slow: "Slow" } as const;

// What is spoken: the pace and the phase's target heart rate, or that the walk
// is complete.
export const spokenCue = (cue: Cue): string =>
  cue === "done"
    ? "Walk complete"
    : `${PACE_TEXT[cue]}. Target heart rate ${heartRateTarget(cue).average}.`;

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

// Speaks a line in the most natural voice the device has, cutting off any
// line still being spoken.
const speak = (text: string) => {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(speechSynthesis.getVoices());
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
};

// Muting drops the beep and the spoken words; vibration still plays.
export const playCue = (cue: Cue, ctx: AudioContext | null, muted = false) => {
  if (ctx && !muted) {
    void ctx.resume();
    const frequency = CUE_TONE_HZ[cue];
    beep(ctx, frequency);
    if (cue === "done") beep(ctx, frequency, 0.35);
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(cue === "done" ? [200, 100, 200] : 300);
  }

  if (!muted) speak(spokenCue(cue));
};

// A short spoken and felt warning so the walker can get ready for the change.
export const playHeadsUp = (muted = false) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(100);
  }

  if (!muted) speak("10 seconds");
};
