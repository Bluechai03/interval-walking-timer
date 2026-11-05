import { describe, expect, it } from "vitest";
import { cueSchedule } from "./push-test";

describe("cueSchedule", () => {
  it("alternates fast and slow cues", () => {
    const cues = cueSchedule(4, 30);
    expect(cues.map((c) => c.title)).toEqual(["Walk fast", "Walk slow", "Walk fast", "Walk slow"]);
    expect(cues.map((c) => c.n)).toEqual([1, 2, 3, 4]);
  });

  it("keeps the count and interval within safe limits", () => {
    expect(cueSchedule(100, 30)).toHaveLength(12);
    expect(cueSchedule(0, 30)).toHaveLength(1);
    expect(cueSchedule(3, 1)[0].delaySeconds).toBe(5);
    expect(cueSchedule(3, 999)[0].delaySeconds).toBe(60);
  });
});
