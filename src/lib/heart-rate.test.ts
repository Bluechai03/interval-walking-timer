import { describe, expect, it } from "vitest";
import { heartRateTarget } from "./heart-rate";

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
