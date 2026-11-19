"use client";

import { useSyncExternalStore } from "react";

const subscribe = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};

// Whether the phone says it has a signal. A phone can say yes with no data coming
// through, so this is for explaining, never for deciding whether something works.
export const useOnline = (): boolean =>
  useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
