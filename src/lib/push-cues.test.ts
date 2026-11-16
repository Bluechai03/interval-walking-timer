import { describe, expect, it } from "vitest";
import { buildPlan } from "./plan";
import { pushCues } from "./push-cues";

const plan = buildPlan({ fastSeconds: 180, slowSeconds: 120, rounds: 2 });

describe("pushCues", () => {
  it("makes one cue per phase change after the start, then one for the end", () => {
    const cues = pushCues(plan, 0);
    expect(cues.map((c) => c.delaySeconds)).toEqual([180, 300, 480, 600]);
    expect(cues).toHaveLength(plan.length);
  });

  it("puts the pace and its length in the title, then target heart rate and round", () => {
    const [first] = pushCues(plan, 0);
    expect(first.title).toBe("Easy pace · 2 min");
    expect(first.body).toBe("Target 79–99 bpm\nRound 1 of 2");
  });

  it("numbers rounds", () => {
    const cues = pushCues(plan, 0);
    expect(cues[1].title).toBe("Fast pace · 3 min");
    expect(cues[1].body).toBe("Target 138–158 bpm\nRound 2 of 2");
  });

  it("ends with the total time walked", () => {
    const cues = pushCues(plan, 0);
    expect(cues[3]).toMatchObject({ title: "Walk done", body: "Well done, 10 min walked", delaySeconds: 600 });
  });

  it("only schedules what is left after a pause, counted from now", () => {
    const cues = pushCues(plan, 200);
    expect(cues.map((c) => c.delaySeconds)).toEqual([100, 280, 400]);
    expect(cues[0].title).toBe("Fast pace · 3 min");
  });

  it("schedules nothing once the walk is over", () => {
    expect(pushCues(plan, 600)).toEqual([]);
  });
});
