"use client";

import { useSyncExternalStore } from "react";

type Env = {
  navigator: Navigator & { standalone?: boolean };
  matchMedia?: (query: string) => { matches: boolean };
};

// True when Strut was opened from the Home Screen icon, not from a browser tab.
export const isStandalone = ({ navigator, matchMedia }: Env): boolean =>
  navigator.standalone === true || matchMedia?.("(display-mode: standalone)").matches === true;

const subscribe = () => () => {};

// False on the server and while hydrating.
export const useStandalone = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () =>
      isStandalone({
        navigator,
        matchMedia: typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : undefined,
      }),
    () => false,
  );
