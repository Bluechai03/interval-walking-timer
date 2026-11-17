import { describe, expect, it } from "vitest";
import { isWatchEnabled } from "./use-shortcut-name";

describe("isWatchEnabled", () => {
  it("is off until the walker turns it on", () => {
    expect(isWatchEnabled("")).toBe(false);
  });

  it("is on only when switched on", () => {
    expect(isWatchEnabled("1")).toBe(true);
    expect(isWatchEnabled("0")).toBe(false);
  });
});
