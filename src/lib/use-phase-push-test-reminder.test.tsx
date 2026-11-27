import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "AAAA";
});

import { forgetMemory } from "./phone-store";
import { DEFAULT_PLAN_CONFIG } from "./plan";
import { usePhasePush } from "./use-phase-push";

const subscription = { endpoint: "https://web.push.apple.com/abc", keys: { p256dh: "p", auth: "a" } };
const unsubscribe = vi.fn();
const getSubscription = vi.fn();
const fetchMock = vi.fn();

const fakePush = () => {
  Object.defineProperty(window, "PushManager", { value: class {}, configurable: true });
  Object.defineProperty(window, "Notification", {
    value: { permission: "granted", requestPermission: vi.fn() },
    configurable: true,
  });
  Object.defineProperty(navigator, "serviceWorker", {
    value: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe: vi.fn() } }) },
    configurable: true,
  });
};

const idle = { config: DEFAULT_PLAN_CONFIG, elapsedSeconds: 0, ready: true, running: false, done: false };

const reply = (response: Response) => fetchMock.mockResolvedValueOnce(response);

beforeEach(() => {
  localStorage.clear();
  forgetMemory();
  localStorage.setItem("phase-push-enabled", "1");
  getSubscription.mockReset();
  getSubscription.mockResolvedValue({ toJSON: () => subscription, unsubscribe });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fakePush();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const sendTest = async () => {
  const hook = renderHook(() => usePhasePush(idle));
  await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 10))));
  await act(async () => {
    await hook.result.current.sendTest();
  });
  return hook;
};

describe("usePhasePush: send a test reminder", () => {
  it("starts out idle", async () => {
    const { result } = renderHook(() => usePhasePush(idle));
    expect(result.current.testResult).toBe("idle");
  });

  it("sends this phone's own subscription and reports it sent", async () => {
    reply(Response.json({ result: "sent" }));
    const { result } = await sendTest();
    await waitFor(() => expect(result.current.testResult).toBe("sent"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/walk-push/test");
    expect(JSON.parse(init.body)).toEqual({ subscription });
  });

  it("says so when the phone has no subscription, without calling the server", async () => {
    getSubscription.mockResolvedValue(null);
    const { result } = await sendTest();
    expect(result.current.testResult).toBe("no-subscription");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says the address was refused for a 400, and to wait for a 429, and not to check the signal", async () => {
    reply(Response.json({ error: "Missing subscription" }, { status: 400 }));
    expect((await sendTest()).result.current.testResult).toBe("refused");
    cleanup();

    reply(Response.json({ result: "too-many" }, { status: 429 }));
    expect((await sendTest()).result.current.testResult).toBe("too-many");
  });

  it("forgets the result when reminders are turned off, so an old message is not waiting later", async () => {
    reply(Response.json({ result: "expired" }));
    const { result } = await sendTest();
    expect(result.current.testResult).toBe("expired");
    await act(async () => {
      await result.current.disable();
    });
    expect(result.current.testResult).toBe("idle");
  });

  it("reports an expired address, a failed send and a lost connection as different results", async () => {
    reply(Response.json({ result: "expired" }));
    expect((await sendTest()).result.current.testResult).toBe("expired");
    cleanup();

    reply(Response.json({ result: "failed" }, { status: 502 }));
    expect((await sendTest()).result.current.testResult).toBe("failed");
    cleanup();

    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    expect((await sendTest()).result.current.testResult).toBe("failed");
  });
});
