import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WatchReturnHint } from "./watch-return-hint";

afterEach(cleanup);

describe("WatchReturnHint", () => {
  it("tells the walker before Start, when the Watch is on, not to start over in a different Strut", () => {
    render(<WatchReturnHint watchOn started={false} walking={false} leftForShortcut={false} />);
    expect(screen.getByText(/switch back to this Strut/)).toBeTruthy();
    expect(screen.getByText(/don't start a new walk there/)).toBeTruthy();
  });

  it("says nothing before Start when the Watch is off, since no Shortcut will open", () => {
    const { container } = render(<WatchReturnHint watchOn={false} started={false} walking={false} leftForShortcut={false} />);
    expect(container.textContent).toBe("");
  });

  it("says where the walk is after the app opened the Shortcut, as a status so it is announced", () => {
    render(<WatchReturnHint watchOn started walking leftForShortcut />);
    expect(screen.getByRole("status").textContent).toMatch(/Your walk is running in this app/);
  });

  it("stays quiet on the finished screen, where there is no Start to explain", () => {
    const { container } = render(<WatchReturnHint watchOn started walking={false} leftForShortcut />);
    expect(container.textContent).toBe("");
  });

  it("stays quiet mid-walk when the app has not left for a Shortcut", () => {
    const { container } = render(<WatchReturnHint watchOn started walking leftForShortcut={false} />);
    expect(container.textContent).toBe("");
  });
});
