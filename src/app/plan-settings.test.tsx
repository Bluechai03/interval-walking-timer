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
    age: 23,
    onAgeChange: vi.fn(),
    getReadySeconds: 5,
    onGetReadyChange: () => {},
    onChange: () => {},
    ...over,
  };
  render(<PlanSettings {...props} />);
  return props;
};

describe("PlanSettings activity", () => {
  it("offers Walk, Elliptical and Bike, with Walk chosen to begin with", () => {
    show();
    const select = screen.getByLabelText("Activity") as HTMLSelectElement;
    expect(select.value).toBe("walk");
    expect(Array.from(select.options).map((o) => o.text)).toEqual(["Walk", "Elliptical", "Bike"]);
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

describe("PlanSettings out-of-range values", () => {
  it("says what is allowed when a value is out of range, and not the plan changed", () => {
    const props = show({ onChange: vi.fn() });
    fireEvent.change(screen.getByLabelText("Rounds"), { target: { value: "99" } });
    expect(screen.getByRole("alert").textContent).toBe("Rounds can be 1 to 20.");
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it("clears the message once the value is fine again", () => {
    show();
    const rounds = screen.getByLabelText("Rounds");
    fireEvent.change(rounds, { target: { value: "99" } });
    fireEvent.change(rounds, { target: { value: "6" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("takes an age and reports it, and complains about one that is too small", () => {
    const props = show();
    const age = screen.getByLabelText("Age");
    fireEvent.change(age, { target: { value: "58" } });
    expect(props.onAgeChange).toHaveBeenCalledWith(58);
    fireEvent.change(age, { target: { value: "3" } });
    expect(screen.getByRole("alert").textContent).toBe("Age can be 10 to 90.");
  });
});

describe("PlanSettings during a walk", () => {
  it("locks the age with the rest of the plan", () => {
    show({ disabled: true });
    expect((screen.getByLabelText("Age") as HTMLInputElement).disabled).toBe(true);
  });
});
