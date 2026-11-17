import { describe, expect, it } from "vitest";
import { DEFAULT_WATCH_DELAY_SECONDS, parseWatchDelay } from "./use-watch-delay";

describe("parseWatchDelay", () => {
  it("defaults to 6 seconds when nothing is saved", () => {
    expect(parseWatchDelay("")).toBe(DEFAULT_WATCH_DELAY_SECONDS);
    expect(DEFAULT_WATCH_DELAY_SECONDS).toBe(6);
  });

  it("keeps a valid value, including 0", () => {
    expect(parseWatchDelay("9")).toBe(9);
    expect(parseWatchDelay("0")).toBe(0);
  });

  it("falls back for anything out of range or not whole", () => {
    expect(parseWatchDelay("-1")).toBe(DEFAULT_WATCH_DELAY_SECONDS);
    expect(parseWatchDelay("31")).toBe(DEFAULT_WATCH_DELAY_SECONDS);
    expect(parseWatchDelay("4.5")).toBe(DEFAULT_WATCH_DELAY_SECONDS);
    expect(parseWatchDelay("soon")).toBe(DEFAULT_WATCH_DELAY_SECONDS);
  });
});
