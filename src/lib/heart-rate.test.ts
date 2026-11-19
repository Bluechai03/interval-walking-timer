import { describe, expect, it } from "vitest";
import { effortWords, heartRateTarget, parseAge } from "./heart-rate";

describe("heartRateTarget", () => {
  it("targets a higher rate for fast than slow phases", () => {
    expect(heartRateTarget("fast").average).toBeGreaterThan(
      heartRateTarget("slow").average,
    );
  });

  it("returns an average within the range", () => {
    for (const type of ["fast", "slow"] as const) {
      const { min, max, average } = heartRateTarget(type);
      expect(average).toBeGreaterThanOrEqual(min);
      expect(average).toBeLessThanOrEqual(max);
    }
  });
});

describe("effortWords", () => {
  it("describes fast as brisk and slow as easy, in a few words", () => {
    expect(effortWords("fast")).toBe("Brisk: short sentences only");
    expect(effortWords("slow")).toBe("Easy: you can chat");
  });
});

describe("age", () => {
  it("lowers the target for an older walker", () => {
    expect(heartRateTarget("fast", 60).average).toBeLessThan(heartRateTarget("fast", 23).average);
  });

  it("keeps a good age and falls back to 23 for anything else", () => {
    expect(parseAge("58")).toBe(58);
    for (const bad of ["", "abc", "5", "120", "40.5"]) expect(parseAge(bad)).toBe(23);
  });
});
