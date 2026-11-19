import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OfflineNote } from "./offline-note";

afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

describe("OfflineNote", () => {
  it("says nothing with a signal, and explains without one", () => {
    render(<OfflineNote />);
    expect(screen.queryByRole("status")).toBeNull();
    act(() => {
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status").textContent).toContain("The timer still works");
  });
});
