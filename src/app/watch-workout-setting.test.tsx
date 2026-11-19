import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/use-ios", () => ({ useIos: () => true }));

import { WatchWorkoutSetting } from "./watch-workout-setting";

afterEach(cleanup);

describe("WatchWorkoutSetting", () => {
  it("shows the settings the moment the switch goes on, and a short explanation while it is off", () => {
    try {
      localStorage.clear();
    } catch {}
    render(<WatchWorkoutSetting />);
    const toggle = screen.getByRole("switch", { name: "Start my Watch too" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/Runs your Shortcut when you tap Start/)).toBeTruthy();
    expect(screen.queryByLabelText("Shortcut name")).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByLabelText("Shortcut name")).toBeTruthy();
    expect(screen.getByLabelText("Shortcut to end it")).toBeTruthy();
    expect(screen.queryByText(/Runs your Shortcut when you tap Start/)).toBeNull();
  });

  it("keeps the switch a control of its own, not inside anything that opens and closes", () => {
    render(<WatchWorkoutSetting />);
    const toggle = screen.getByRole("switch", { name: "Start my Watch too" });
    expect(toggle.closest("summary")).toBeNull();
    expect(toggle.closest("details")).toBeNull();
  });
});
