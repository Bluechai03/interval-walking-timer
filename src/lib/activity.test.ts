import { describe, expect, it } from "vitest";
import { ACTIVITY_IDS, activityWords, DEFAULT_ACTIVITY, isActivity, parseActivity } from "./activity";

describe("activity words", () => {
  it("keeps the walking words exactly as they were", () => {
    const words = activityWords("walk");
    expect(words.fast).toBe("Walk fast");
    expect(words.slow).toBe("Walk slow");
    expect(words.done).toBe("Walk complete");
    expect(words.timeDone).toBe("Time walked");
    expect(words.total("9:00")).toBe("9:00 walked");
    expect(words.doneTitle).toBe("Walk done");
    expect(words.doneBody("30 min")).toBe("Well done, 30 min walked");
  });

  it("uses push harder and ease off on the elliptical", () => {
    const words = activityWords("elliptical");
    expect(words.fast).toBe("Push harder");
    expect(words.slow).toBe("Ease off");
    expect(words.done).toBe("Workout complete");
    expect(words.total("9:00")).toBe("9:00 in total");
  });

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
