import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhaseNotifications } from "./phase-notifications";

afterEach(cleanup);

const props = { failed: false, shouldAsk: false, onEnable: () => {}, onDisable: () => {}, onDismissAsk: () => {} };

describe("PhaseNotifications in an iPhone browser tab", () => {
  it("says plainly during a walk that reminders won't come", () => {
    render(<PhaseNotifications {...props} state="install" walking />);
    expect(screen.getByRole("alert").textContent).toContain("This walk is in a browser tab");
    expect(screen.getByRole("alert").textContent).toContain("Home Screen");
  });

});

describe("PhaseNotifications explaining cards", () => {
  it("can be hidden for good, so it stops nagging", () => {
    try {
      localStorage.removeItem("reminders-note-hidden");
    } catch {}
    render(<PhaseNotifications {...props} state="denied" />);
    expect(screen.getByText("Reminders are blocked")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hide this" }));
    expect(screen.queryByText("Reminders are blocked")).toBeNull();
    cleanup();
    render(<PhaseNotifications {...props} state="install" />);
    expect(screen.queryByText("Want reminders on your lock screen?")).toBeNull();
    try {
      localStorage.removeItem("reminders-note-hidden");
    } catch {}
  });
});

describe("PhaseNotifications on the workout screen", () => {
  it("keeps the explaining cards out of the way until a walk is on, since they live in Settings", () => {
    render(<PhaseNotifications {...props} state="denied" quietWhenIdle />);
    expect(screen.queryByText("Reminders are blocked")).toBeNull();
    cleanup();
    render(<PhaseNotifications {...props} state="install" quietWhenIdle walking />);
    expect(screen.getByRole("alert").textContent).toContain("This walk is in a browser tab");
  });

  it("still asks once, when the app is first opened", () => {
    // jsdom has no modal dialogs.
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    render(<PhaseNotifications {...props} state="off" shouldAsk quietWhenIdle />);
    expect(screen.getByText(/nudge at each change/)).toBeTruthy();
  });
});

describe("PhaseNotifications test reminder", () => {
  it("offers a test while reminders are on, and runs it on a tap", () => {
    const onTest = vi.fn();
    render(<PhaseNotifications {...props} state="on" onTest={onTest} />);
    fireEvent.click(screen.getByRole("button", { name: "Send a test reminder" }));
    expect(onTest).toHaveBeenCalledTimes(1);
  });

  it("offers no test where it was not asked for, while reminders are off, or mid-walk", () => {
    render(<PhaseNotifications {...props} state="on" />);
    expect(screen.queryByRole("button", { name: "Send a test reminder" })).toBeNull();
    cleanup();
    render(<PhaseNotifications {...props} state="off" onTest={() => {}} />);
    expect(screen.queryByRole("button", { name: "Send a test reminder" })).toBeNull();
    cleanup();
    render(<PhaseNotifications {...props} state="on" walking onTest={() => {}} />);
    expect(screen.queryByRole("button", { name: "Send a test reminder" })).toBeNull();
  });

  it("says what came of the test, and tells the walker how to repair a dead link", () => {
    const messages = [
      ["sent", /should show up within a few seconds/],
      ["no-subscription", /no reminder link for Strut.*off and on again/],
      ["refused", /couldn't use this phone's reminder link.*off and on again/],
      ["expired", /stopped working.*off and on again/],
      ["too-many", /Wait a few seconds/],
      ["failed", /didn't go through/],
    ] as const;
    for (const [result, text] of messages) {
      render(<PhaseNotifications {...props} state="on" onTest={() => {}} testResult={result} />);
      expect(screen.getByText(text)).toBeTruthy();
      cleanup();
    }
  });

  it("disables the button while a test is going out", () => {
    render(<PhaseNotifications {...props} state="on" onTest={() => {}} testResult="sending" />);
    expect((screen.getByRole("button", { name: "Sending…" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
