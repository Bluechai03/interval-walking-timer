import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "AAAA";
});

import { forgetMemory } from "./phone-store";
import { DEFAULT_PLAN_CONFIG } from "./plan";
import { usePhasePush } from "./use-phase-push";

const subscription = { endpoint: "https://push.example/abc", keys: { p256dh: "p", auth: "a" } };
const getSubscription = vi.fn();
const fetchMock = vi.fn();

// What the phone offers: the notification permission, a service worker and a push manager.
const fakePush = (permission: NotificationPermission = "granted") => {
  Object.defineProperty(window, "PushManager", { value: class {}, configurable: true });
  Object.defineProperty(window, "Notification", { value: { permission, requestPermission: vi.fn() }, configurable: true });
  Object.defineProperty(navigator, "serviceWorker", {
    value: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe: vi.fn() } }) },
    configurable: true,
  });
};

const walk = (over: Partial<Parameters<typeof usePhasePush>[0]> = {}) => ({
  config: DEFAULT_PLAN_CONFIG,
  elapsedSeconds: 0,
  ready: true,
  running: false,
  done: false,
  ...over,
});

const startCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/start"));

beforeEach(() => {
  localStorage.clear();
  forgetMemory();
  localStorage.setItem("phase-push-enabled", "1");
  getSubscription.mockReset();
  getSubscription.mockResolvedValue({ toJSON: () => subscription });
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    String(url).endsWith("/start") ? Response.json({ runId: "run-new" }) : Response.json({ cancelled: true }),
  );
  vi.stubGlobal("fetch", fetchMock);
  fakePush();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const settle = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 20))));

describe("usePhasePush: does a started walk get its reminders scheduled?", () => {
  it("schedules them for a first walk", async () => {
    const { rerender } = renderHook((props) => usePhasePush(props), { initialProps: walk() });
    await settle();
    rerender(walk({ running: true }));
    await settle();
    expect(startCalls()).toHaveLength(1);
  });

  it("schedules them for a walk when an earlier walk's run was left saved", async () => {
    localStorage.setItem("phase-push-run", "run-from-an-earlier-walk");
    forgetMemory();
    const { rerender } = renderHook((props) => usePhasePush(props), { initialProps: walk() });
    await settle();
    rerender(walk({ running: true }));
    await settle();
    expect(startCalls()).toHaveLength(1);
  });

  it("tells the walker when the phone has no push subscription, instead of staying quiet", async () => {
    getSubscription.mockResolvedValue(null);
    const { result, rerender } = renderHook((props) => usePhasePush(props), { initialProps: walk() });
    await settle();
    rerender(walk({ running: true }));
    await settle();
    expect(startCalls()).toHaveLength(0);
    await waitFor(() => expect(result.current.failed).toBe(true));
  });
});
