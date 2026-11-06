"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { totalSeconds, type Phase } from "./plan";
import { getPosition } from "./timer";

const TICK_MS = 250;

// The walk is saved on the phone so it survives the page being discarded while
// the phone is locked. A finished walk is forgotten a few minutes after it ends.
const STORAGE_KEY = "walk-state";
const FORGET_AFTER_DONE_MS = 5 * 60 * 1000;
const FORGET_PAUSED_AFTER_MS = 6 * 60 * 60 * 1000;

type Saved = { accumulatedMs: number; startedAt: number | null; savedAt: number };
type Restored = { accumulatedMs: number; startedAt: number | null; now: number };

const readSaved = (plan: Phase[]): Restored | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (typeof saved.accumulatedMs !== "number" || typeof saved.savedAt !== "number") return null;
    const now = Date.now();
    const totalMs = totalSeconds(plan) * 1000;
    const elapsed = saved.accumulatedMs + (typeof saved.startedAt === "number" ? now - saved.startedAt : 0);
    if (elapsed >= totalMs + FORGET_AFTER_DONE_MS) return null;
    if (typeof saved.startedAt !== "number" && now - saved.savedAt > FORGET_PAUSED_AFTER_MS) return null;
    return { accumulatedMs: saved.accumulatedMs, startedAt: saved.startedAt ?? null, now };
  } catch {
    return null;
  }
};

const writeSaved = (accumulatedMs: number, startedAt: number | null) => {
  try {
    if (accumulatedMs === 0 && startedAt === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify({ accumulatedMs, startedAt, savedAt: Date.now() }));
  } catch {
    // Storage unavailable: the walk just won't survive a reload.
  }
};

const subscribeNever = () => () => {};

// Elapsed time is derived from wall-clock timestamps rather than counted
// ticks, so it stays accurate when the browser throttles background tabs.
export const useTimer = (plan: Phase[]) => {
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  // False while the server renders and the page hydrates, true afterwards.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [ready, setReady] = useState(false);
  if (hydrated && !ready) {
    // Pick the walk up where a reload or a locked phone left it.
    setReady(true);
    const saved = readSaved(plan);
    if (saved) {
      setAccumulatedMs(saved.accumulatedMs);
      setStartedAt(saved.startedAt);
      setNow(saved.now);
    }
  }

  const elapsedMs = accumulatedMs + (startedAt !== null ? now - startedAt : 0);
  const position = getPosition(plan, elapsedMs);
  // The clock stops ticking on its own once the last phase finishes.
  const running = startedAt !== null && !position.done;

  useEffect(() => {
    if (ready) writeSaved(accumulatedMs, startedAt);
  }, [ready, accumulatedMs, startedAt]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setStartedAt(t);
  }, []);

  const pause = useCallback(() => {
    if (startedAt === null) return;
    setAccumulatedMs((ms) => ms + Date.now() - startedAt);
    setStartedAt(null);
  }, [startedAt]);

  const reset = useCallback(() => {
    setAccumulatedMs(0);
    setStartedAt(null);
  }, []);

  return {
    ...position,
    ready,
    running,
    started: startedAt !== null || accumulatedMs > 0,
    start,
    pause,
    reset,
  };
};
