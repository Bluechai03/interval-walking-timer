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
    // Checked four times a second so a second is never shown late, but the page
    // is only redrawn when the second on screen changes, which spares the battery.
    const secondOf = (time: number) => Math.floor((time + offsetMs - startMs) / 1000);
    const id = setInterval(
      () => setNow((previous) => {
        const next = Date.now();
        return secondOf(next) === secondOf(previous) ? previous : next;
      }),
      TICK_MS,
    );
    return () => clearInterval(id);
  }, [position.done, offsetMs, startMs]);

  const totalBefore = plan.slice(0, position.phaseIndex).reduce((sum, p) => sum + p.durationInSeconds, 0);
  return {
    ...position,
    // Late joiners arrive part-way through, so this is not always zero at the start.
    elapsedSeconds: position.done ? 0 : totalBefore + plan[position.phaseIndex].durationInSeconds - position.secondsLeft,
    getReadyLeft: countdownLeft(elapsedMs),
    running: !position.done,
  };
};
