import { describe, expect, it } from "vitest";
import { DEFAULT_GET_READY_SECONDS, parseGetReady } from "./use-get-ready";

describe("parseGetReady", () => {
  it("allows 0 to turn it off", () => {
    expect(parseGetReady("0")).toBe(0);
  });

  it("falls back for values out of range or not whole numbers", () => {
    expect(parseGetReady("-1")).toBe(DEFAULT_GET_READY_SECONDS);
    expect(parseGetReady("31")).toBe(DEFAULT_GET_READY_SECONDS);
    expect(parseGetReady("2.5")).toBe(DEFAULT_GET_READY_SECONDS);
    expect(parseGetReady("abc")).toBe(DEFAULT_GET_READY_SECONDS);
  });
});
