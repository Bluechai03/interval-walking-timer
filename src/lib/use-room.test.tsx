import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Room } from "./rooms";

const fetchRoom = vi.hoisted(() => vi.fn());

vi.mock("./rooms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./rooms")>()),
  fetchRoom,
  touchRoom: vi.fn(),
}));
vi.mock("./supabase", () => ({ getSupabase: () => null }));
vi.mock("./use-server-offset", () => ({ useServerOffset: () => 0 }));

import { useRoom } from "./use-room";

const started: Room = {
  id: "r1",
  code: "BCDF",
  host_id: "host",
  status: "walking",
  fast_seconds: 180,
  slow_seconds: 180,
  rounds: 5,
  get_ready_seconds: 10,
  activity: "walk",
  start_at: "2026-11-19T10:00:00.000Z",
};
const gone = { ok: false, message: "That didn't work." };

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useRoom with a signal that comes and goes", () => {
  it("keeps showing the walk when a later check gets no answer, and says it is reconnecting", async () => {
    fetchRoom.mockResolvedValueOnce({ ok: true, value: { room: started, members: [] } });
    const { result } = renderHook(() => useRoom("r1"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.status === "ready" && result.current.connected).toBe(true);

    fetchRoom.mockResolvedValue(gone);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(result.current.status).toBe("ready");
    expect(result.current.status === "ready" && result.current.connected).toBe(false);
  });

  it("carries on with the saved walk after a reload with no signal", async () => {
    fetchRoom.mockResolvedValueOnce({ ok: true, value: { room: started, members: [] } });
    const first = renderHook(() => useRoom("r1"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    first.unmount();

    fetchRoom.mockResolvedValue(gone);
    const { result } = renderHook(() => useRoom("r1"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.status).toBe("ready");
    if (result.current.status === "ready") {
      expect(result.current.room.start_at).toBe(started.start_at);
      expect(result.current.connected).toBe(false);
    }
  });

  it("still shows the error when nothing was saved for this crew", async () => {
    fetchRoom.mockResolvedValue(gone);
    const { result } = renderHook(() => useRoom("other"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.status).toBe("error");
  });
});
