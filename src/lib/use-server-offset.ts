"use client";

import { useEffect, useState } from "react";
import { fetchServerTime } from "./rooms";
import { measureOffset } from "./server-clock";

const REMEASURE_MS = 2 * 60 * 1000;

// How far the server's clock is ahead of this phone's, in milliseconds. Null
// until the first measurement comes back.
export const useServerOffset = (): number | null => {
  const [offset, setOffset] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const measure = () =>
      void measureOffset(fetchServerTime).then((value) => {
        if (active && value !== null) setOffset(value);
      });
    measure();
    const id = setInterval(measure, REMEASURE_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return offset;
};
