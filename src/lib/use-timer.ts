"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { totalSeconds, type Phase } from "./plan";
import { countdownLeft, getPosition } from "./timer";

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
// `getReadySeconds` is a countdown before a fresh walk. It is the walk's start
// time pushed into the future, so elapsed time is negative until it ends.
export const useTimer = (plan: Phase[], getReadySeconds = 0) => {
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
  const getReadyLeft = startedAt !== null ? countdownLeft(elapsedMs) : 0;

  useEffect(() => {
    if (ready) writeSaved(accumulatedMs, startedAt);
  }, [ready, accumulatedMs, startedAt]);

  useEffect(() => {
    if (!running || startedAt === null) return;
    // Checked four times a second so a second is never shown late, but the page
    // is only redrawn when the second on screen changes, which spares the battery.
    const secondOf = (time: number) => Math.floor((accumulatedMs + time - startedAt) / 1000);
    const id = setInterval(
      () => setNow((previous) => {
        const next = Date.now();
        return secondOf(next) === secondOf(previous) ? previous : next;
      }),
      TICK_MS,
    );
    return () => clearInterval(id);
  }, [running, startedAt, accumulatedMs]);

  const start = useCallback(() => {
    const t = Date.now();
    // Only a fresh walk gets the countdown, not a resume.
    const begins = t + (accumulatedMs === 0 ? getReadySeconds * 1000 : 0);
    setNow(t);
    setStartedAt(begins);
    // Saved now, not after the next render, in case the page is left at once.
    writeSaved(accumulatedMs, begins);
  }, [accumulatedMs, getReadySeconds]);

  const pause = useCallback(() => {
    if (startedAt === null) return;
    setAccumulatedMs((ms) => ms + Math.max(0, Date.now() - startedAt));
    setStartedAt(null);
  }, [startedAt]);

  const reset = useCallback(() => {
    setAccumulatedMs(0);
    setStartedAt(null);
    writeSaved(0, null);
  }, []);

  return {
    ...position,
    ready,
    running,
    getReadyLeft,
    started: startedAt !== null || accumulatedMs > 0,
    start,
    pause,
    reset,
  };
};
