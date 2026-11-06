"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanConfig } from "./plan";

const ENABLED_KEY = "phase-push-enabled";
const ASKED_KEY = "phase-push-asked";
const RUN_KEY = "phase-push-run";

const rememberRun = (id: string | null) => {
  try {
    if (id) localStorage.setItem(RUN_KEY, id);
    else localStorage.removeItem(RUN_KEY);
  } catch {
    // storage unavailable
  }
};

const savedRun = () => {
  try {
    return localStorage.getItem(RUN_KEY);
  } catch {
    return null;
  }
};
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// "install": an iPhone browser tab, where push only works from the Home Screen.
export type PushSupport = "unsupported" | "install" | "denied" | "off" | "on";

const isIphoneBrowserTab = () => {
  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installed =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return iphone && !installed;
};

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
  elapsedSeconds: number;
  // False until the timer has picked up a walk saved before a reload.
  ready: boolean;
  running: boolean;
  done: boolean;
};

// Optional phase notifications for a locked phone. The server schedules them
// when the walk starts or resumes, and they are cancelled on pause or reset.
export const usePhasePush = ({ config, elapsedSeconds, ready, running, done }: Options) => {
  const [state, setState] = useState<PushSupport>("unsupported");
  // Whether the opening dialog has been answered (either way) on this phone.
  const [asked, setAsked] = useState(true);
  // True when the server could not schedule this walk's reminders.
  const [failed, setFailed] = useState(false);
  const runId = useRef<string | null>(null);
  const latest = useRef({ config, elapsedSeconds });
  useEffect(() => {
    latest.current = { config, elapsedSeconds };
  });

  useEffect(() => {
    if (!canPush()) {
      if (typeof window !== "undefined" && isIphoneBrowserTab()) {
        void Promise.resolve().then(() => setState("install"));
      }
      return;
    }
    let enabled = false;
    let wasAsked = false;
    try {
      enabled = localStorage.getItem(ENABLED_KEY) === "1";
      wasAsked = localStorage.getItem(ASKED_KEY) === "1";
    } catch {
      // storage unavailable
    }
    const initial: PushSupport =
      Notification.permission === "denied" ? "denied" : enabled && Notification.permission === "granted" ? "on" : "off";
    void Promise.resolve().then(() => {
      setState(initial);
      setAsked(wasAsked);
    });
  }, []);

  const dismissAsk = useCallback(() => {
    try {
      localStorage.setItem(ASKED_KEY, "1");
    } catch {
      // storage unavailable
    }
    setAsked(true);
  }, []);

  const enable = useCallback(async () => {
    if (!canPush()) return;
    dismissAsk();
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
    const reg = await navigator.serviceWorker.ready;
    await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) });
    try {
      localStorage.setItem(ENABLED_KEY, "1");
    } catch {
      // storage unavailable
    }
    setState("on");
  }, [dismissAsk]);

  const disable = useCallback(async () => {
    try {
      localStorage.removeItem(ENABLED_KEY);
    } catch {
      // storage unavailable
    }
    const reg = await navigator.serviceWorker.ready;
    await (await reg.pushManager.getSubscription())?.unsubscribe();
    setState("off");
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
      // After the last phase the final notification is already on its way.
      if (!done) cancel();
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
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          config: latest.current.config,
          elapsedSeconds: latest.current.elapsedSeconds,
        }),
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

  return { state, failed, enable, disable, shouldAsk: state === "off" && !asked, dismissAsk };
};
