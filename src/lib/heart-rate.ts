import type { Phase } from "./plan";

// Interval walking guidance: fast phases at roughly 70-80% of max heart rate,
// slow phases at roughly 40-50%. Max heart rate is estimated as 220 - age,
// using the owner's age since the app doesn't ask for one.
export const ASSUMED_AGE = 23;
const MAX_HEART_RATE = 220 - ASSUMED_AGE;

const INTENSITY: Record<Phase["type"], { min: number; max: number }> = {
  fast: { min: 0.7, max: 0.8 },
  slow: { min: 0.4, max: 0.5 },
};

export type HeartRateTarget = { min: number; max: number; average: number };

export const heartRateTarget = (type: Phase["type"]): HeartRateTarget => {
  const { min, max } = INTENSITY[type];
  const low = Math.round(MAX_HEART_RATE * min);
  const high = Math.round(MAX_HEART_RATE * max);
  return { min: low, max: high, average: Math.round((low + high) / 2) };
};

// How the pace should feel, for walkers without a tracker: the talk test.
const EFFORT: Record<Phase["type"], string> = {
  fast: "Brisk: short sentences only",
  slow: "Easy: you can chat",
};

export const effortWords = (type: Phase["type"]): string => EFFORT[type];
