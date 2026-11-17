import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthState } from "@/lib/use-auth";
import { StepsTest } from "./steps-test";

const auth = vi.hoisted(() => ({ state: { status: "signed-in", user: { id: "u1" } } as unknown as AuthState }));
const signInAsGuest = vi.hoisted(() => vi.fn());
const createStepClaim = vi.hoisted(() => vi.fn());
const fetchClaimedSteps = vi.hoisted(() => vi.fn());

vi.mock("@/lib/use-auth", () => ({ useAuth: () => auth.state, signInAsGuest }));
vi.mock("@/lib/steps", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/steps")>()),
  createStepClaim,
  fetchClaimedSteps,
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse("2026-11-18T10:30:00Z"));
  auth.state = { status: "signed-in", user: { id: "u1" } } as unknown as AuthState;
  createStepClaim.mockResolvedValue({ ok: true, value: "ABCDE23456" });
  fetchClaimedSteps.mockResolvedValue({ ok: true, value: null });
  // Opening a Shortcut would navigate away, which jsdom can't do.
  Object.defineProperty(window, "location", { value: { href: "" }, writable: true, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

const press = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Check my steps" }));
  });
};

describe("StepsTest", () => {
  it("asks for a code for the chosen window and opens the Shortcut with it", async () => {
    render(<StepsTest />);
    await press();
    const [start, end] = createStepClaim.mock.calls[0];
    expect(end.getTime() - start.getTime()).toBe(30 * 60_000);
    const url = String(window.location.href);
    expect(url).toContain("shortcuts://run-shortcut?name=Strut%20Steps");
    expect(decodeURIComponent(url)).toContain("ABCDE23456");
    expect(screen.getByRole("status").textContent).toContain("ABCDE23456");
  });

  it("makes a guest account first when nobody is signed in", async () => {
    auth.state = { status: "signed-out" };
    signInAsGuest.mockResolvedValue({ ok: true, userId: "u9" });
    render(<StepsTest />);
    await press();
    expect(signInAsGuest).toHaveBeenCalled();
    expect(createStepClaim).toHaveBeenCalled();
  });

  it("shows the steps once the Shortcut has posted them, and how long it took", async () => {
    render(<StepsTest />);
    await press();
    fetchClaimedSteps.mockResolvedValue({ ok: true, value: 2345 });
    await act(async () => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.getByText("2,345 steps")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("came back 4 seconds after");
  });

  it("keeps waiting while nothing has come back, then gives up kindly", async () => {
    render(<StepsTest />);
    await press();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("status").textContent).toContain("Waiting for your Shortcut");
    await act(async () => {
      vi.advanceTimersByTime(130_000);
    });
    expect(screen.getByRole("alert").textContent).toContain("Nothing came back in 3 minutes");
  });

  it("says so when a code can't be made", async () => {
    createStepClaim.mockResolvedValue({ ok: false, message: "Please wait a little." });
    render(<StepsTest />);
    await press();
    expect(screen.getByRole("alert").textContent).toContain("Please wait a little.");
    expect(String(window.location.href)).toBe("");
  });

  it("will not open a Shortcut with no name", async () => {
    render(<StepsTest />);
    fireEvent.change(screen.getByLabelText("Shortcut name"), { target: { value: "  " } });
    await press();
    expect(screen.getByRole("alert").textContent).toContain("name of your Shortcut");
    expect(String(window.location.href)).toBe("");
  });
});
