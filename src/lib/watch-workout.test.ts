import { describe, expect, it } from "vitest";
import {
  clearWorkoutFlag,
  isIos,
  markWorkoutStarted,
  takeWorkoutEnd,
  watchWorkoutUrl,
} from "./watch-workout";

const fakeStore = (): Storage => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as Storage;
};

describe("watchWorkoutUrl", () => {
  it("opens the named Shortcut", () => {
    expect(watchWorkoutUrl("Strut Outdoor")).toBe("shortcuts://run-shortcut?name=Strut%20Outdoor");
  });

  it("asks for no way back, so iOS never opens Safari", () => {
    expect(watchWorkoutUrl("Strut Outdoor")).not.toContain("x-success");
    expect(watchWorkoutUrl("Strut Outdoor")).not.toContain("x-callback-url");
  });

  it("makes nothing when no name is set", () => {
    expect(watchWorkoutUrl("")).toBeNull();
    expect(watchWorkoutUrl("   ")).toBeNull();
  });
});

describe("isIos", () => {
  it("knows iPhones", () => {
    expect(isIos("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(true);
  });

  it("knows iPads that call themselves Macs", () => {
    expect(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
  });

  it("leaves out Macs and Android", () => {
    expect(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false);
    expect(isIos("Mozilla/5.0 (Linux; Android 14)")).toBe(false);
  });
});

describe("ending the workout", () => {
  it("does nothing when Strut never started a workout", () => {
    expect(takeWorkoutEnd(fakeStore())).toBe(false);
  });

  it("ends once after a start", () => {
    const store = fakeStore();
    expect(markWorkoutStarted(store)).toBe(true);
    expect(takeWorkoutEnd(store)).toBe(true);
    expect(takeWorkoutEnd(store)).toBe(false);
  });

  it("lets the walker's own tap end it again", () => {
    const store = fakeStore();
    markWorkoutStarted(store);
    takeWorkoutEnd(store);
    expect(takeWorkoutEnd(store, true)).toBe(true);
  });

  it("forgets a workout that was never launched", () => {
    const store = fakeStore();
    markWorkoutStarted(store);
    clearWorkoutFlag(store);
    expect(takeWorkoutEnd(store)).toBe(false);
  });

  it("does not start when storage fails", () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    } as unknown as Storage;
    expect(markWorkoutStarted(broken)).toBe(false);
  });
});
