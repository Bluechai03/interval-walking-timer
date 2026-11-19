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

  it("only schedules what is left after a pause, counted from now", () => {
    const cues = pushCues(plan, 200);
    expect(cues.map((c) => c.delaySeconds)).toEqual([100, 280, 400]);
    expect(cues[0].title).toBe("Fast pace · 3 min");
  });

  it("schedules nothing once the walk is over", () => {
    expect(pushCues(plan, 600)).toEqual([]);
  });

  it("ends with workout words on the elliptical, and walking words by default", () => {
    const plan = buildPlan({ fastSeconds: 60, slowSeconds: 60, rounds: 1 });
    const last = (activity?: "elliptical") => pushCues(plan, 0, activity).at(-1)!;
    expect(last().title).toBe("Walk done");
    expect(last().body).toBe("Well done, 2 min walked");
    expect(last("elliptical").title).toBe("Workout done");
    expect(last("elliptical").body).toBe("Well done, 2 min in total");
  });

  it("works out the target heart rate from the walker's age", () => {
    const [young] = pushCues(plan, 0);
    const [older] = pushCues(plan, 0, "walk", 60);
    expect(older.body).not.toBe(young.body);
  });
});
