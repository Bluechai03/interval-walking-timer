import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Room } from "@/lib/rooms";
import { RoomWalk } from "./room-walk";

const offset = vi.hoisted(() => ({ value: 0 as number | null, approximate: false }));
const push = vi.hoisted(() => vi.fn());
const leaveRoom = vi.hoisted(() => vi.fn());
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
  start_at: new Date(NOW + startOffsetSeconds * 1000).toISOString(),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  offset.value = 0;
  offset.approximate = false;
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
      fireEvent.click(screen.getByRole("button", { name: "Leave the room" }));
    });
    expect(push).toHaveBeenCalledWith("/friends");
    expect(leaveRoom).toHaveBeenCalledWith("r1");
  });
});
