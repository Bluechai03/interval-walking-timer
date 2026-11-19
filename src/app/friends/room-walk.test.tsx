import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Room } from "@/lib/rooms";
import { RoomWalk } from "./room-walk";

const offset = vi.hoisted(() => ({ value: 0 as number | null, approximate: false }));
const push = vi.hoisted(() => vi.fn());
const leaveRoom = vi.hoisted(() => vi.fn());
const watchState = vi.hoisted(() => ({ ios: false, standalone: true, start: "", end: "", delay: 6 }));
const openShortcut = vi.hoisted(() => vi.fn());
const useCues = vi.hoisted(() => vi.fn(() => ({ prime: () => {}, unlock: () => Promise.resolve(true) })));
const usePhasePush = vi.hoisted(() =>
  vi.fn(() => ({ state: "off", failed: false, enable: () => {}, disable: () => {}, shouldAsk: false, dismissAsk: () => {} })),
);

vi.mock("@/lib/use-server-offset", () => ({
  useOffsetOrFallback: () => ({ offset: offset.value, approximate: offset.approximate }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/rooms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rooms")>()),
  leaveRoom,
}));
vi.mock("@/lib/use-ios", () => ({ useIos: () => watchState.ios }));
vi.mock("@/lib/use-standalone", () => ({ useStandalone: () => watchState.standalone }));
vi.mock("@/lib/use-shortcut-name", () => ({
  useWatchShortcuts: () => ({ startShortcut: watchState.start, endShortcut: watchState.end }),
  useNamed: () => ({ name: "", setName: () => {} }),
}));
vi.mock("@/lib/use-watch-delay", () => ({ useWatchDelay: () => ({ seconds: watchState.delay }) }));
vi.mock("@/lib/watch-workout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/watch-workout")>()),
  openShortcut,
}));
vi.mock("@/lib/use-cues", () => ({ useCues, primeAudio: () => {} }));
vi.mock("@/lib/use-phase-push", () => ({ usePhasePush }));
vi.mock("@/lib/use-wake-lock", () => ({ useWakeLock: () => {} }));

