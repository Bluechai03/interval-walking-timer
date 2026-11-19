import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SCHEME, parseScheme, SCHEME_BOOT_SCRIPT, SCHEME_IDS, SCHEME_LABELS } from "./scheme";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.scheme;
});

describe("parseScheme", () => {
  it("knows the schemes and falls back to midnight for anything else", () => {
    expect(DEFAULT_SCHEME).toBe("midnight");
    expect(parseScheme("ember")).toBe("ember");
    expect(parseScheme("hot-pink")).toBe("midnight");
    expect(parseScheme("")).toBe("midnight");
    expect(parseScheme(null)).toBe("midnight");
  });

  it("names every scheme", () => {
    for (const id of SCHEME_IDS) expect(SCHEME_LABELS[id].length).toBeGreaterThan(0);
  });
});

describe("the boot script", () => {
  const run = () => new Function(SCHEME_BOOT_SCRIPT)();

  it("puts the saved scheme on the page before it is painted", () => {
    localStorage.setItem("scheme", "forest");
    run();
    expect(document.documentElement.dataset.scheme).toBe("forest");
  });

  it("leaves the default alone when nothing is saved", () => {
    run();
    expect(document.documentElement.dataset.scheme).toBeUndefined();
  });

  it("ignores a value it doesn't know, so nothing odd lands on the page", () => {
    localStorage.setItem("scheme", '"><script>alert(1)</script>');
    run();
    expect(document.documentElement.dataset.scheme).toBeUndefined();
  });

  it("never throws, even when storage is blocked", () => {
    const real = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    expect(run).not.toThrow();
    Storage.prototype.getItem = real;
  });
});
