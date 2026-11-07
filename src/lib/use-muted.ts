"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "muted";

const listeners = new Set<() => void>();

// Kept in memory as well as localStorage, so the switch still works when
// storage is unavailable (e.g. private windows).
let current: boolean | undefined;

const readStorage = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    current = readStorage();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

const getSnapshot = (): boolean => {
  if (current === undefined) current = readStorage();
  return current;
};

// On the server, and while hydrating, the app starts unmuted.
const getServerSnapshot = (): boolean => false;

const setMuted = (value: boolean) => {
  current = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Not persisted, but the in-memory value still applies.
  }
  notify();
};

export const useMuted = () => {
  const muted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { muted, setMuted };
};
