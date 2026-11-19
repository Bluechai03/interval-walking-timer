import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const path = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.value }));

import { BottomTabs } from "./bottom-tabs";

afterEach(cleanup);

describe("BottomTabs", () => {
  it("has Workout, Crew and Settings, and marks the one you are on", () => {
    path.value = "/";
    render(<BottomTabs />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Workout", "Crew", "Settings"]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/", "/friends", "/settings"]);
    expect(screen.getByRole("link", { name: "Workout" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Crew" }).getAttribute("aria-current")).toBeNull();
  });

  it("counts every crew page as the Crew tab", () => {
    path.value = "/friends/join/ABCD";
    render(<BottomTabs />);
    expect(screen.getByRole("link", { name: "Crew" }).getAttribute("aria-current")).toBe("page");
  });

  it("is gone during a walk and on a crew's own walk screen", () => {
    path.value = "/";
    const { rerender } = render(<BottomTabs hidden />);
    expect(screen.queryByRole("navigation")).toBeNull();
    path.value = "/friends/room/abc";
    rerender(<BottomTabs />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
