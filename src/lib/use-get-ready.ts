"use client";

import { useSetting } from "./settings";

export { DEFAULT_GET_READY_SECONDS, GET_READY_LIMITS, parseGetReady } from "./settings";

// Seconds of countdown before the walk starts. 0 means none.
export const useGetReady = () => {
  const [seconds, setSeconds] = useSetting("getReady");
  return { seconds, setSeconds };
};
