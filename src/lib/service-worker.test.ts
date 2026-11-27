import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

// Runs public/sw.js against a stand-in for the service worker scope, and returns what it
// registered, so the push handler can be driven without a browser.
const loadWorker = () => {
  const listeners: Record<string, (event: unknown) => void> = {};
  const showNotification = vi.fn(async () => {});
  const scope = {
    addEventListener: (type: string, listener: (event: unknown) => void) => (listeners[type] = listener),
    registration: { showNotification },
    location: { origin: "https://strut.example" },
  };
  const source = readFileSync(resolve(__dirname, "../../public/sw.js"), "utf8");
  new Function("self", source)(scope);
  return { listeners, showNotification };
};

const push = async (payload: object) => {
  const { listeners, showNotification } = loadWorker();
  const waiting: Promise<unknown>[] = [];
  listeners.push({ data: { json: () => payload }, waitUntil: (promise: Promise<unknown>) => waiting.push(promise) });
  await Promise.all(waiting);
  return showNotification.mock.calls[0] as unknown as [string, NotificationOptions];
};

describe("service worker push handler", () => {
  it("shows a walk's reminders under one shared tag, so each replaces the last", async () => {
    const [title, options] = await push({ title: "Fast pace · 3 min", body: "Round 1 of 5" });
    expect(title).toBe("Fast pace · 3 min");
    expect(options.tag).toBe("phase");
    expect(options.body).toBe("Round 1 of 5");
  });

  it("uses the tag a push brings, so a test reminder never replaces another", async () => {
    const [, options] = await push({ title: "Strut reminders work", body: "This is a test.", tag: "test-123" });
    expect(options.tag).toBe("test-123");
  });

  it("ignores a tag that is not a non-empty string", async () => {
    for (const tag of ["", 42, null, { a: 1 }]) {
      const [, options] = await push({ title: "t", tag });
      expect(options.tag, String(tag)).toBe("phase");
    }
  });
});
