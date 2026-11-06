import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Phase } from "./plan";
import { useTimer } from "./use-timer";

const plan: Phase[] = [
  { type: "fast", durationInSeconds: 10 },
  { type: "slow", durationInSeconds: 10 },
];

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTimer", () => {
  it("is idle before starting and does not tick", () => {
    const { result } = renderHook(() => useTimer(plan));
    advance(5000);
    expect(result.current).toMatchObject({
      running: false,
      started: false,
      phaseIndex: 0,
      secondsLeft: 10,
    });
  });

  it("counts down once started", () => {
    const { result } = renderHook(() => useTimer(plan));
    act(() => result.current.start());
    advance(3000);
    expect(result.current).toMatchObject({
      running: true,
      started: true,
      secondsLeft: 7,
    });
  });

  it("moves to the next phase", () => {
    const { result } = renderHook(() => useTimer(plan));
    act(() => result.current.start());
    advance(12_000);
    expect(result.current).toMatchObject({ phaseIndex: 1, secondsLeft: 8 });
  });

  it("does not count time spent paused", () => {
    const { result } = renderHook(() => useTimer(plan));
    act(() => result.current.start());
    advance(4000);
    act(() => result.current.pause());
    expect(result.current).toMatchObject({
      running: false,
      started: true,
      secondsLeft: 6,
    });

    advance(60_000);
    expect(result.current.secondsLeft).toBe(6);

    act(() => result.current.start());
    advance(2000);
    expect(result.current).toMatchObject({ running: true, secondsLeft: 4 });
  });

  it("resets to the start", () => {
    const { result } = renderHook(() => useTimer(plan));
    act(() => result.current.start());
    advance(4000);
    act(() => result.current.reset());
    expect(result.current).toMatchObject({
      running: false,
      started: false,
      phaseIndex: 0,
      secondsLeft: 10,
    });
  });

  it("stops itself when the last phase finishes", () => {
    const { result } = renderHook(() => useTimer(plan));
    act(() => result.current.start());
    advance(25_000);
    expect(result.current).toMatchObject({ done: true, running: false });

    advance(5000);
    expect(result.current).toMatchObject({ done: true, secondsLeft: 0 });
  });
});

describe("useTimer across a reload", () => {
  it("keeps a running walk going after the page is reloaded", () => {
    const first = renderHook(() => useTimer(plan));
    act(() => first.result.current.start());
    advance(3000);
    first.unmount();

    // The phone was locked for 4 more seconds and the page came back.
    vi.setSystemTime(7000);
    const { result } = renderHook(() => useTimer(plan));
    expect(result.current).toMatchObject({
      ready: true,
      running: true,
      started: true,
      phaseIndex: 0,
      secondsLeft: 3,
    });
  });

  it("restores a paused walk where it was left", () => {
    const first = renderHook(() => useTimer(plan));
    act(() => first.result.current.start());
    advance(4000);
    act(() => first.result.current.pause());
    first.unmount();

    vi.setSystemTime(60_000);
    const { result } = renderHook(() => useTimer(plan));
    expect(result.current).toMatchObject({ running: false, started: true, secondsLeft: 6 });
  });

  it("starts fresh after a reset", () => {
    const first = renderHook(() => useTimer(plan));
    act(() => first.result.current.start());
    advance(2000);
    act(() => first.result.current.reset());
    first.unmount();

    const { result } = renderHook(() => useTimer(plan));
    expect(result.current).toMatchObject({ started: false, running: false, secondsLeft: 10 });
  });

  it("forgets a walk that finished a while ago", () => {
    const first = renderHook(() => useTimer(plan));
    act(() => first.result.current.start());
    first.unmount();

    vi.setSystemTime(60 * 60 * 1000);
    const { result } = renderHook(() => useTimer(plan));
    expect(result.current).toMatchObject({ started: false, secondsLeft: 10 });
  });
});
