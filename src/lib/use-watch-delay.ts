"use client";

import { useNamed } from "./use-shortcut-name";

export const WATCH_DELAY_LIMITS = { min: 0, max: 30 } as const;
export const DEFAULT_WATCH_DELAY_SECONDS = 6;

export const parseWatchDelay = (raw: string): number => {
  if (raw.trim() === "") return DEFAULT_WATCH_DELAY_SECONDS;
  const value = Number(raw);
  return Number.isInteger(value) && value >= WATCH_DELAY_LIMITS.min && value <= WATCH_DELAY_LIMITS.max
    ? value
    : DEFAULT_WATCH_DELAY_SECONDS;
};

// How long after you tap Start your Watch's workout begins. With the Watch
// switch on, Strut's countdown lasts this long, so the walk starts on the
// same beat as the workout.
export const useWatchDelay = () => {
  const { name, setName } = useNamed("watch-delay-seconds");
  return {
    seconds: parseWatchDelay(name),
    setSeconds: (value: number) => setName(String(value)),
  };
};
