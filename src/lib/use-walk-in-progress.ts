"use client";

import { useSyncExternalStore } from "react";

const nothing = () => () => {};

// Whether a walk is saved on this phone as started, for screens that must not change
// the plan underneath it. Read once, when the screen opens.
const read = (): boolean => {
  try {
    const saved = JSON.parse(localStorage.getItem("walk-state") ?? "null") as
      | { accumulatedMs?: number; startedAt?: number | null }
      | null;
    return !!saved && ((saved.accumulatedMs ?? 0) > 0 || typeof saved.startedAt === "number");
  } catch {
    return false;
  }
};

export const useWalkInProgress = (): boolean => useSyncExternalStore(nothing, read, () => false);
