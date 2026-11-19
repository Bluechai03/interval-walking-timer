import { describe, expect, it } from "vitest";
import { ACTIVITY_IDS, activityWords, DEFAULT_ACTIVITY, isActivity, parseActivity } from "./activity";

describe("activity words", () => {
  it("gives every activity a full set of words, with no leftover 'walk' except for walking", () => {
    for (const id of ACTIVITY_IDS) {
      const words = activityWords(id);
      const text = [words.label, words.fast, words.slow, words.done, words.timeDone, words.total("1:00"), words.phaseDone, words.doneTitle, words.doneBody("1 min")];
      for (const line of text) expect(line.length, `${id}`).toBeGreaterThan(0);
      if (id !== "walk") expect(text.join(" ").toLowerCase(), id).not.toContain("walk");
    }
  });
});

describe("parseActivity", () => {
  it("knows the activities and falls back to walking for anything else", () => {
    expect(DEFAULT_ACTIVITY).toBe("walk");
    expect(parseActivity("elliptical")).toBe("elliptical");
    expect(parseActivity("swimming")).toBe("walk");
    expect(parseActivity("")).toBe("walk");
    expect(parseActivity(undefined)).toBe("walk");
    expect(isActivity("bike")).toBe(true);
    expect(isActivity("Bike")).toBe(false);
  });
});
