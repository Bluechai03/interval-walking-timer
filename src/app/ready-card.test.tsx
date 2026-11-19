import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PLAN_CONFIG } from "@/lib/plan";
import { ReadyCard } from "./ready-card";

afterEach(cleanup);

const show = (config = DEFAULT_PLAN_CONFIG) => {
  const onChange = vi.fn();
  render(<ReadyCard config={config} onChange={onChange} activity="walk" muted={false} onToggleMute={() => {}} />);
  return onChange;
};

describe("ReadyCard", () => {
  it("shows the plan as three plain numbers and the time in all, with no controls for them", () => {
    show();
    expect(screen.getByText("min fast").previousSibling?.textContent).toBe("3");
    expect(screen.getByText("min slow").previousSibling?.textContent).toBe("3");
    expect(screen.getByText("rounds").previousSibling?.textContent).toBe("5");
    expect(screen.getByText("30 min in all")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "More fast" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Classic" })).toBeNull();
  });

  it("opens the plan's controls from Change plan, and closes them with Done", () => {
    const onChange = show();
    fireEvent.click(screen.getByRole("button", { name: "Change plan" }));
    expect(screen.getByRole("heading", { name: "Your plan" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "More rounds" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_PLAN_CONFIG, rounds: 6 });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("heading", { name: "Your plan" })).toBeNull();
  });

  it("says one round, not one rounds", () => {
    show({ ...DEFAULT_PLAN_CONFIG, rounds: 1 });
    expect(screen.getByText("round")).toBeTruthy();
  });
});
