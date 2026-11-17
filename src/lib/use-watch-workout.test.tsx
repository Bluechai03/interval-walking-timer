import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWatchSetup, useWatchWorkout } from "./use-watch-workout";

const watchState = vi.hoisted(() => ({ ios: true, standalone: true, start: "Strut Outdoor", end: "Strut End", delay: 6 }));
const openShortcut = vi.hoisted(() => vi.fn());

vi.mock("./use-ios", () => ({ useIos: () => watchState.ios }));
vi.mock("./use-standalone", () => ({ useStandalone: () => watchState.standalone }));
vi.mock("./use-shortcut-name", () => ({
  useWatchShortcuts: () => ({ startShortcut: watchState.start, endShortcut: watchState.end }),
}));
vi.mock("./use-watch-delay", () => ({ useWatchDelay: () => ({ seconds: watchState.delay }) }));
vi.mock("./watch-workout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./watch-workout")>()),
  openShortcut,
}));

const START_URL = "shortcuts://run-shortcut?name=Strut%20Outdoor";
const END_URL = "shortcuts://run-shortcut?name=Strut%20End";

type Walk = { running: boolean; done: boolean; muted?: boolean };
const prime = vi.fn();
const unlock = vi.fn(async () => true);

const setup = (walk: Walk) =>
  renderHook(
    (props: Walk) => {
      const watchSetup = useWatchSetup();
      return { setup: watchSetup, watch: useWatchWorkout(watchSetup, { muted: false, prime, unlock, ...props }) };
    },
    { initialProps: walk },
  );

beforeEach(() => {
  localStorage.clear();
  watchState.ios = true;
  watchState.standalone = true;
  watchState.start = "Strut Outdoor";
  watchState.end = "Strut End";
  watchState.delay = 6;
  unlock.mockResolvedValue(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useWatchSetup", () => {
  it("is on when the switch is on and it's an iPhone", () => {
    const { result } = setup({ running: false, done: false });
    expect(result.current.setup).toMatchObject({ on: true, canEnd: true, delaySeconds: 6 });
  });

  it("is off with the switch off, and off away from iOS", () => {
    watchState.start = "";
    watchState.end = "";
    expect(setup({ running: false, done: false }).result.current.setup).toMatchObject({ on: false, canEnd: false });
    watchState.start = "Strut Outdoor";
    watchState.ios = false;
    expect(setup({ running: false, done: false }).result.current.setup.on).toBe(false);
  });
});

describe("in a browser tab", () => {
  beforeEach(() => {
    watchState.standalone = false;
  });

  it("is off, and says it is the browser that is the problem", () => {
    const { result } = setup({ running: true, done: false });
    expect(result.current.setup).toMatchObject({ on: false, canEnd: false, blockedInBrowser: true });
  });

  it("never opens a Shortcut, because it would pull the walker out of the tab", () => {
    const { result } = setup({ running: true, done: false });
    let launched = true;
    act(() => {
      launched = result.current.watch.start();
    });
    expect(launched).toBe(false);
    act(() => result.current.watch.end(true));
    expect(openShortcut).not.toHaveBeenCalled();
  });

  it("has nothing to block when the switch is off", () => {
    watchState.start = "";
    const { result } = setup({ running: true, done: false });
    expect(result.current.setup.blockedInBrowser).toBe(false);
  });
});

describe("start", () => {
  it("opens the start Shortcut and remembers that it did", () => {
    const { result } = setup({ running: true, done: false });
    let launched = false;
    act(() => {
      launched = result.current.watch.start();
    });
    expect(launched).toBe(true);
    expect(openShortcut).toHaveBeenCalledWith(START_URL);
    expect(result.current.watch.started).toBe(true);
    expect(localStorage.getItem("watch-workout")).toBe("started");
  });

  it("does nothing with the switch off, and forgets any earlier workout", () => {
    watchState.start = "";
    localStorage.setItem("watch-workout", "started");
    const { result } = setup({ running: true, done: false });
    let launched = true;
    act(() => {
      launched = result.current.watch.start();
    });
    expect(launched).toBe(false);
    expect(openShortcut).not.toHaveBeenCalled();
    expect(localStorage.getItem("watch-workout")).toBeNull();
  });
});

describe("end", () => {
  it("opens the end Shortcut once, and only for a workout Strut started", () => {
    const { result } = setup({ running: true, done: false });
    act(() => result.current.watch.end());
    expect(openShortcut).not.toHaveBeenCalled();

    act(() => {
      result.current.watch.start();
    });
    openShortcut.mockClear();
    act(() => result.current.watch.end());
    act(() => result.current.watch.end());
    expect(openShortcut).toHaveBeenCalledTimes(1);
    expect(openShortcut).toHaveBeenCalledWith(END_URL);
  });

  it("lets the walker's own tap end it again", () => {
    const { result } = setup({ running: true, done: false });
    act(() => {
      result.current.watch.start();
    });
    act(() => result.current.watch.end());
    openShortcut.mockClear();
    act(() => result.current.watch.end(true));
    expect(openShortcut).toHaveBeenCalledWith(END_URL);
  });

  it("does nothing without an end Shortcut", () => {
    watchState.end = "";
    const { result } = setup({ running: true, done: false });
    act(() => {
      result.current.watch.start();
    });
    openShortcut.mockClear();
    act(() => result.current.watch.end(true));
    expect(openShortcut).not.toHaveBeenCalled();
  });
});

describe("ending by itself", () => {
  it("ends the workout a moment after a walk finishes in front of us", () => {
    vi.useFakeTimers();
    localStorage.setItem("watch-workout", "started");
    const { rerender } = setup({ running: true, done: false });
    rerender({ running: false, done: true });
    act(() => vi.advanceTimersByTime(2_400));
    expect(openShortcut).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(openShortcut).toHaveBeenCalledWith(END_URL);
  });

  it("does not end a finished walk that was only restored from storage", () => {
    vi.useFakeTimers();
    localStorage.setItem("watch-workout", "started");
    setup({ running: false, done: true });
    act(() => vi.advanceTimersByTime(5_000));
    expect(openShortcut).not.toHaveBeenCalled();
  });
});

describe("sound after Shortcuts", () => {
  const comeBack = () => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  };

  it("asks for a touch when iOS keeps sound locked, and unlocks on the first one", async () => {
    unlock.mockResolvedValue(false);
    const { result } = setup({ running: true, done: false });
    act(() => {
      result.current.watch.start();
    });
    await act(async () => comeBack());
    expect(result.current.watch.soundLocked).toBe(true);
    act(() => {
      document.dispatchEvent(new Event("pointerdown"));
    });
    expect(prime).toHaveBeenCalled();
    expect(result.current.watch.soundLocked).toBe(false);
  });

  it("stays quiet when sound is already allowed", async () => {
    const { result } = setup({ running: true, done: false });
    act(() => {
      result.current.watch.start();
    });
    await act(async () => comeBack());
    expect(result.current.watch.soundLocked).toBe(false);
  });

  it("does nothing if we never left", async () => {
    unlock.mockResolvedValue(false);
    const { result } = setup({ running: true, done: false });
    await act(async () => comeBack());
    expect(unlock).not.toHaveBeenCalled();
    expect(result.current.watch.soundLocked).toBe(false);
  });
});
