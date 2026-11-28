"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityId } from "./activity";
import type { PlanConfig } from "./plan";
import { pushRunRecord } from "./records";
import { getSetting, setSetting } from "./settings";

const rememberRun = (id: string | null) => (id ? pushRunRecord.write(id) : pushRunRecord.clear());
const savedRun = () => pushRunRecord.read();
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// Where a test reminder stands: not asked for yet, going out, accepted by the push
// service, no push subscription on this phone, the server refused this phone's address,
// the push service says the address is gone, tried too soon after the last, the walker
// left the app before it was answered, or failed.
export type TestResult =
  | "idle"
  | "sending"
  | "sent"
  | "no-subscription"
  | "refused"
  | "expired"
  | "too-many"
  | "left"
  | "failed";

// A test that has not been answered by now is given up on, so the button never stays stuck.
const TEST_TIMEOUT_MS = 15_000;

// What the server's answer means for the walker. A 400 is its own result: the address was
// no use, and a lost signal is not the cause.
const testResultOf = (status: number, body: { result?: string } | null): TestResult => {
  if (status === 400) return "refused";
  if (status === 429) return "too-many";
  if (body?.result === "sent") return "sent";
  if (body?.result === "expired") return "expired";
  return "failed";
};

// "install": an iPhone browser tab, where push only works from the Home Screen.
export type PushSupport = "unsupported" | "install" | "denied" | "off" | "on";

const isIphoneBrowserTab = () => {
  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installed =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return iphone && !installed;
};

// What the phone tells the server when a walk starts. The server schedules the
// reminders from it, in the words of the walker's activity.
export const pushStartBody = (
  subscription: unknown,
  latest: { config: PlanConfig; elapsedSeconds: number; activity?: ActivityId; age?: number },
) => ({
  subscription,
  config: latest.config,
  elapsedSeconds: latest.elapsedSeconds,
  activity: latest.activity,
  age: latest.age,
});

