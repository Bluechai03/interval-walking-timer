import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEME_IDS, type SchemeId } from "@/lib/scheme";

// Reads the real stylesheet and checks every colour pair against WCAG 2.2.
// AA needs 4.5:1 for normal text and 3:1 for large text and for graphics.

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// The variables set for one scheme, such as --field-hard.
const schemeVars = (id: SchemeId): Record<string, string> => {
  const selector = id === "midnight" ? ':root,\n[data-scheme="midnight"]' : `[data-scheme="${id}"]`;
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No block for ${id}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
};

const rootVar = (name: string, inLight = false): string => {
  const region = inLight ? css.slice(css.indexOf("prefers-color-scheme: light")) : css.slice(css.indexOf(":root {\n  --page-ink"));
  const match = region.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`));
  if (!match) throw new Error(`No --${name}`);
  return match[1];
};

describe("colour contrast", () => {
  it("measures contrast the way WCAG does", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#777777")).toBe(1);
  });

  for (const id of SCHEME_IDS) {
    describe(`${id}`, () => {
      const v = schemeVars(id);

      it("keeps the writing on each effort field readable (4.5:1)", () => {
        expect(contrast(v["field-hard"], v["field-hard-ink"]), "hard").toBeGreaterThanOrEqual(4.5);
        expect(contrast(v["field-easy"], v["field-easy-ink"]), "easy").toBeGreaterThanOrEqual(4.5);
        expect(contrast(v["field-done"], v["field-done-ink"]), "done").toBeGreaterThanOrEqual(4.5);
      });

      it("keeps the you-are-here marker visible on both fields (3:1)", () => {
        expect(contrast(v["field-marker"], v["field-hard"]), "on hard").toBeGreaterThanOrEqual(3);
        expect(contrast(v["field-marker"], v["field-easy"]), "on easy").toBeGreaterThanOrEqual(3);
      });

      it("keeps the page's quiet text readable on this scheme's dark page (4.5:1)", () => {
        expect(contrast(rootVar("page-quiet"), v["page"])).toBeGreaterThanOrEqual(4.5);
        expect(contrast(rootVar("page-ink"), v["page"])).toBeGreaterThanOrEqual(7);
      });

      it("keeps the hard and easy fields visibly different in brightness, for people who see colour differently (1.5:1)", () => {
        expect(contrast(v["field-hard"], v["field-easy"])).toBeGreaterThanOrEqual(1.5);
      });
    });
  }

  it("keeps the light page readable too", () => {
    expect(contrast(rootVar("page-quiet", true), rootVar("page", true))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rootVar("page-ink", true), rootVar("page", true))).toBeGreaterThanOrEqual(7);
    expect(contrast(rootVar("action-ink", true), rootVar("action", true))).toBeGreaterThanOrEqual(7);
  });
});
