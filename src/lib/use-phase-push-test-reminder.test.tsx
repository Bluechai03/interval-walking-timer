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
  vi.useRealTimers();
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

const settle = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 10))));

const returnToApp = () =>
  act(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });

describe("usePhasePush: a test reminder when the walker leaves the app", () => {
  it("sends the request in the same moment as the tap, and marks it to carry on if the page is put to sleep", async () => {
    const { result } = renderHook(() => usePhasePush(idle));
    await settle();
    reply(Response.json({ result: "sent" }));
    // Nothing is awaited between the tap and the request: iOS can freeze the page right after the tap.
    act(() => {
      void result.current.sendTest();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1];
    expect(init.keepalive).toBe(true);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    await waitFor(() => expect(result.current.testResult).toBe("sent"));
  });

  it("says so when the walker comes back and it is still going, and the answer can still arrive", async () => {
    const { result } = renderHook(() => usePhasePush(idle));
    await settle();
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => (answer = resolve)));
    act(() => {
      void result.current.sendTest();
    });
    expect(result.current.testResult).toBe("sending");

    returnToApp();
    expect(result.current.testResult).toBe("left");

    await act(async () => answer(Response.json({ result: "sent" })));
    await waitFor(() => expect(result.current.testResult).toBe("sent"));
  });

  it("does not change a finished result when the walker comes back", async () => {
    reply(Response.json({ result: "sent" }));
    const { result } = await sendTest();
    await waitFor(() => expect(result.current.testResult).toBe("sent"));
    returnToApp();
    expect(result.current.testResult).toBe("sent");
  });

  it("gives up after 15 seconds, so the button never stays stuck", async () => {
    const { result } = renderHook(() => usePhasePush(idle));
    await settle();
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
    );
    act(() => {
      void result.current.sendTest();
    });
    expect(result.current.testResult).toBe("sending");
    await act(async () => {
      vi.advanceTimersByTime(14_999);
    });
    expect(result.current.testResult).toBe("sending");
    await act(async () => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current.testResult).toBe("failed");
  });
});
