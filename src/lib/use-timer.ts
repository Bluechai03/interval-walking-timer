"use client";

import { useCallback, useEffect, useState } from "react";
import type { Phase } from "./plan";
import { getPosition } from "./timer";

const TICK_MS = 250;

// Elapsed time is derived from wall-clock timestamps rather than counted
// ticks, so it stays accurate when the browser throttles background tabs.
export const useTimer = (plan: Phase[]) => {
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const elapsedMs = accumulatedMs + (startedAt !== null ? now - startedAt : 0);
  const position = getPosition(plan, elapsedMs);
  // The clock stops ticking on its own once the last phase finishes.
  const running = startedAt !== null && !position.done;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setStartedAt(t);
  }, []);

  const pause = useCallback(() => {
    if (startedAt === null) return;
    setAccumulatedMs((ms) => ms + Date.now() - startedAt);
    setStartedAt(null);
  }, [startedAt]);

  const reset = useCallback(() => {
    setAccumulatedMs(0);
    setStartedAt(null);
  }, []);

  return {
    ...position,
    running,
    started: startedAt !== null || accumulatedMs > 0,
    start,
    pause,
    reset,
  };
};
