"use client";

import { parseAge } from "./heart-rate";
import { useNamed } from "./use-shortcut-name";

// The walker's age for the heart rate targets, remembered on this phone.
export const useAge = () => {
  const { name, setName } = useNamed("age");
  return { age: parseAge(name), setAge: (value: number) => setName(String(value)) };
};