const keyToBytes = (base64: string) => {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

const canPush = () =>
  typeof window !== "undefined" &&
  PUBLIC_KEY !== "" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

type Options = {
  config: PlanConfig;
  // Changes the words in the notifications. Walking if left out.
  activity?: ActivityId;
  // For the heart rate in the notifications.
  age?: number;
  elapsedSeconds: number;
  // False until the timer has picked up a walk saved before a reload.
  ready: boolean;
  running: boolean;
  done: boolean;
};

// Optional phase notifications for a locked phone. The server schedules them
// when the walk starts or resumes, and they are cancelled on pause or reset.
export const usePhasePush = ({ config, activity, age, elapsedSeconds, ready, running, done }: Options) => {
  const [state, setState] = useState<PushSupport>("unsupported");
  // Whether the opening dialog has been answered (either way) on this phone.
  const [asked, setAsked] = useState(true);
  // True when the server could not schedule this walk's reminders.
  const [failed, setFailed] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>("idle");
  // This phone's push subscription, looked up ahead of time so a test can go out the moment
  // it is tapped. undefined: not looked up yet. null: the phone has none.
  const knownSubscription = useRef<ReturnType<PushSubscription["toJSON"]> | null | undefined>(undefined);
  const runId = useRef<string | null>(null);
  const latest = useRef({ config, elapsedSeconds, activity, age });
  useEffect(() => {
    latest.current = { config, elapsedSeconds, activity, age };
  });

  useEffect(() => {
    if (!canPush()) {
      if (typeof window !== "undefined" && isIphoneBrowserTab()) {
        void Promise.resolve().then(() => setState("install"));
      }
      return;
    }
    const enabled = getSetting("phasePushEnabled");
    const wasAsked = getSetting("phasePushAsked");
    const initial: PushSupport =
      Notification.permission === "denied" ? "denied" : enabled && Notification.permission === "granted" ? "on" : "off";
    void Promise.resolve().then(() => {
      setState(initial);
      setAsked(wasAsked);
    });
  }, []);

  const dismissAsk = useCallback(() => {
    setSetting("phasePushAsked", true);
    setAsked(true);
  }, []);

  const enable = useCallback(async () => {
    if (!canPush()) return;
    dismissAsk();
    setTestResult("idle");
    knownSubscription.current = undefined;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
    const reg = await navigator.serviceWorker.ready;
    await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) });
    setSetting("phasePushEnabled", true);
    setState("on");
  }, [dismissAsk]);

  const disable = useCallback(async () => {
    // A result from before the walker turned reminders off and on says nothing about the new link.
    setTestResult("idle");
    knownSubscription.current = undefined;
    setSetting("phasePushEnabled", false);
    const reg = await navigator.serviceWorker.ready;
    await (await reg.pushManager.getSubscription())?.unsubscribe();
    setState("off");
  }, []);

  // Look up the subscription while the card is on screen, so a test needs nothing to finish
  // between the tap and the request. iOS puts a page to sleep within moments of leaving it.
  useEffect(() => {
    if (state !== "on" || !canPush()) return;
    let stale = false;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((subscription) => {
        if (!stale) knownSubscription.current = subscription ? subscription.toJSON() : null;
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [state]);

  // The walker leaves the app to see the banner. If they come back and the test is still
  // going, say what happened, and let them try again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setTestResult((now) => (now === "sending" ? "left" : now));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Sends one notification to this phone now, so a walker can tell whether reminders
  // reach it before a walk depends on them. With the subscription already known, the request
  // is sent before anything is awaited, and it is marked to carry on if the page is put to sleep.
  const sendTest = useCallback(async () => {
    if (!canPush()) return;
    setTestResult("sending");
    const controller = new AbortController();
    const giveUp = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
    try {
      let subscription = knownSubscription.current;
      if (subscription === undefined) {
        const reg = await navigator.serviceWorker.ready;
        subscription = (await reg.pushManager.getSubscription())?.toJSON() ?? null;
        knownSubscription.current = subscription;
      }
      if (subscription === null) return setTestResult("no-subscription");
      const response = await fetch("/api/walk-push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
        keepalive: true,
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as { result?: string } | null;
      setTestResult(testResultOf(response.status, body));
    } catch {
      setTestResult("failed");
    } finally {
      clearTimeout(giveUp);
    }
  }, []);

  const enabled = state === "on" && ready;

  useEffect(() => {
    if (!enabled) return;
    const cancel = () => {
      const id = runId.current ?? savedRun();
      runId.current = null;
      rememberRun(null);
      if (!id) return;
      void fetch("/api/walk-push/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: id }),
        keepalive: true,
      });
    };

    if (!running) {
      // After the last phase the final notification is already on its way, so the
      // run is simply forgotten, and the next walk can set up its own.
      if (done) {
        runId.current = null;
        rememberRun(null);
      } else cancel();
      return;
    }

    // After a reload the earlier run is still counting down: keep it.
    const existing = runId.current ?? savedRun();
    if (existing) {
      runId.current = existing;
      return;
    }

    let stale = false;
    void (async () => {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (!subscription || stale) return;
      setFailed(false);
      const response = await fetch("/api/walk-push/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pushStartBody(subscription.toJSON(), latest.current)),
      }).catch(() => null);
      if (!stale) setFailed(!response?.ok);
      const body = (await response?.json().catch(() => null)) as { runId?: string | null } | null;
      if (!body?.runId) return;
      if (stale) {
        // Paused before the server answered: stop the run we just made.
        void fetch("/api/walk-push/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: body.runId }),
        });
        return;
      }
      runId.current = body.runId;
      rememberRun(body.runId);
    })();

    return () => {
      stale = true;
    };
  }, [enabled, running, done]);

  return { state, failed, enable, disable, shouldAsk: state === "off" && !asked, dismissAsk, testResult, sendTest };
};
