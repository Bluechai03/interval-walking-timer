"use client";

import { useSetting } from "./settings";

export const DEFAULT_START_SHORTCUT = "Strut Outdoor";
export const DEFAULT_END_SHORTCUT = "Strut End";

// The switch, plus the Shortcut names Start and the finish should run (empty
// when the switch is off). The Watch switch is off until the walker turns it on;
// saving a Shortcut name does not turn it on.
export const useWatchShortcuts = () => {
  const [startName, setStartName] = useSetting("watchShortcut");
  const [endName, setEndName] = useSetting("watchShortcutEnd");
  const [enabled, setEnabled] = useSetting("watchEnabled");
  return {
    enabled,
    setEnabled,
    start: { name: startName, setName: setStartName },
    end: { name: endName, setName: setEndName },
    startShortcut: enabled ? startName.trim() || DEFAULT_START_SHORTCUT : "",
    endShortcut: enabled ? endName.trim() || DEFAULT_END_SHORTCUT : "",
  };
};
