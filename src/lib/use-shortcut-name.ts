"use client";

import { useSyncExternalStore } from "react";

const START_KEY = "watch-shortcut";
const END_KEY = "watch-shortcut-end";
const ENABLED_KEY = "watch-enabled";

export const DEFAULT_START_SHORTCUT = "Strut Outdoor";
export const DEFAULT_END_SHORTCUT = "Strut End";

const listeners = new Set<() => void>();

// Kept in memory as well as localStorage, so it still works when storage is
// unavailable (e.g. private windows).
const cache = new Map<string, string>();

const readStorage = (key: string): string => {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

const getSnapshotFor = (key: string) => (): string => {
  let value = cache.get(key);
  if (value === undefined) {
    value = readStorage(key);
    cache.set(key, value);
  }
  return value;
};

// Off on the server, and while hydrating.
const getServerSnapshot = (): string => "";

const setNameFor = (key: string, value: string) => {
  cache.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not persisted, but the in-memory value still applies.
  }
  listeners.forEach((listener) => listener());
};

const useNamed = (key: string) => {
  const name = useSyncExternalStore(
    subscribe,
    getSnapshotFor(key),
    getServerSnapshot,
  );
  return { name, setName: (value: string) => setNameFor(key, value) };
};

// The name of the Shortcut that starts a Watch workout. Empty means off.
export const useShortcutName = () => useNamed(START_KEY);

// The name of the Shortcut that ends it. Empty means the walker ends it on the Watch.
export const useEndShortcutName = () => useNamed(END_KEY);

// The switch, plus the Shortcut names Start and the finish should run (empty
// when the switch is off). A name saved before the switch existed turns it on once.
export const useWatchShortcuts = () => {
  const start = useShortcutName();
  const end = useEndShortcutName();
  const flag = useNamed(ENABLED_KEY);
  const enabled = flag.name === "" ? start.name.trim() !== "" : flag.name === "1";
  return {
    enabled,
    setEnabled: (on: boolean) => flag.setName(on ? "1" : "0"),
    start,
    end,
    startShortcut: enabled ? start.name.trim() || DEFAULT_START_SHORTCUT : "",
    endShortcut: enabled ? end.name.trim() || DEFAULT_END_SHORTCUT : "",
  };
};
