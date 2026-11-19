"use client";

import { type ActivityId, parseActivity } from "./activity";
import { useNamed } from "./use-shortcut-name";

// What the walker is doing, remembered on this phone. Walking until they pick
// something else.
export const useActivity = () => {
  const { name, setName } = useNamed("activity");
  return {
    activity: parseActivity(name),
    setActivity: (value: ActivityId) => setName(value),
  };
};
