"use client";

import { useSetting } from "./settings";

// What the walker is doing, remembered on this phone. Walking until they pick
// something else.
export const useActivity = () => {
  const [activity, setActivity] = useSetting("activity");
  return { activity, setActivity };
};
