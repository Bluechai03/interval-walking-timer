import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The setting is kept in module state as well as localStorage, so each test
// loads a fresh copy of the hook to stand in for opening the app again.
const load = async () => {
  vi.resetModules();
  return (await import("./use-muted")).useMuted;
};

beforeEach(() => localStorage.clear());

describe("useMuted", () => {
  it("is off by default", async () => {
    const useMuted = await load();
    const { result } = renderHook(() => useMuted());
    expect(result.current.muted).toBe(false);
  });

  it("switches on and off", async () => {
    const useMuted = await load();
    const { result } = renderHook(() => useMuted());
    act(() => result.current.setMuted(true));
    expect(result.current.muted).toBe(true);
    act(() => result.current.setMuted(false));
    expect(result.current.muted).toBe(false);
  });

  it("is remembered when the app is opened again", async () => {
    const first = await load();
    const a = renderHook(() => first());
    act(() => a.result.current.setMuted(true));
    a.unmount();

    const second = await load();
    const b = renderHook(() => second());
    expect(b.result.current.muted).toBe(true);
  });

  it("still switches when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const useMuted = await load();
    const { result } = renderHook(() => useMuted());
    act(() => result.current.setMuted(true));
    expect(result.current.muted).toBe(true);
    vi.restoreAllMocks();
  });
});
