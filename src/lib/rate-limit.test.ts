import { describe, expect, it } from "vitest";
import { createRateLimit } from "./rate-limit";

describe("createRateLimit", () => {
  it("lets a key through once, then holds it back until the window has passed", () => {
    const limit = createRateLimit({ max: 1, windowMs: 5000 });
    expect(limit.allow("a", 0)).toBe(true);
    expect(limit.allow("a", 4999)).toBe(false);
    expect(limit.allow("a", 5000)).toBe(true);
  });

  it("counts each key on its own", () => {
    const limit = createRateLimit({ max: 1, windowMs: 5000 });
    expect(limit.allow("a", 0)).toBe(true);
    expect(limit.allow("b", 1)).toBe(true);
  });

  it("allows up to max in a window", () => {
    const limit = createRateLimit({ max: 2, windowMs: 1000 });
    expect([limit.allow("a", 0), limit.allow("a", 1), limit.allow("a", 2)]).toEqual([true, true, false]);
  });

  it("does not count a refused call against the key", () => {
    const limit = createRateLimit({ max: 1, windowMs: 1000 });
    limit.allow("a", 0);
    limit.allow("a", 500);
    expect(limit.allow("a", 1000)).toBe(true);
  });
});
