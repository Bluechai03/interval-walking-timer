"use client";

import { useSetting } from "./settings";

export { DEFAULT_WATCH_DELAY_SECONDS, parseWatchDelay, WATCH_DELAY_LIMITS } from "./settings";

// How long after you tap Start your Watch's workout begins. With the Watch
// switch on, Strut's countdown lasts this long, so the walk starts on the
// same beat as the workout.
export const useWatchDelay = () => {
  const [seconds, setSeconds] = useSetting("watchDelay");
  return { seconds, setSeconds };
};
