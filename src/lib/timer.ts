import type { Phase } from "./plan";

export type TimerPosition = {
  phaseIndex: number;
  secondsLeft: number;
  /** Portion of the current phase still to go, from 1 (just started) to 0. */
  fractionLeft: number;
  done: boolean;
};

export const getPosition = (plan: Phase[], elapsedMs: number): TimerPosition => {
  let remaining = Math.max(0, elapsedMs);

  for (let i = 0; i < plan.length; i++) {
    const durationMs = plan[i].durationInSeconds * 1000;
    if (remaining < durationMs) {
      return {
        phaseIndex: i,
        secondsLeft: Math.ceil((durationMs - remaining) / 1000),
        fractionLeft: (durationMs - remaining) / durationMs,
        done: false,
      };
    }
    remaining -= durationMs;
  }

  return { phaseIndex: plan.length - 1, secondsLeft: 0, fractionLeft: 0, done: true };
};
