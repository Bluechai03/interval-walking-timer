import { describe, expect, it } from "vitest";
import { isIos, watchWorkoutUrl } from "./watch-workout";

describe("watchWorkoutUrl", () => {
  it("opens the named Shortcut and comes back to the timer", () => {
    expect(watchWorkoutUrl("Strut outdoor", "https://strut.app/")).toBe(
      "shortcuts://x-callback-url/run-shortcut?name=Strut%20outdoor&x-success=https%3A%2F%2Fstrut.app%2F",
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
