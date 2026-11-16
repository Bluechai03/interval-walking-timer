import { describe, expect, it } from "vitest";
import {
  clearWorkoutFlag,
  isIos,
  markWorkoutStarted,
  startReturnUrls,
  takeWorkoutEnd,
  watchReturn,
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
  it("opens the named Shortcut and comes back to the timer", () => {
    expect(watchWorkoutUrl("Strut outdoor", "https://strut.app/")).toBe(
      "shortcuts://x-callback-url/run-shortcut?name=Strut%20outdoor&x-success=https%3A%2F%2Fstrut.app%2F&x-error=https%3A%2F%2Fstrut.app%2F&x-cancel=https%3A%2F%2Fstrut.app%2F",
    );
  });

  it("makes nothing when no name is set", () => {
    expect(watchWorkoutUrl("", "https://strut.app/")).toBeNull();
    expect(watchWorkoutUrl("   ", "https://strut.app/")).toBeNull();
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

describe("coming back from the start Shortcut", () => {
  it("tells success, error and cancel apart", () => {
    const back = startReturnUrls("https://strut.app");
    const url = watchWorkoutUrl("Strut Outdoor", back) ?? "";
    expect(url).toContain("x-success=https%3A%2F%2Fstrut.app%2F%3Fwatch%3Dok");
    expect(url).toContain("x-error=https%3A%2F%2Fstrut.app%2F%3Fwatch%3Derror");
    expect(url).toContain("x-cancel=https%3A%2F%2Fstrut.app%2F%3Fwatch%3Dcancel");
  });

  it("reads the outcome from the address", () => {
    expect(watchReturn("?watch=ok")).toBe("ok");
    expect(watchReturn("?watch=error")).toBe("error");
    expect(watchReturn("?watch=cancel")).toBe("cancel");
    expect(watchReturn("?watch=banana")).toBeNull();
    expect(watchReturn("")).toBeNull();
  });
});
