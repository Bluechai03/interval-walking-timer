import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PhaseNotifications } from "./phase-notifications";

afterEach(cleanup);

const props = { failed: false, shouldAsk: false, onEnable: () => {}, onDisable: () => {}, onDismissAsk: () => {} };

describe("PhaseNotifications in an iPhone browser tab", () => {
  it("suggests the Home Screen app before a walk", () => {
    render(<PhaseNotifications {...props} state="install" />);
    expect(screen.getByText("Want reminders on your lock screen?")).toBeTruthy();
  });

  it("says plainly during a walk that reminders won't come", () => {
    render(<PhaseNotifications {...props} state="install" walking />);
    expect(screen.getByRole("alert").textContent).toContain("This walk is in a browser tab");
    expect(screen.getByRole("alert").textContent).toContain("Home Screen");
  });

  it("stays quiet about it when reminders can work", () => {
    render(<PhaseNotifications {...props} state="on" walking />);
    expect(screen.queryByText("This walk is in a browser tab")).toBeNull();
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
