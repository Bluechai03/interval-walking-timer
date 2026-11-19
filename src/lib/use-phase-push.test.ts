import { describe, expect, it } from "vitest";
import { pushStartBody } from "./use-phase-push";

describe("pushStartBody", () => {
  const config = { fastSeconds: 180, slowSeconds: 180, rounds: 5 };

  it("sends the plan, how far in the walk is, and the activity", () => {
    expect(pushStartBody({ endpoint: "x" }, { config, elapsedSeconds: 30, activity: "elliptical" })).toEqual({
      subscription: { endpoint: "x" },
      config,
      elapsedSeconds: 30,
      activity: "elliptical",
    });
  });

  it("still works when no activity was chosen", () => {
    expect(pushStartBody({}, { config, elapsedSeconds: 0 }).activity).toBeUndefined();
  });
});
