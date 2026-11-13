"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "watch-shortcut";

const listeners = new Set<() => void>();

// Kept in memory as well as localStorage, so it still works when storage is
// unavailable (e.g. private windows).
let current: string | undefined;

const readStorage = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

const getSnapshot = (): string => (current ??= readStorage());

// Off on the server, and while hydrating.
const getServerSnapshot = (): string => "";

const setName = (value: string) => {
  current = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Not persisted, but the in-memory value still applies.
  }
  listeners.forEach((listener) => listener());
};

// The name of the Shortcut that starts a Watch workout. Empty means off.
export const useShortcutName = () => {
  const name = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { name, setName };
};

