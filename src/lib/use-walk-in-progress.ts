"use client";

import { useSyncExternalStore } from "react";
import { walkInProgress, walkRecord } from "./records";

const nothing = () => () => {};

// Whether a walk is saved on this phone as started, for screens that must not change
// the plan underneath it. Read once, when the screen opens.
export const useWalkInProgress = (): boolean =>
  useSyncExternalStore(nothing, () => walkInProgress(walkRecord.read()), () => false);
