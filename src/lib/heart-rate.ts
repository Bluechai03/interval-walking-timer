import { parseWhole } from "./phone-store";
import type { Phase } from "./plan";

// Interval walking guidance: fast phases at roughly 70-80% of max heart rate,
// slow phases at roughly 40-50%. Max heart rate is estimated as 220 - age,
// using the walker's age, or 23 until they set it.
export const ASSUMED_AGE = 23;
export const AGE_LIMITS = { min: 10, max: 90 } as const;

// Anything that isn't a whole age in range falls back to the default.
export const parseAge = (raw: string): number => parseWhole(raw, AGE_LIMITS.min, AGE_LIMITS.max, ASSUMED_AGE);

const INTENSITY: Record<Phase["type"], { min: number; max: number }> = {
  fast: { min: 0.7, max: 0.8 },
  slow: { min: 0.4, max: 0.5 },
};

export type HeartRateTarget = { min: number; max: number; average: number };

export const heartRateTarget = (type: Phase["type"], age: number = ASSUMED_AGE): HeartRateTarget => {
  const { min, max } = INTENSITY[type];
  const maxHeartRate = 220 - age;
  const low = Math.round(maxHeartRate * min);
  const high = Math.round(maxHeartRate * max);
  return { min: low, max: high, average: Math.round((low + high) / 2) };
};

// How the pace should feel, for walkers without a tracker: the talk test.
const EFFORT: Record<Phase["type"], string> = {
  fast: "Brisk: short sentences only",
  slow: "Easy: you can chat",
};

export const effortWords = (type: Phase["type"]): string => EFFORT[type];
