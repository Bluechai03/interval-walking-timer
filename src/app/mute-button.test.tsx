import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MuteButton } from "./mute-button";

afterEach(cleanup);

describe("MuteButton", () => {
  it("says Sound on while sound is on", () => {
    render(<MuteButton muted={false} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "Sound on" })).toBeTruthy();
    expect(screen.queryByText("Sound off")).toBeNull();
  });

  it("says Sound off while muted", () => {
    render(<MuteButton muted onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "Sound off" })).toBeTruthy();
    expect(screen.queryByText("Sound on")).toBeNull();
  });

  it("asks to switch when pressed", () => {
    const onToggle = vi.fn();
    render(<MuteButton muted={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Sound on" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
