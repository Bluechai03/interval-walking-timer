"use client";

import { useEffect } from "react";
import { parseScheme, type SchemeId } from "./scheme";
import { useNamed } from "./use-shortcut-name";

// The colour scheme, remembered on this phone. The page already wears it from the
// first frame (see SCHEME_BOOT_SCRIPT); this keeps it in step when it changes.
export const useScheme = () => {
  const { name, setName } = useNamed("scheme");
  const scheme = parseScheme(name);
  useEffect(() => {
    document.documentElement.dataset.scheme = scheme;
  }, [scheme]);
  return { scheme, setScheme: (value: SchemeId) => setName(value) };
};
