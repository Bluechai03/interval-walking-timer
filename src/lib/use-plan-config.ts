"use client";

import { useSyncExternalStore } from "react";
import { useSetting } from "./settings";

const subscribeNever = () => () => {};

export const usePlanConfig = () => {
  const [config, setConfig] = useSetting("plan");

  // False during server render and hydration, true afterwards. Lets the
  // settings form remount once so it shows the stored values.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return { config, setConfig, hydrated };
};
