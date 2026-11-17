import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Phase } from "./plan";
import { useRoomTimer } from "./use-room-timer";

const plan: Phase[] = [
  { type: "fast", durationInSeconds: 10 },
  { type: "slow", durationInSeconds: 10 },
];
const at = (ms: number) => new Date(ms).toISOString();
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(100_000);
});
afterEach(() => vi.useRealTimers());

describe("useRoomTimer", () => {
  it("counts down to the start moment, then begins the first phase", () => {
    const { result } = renderHook(() => useRoomTimer(plan, at(105_000), 0));
    expect(result.current.getReadyLeft).toBe(5);
    advance(2000);
    expect(result.current.getReadyLeft).toBe(3);
    advance(3000);
    expect(result.current).toMatchObject({ getReadyLeft: 0, phaseIndex: 0, secondsLeft: 10 });
    advance(4000);
    expect(result.current.secondsLeft).toBe(6);
  });

  it("follows the server's clock, not the phone's", () => {
    // The server is 2 seconds ahead of this phone, so it is already 2 seconds
    // closer to the start moment than the phone's own clock says.
    const { result } = renderHook(() => useRoomTimer(plan, at(105_000), 2000));
    expect(result.current.getReadyLeft).toBe(3);
  });

  it("puts a late joiner in the right place", () => {
    // The walk began 12 seconds ago: two seconds into the slow phase.
    const { result } = renderHook(() => useRoomTimer(plan, at(88_000), 0));
    expect(result.current).toMatchObject({ phaseIndex: 1, secondsLeft: 8, getReadyLeft: 0, done: false });
    expect(result.current.elapsedSeconds).toBe(12);
  });

  it("finishes and stops ticking", () => {
    const { result } = renderHook(() => useRoomTimer(plan, at(70_000), 0));
    expect(result.current).toMatchObject({ done: true, running: false });
  });

  it("goes from fast to slow on the beat", () => {
    const { result } = renderHook(() => useRoomTimer(plan, at(100_000), 0));
    advance(9_900);
    expect(result.current.phaseIndex).toBe(0);
    advance(300);
    expect(result.current.phaseIndex).toBe(1);
  });
});
