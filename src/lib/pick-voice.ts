export type VoiceInfo = { name: string; lang: string; localService: boolean };

// The joke voices that ship with Apple devices. They are English, but they
// are the last thing a walker wants to hear.
const NOVELTY = [
  "Albert", "Bad News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos",
  "Deranged", "Good News", "Jester", "Organ", "Superstar", "Trinoids",
  "Whisper", "Wobble", "Zarvox", "Fred", "Junior", "Kathy", "Ralph",
];

const isNovelty = (voice: VoiceInfo) =>
  NOVELTY.some((name) => voice.name.toLowerCase().startsWith(name.toLowerCase()));

const quality = (voice: VoiceInfo) =>
  /premium/i.test(voice.name) ? 2 : /enhanced/i.test(voice.name) ? 1 : 0;

// Chooses the most natural-sounding English voice the device offers.
export const pickVoice = <T extends VoiceInfo>(voices: T[]): T | undefined =>
  voices
    .filter((voice) => voice.lang.toLowerCase().startsWith("en") && !isNovelty(voice))
    .sort((a, b) => quality(b) - quality(a))[0];
