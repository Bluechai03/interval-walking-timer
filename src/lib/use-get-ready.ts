"use client";

import { useNamed } from "./use-shortcut-name";

export const GET_READY_LIMITS = { min: 0, max: 30 } as const;
export const DEFAULT_GET_READY_SECONDS = 5;

export const parseGetReady = (raw: string): number => {
  if (raw.trim() === "") return DEFAULT_GET_READY_SECONDS;
  const value = Number(raw);
  return Number.isInteger(value) && value >= GET_READY_LIMITS.min && value <= GET_READY_LIMITS.max
    ? value
    : DEFAULT_GET_READY_SECONDS;
};

// Seconds of countdown before the walk starts. 0 means none.
export const useGetReady = () => {
  const { name, setName } = useNamed("get-ready-seconds");
  return {
    seconds: parseGetReady(name),
    setSeconds: (value: number) => setName(String(value)),
  };
};
