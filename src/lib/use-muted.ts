"use client";

import { useSetting } from "./settings";

// Silences the beeps and spoken words. On the phone, so it is remembered.
export const useMuted = () => {
  const [muted, setMuted] = useSetting("muted");
  return { muted, setMuted };
};
