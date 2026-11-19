import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

afterEach(cleanup);

const show = () => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog title="End the walk for everyone?" body="Sure?" cancelLabel="Keep it" confirmLabel="Close it" onCancel={onCancel} onConfirm={onConfirm} />,
  );
  return { onCancel, onConfirm };
};

describe("ConfirmDialog", () => {
  it("counts a tap on the dimmed page around the card as the safe choice", () => {
    const { onCancel, onConfirm } = show();
    fireEvent.click(document.querySelector("dialog")!);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not cancel when the tap is inside the card", () => {
    const { onCancel } = show();
    fireEvent.click(screen.getByText("Sure?"));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
