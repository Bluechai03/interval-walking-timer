"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { fetchServerTime } from "./rooms";
import { collectSamples, offsetFromSamples, type ClockSample } from "./server-clock";

// One measurement shared by everything that needs it. The best of the last few
// rounds is kept, so a single slow answer can't make a countdown jump.
const KEEP = 12;
const REMEASURE_MS = 2 * 60 * 1000;
// Until the first answer, try again soon.
const RETRY_MS = 4_000;

// The last good offset is kept on the phone, so a walk reopened with no signal
// still lines up with the others. Phone clocks drift slowly, so it is only trusted
// for a few hours.
const SAVED_KEY = "server-offset";
const SAVED_FOR_MS = 6 * 60 * 60 * 1000;

const readSavedOffset = (): number | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null") as { offset?: number; at?: number } | null;
    if (saved && typeof saved.offset === "number" && Date.now() - (saved.at ?? 0) < SAVED_FOR_MS) return saved.offset;
  } catch {
    // Nothing usable saved.
  }
  return null;
};

const writeSavedOffset = (value: number) => {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify({ offset: value, at: Date.now() }));
  } catch {
    // Storage unavailable.
  }
};

let samples: ClockSample[] = [];
let offset: number | null = null;
// True once the offset came from this visit's own measurement.
let measuredNow = false;
let users = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const measure = async () => {
  const fresh = await collectSamples(fetchServerTime);
  if (users === 0) return;
  samples = [...samples, ...fresh].slice(-KEEP);
  const next = offsetFromSamples(samples);
  if (next !== null) {
    measuredNow = true;
    writeSavedOffset(next);
  }
  if (next !== offset) {
    offset = next;
    listeners.forEach((listener) => listener());
  }
  timer = setTimeout(() => void measure(), offset === null ? RETRY_MS : REMEASURE_MS);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  users += 1;
  if (users === 1) {
    // Use the saved offset straight away; a fresh measurement replaces it.
    if (offset === null && !measuredNow) offset = readSavedOffset();
    void measure();
  }
  return () => {
    listeners.delete(listener);
    users -= 1;
    if (users === 0) clearTimeout(timer);
  };
};

// How far the server's clock is ahead of this phone's, in milliseconds. Null
// until the first measurement comes back.
export const useServerOffset = (): number | null =>
  useSyncExternalStore(subscribe, () => offset, () => null);

// For a walk that must not wait forever: after a few seconds with no answer it
// falls back to the phone's own clock, and says so.
export const useOffsetOrFallback = (giveUpMs = 6_000): { offset: number | null; approximate: boolean } => {
  const measured = useServerOffset();
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (measured !== null) return;
    const id = setTimeout(() => setGaveUp(true), giveUpMs);
    return () => clearTimeout(id);
  }, [measured, giveUpMs]);
  if (measured !== null) return { offset: measured, approximate: false };
  return gaveUp ? { offset: 0, approximate: true } : { offset: null, approximate: false };
};
