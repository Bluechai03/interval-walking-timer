import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MuteButton } from "./mute-button";

afterEach(cleanup);

describe("MuteButton", () => {
  it("is a toggle that is not pressed while sound is on", () => {
    render(<MuteButton muted={false} onToggle={() => {}} />);
    const button = screen.getByRole("button", { name: "Mute cue sounds" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByText("Muted")).toBeNull();
  });

  it("is pressed and says Muted while muted", () => {
    render(<MuteButton muted onToggle={() => {}} />);
    const button = screen.getByRole("button", { name: "Mute cue sounds" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Muted")).toBeTruthy();
  });

  it("asks to switch when pressed", () => {
    const onToggle = vi.fn();
    render(<MuteButton muted={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Mute cue sounds" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
