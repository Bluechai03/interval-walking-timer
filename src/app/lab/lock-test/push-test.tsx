"use client";

import { useCallback, useEffect, useState } from "react";

// Throwaway push-notification test. A server sends one cue every 30 s; the service worker shows it and records
// when it arrived, so we can see how late iOS delivers it with the phone locked and music playing.

type Received = { n: number; title: string; sentAt: number; receivedAt: number };

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const REQUESTED_KEY = "push-test-requested";
const COUNT = 6;
const INTERVAL_SECONDS = 30;

function keyToBytes(base64: string) {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour12: false });

async function loadReceived(): Promise<Received[]> {
  if (!("caches" in window)) return [];
  const cache = await caches.open("push-log");
  const keys = await cache.keys();
  const items = await Promise.all(keys.map(async (k) => (await (await cache.match(k))!.json()) as Received));
  return items.sort((a, b) => a.receivedAt - b.receivedAt);
}

export function PushTest() {
  const [message, setMessage] = useState("");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [received, setReceived] = useState<Received[]>([]);
  const [requestedAt, setRequestedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setReceived(await loadReceived());
    try {
      const saved = localStorage.getItem(REQUESTED_KEY);
      setRequestedAt(saved ? Number(saved) : null);
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    void (async () => {
      await refresh();
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        setSubscription(await reg.pushManager.getSubscription());
      }
    })();
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  async function enable() {
    if (!PUBLIC_KEY) return setMessage("No NEXT_PUBLIC_VAPID_PUBLIC_KEY in this build. Add it in Vercel and redeploy.");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setMessage("Push is not available here. On iPhone it only works from an app added to the Home Screen.");
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setMessage(`Notification permission: ${permission}`);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) });
    setSubscription(sub);
    setMessage("Subscribed. Now tap Send.");
  }

  async function send() {
    if (!subscription) return;
    const response = await fetch("/api/push-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON(), count: COUNT, intervalSeconds: INTERVAL_SECONDS }),
    });
    const now = Date.now();
    try {
      localStorage.setItem(REQUESTED_KEY, String(now));
    } catch {
      // ignore
    }
    setRequestedAt(now);
    setMessage(
      response.ok
        ? `Requested at ${clock(now)}. ${COUNT} cues, one every ${INTERVAL_SECONDS} s. Lock the phone with your music playing now.`
        : `Request failed: ${response.status} ${await response.text()}`,
    );
  }

  async function clear() {
    await caches.delete("push-log");
    await refresh();
  }

  return (
    <section className="space-y-3 border-t pt-5">
      <h2 className="font-semibold">Push notification test</h2>
      <p className="text-sm">
        Cues arrive as notifications, not page audio. Steps: add this to the Home Screen, tap Enable, tap Send, start
        your music, lock the phone and listen and feel for 3 minutes. Silent mode off. Then unlock and read the result.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void enable()} disabled={subscription !== null} className="rounded-md border px-4 py-3 font-semibold disabled:opacity-40">
          Enable notifications
        </button>
        <button type="button" onClick={() => void send()} disabled={subscription === null} className="rounded-md border px-4 py-3 font-semibold disabled:opacity-40">
          Send {COUNT} cues
        </button>
        <button type="button" onClick={() => void clear()} className="rounded-md border px-3 py-2 text-sm">
          Clear received
        </button>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
      <ol className="font-mono text-xs">
        {received.map((r) => (
          <li key={r.receivedAt}>
            cue {r.n} ({r.title}): sent {clock(r.sentAt)}, arrived {clock(r.receivedAt)}, delivery {((r.receivedAt - r.sentAt) / 1000).toFixed(1)} s
            {requestedAt ? `, ${((r.receivedAt - requestedAt) / 1000 - r.n * INTERVAL_SECONDS).toFixed(1)} s off schedule` : ""}
          </li>
        ))}
      </ol>
    </section>
  );
}
