"use client";

import { useEffect, useState } from "react";
import type { Phase } from "./plan";
import { getPosition, countdownLeft } from "./timer";

const TICK_MS = 250;

// The walk of a room, read off the room's start moment instead of a Start button.
// `offsetMs` is how far the server's clock is ahead of this phone's. Before the
// start moment time is negative, which is the countdown, as in the solo timer.
export const useRoomTimer = (plan: Phase[], startAt: string, offsetMs: number) => {
  const startMs = Date.parse(startAt);
  const [now, setNow] = useState(() => Date.now());

  const elapsedMs = now + offsetMs - startMs;
  const position = getPosition(plan, elapsedMs);

  useEffect(() => {
    if (position.done) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [position.done]);

  const totalBefore = plan.slice(0, position.phaseIndex).reduce((sum, p) => sum + p.durationInSeconds, 0);
  return {
    ...position,
    // Late joiners arrive part-way through, so this is not always zero at the start.
    elapsedSeconds: position.done ? 0 : totalBefore + plan[position.phaseIndex].durationInSeconds - position.secondsLeft,
    getReadyLeft: countdownLeft(elapsedMs),
    running: !position.done,
  };
};
