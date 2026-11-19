import { beforeEach, describe, expect, it, vi } from "vitest";

const start = vi.hoisted(() => vi.fn());

vi.mock("workflow/api", () => ({ start }));
vi.mock("../../../../../workflows/walk-pushes", () => ({ walkPushes: "walkPushes" }));

import { POST } from "./route";

const post = (body: object) =>
  POST(new Request("http://localhost/api/walk-push/start", { method: "POST", body: JSON.stringify(body) }));

const subscription = { endpoint: "https://push.example/abc", keys: { p256dh: "p", auth: "a" } };
const config = { fastSeconds: 60, slowSeconds: 60, rounds: 1 };

beforeEach(() => {
  start.mockReset();
  start.mockResolvedValue({ runId: "run-1" });
});

const lastCueOf = () => (start.mock.calls[0][1] as [unknown, { title: string; body: string }[]])[1].at(-1)!;

describe("POST /api/walk-push/start", () => {
  it("schedules reminders in the walker's words for the elliptical", async () => {
    const response = await post({ subscription, config, elapsedSeconds: 0, activity: "elliptical" });
    expect(await response.json()).toEqual({ runId: "run-1" });
    expect(lastCueOf().title).toBe("Workout done");
  });

  it("keeps the walking words when no activity is sent", async () => {
    await post({ subscription, config, elapsedSeconds: 0 });
    expect(lastCueOf().title).toBe("Walk done");
  });

  it("falls back to walking for an activity it doesn't know, and never fails over it", async () => {
    const response = await post({ subscription, config, elapsedSeconds: 0, activity: "<script>" });
    expect(response.status).toBe(200);
    expect(lastCueOf().title).toBe("Walk done");
  });

  it("still refuses a request with no subscription", async () => {
    const response = await post({ config });
    expect(response.status).toBe(400);
    expect(start).not.toHaveBeenCalled();
  });
});
