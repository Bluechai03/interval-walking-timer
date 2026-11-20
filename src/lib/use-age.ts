"use client";

import { useSetting } from "./settings";

// The walker's age for the heart rate targets, remembered on this phone.
export const useAge = () => {
  const [age, setAge] = useSetting("age");
  return { age, setAge };
};
