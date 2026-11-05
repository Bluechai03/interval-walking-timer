import { describe, expect, it } from "vitest";
import { summarize } from "./lock-test";

const at = (seconds: number, kind: string) => ({ t: 1_000_000 + seconds * 1000, kind });

describe("summarize", () => {
  it("summarises each run on its own", () => {
    const log = [
      at(0, "start run A (session default, wake lock off)"),
      at(10, "tick"),
      at(20, "tick"),
      at(60, "tick"),
      at(61, "stop"),
      at(100, "start run B (session ambient, wake lock on)"),
      at(110, "tick"),
      at(115, "page hidden"),
      at(120, "tick"),
    ];
    const [a, b] = summarize(log);
    expect(a).toMatchObject({ run: "A", ticks: 3, seconds: 61, maxGap: 40, lateTicks: 1, hidden: 0 });
    expect(b).toMatchObject({ run: "B", ticks: 2, maxGap: 10, lateTicks: 0, hidden: 1 });
  });

  it("returns nothing for an empty log", () => {
    expect(summarize([])).toEqual([]);
  });
});
