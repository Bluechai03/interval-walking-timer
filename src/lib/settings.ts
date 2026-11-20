"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseActivity } from "./activity";
import { AGE_LIMITS, ASSUMED_AGE } from "./heart-rate";
import { parseWhole, readRaw, subscribe, writeRaw } from "./phone-store";
import { DEFAULT_PLAN_CONFIG, sanitizePlanConfig, type PlanConfig } from "./plan";

export const GET_READY_LIMITS = { min: 0, max: 30 } as const;
export const DEFAULT_GET_READY_SECONDS = 5;
export const WATCH_DELAY_LIMITS = { min: 0, max: 30 } as const;
export const DEFAULT_WATCH_DELAY_SECONDS = 6;

export const parseGetReady = (raw: string): number =>
  parseWhole(raw, GET_READY_LIMITS.min, GET_READY_LIMITS.max, DEFAULT_GET_READY_SECONDS);
export const parseWatchDelay = (raw: string): number =>
  parseWhole(raw, WATCH_DELAY_LIMITS.min, WATCH_DELAY_LIMITS.max, DEFAULT_WATCH_DELAY_SECONDS);

// A setting: a choice the walker made, kept on this phone. `parse` turns what was
// saved into a value and falls back to the default for anything that doesn't fit;
// `serialize` turns a value back into what is saved (null removes it).
type Setting<T> = {
  key: string;
  parse: (raw: string | null) => T;
  serialize: (value: T) => string | null;
};

const text = (key: string): Setting<string> => ({ key, parse: (raw) => raw ?? "", serialize: (value) => value });
// Saved as "1" when on. When off it is saved as "0", or removed.
const flag = (key: string, off: "0" | null = "0"): Setting<boolean> => ({
  key,
  parse: (raw) => raw === "1",
  serialize: (on) => (on ? "1" : off),
});
const whole = (key: string, min: number, max: number, fallback: number): Setting<number> => ({
  key,
  parse: (raw) => parseWhole(raw, min, max, fallback),
  serialize: String,
});

// Every setting the app keeps on the phone, in one place. Keys are what is already
// saved on people's phones, so none may be renamed.
export const SETTINGS = {
  activity: { key: "activity", parse: (raw) => parseActivity(raw ?? ""), serialize: (value) => value } as Setting<ReturnType<typeof parseActivity>>,
  age: whole("age", AGE_LIMITS.min, AGE_LIMITS.max, ASSUMED_AGE),
  getReady: whole("get-ready-seconds", GET_READY_LIMITS.min, GET_READY_LIMITS.max, DEFAULT_GET_READY_SECONDS),
  watchDelay: whole("watch-delay-seconds", WATCH_DELAY_LIMITS.min, WATCH_DELAY_LIMITS.max, DEFAULT_WATCH_DELAY_SECONDS),
  muted: flag("muted"),
  plan: {
    key: "plan-config",
    parse: (raw) => {
      if (!raw) return DEFAULT_PLAN_CONFIG;
      try {
        return sanitizePlanConfig(JSON.parse(raw));
      } catch {
        return DEFAULT_PLAN_CONFIG;
      }
    },
    serialize: (config) => JSON.stringify(config),
  } as Setting<PlanConfig>,
  watchEnabled: flag("watch-enabled"),
  watchShortcut: text("watch-shortcut"),
  watchShortcutEnd: text("watch-shortcut-end"),
  remindersNoteHidden: flag("reminders-note-hidden"),
  phasePushEnabled: flag("phase-push-enabled", null),
  phasePushAsked: flag("phase-push-asked", null),
};

export type SettingId = keyof typeof SETTINGS;
type Value<K extends SettingId> = ReturnType<(typeof SETTINGS)[K]["parse"]>;

// For code outside rendering, such as an effect or an event handler.
export const getSetting = <K extends SettingId>(id: K): Value<K> =>
  SETTINGS[id].parse(readRaw(SETTINGS[id].key)) as Value<K>;

export const setSetting = <K extends SettingId>(id: K, value: Value<K>): void => {
  const setting = SETTINGS[id] as unknown as Setting<Value<K>>;
  writeRaw(setting.key, setting.serialize(value));
};

// For rendering. The server render and the first paint use the default.
export const useSetting = <K extends SettingId>(id: K): [Value<K>, (value: Value<K>) => void] => {
  const setting = SETTINGS[id];
  const raw = useSyncExternalStore(subscribe, () => readRaw(setting.key), () => null);
  const value = useMemo(() => setting.parse(raw) as Value<K>, [setting, raw]);
  return [value, (next) => setSetting(id, next)];
};
