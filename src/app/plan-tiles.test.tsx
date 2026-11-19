import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PLAN_CONFIG, PLAN_PRESETS } from "@/lib/plan";
import { PlanTiles } from "./plan-tiles";

afterEach(cleanup);

const show = (config = DEFAULT_PLAN_CONFIG) => {
  const onChange = vi.fn();
  render(<PlanTiles config={config} onChange={onChange} />);
  return onChange;
};

describe("PlanTiles", () => {
  it("shows the plan as minutes and rounds", () => {
    show();
    expect((screen.getByLabelText("Fast") as HTMLInputElement).value).toBe("3");
    expect((screen.getByLabelText("Slow") as HTMLInputElement).value).toBe("3");
    expect((screen.getByLabelText("Rounds") as HTMLInputElement).value).toBe("5");
  });

  it("steps a minute at a time and stores seconds", () => {
    const onChange = show();
    fireEvent.click(screen.getByRole("button", { name: "More fast" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_PLAN_CONFIG, fastSeconds: 240 });
    fireEvent.click(screen.getByRole("button", { name: "Less rounds" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_PLAN_CONFIG, rounds: 4 });
  });

  it("stops at the limits", () => {
    show({ fastSeconds: 60, slowSeconds: 60, rounds: 20 });
    expect((screen.getByRole("button", { name: "Less fast" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "More rounds" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("takes a typed number, and says what is allowed when it is out of range", () => {
    const onChange = show();
    fireEvent.change(screen.getByLabelText("Rounds"), { target: { value: "8" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_PLAN_CONFIG, rounds: 8 });
    onChange.mockClear();
    fireEvent.change(screen.getByLabelText("Rounds"), { target: { value: "99" } });
    expect(screen.getByRole("alert").textContent).toBe("Rounds can be 1 to 20.");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("offers ready-made plans and marks the one in use", () => {
    const onChange = show();
    expect(screen.getByRole("button", { name: "Classic" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Gentle" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Gentle" }));
    expect(onChange).toHaveBeenCalledWith(PLAN_PRESETS[1].config);
  });
});