const NOW = Date.parse("2026-11-17T10:00:00Z");
const room = (startOffsetSeconds: number): Room => ({
  id: "r1",
  code: "BCDF",
  host_id: "host",
  status: "walking",
  fast_seconds: 60,
  slow_seconds: 60,
  rounds: 2,
  get_ready_seconds: 5,
  activity: "walk",
  start_at: new Date(NOW + startOffsetSeconds * 1000).toISOString(),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  offset.value = 0;
  offset.approximate = false;
  localStorage.clear();
  Object.assign(watchState, { ios: false, standalone: true, start: "", end: "", delay: 6 });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("RoomWalk", () => {
  it("waits until the server's clock has been read", () => {
    offset.value = null;
    render(<RoomWalk room={room(5)} roomId="r1" />);
    expect(screen.getByText("One moment…")).toBeTruthy();
  });

  it("says so when it had to use the phone's own clock", () => {
    offset.value = 0;
    offset.approximate = true;
    render(<RoomWalk room={room(5)} roomId="r1" />);
    expect(screen.getByText(/couldn't check the clock/)).toBeTruthy();
  });

  it("says it is reconnecting, and that the walk keeps counting, when the live connection is down", () => {
    render(<RoomWalk room={room(5)} roomId="r1" connected={false} />);
    expect(screen.getByText(/Reconnecting/)).toBeTruthy();
    expect(screen.getByText(/keeps counting/)).toBeTruthy();
    cleanup();
    render(<RoomWalk room={room(5)} roomId="r1" />);
    expect(screen.queryByText(/Reconnecting/)).toBeNull();
  });

  it("says nothing about the clock when it was read", () => {
    render(<RoomWalk room={room(5)} roomId="r1" />);
    expect(screen.queryByText(/couldn't check the clock/)).toBeNull();
  });

  it("counts everyone in, then starts the first phase together", () => {
    render(<RoomWalk room={room(5)} roomId="r1" />);
    expect(screen.getByText("Get ready")).toBeTruthy();
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("5 seconds");
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByText("Walk fast")).toBeTruthy();
  });

  it("has no Start, Pause or Reset: the host's start moment is the only clock", () => {
    render(<RoomWalk room={room(5)} roomId="r1" />);
    for (const name of ["Start", "Pause", "Resume", "Reset"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(screen.getByRole("button", { name: "Leave this walk" })).toBeTruthy();
  });

  it("puts someone who joins late in the right phase", () => {
    // Started 70 seconds ago: ten seconds into the first slow phase.
    render(<RoomWalk room={room(-70)} roomId="r1" />);
    expect(screen.getByText("Walk slow")).toBeTruthy();
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("0:50");
  });

  it("follows the server clock when the phone's is behind", () => {
    // The phone is 3 seconds behind the server, so the walk is 3 seconds further on.
    offset.value = 3000;
    render(<RoomWalk room={room(5)} roomId="r1" />);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("2 seconds");
  });

  it("schedules reminders from the room's plan and clock", () => {
    render(<RoomWalk room={room(-70)} roomId="r1" />);
    expect(usePhasePush).toHaveBeenCalledWith(
      expect.objectContaining({
        config: { fastSeconds: 60, slowSeconds: 60, rounds: 2 },
        elapsedSeconds: 70,
        running: true,
        done: false,
      }),
    );
  });

  it("never covers the countdown with the reminders pop-up", () => {
    usePhasePush.mockReturnValueOnce({ state: "off", failed: false, enable: () => {}, disable: () => {}, shouldAsk: true, dismissAsk: () => {} });
    render(<RoomWalk room={room(5)} roomId="r1" />);
    expect(screen.queryByText("Want a nudge at each change?")).toBeNull();
    expect(screen.getByText("Lock-screen reminders")).toBeTruthy();
  });

  it("says the walk is complete, and offers to leave", async () => {
    render(<RoomWalk room={room(-500)} roomId="r1" />);
    expect(screen.getByText("Walk complete")).toBeTruthy();
    leaveRoom.mockResolvedValue({ ok: true, value: null });
    // Fake timers are on, so let the leave finish by hand, not with waitFor.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leave the crew" }));
    });
    expect(push).toHaveBeenCalledWith("/friends");
    expect(leaveRoom).toHaveBeenCalledWith("r1");
  });
});

describe("RoomWalk, the host leaving", () => {
  it("asks the host first, and says the walk carries on", () => {
    render(<RoomWalk room={room(-30)} roomId="r1" isHost />);
    fireEvent.click(screen.getByRole("button", { name: "Leave this walk" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Leave the walk?");
    expect(dialog.textContent).toContain("carries on for everyone else");
    expect(leaveRoom).not.toHaveBeenCalled();
  });

  it("stays in the walk if the host changes their mind", () => {
    render(<RoomWalk room={room(-30)} roomId="r1" isHost />);
    fireEvent.click(screen.getByRole("button", { name: "Leave this walk" }));
    fireEvent.click(screen.getByRole("button", { name: "Stay in the walk" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(leaveRoom).not.toHaveBeenCalled();
  });

  it("leaves once the host confirms", async () => {
    leaveRoom.mockResolvedValue({ ok: true, value: null });
    render(<RoomWalk room={room(-30)} roomId="r1" isHost />);
    fireEvent.click(screen.getByRole("button", { name: "Leave this walk" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leave the walk" }));
    });
    expect(leaveRoom).toHaveBeenCalledWith("r1");
    expect(push).toHaveBeenCalledWith("/friends");
  });

  it("does not ask a guest", async () => {
    leaveRoom.mockResolvedValue({ ok: true, value: null });
    render(<RoomWalk room={room(-30)} roomId="r1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leave this walk" }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(leaveRoom).toHaveBeenCalledWith("r1");
  });

  it("does not ask the host once the walk is over", async () => {
    leaveRoom.mockResolvedValue({ ok: true, value: null });
    render(<RoomWalk room={room(-500)} roomId="r1" isHost />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leave the crew" }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(leaveRoom).toHaveBeenCalledWith("r1");
  });
});

describe("RoomWalk, the Apple Watch", () => {
  const START_URL = "shortcuts://run-shortcut?name=Strut%20Outdoor";
  const END_URL = "shortcuts://run-shortcut?name=Strut%20End";
  const watchOn = () => Object.assign(watchState, { ios: true, start: "Strut Outdoor", end: "Strut End" });

  it("opens the Shortcut by itself, one Watch delay before the walk begins", () => {
    watchOn();
    render(<RoomWalk room={room(10)} roomId="r1" />);
    act(() => vi.advanceTimersByTime(3_900));
    expect(openShortcut).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(openShortcut).toHaveBeenCalledTimes(1);
    expect(openShortcut).toHaveBeenCalledWith(START_URL);
  });

  it("follows the server clock when it times the launch", () => {
    watchOn();
    offset.value = 2000;
    render(<RoomWalk room={room(10)} roomId="r1" />);
    // The server is 2 seconds ahead, so the walk is 8 seconds off, not 10.
    act(() => vi.advanceTimersByTime(1_900));
    expect(openShortcut).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(openShortcut).toHaveBeenCalledWith(START_URL);
  });

  it("always offers a Start my Watch button, and the tap opens the Shortcut at once", () => {
    watchOn();
    render(<RoomWalk room={room(10)} roomId="r1" />);
    fireEvent.click(screen.getByRole("button", { name: "Start my Watch" }));
    expect(openShortcut).toHaveBeenCalledWith(START_URL);
    // Done: the button goes, and the automatic launch doesn't happen a second time.
    expect(screen.queryByRole("button", { name: "Start my Watch" })).toBeNull();
    act(() => vi.advanceTimersByTime(10_000));
    expect(openShortcut).toHaveBeenCalledTimes(1);
  });

  it("launches at once if the countdown is already shorter than the Watch delay", () => {
    watchOn();
    render(<RoomWalk room={room(3)} roomId="r1" />);
    act(() => vi.advanceTimersByTime(10));
    expect(openShortcut).toHaveBeenCalledWith(START_URL);
  });

  it("leaves someone who joins after the start to the button, since the Watch would be late", () => {
    watchOn();
    render(<RoomWalk room={room(-30)} roomId="r1" />);
    act(() => vi.advanceTimersByTime(10_000));
    expect(openShortcut).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start my Watch" }));
    expect(openShortcut).toHaveBeenCalledWith(START_URL);
  });

  it("shows nothing about the Watch when the switch is off, or away from iOS", () => {
    render(<RoomWalk room={room(10)} roomId="r1" />);
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.queryByRole("button", { name: "Start my Watch" })).toBeNull();
    expect(openShortcut).not.toHaveBeenCalled();
    cleanup();
    Object.assign(watchState, { ios: false, start: "Strut Outdoor" });
    render(<RoomWalk room={room(10)} roomId="r1" />);
    expect(screen.queryByRole("button", { name: "Start my Watch" })).toBeNull();
  });

  it("in a browser tab, says so and neither launches nor offers the Watch", () => {
    watchOn();
    watchState.standalone = false;
    render(<RoomWalk room={room(10)} roomId="r1" />);
    expect(screen.getByText(/only starts from the Strut app on your Home Screen/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start my Watch" })).toBeNull();
    act(() => vi.advanceTimersByTime(20_000));
    expect(openShortcut).not.toHaveBeenCalled();
  });

  it("stays quiet about browser tabs in the Home Screen app", () => {
    watchOn();
    render(<RoomWalk room={room(10)} roomId="r1" />);
    expect(screen.queryByText(/only starts from the Strut app on your Home Screen/)).toBeNull();
  });

  it("ends the workout a moment after the walk finishes", () => {
    watchOn();
    localStorage.setItem("watch-workout", "started");
    // Five seconds from the end of a 240 second walk.
    render(<RoomWalk room={room(-235)} roomId="r1" />);
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByText("Walk complete")).toBeTruthy();
    act(() => vi.advanceTimersByTime(2_400));
    expect(openShortcut).not.toHaveBeenCalledWith(END_URL);
    act(() => vi.advanceTimersByTime(200));
    expect(openShortcut).toHaveBeenCalledWith(END_URL);
  });

  it("does not end a workout for a walk that was already over when the page opened", () => {
    watchOn();
    localStorage.setItem("watch-workout", "started");
    render(<RoomWalk room={room(-500)} roomId="r1" />);
    act(() => vi.advanceTimersByTime(10_000));
    expect(openShortcut).not.toHaveBeenCalled();
  });

  it("offers End Watch workout on the finished screen", () => {
    watchOn();
    localStorage.setItem("watch-workout", "started");
    render(<RoomWalk room={room(-500)} roomId="r1" />);
    fireEvent.click(screen.getByRole("button", { name: "End Watch workout" }));
    expect(openShortcut).toHaveBeenCalledWith(END_URL);
  });

  it("ends the workout too when someone leaves the walk early", async () => {
    watchOn();
    localStorage.setItem("watch-workout", "started");
    leaveRoom.mockResolvedValue({ ok: true, value: null });
    render(<RoomWalk room={room(-30)} roomId="r1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leave this walk" }));
    });
    expect(leaveRoom).toHaveBeenCalledWith("r1");
    expect(openShortcut).toHaveBeenCalledWith(END_URL);
  });

  it("does not open any Shortcut for someone whose workout Strut never started", async () => {
    watchOn();
    leaveRoom.mockResolvedValue({ ok: true, value: null });
    render(<RoomWalk room={room(-30)} roomId="r1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leave this walk" }));
    });
    expect(openShortcut).not.toHaveBeenCalled();
  });
});

describe("RoomWalk, the activity the host chose", () => {
  it("uses the elliptical's words on the screen and in the reminders", () => {
    const base = room(-30);
    render(<RoomWalk room={{ ...base, activity: "elliptical" }} roomId="r1" />);
    expect(screen.getByText("Push harder")).toBeTruthy();
    expect(screen.queryByText("Walk fast")).toBeNull();
    expect(useCues).toHaveBeenCalledWith(expect.objectContaining({ activity: "elliptical" }));
    expect(usePhasePush).toHaveBeenCalledWith(expect.objectContaining({ activity: "elliptical" }));
  });

  it("says the workout is complete at the end", () => {
    render(<RoomWalk room={{ ...room(-500), activity: "elliptical" }} roomId="r1" />);
    expect(screen.getByText("Workout complete")).toBeTruthy();
  });

  it("keeps the walking words for a walk, and for anything it doesn't know", () => {
    render(<RoomWalk room={{ ...room(-30), activity: "swimming" }} roomId="r1" />);
    expect(screen.getByText("Walk fast")).toBeTruthy();
  });
});
