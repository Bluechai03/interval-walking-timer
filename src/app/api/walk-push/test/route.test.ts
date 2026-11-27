import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotification = vi.hoisted(() => vi.fn());
const setVapidDetails = vi.hoisted(() => vi.fn());

vi.mock("web-push", () => ({ default: { sendNotification, setVapidDetails } }));

import { POST } from "./route";

const post = (body: object) =>
  POST(new Request("http://localhost/api/walk-push/test", { method: "POST", body: JSON.stringify(body) }));

const subscription = { endpoint: "https://web.push.apple.com/abc", keys: { p256dh: "p", auth: "a" } };

// Each test is a new minute, so the limit on one test per phone every few seconds never carries over.
let now = Date.parse("2026-11-27T09:00:00Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  now += 60_000;
  vi.setSystemTime(now);
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
      // A different phone each time, so the limit on one test per phone doesn't apply.
      const response = await post({ subscription: { ...subscription, endpoint: `https://web.push.apple.com/${statusCode}` } });
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
    expect((await post({ subscription: { ...subscription, endpoint: "http://web.push.apple.com/abc" } })).status).toBe(400);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("refuses an address that is not a push service, so it can't be used to make the server call any address", async () => {
    for (const endpoint of ["https://example.com/push", "https://web.push.apple.com.evil.example/abc"]) {
      const response = await post({ subscription: { ...subscription, endpoint } });
      expect(response.status, endpoint).toBe(400);
    }
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("sends to the push services phones use", async () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
    ]) {
      const response = await post({ subscription: { ...subscription, endpoint } });
      expect(await response.json(), endpoint).toEqual({ result: "sent" });
    }
  });

  it("lets one phone test once every few seconds, and says to wait without sending again", async () => {
    expect((await post({ subscription })).status).toBe(200);
    const again = await post({ subscription });
    expect(again.status).toBe(429);
    expect(await again.json()).toEqual({ result: "too-many" });
    expect(sendNotification).toHaveBeenCalledTimes(1);

    vi.setSystemTime(now + 6000);
    expect((await post({ subscription })).status).toBe(200);
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it("counts each phone on its own", async () => {
    await post({ subscription });
    const other = await post({ subscription: { ...subscription, endpoint: "https://web.push.apple.com/other" } });
    expect(other.status).toBe(200);
  });
});
