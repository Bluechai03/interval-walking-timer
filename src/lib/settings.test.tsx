import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fresh = async () => {
  vi.resetModules();
  return import("./settings");
};

beforeEach(() => localStorage.clear());

describe("settings: what a phone already has saved must keep working", () => {
  it("keeps every key under its present name", async () => {
    const { SETTINGS } = await fresh();
    expect(Object.fromEntries(Object.entries(SETTINGS).map(([id, s]) => [id, s.key]))).toEqual({
      activity: "activity",
      age: "age",
      getReady: "get-ready-seconds",
      watchDelay: "watch-delay-seconds",
      muted: "muted",
      plan: "plan-config",
      watchEnabled: "watch-enabled",
      watchShortcut: "watch-shortcut",
      watchShortcutEnd: "watch-shortcut-end",
      remindersNoteHidden: "reminders-note-hidden",
      phasePushEnabled: "phase-push-enabled",
      phasePushAsked: "phase-push-asked",
    });
  });

  it("saves each kind of value in the same shape as before", async () => {
    const { setSetting } = await fresh();
    setSetting("activity", "elliptical");
    setSetting("age", 58);
    setSetting("getReady", 0);
    setSetting("muted", true);
    setSetting("watchEnabled", false);
    setSetting("watchShortcut", "My Shortcut");
    setSetting("phasePushAsked", true);
    setSetting("phasePushEnabled", true);
    setSetting("plan", { fastSeconds: 120, slowSeconds: 60, rounds: 8 });
    expect(localStorage.getItem("activity")).toBe("elliptical");
    expect(localStorage.getItem("age")).toBe("58");
    expect(localStorage.getItem("get-ready-seconds")).toBe("0");
    expect(localStorage.getItem("muted")).toBe("1");
    expect(localStorage.getItem("watch-enabled")).toBe("0");
    expect(localStorage.getItem("watch-shortcut")).toBe("My Shortcut");
    expect(localStorage.getItem("phase-push-asked")).toBe("1");
    expect(localStorage.getItem("phase-push-enabled")).toBe("1");
    expect(JSON.parse(localStorage.getItem("plan-config") ?? "")).toEqual({ fastSeconds: 120, slowSeconds: 60, rounds: 8 });
  });

  it("removes the reminders flag when it is switched off, as before", async () => {
    const { setSetting } = await fresh();
    setSetting("phasePushEnabled", true);
    setSetting("phasePushEnabled", false);
    expect(localStorage.getItem("phase-push-enabled")).toBeNull();
  });

  it("reads values saved by an earlier version", async () => {
    localStorage.setItem("age", "41");
    localStorage.setItem("muted", "1");
    localStorage.setItem("activity", "bike");
    localStorage.setItem("plan-config", JSON.stringify({ fastSeconds: 240, slowSeconds: 120, rounds: 3 }));
    const { getSetting } = await fresh();
    expect(getSetting("age")).toBe(41);
    expect(getSetting("muted")).toBe(true);
    expect(getSetting("activity")).toBe("bike");
    expect(getSetting("plan")).toEqual({ fastSeconds: 240, slowSeconds: 120, rounds: 3 });
  });
});

describe("settings: defaults and bad data", () => {
  it("gives the default when nothing is saved", async () => {
    const { getSetting } = await fresh();
    expect(getSetting("activity")).toBe("walk");
    expect(getSetting("age")).toBe(23);
    expect(getSetting("getReady")).toBe(5);
    expect(getSetting("watchDelay")).toBe(6);
    expect(getSetting("muted")).toBe(false);
    expect(getSetting("watchEnabled")).toBe(false);
    expect(getSetting("plan")).toEqual({ fastSeconds: 180, slowSeconds: 180, rounds: 5 });
  });

  it("gives the default, and never throws, for anything that doesn't fit", async () => {
    localStorage.setItem("age", "abc");
    localStorage.setItem("activity", "run");
    localStorage.setItem("plan-config", "{not json");
    localStorage.setItem("get-ready-seconds", "99");
    const { getSetting } = await fresh();
    expect(getSetting("age")).toBe(23);
    expect(getSetting("activity")).toBe("walk");
    expect(getSetting("plan")).toEqual({ fastSeconds: 180, slowSeconds: 180, rounds: 5 });
    expect(getSetting("getReady")).toBe(5);
  });
});

describe("useSetting", () => {
  it("follows a change made anywhere, including another tab", async () => {
    const { useSetting } = await fresh();
    const { result } = renderHook(() => useSetting("age"));
    expect(result.current[0]).toBe(23);
    act(() => result.current[1](40));
    expect(result.current[0]).toBe(40);
    act(() => {
      localStorage.setItem("age", "61");
      window.dispatchEvent(new StorageEvent("storage", { key: "age" }));
    });
    expect(result.current[0]).toBe(61);
  });
});
