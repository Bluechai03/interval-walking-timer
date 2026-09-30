"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_PLAN_CONFIG,
  sanitizePlanConfig,
  type PlanConfig,
} from "./plan";

const STORAGE_KEY = "plan-config";

const listeners = new Set<() => void>();

// undefined until first read. Kept in memory as well as localStorage so
// changes still apply when storage is unavailable (e.g. private windows).
let current: string | null | undefined;

const readStorage = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
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

const getSnapshot = (): string | null => {
  if (current === undefined) current = readStorage();
  return current;
};

const getServerSnapshot = (): string | null => null;

const parse = (raw: string | null): PlanConfig => {
  if (!raw) return DEFAULT_PLAN_CONFIG;
  try {
    return sanitizePlanConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_PLAN_CONFIG;
  }
};

const setPlanConfig = (config: PlanConfig) => {
  current = JSON.stringify(config);
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    // Not persisted, but the in-memory value still applies.
  }
  notify();
};

const subscribeNever = () => () => {};

export const usePlanConfig = () => {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const config = useMemo(() => parse(raw), [raw]);

  // False during server render and hydration, true afterwards. Lets the
  // settings form remount once so it shows the stored values.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return { config, setConfig: setPlanConfig, hydrated };
};
