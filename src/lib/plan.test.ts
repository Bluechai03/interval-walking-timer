import { describe, expect, it } from "vitest";
import {
  buildPlan,
  DEFAULT_PLAN_CONFIG,
  isValidPlanValue,
  sanitizePlanConfig,
  totalSeconds,
} from "./plan";

describe("buildPlan", () => {
  it("alternates fast and slow, starting with fast", () => {
    const plan = buildPlan({ fastSeconds: 30, slowSeconds: 60, rounds: 3 });
    expect(plan.map((phase) => phase.type)).toEqual([
      "fast",
      "slow",
      "fast",
      "slow",
      "fast",
      "slow",
    ]);
  });

  it("uses the fast and slow durations independently", () => {
    const plan = buildPlan({ fastSeconds: 30, slowSeconds: 60, rounds: 1 });
    expect(plan).toEqual([
      { type: "fast", durationInSeconds: 30 },
      { type: "slow", durationInSeconds: 60 },
    ]);
  });

  it("uses the default config when none is given", () => {
    expect(buildPlan()).toHaveLength(DEFAULT_PLAN_CONFIG.rounds * 2);
  });
});

describe("totalSeconds", () => {
  it("adds up every phase", () => {
    const plan = buildPlan({ fastSeconds: 30, slowSeconds: 60, rounds: 4 });
    expect(totalSeconds(plan)).toBe(360);
  });

  it("is zero for an empty plan", () => {
    expect(totalSeconds([])).toBe(0);
  });
});

describe("isValidPlanValue", () => {
  it("accepts integers within the limits, inclusive", () => {
    expect(isValidPlanValue("rounds", 1)).toBe(true);
    expect(isValidPlanValue("rounds", 20)).toBe(true);
    expect(isValidPlanValue("fastSeconds", 5)).toBe(true);
    expect(isValidPlanValue("fastSeconds", 3600)).toBe(true);
  });

  it("rejects out-of-range, fractional, non-numeric and NaN values", () => {
    expect(isValidPlanValue("rounds", 0)).toBe(false);
    expect(isValidPlanValue("rounds", 21)).toBe(false);
    expect(isValidPlanValue("fastSeconds", 4)).toBe(false);
    expect(isValidPlanValue("slowSeconds", 3601)).toBe(false);
    expect(isValidPlanValue("rounds", 2.5)).toBe(false);
    expect(isValidPlanValue("rounds", "3")).toBe(false);
    expect(isValidPlanValue("rounds", NaN)).toBe(false);
  });
});

describe("sanitizePlanConfig", () => {
  it("keeps valid values", () => {
    const config = { fastSeconds: 120, slowSeconds: 90, rounds: 8 };
    expect(sanitizePlanConfig(config)).toEqual(config);
  });

  it("falls back to defaults for missing fields", () => {
    expect(sanitizePlanConfig({})).toEqual(DEFAULT_PLAN_CONFIG);
  });

  it("replaces only the invalid fields", () => {
    expect(
      sanitizePlanConfig({ fastSeconds: 120, slowSeconds: 1, rounds: 99 }),
    ).toEqual({
      fastSeconds: 120,
      slowSeconds: DEFAULT_PLAN_CONFIG.slowSeconds,
      rounds: DEFAULT_PLAN_CONFIG.rounds,
    });
  });
});
