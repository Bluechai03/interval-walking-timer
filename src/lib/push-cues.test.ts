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

  it("puts the phase and its length in the title, the rest in the body", () => {
    const [first] = pushCues(plan, 0);
    expect(first.title).toBe("Slow · 2 min");
    expect(first.body).toBe("Round 1 of 2 · Easy: you can chat · next: Fast");
  });

  it("numbers rounds and names what comes next", () => {
    const cues = pushCues(plan, 0);
    expect(cues[1].title).toBe("Fast · 3 min");
    expect(cues[1].body).toBe("Round 2 of 2 · Brisk: short sentences only · next: Slow");
  });

  it("calls the last phase the last phase", () => {
    const cues = pushCues(plan, 0);
    expect(cues[2].body).toBe("Round 2 of 2 · Easy: you can chat · last phase");
  });

  it("ends with the total time walked", () => {
    const cues = pushCues(plan, 0);
    expect(cues[3]).toMatchObject({ title: "Walk done", body: "10 min walked", delaySeconds: 600 });
  });

  it("only schedules what is left after a pause, counted from now", () => {
    const cues = pushCues(plan, 200);
    expect(cues.map((c) => c.delaySeconds)).toEqual([100, 280, 400]);
    expect(cues[0].title).toBe("Fast · 3 min");
  });

  it("schedules nothing once the walk is over", () => {
    expect(pushCues(plan, 600)).toEqual([]);
  });
});
