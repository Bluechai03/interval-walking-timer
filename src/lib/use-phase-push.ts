"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanConfig } from "./plan";

const ENABLED_KEY = "phase-push-enabled";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushSupport = "unsupported" | "denied" | "off" | "on";

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
  running: boolean;
  done: boolean;
};

// Optional phase notifications for a locked phone. The server schedules them
// when the walk starts or resumes, and they are cancelled on pause or reset.
export const usePhasePush = ({ config, elapsedSeconds, running, done }: Options) => {
  const [state, setState] = useState<PushSupport>("unsupported");
  const runId = useRef<string | null>(null);
  const latest = useRef({ config, elapsedSeconds });
  useEffect(() => {
    latest.current = { config, elapsedSeconds };
  });

  useEffect(() => {
    if (!canPush()) return;
    let enabled = false;
    try {
      enabled = localStorage.getItem(ENABLED_KEY) === "1";
    } catch {
      // storage unavailable
    }
    const initial: PushSupport =
      Notification.permission === "denied" ? "denied" : enabled && Notification.permission === "granted" ? "on" : "off";
    void Promise.resolve().then(() => setState(initial));
  }, []);

  const enable = useCallback(async () => {
    if (!canPush()) return;
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
  }, []);

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

  const enabled = state === "on";

  useEffect(() => {
    if (!enabled) return;
    const cancel = () => {
      const id = runId.current;
      runId.current = null;
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

    let stale = false;
    void (async () => {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (!subscription || stale) return;
      const response = await fetch("/api/walk-push/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          config: latest.current.config,
          elapsedSeconds: latest.current.elapsedSeconds,
        }),
      }).catch(() => null);
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
    })();

    return () => {
      stale = true;
    };
  }, [enabled, running, done]);

  return { state, enable, disable };
};
