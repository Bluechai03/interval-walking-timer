import { describe, expect, it } from "vitest";
import { checkName, cleanName, suggestName } from "./name-rules";

describe("cleanName", () => {
  it("trims and collapses spaces", () => {
    expect(cleanName("  Anna   M ")).toBe("Anna M");
  });
});

describe("checkName", () => {
  it("accepts a normal name and returns it cleaned", () => {
    expect(checkName(" Anna ")).toEqual({ ok: true, name: "Anna" });
  });

  it("accepts the shortest and longest names", () => {
    expect(checkName("Jo").ok).toBe(true);
    expect(checkName("a".repeat(16)).ok).toBe(true);
  });

  it("rejects names that are too short or too long", () => {
    expect(checkName("J").ok).toBe(false);
    expect(checkName("   ").ok).toBe(false);
    expect(checkName("a".repeat(17)).ok).toBe(false);
  });

  it("rejects control characters", () => {
    expect(checkName("Anna\u0007").ok).toBe(false);
  });

  it("explains a rejection kindly", () => {
    const result = checkName("J");
    expect(result.ok === false && result.message).toContain("at least 2");
  });
});

describe("suggestName", () => {
  it("cuts a long full name to fit", () => {
    expect(suggestName("Anna Katreena Montero Santos").length).toBeLessThanOrEqual(16);
  });

  it("returns nothing for a missing name", () => {
    expect(suggestName(undefined)).toBe("");
  });
});
