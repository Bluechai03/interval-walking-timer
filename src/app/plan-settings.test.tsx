import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PLAN_CONFIG } from "@/lib/plan";
import { PlanSettings } from "./plan-settings";

afterEach(cleanup);

const show = (over: Partial<React.ComponentProps<typeof PlanSettings>> = {}) => {
  const props = {
    config: DEFAULT_PLAN_CONFIG,
    totalSeconds: 1800,
    disabled: false,
    activity: "walk" as const,
    onActivityChange: vi.fn(),
    getReadySeconds: 5,
    onGetReadyChange: () => {},
    onChange: () => {},
    ...over,
  };
  render(<PlanSettings {...props} />);
  return props;
};

describe("PlanSettings activity", () => {
  it("offers Walk, Elliptical, Bike and Run, with Walk chosen to begin with", () => {
    show();
    const select = screen.getByLabelText("Activity") as HTMLSelectElement;
    expect(select.value).toBe("walk");
    expect(Array.from(select.options).map((o) => o.text)).toEqual(["Walk", "Elliptical", "Bike", "Run"]);
  });

  it("reports what the walker picks", () => {
    const props = show();
    fireEvent.change(screen.getByLabelText("Activity"), { target: { value: "elliptical" } });
    expect(props.onActivityChange).toHaveBeenCalledWith("elliptical");
  });

  it("is locked once the walk has started, like the rest of the plan", () => {
    show({ disabled: true });
    expect((screen.getByLabelText("Activity") as HTMLSelectElement).disabled).toBe(true);
  });
});
