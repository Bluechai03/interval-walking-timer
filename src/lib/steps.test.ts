import { describe, expect, it } from "vitest";
import { stepsShortcutUrl, stepsMessage, submitStepsUrl } from "./steps";

const input = {
  code: "ABCDE23456",
  start: "2026-11-18T10:00:00.000Z",
  end: "2026-11-18T10:30:00.000Z",
  url: "https://example.supabase.co/rest/v1/rpc/submit_steps",
  key: "sb_publishable_xyz",
};

describe("stepsShortcutUrl", () => {
  it("opens the named Shortcut with the details as JSON text", () => {
    const url = stepsShortcutUrl("Strut Steps", input)!;
    expect(url.startsWith("shortcuts://run-shortcut?")).toBe(true);
    const params = new URL(url.replace("shortcuts://", "https://x/")).searchParams;
    expect(params.get("name")).toBe("Strut Steps");
    expect(params.get("input")).toBe("text");
    expect(JSON.parse(params.get("text")!)).toEqual(input);
  });

  it("writes spaces as %20, which Shortcuts reads correctly", () => {
    const url = stepsShortcutUrl("Strut Steps", input)!;
    expect(url).toContain("name=Strut%20Steps");
    expect(url).not.toContain("+");
  });

  it("asks for no way back, so iOS never opens Safari", () => {
    const url = stepsShortcutUrl("Strut Steps", input)!;
    expect(url).not.toContain("x-success");
    expect(url).not.toContain("x-callback-url");
  });

  it("makes nothing without a name", () => {
    expect(stepsShortcutUrl("  ", input)).toBeNull();
  });
});

describe("submitStepsUrl", () => {
  it("points at the function the Shortcut calls", () => {
    expect(submitStepsUrl("https://example.supabase.co")).toBe("https://example.supabase.co/rest/v1/rpc/submit_steps");
    expect(submitStepsUrl("https://example.supabase.co/")).toBe("https://example.supabase.co/rest/v1/rpc/submit_steps");
  });
});

describe("stepsMessage", () => {
  it("is kind about too many tries", () => {
    expect(stepsMessage({ message: "too_many_claims" })).toContain("Please wait");
  });

  it("falls back for anything else", () => {
    expect(stepsMessage({ message: "boom" })).toContain("didn't work");
    expect(stepsMessage(null)).toContain("didn't work");
  });
});
