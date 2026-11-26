import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotification = vi.hoisted(() => vi.fn());
const setVapidDetails = vi.hoisted(() => vi.fn());

vi.mock("web-push", () => ({ default: { sendNotification, setVapidDetails } }));

import { POST } from "./route";

const post = (body: object) =>
  POST(new Request("http://localhost/api/walk-push/test", { method: "POST", body: JSON.stringify(body) }));

const subscription = { endpoint: "https://push.example/abc", keys: { p256dh: "p", auth: "a" } };

beforeEach(() => {
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({ statusCode: 201 });
  setVapidDetails.mockReset();
  vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.com");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public");
  vi.stubEnv("VAPID_PRIVATE_KEY", "private");
});

describe("POST /api/walk-push/test", () => {
  it("sends one fixed notification to the phone that asked", async () => {
    const response = await post({ subscription });
    expect(await response.json()).toEqual({ result: "sent" });
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification.mock.calls[0][0]).toEqual(subscription);
    expect(JSON.parse(sendNotification.mock.calls[0][1]).title).toBe("Strut reminders work");
  });

  it("says the address is gone when the push service reports 404 or 410", async () => {
    for (const statusCode of [404, 410]) {
      sendNotification.mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode }));
      const response = await post({ subscription });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ result: "expired" });
    }
  });

  it("reports any other failure as a failure, not as an expired address", async () => {
    sendNotification.mockRejectedValueOnce(Object.assign(new Error("busy"), { statusCode: 503 }));
    const response = await post({ subscription });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ result: "failed" });
  });

  it("reports a failure when the server has no push keys set", async () => {
    setVapidDetails.mockImplementationOnce(() => {
      throw new Error("No key");
    });
    const response = await post({ subscription });
    expect(await response.json()).toEqual({ result: "failed" });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("refuses a request with no subscription, or an address that is not https", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ subscription: { ...subscription, endpoint: "http://push.example/abc" } })).status).toBe(400);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
