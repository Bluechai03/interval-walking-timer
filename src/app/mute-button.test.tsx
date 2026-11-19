import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MuteButton } from "./mute-button";

afterEach(cleanup);

describe("MuteButton", () => {
  it("asks to switch when pressed", () => {
    const onToggle = vi.fn();
    render(<MuteButton muted={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Sound on" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
