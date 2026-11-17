"use client";

import { useSyncExternalStore } from "react";
import { isIos } from "./watch-workout";

const subscribe = () => () => {};

// True on iPhone and iPad. False on the server and while hydrating.
export const useIos = (): boolean =>
  useSyncExternalStore(subscribe, () => isIos(navigator.userAgent, navigator.maxTouchPoints), () => false);
