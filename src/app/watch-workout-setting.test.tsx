import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/use-ios", () => ({ useIos: () => true }));

import { WatchWorkoutSetting } from "./watch-workout-setting";

afterEach(cleanup);

describe("WatchWorkoutSetting", () => {
  it("keeps the switch outside the summary, so it is one control and not two nested", () => {
    render(<WatchWorkoutSetting />);
    const toggle = screen.getByRole("switch", { name: "Start my Watch too" });
    expect(toggle.closest("summary")).toBeNull();
    expect(screen.getByText("Watch settings").tagName).toBe("SUMMARY");
  });
});
