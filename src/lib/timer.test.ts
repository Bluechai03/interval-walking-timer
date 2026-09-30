import { describe, expect, it } from "vitest";
import type { Phase } from "./plan";
import { getPosition } from "./timer";

const plan: Phase[] = [
  { type: "fast", durationInSeconds: 10 },
  { type: "slow", durationInSeconds: 20 },
];

describe("getPosition", () => {
  it("starts at the first phase with its full time left", () => {
    expect(getPosition(plan, 0)).toEqual({
      phaseIndex: 0,
      secondsLeft: 10,
      fractionLeft: 1,
      done: false,
    });
  });

  it("rounds seconds left up and reports the fraction left", () => {
    const position = getPosition(plan, 2500);
    expect(position.phaseIndex).toBe(0);
    expect(position.secondsLeft).toBe(8);
    expect(position.fractionLeft).toBeCloseTo(0.75);
  });

  it("moves to the next phase exactly at the boundary", () => {
    expect(getPosition(plan, 10_000)).toMatchObject({
      phaseIndex: 1,
      secondsLeft: 20,
      fractionLeft: 1,
      done: false,
    });
  });

  it("is still in the first phase just before the boundary", () => {
    expect(getPosition(plan, 9_999)).toMatchObject({
      phaseIndex: 0,
      secondsLeft: 1,
    });
  });

  it("is done once the total time has passed", () => {
    expect(getPosition(plan, 30_000)).toEqual({
      phaseIndex: 1,
      secondsLeft: 0,
      fractionLeft: 0,
      done: true,
    });
    expect(getPosition(plan, 99_000).done).toBe(true);
  });

  it("treats negative elapsed time as the start", () => {
    expect(getPosition(plan, -500)).toMatchObject({
      phaseIndex: 0,
      secondsLeft: 10,
    });
  });
});
