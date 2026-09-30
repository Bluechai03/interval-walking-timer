import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { playCue } from "./cues";
import type { Phase } from "./plan";
import { useCues } from "./use-cues";

vi.mock("./cues", () => ({
  createAudioContext: () => null,
  playCue: vi.fn(),
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
