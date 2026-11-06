import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { playCue, playHeadsUp } from "./cues";
import type { Phase } from "./plan";
import { useCues } from "./use-cues";

vi.mock("./cues", () => ({
  createAudioContext: () => null,
  playCue: vi.fn(),
  playHeadsUp: vi.fn(),
}));

const plan: Phase[] = [
  { type: "fast", durationInSeconds: 10 },
  { type: "slow", durationInSeconds: 10 },
];

type State = Parameters<typeof useCues>[0];

const idle: State = {
  plan,
  phaseIndex: 0,
  running: false,
  started: false,
  done: false,
};

const setup = (initial: State = idle) =>
  renderHook((props: State) => useCues(props), { initialProps: initial });

beforeEach(() => {
  vi.mocked(playCue).mockClear();
  vi.mocked(playHeadsUp).mockClear();
});

describe("useCues", () => {
  it("is silent before the timer starts", () => {
    setup();
    expect(playCue).not.toHaveBeenCalled();
  });

  it("announces the first phase on start", () => {
    const { rerender } = setup();
    rerender({ ...idle, running: true, started: true });
    expect(playCue).toHaveBeenCalledTimes(1);
    expect(playCue).toHaveBeenLastCalledWith("fast", null);
  });

  it("cues once per phase change and not on repeated renders", () => {
    const { rerender } = setup();
    const running = { ...idle, running: true, started: true };
    rerender(running);
    rerender(running);
    rerender({ ...running, phaseIndex: 1 });
    rerender({ ...running, phaseIndex: 1 });
    expect(playCue).toHaveBeenCalledTimes(2);
    expect(playCue).toHaveBeenLastCalledWith("slow", null);
  });

  it("stays quiet while paused and on resume", () => {
    const { rerender } = setup();
    const running = { ...idle, running: true, started: true };
    rerender(running);
    rerender({ ...running, running: false }); // pause
    rerender(running); // resume, same phase
    expect(playCue).toHaveBeenCalledTimes(1);
  });

  it("does not cue a phase change that happens while paused", () => {
    const { rerender } = setup();
    const running = { ...idle, running: true, started: true };
    rerender(running);
    rerender({ ...running, running: false, phaseIndex: 1 });
    expect(playCue).toHaveBeenCalledTimes(1);
  });

  it("announces done once", () => {
    const { rerender } = setup();
    const running = { ...idle, running: true, started: true };
    rerender(running);
    const done = { ...running, running: false, phaseIndex: 1, done: true };
    rerender(done);
    rerender(done);
    expect(playCue).toHaveBeenCalledTimes(2);
    expect(playCue).toHaveBeenLastCalledWith("done", null);
  });

  it("announces the first phase again after a reset", () => {
    const { rerender } = setup();
    const running = { ...idle, running: true, started: true };
    rerender(running);
    rerender(idle); // reset
    rerender(running);
    expect(playCue).toHaveBeenCalledTimes(2);
    expect(playCue).toHaveBeenLastCalledWith("fast", null);
  });
});

describe("useCues heads-up", () => {
  const longPlan: Phase[] = [
    { type: "fast", durationInSeconds: 180 },
    { type: "slow", durationInSeconds: 180 },
  ];
  const running: State = {
    plan: longPlan,
    phaseIndex: 0,
    running: true,
    started: true,
    done: false,
    secondsLeft: 60,
  };
  const setupLong = () => renderHook((props: State) => useCues(props), { initialProps: running });

  it("warns once when 10 seconds are left in a phase", () => {
    const { rerender } = setupLong();
    rerender({ ...running, secondsLeft: 11 });
    expect(playHeadsUp).not.toHaveBeenCalled();
    rerender({ ...running, secondsLeft: 10 });
    rerender({ ...running, secondsLeft: 10 });
    rerender({ ...running, secondsLeft: 9 });
    expect(playHeadsUp).toHaveBeenCalledTimes(1);
  });

  it("warns again in the next phase", () => {
    const { rerender } = setupLong();
    rerender({ ...running, secondsLeft: 10 });
    rerender({ ...running, phaseIndex: 1, secondsLeft: 180 });
    rerender({ ...running, phaseIndex: 1, secondsLeft: 10 });
    expect(playHeadsUp).toHaveBeenCalledTimes(2);
  });

  it("stays quiet while paused", () => {
    const { rerender } = setupLong();
    rerender({ ...running, running: false, secondsLeft: 10 });
    expect(playHeadsUp).not.toHaveBeenCalled();
  });

  it("skips phases too short to need a warning", () => {
    const { rerender } = renderHook((props: State) => useCues(props), {
      initialProps: { ...running, plan, secondsLeft: 20 },
    });
    rerender({ ...running, plan, secondsLeft: 10 });
    expect(playHeadsUp).not.toHaveBeenCalled();
  });
});
