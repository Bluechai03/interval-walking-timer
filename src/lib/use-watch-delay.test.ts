import { describe, expect, it } from "vitest";
import { DEFAULT_WATCH_DELAY_SECONDS, parseWatchDelay } from "./use-watch-delay";

describe("parseWatchDelay", () => {
  it("falls back for anything out of range or not whole", () => {
    expect(parseWatchDelay("-1")).toBe(DEFAULT_WATCH_DELAY_SECONDS);
    expect(parseWatchDelay("31")).toBe(DEFAULT_WATCH_DELAY_SECONDS);
    expect(parseWatchDelay("4.5")).toBe(DEFAULT_WATCH_DELAY_SECONDS);
    expect(parseWatchDelay("soon")).toBe(DEFAULT_WATCH_DELAY_SECONDS);
  });
});
