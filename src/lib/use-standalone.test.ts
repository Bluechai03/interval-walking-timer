import { describe, expect, it } from "vitest";
import { isStandalone } from "./use-standalone";

const nav = (standalone?: boolean) => ({ standalone }) as Navigator & { standalone?: boolean };
const media = (matches: boolean) => () => ({ matches });

describe("isStandalone", () => {
  it("is true for a Home Screen app on iPhone", () => {
    expect(isStandalone({ navigator: nav(true) })).toBe(true);
  });

  it("is true when the display mode says so", () => {
    expect(isStandalone({ navigator: nav(), matchMedia: media(true) })).toBe(true);
  });

  it("is false in a browser tab", () => {
    expect(isStandalone({ navigator: nav(false), matchMedia: media(false) })).toBe(false);
    expect(isStandalone({ navigator: nav() })).toBe(false);
  });
});
