import { cleanup, render, screen } from "@testing-library/react";
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
