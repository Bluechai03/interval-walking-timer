import { beforeEach, describe, expect, it, vi } from "vitest";

const sleep = vi.hoisted(() => vi.fn<(wait: string) => Promise<void>>(async () => {}));
const sendNotification = vi.hoisted(() => vi.fn());
const setVapidDetails = vi.hoisted(() => vi.fn());

vi.mock("workflow", () => ({ sleep }));
vi.mock("web-push", () => ({ default: { sendNotification, setVapidDetails } }));

import { walkPushes } from "./walk-pushes";

const subscription = { endpoint: "https://web.push.apple.com/abc", keys: { p256dh: "p", auth: "a" } };
const cues = [
  { delaySeconds: 180, title: "Easy pace · 3 min", body: "Round 1 of 2" },
  { delaySeconds: 360, title: "Fast pace · 3 min", body: "Round 2 of 2" },
  { delaySeconds: 540, title: "Walk done", body: "Nice walk" },
];

const sent = () => sendNotification.mock.calls.map(([, payload]) => JSON.parse(payload));

beforeEach(() => {
  sleep.mockClear();
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({ statusCode: 201 });
  vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.com");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public");
  vi.stubEnv("VAPID_PRIVATE_KEY", "private");
});

describe("walkPushes", () => {
  it("sleeps until each phase change, then sends that cue's words", async () => {
    await walkPushes(subscription, cues);
    expect(sleep.mock.calls.map(([wait]) => wait)).toEqual(["180s", "180s", "180s"]);
    expect(sent().map(({ title, body }) => ({ title, body }))).toEqual(
      cues.map(({ title, body }) => ({ title, body })),
    );
  });

  it("gives every cue its own tag, so a new cue never replaces the one before it in the tray", async () => {
    await walkPushes(subscription, cues);
    const tags = sent().map((payload) => payload.tag);
    expect(tags).toHaveLength(3);
    for (const tag of tags) expect(tag).toMatch(/^phase-/);
    expect(new Set(tags).size).toBe(3);
  });

  it("carries on when the push service says the phone's address is gone", async () => {
    sendNotification.mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }));
    await expect(walkPushes(subscription, cues)).resolves.toBeUndefined();
    expect(sendNotification).toHaveBeenCalledTimes(3);
  });

  it("fails the run on any other error, so the workflow can retry it", async () => {
    sendNotification.mockRejectedValueOnce(Object.assign(new Error("busy"), { statusCode: 503 }));
    await expect(walkPushes(subscription, cues)).rejects.toThrow("busy");
  });
});
