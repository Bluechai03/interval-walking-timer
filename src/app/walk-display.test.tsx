import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ActivityId } from "@/lib/activity";
import type { Phase } from "@/lib/plan";
import { WalkDisplay } from "./walk-display";

afterEach(cleanup);

const plan: Phase[] = [
  { type: "fast", durationInSeconds: 180 },
  { type: "slow", durationInSeconds: 180 },
];

const show = (over: Partial<React.ComponentProps<typeof WalkDisplay>> = {}) =>
  render(
    <WalkDisplay
      plan={plan}
      rounds={1}
      fastSeconds={180}
      slowSeconds={180}
      phaseIndex={0}
      secondsLeft={150}
      fractionLeft={0.8}
      done={false}
      counting={false}
      getReadyLeft={0}
      running
      muted={false}
      onToggleMute={() => {}}
      {...over}
    />,
  );

describe("WalkDisplay words", () => {
  it("says Walk fast and Walk slow when walking, which is the default", () => {
    show();
    expect(screen.getByText("Walk fast")).toBeTruthy();
    cleanup();
    show({ phaseIndex: 1 });
    expect(screen.getByText("Walk slow")).toBeTruthy();
  });

  it.each<[ActivityId, string, string]>([
    ["elliptical", "Push harder", "Ease off"],
    ["bike", "Pedal hard", "Pedal easy"],
  ])("uses the %s's own words", (activity, fast, slow) => {
    show({ activity });
    expect(screen.getByText(fast)).toBeTruthy();
    cleanup();
    show({ activity, phaseIndex: 1 });
    expect(screen.getByText(slow)).toBeTruthy();
  });

  it("keeps Get ready the same for every activity", () => {
    show({ activity: "elliptical", counting: true, getReadyLeft: 4 });
    expect(screen.getByText("Get ready")).toBeTruthy();
  });

  it("ends with the right words, for the screen and for screen readers", () => {
    show({ done: true, running: false, activity: "elliptical" });
    expect(screen.getByText("Workout complete")).toBeTruthy();
    expect(screen.getByText("Total time")).toBeTruthy();
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe("6:00 in total");
    cleanup();
    show({ done: true, running: false });
    expect(screen.getByText("Walk complete")).toBeTruthy();
    expect(screen.getByText("Time walked")).toBeTruthy();
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe("6:00 walked");
  });
});

describe("WalkDisplay for screen readers", () => {
  it("announces the phase when it changes, and keeps the countdown out of the announcement", () => {
    show();
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Walk fast");
    expect(status.textContent).not.toMatch(/\d:\d\d/);
  });

  it("announces the get ready countdown and the finish", () => {
    show({ counting: true, getReadyLeft: 3 });
    expect(screen.getByRole("status").textContent).toBe("Get ready");
    cleanup();
    show({ done: true });
    expect(screen.getByRole("status").textContent).toBe("Walk complete");
  });
});
