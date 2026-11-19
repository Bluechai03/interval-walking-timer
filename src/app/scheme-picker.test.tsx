import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SchemePicker } from "./scheme-picker";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.scheme;
});

describe("SchemePicker", () => {
  it("offers four schemes as one group, with Midnight chosen to begin with", () => {
    render(<SchemePicker />);
    expect(screen.getByRole("group", { name: "Colour scheme" })).toBeTruthy();
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((r) => r.value)).toEqual(["midnight", "ember", "forest", "mono"]);
    expect((screen.getByRole("radio", { name: "Midnight" }) as HTMLInputElement).checked).toBe(true);
  });

  it("changes the page's colours as soon as one is picked", () => {
    render(<SchemePicker />);
    fireEvent.click(screen.getByRole("radio", { name: "Ember" }));
    expect(document.documentElement.dataset.scheme).toBe("ember");
    expect((screen.getByRole("radio", { name: "Ember" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Mono" }));
    expect(document.documentElement.dataset.scheme).toBe("mono");
  });

  it("remembers the choice on this phone", () => {
    render(<SchemePicker />);
    fireEvent.click(screen.getByRole("radio", { name: "Forest" }));
    expect(localStorage.getItem("scheme")).toBe("forest");
  });

  it("shows each scheme in its own colours, without writing them twice", () => {
    const { container } = render(<SchemePicker />);
    const swatches = Array.from(container.querySelectorAll("[data-scheme]")).map((el) => el.getAttribute("data-scheme"));
    expect(swatches).toEqual(["midnight", "ember", "forest", "mono"]);
  });
});
