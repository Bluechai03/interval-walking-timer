import { describe, expect, it } from "vitest";
import { spokenCue } from "./cues";

// Expected wording comes from the "Speak the target heart rate" issue (#9),
// which works out the target for the assumed age.
describe("spokenCue", () => {
  it("says the fast pace and its target heart rate", () => {
    expect(spokenCue("fast")).toBe("Fast. Target heart rate 148.");
  });

  it("says the slow pace and its target heart rate", () => {
    expect(spokenCue("slow")).toBe("Slow. Target heart rate 89.");
  });

  it("leaves the end of the walk unchanged", () => {
    expect(spokenCue("done")).toBe("Walk complete");
  });
});
