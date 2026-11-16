"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { isIos } from "@/lib/watch-workout";
import { useEndShortcutName, useShortcutName } from "@/lib/use-shortcut-name";

const subscribe = () => () => {};
const onIos = () => isIos(navigator.userAgent, navigator.maxTouchPoints);

// Only offered on iPhone and iPad, where Shortcuts exists.
export function WatchWorkoutSetting() {
  const ios = useSyncExternalStore(subscribe, onIos, () => false);
  const { name, setName } = useShortcutName();
  const { name: endName, setName: setEndName } = useEndShortcutName();
  const details = useRef<HTMLDetailsElement>(null);
  // Open on load when something is saved, then leave it to the walker's taps.
  const decided = useRef(false);
  useEffect(() => {
    if (decided.current || !details.current) return;
    decided.current = true;
    if (name || endName) details.current.open = true;
  }, [ios, name, endName]);
  if (!ios) return null;

  return (
    // Open from the start when a name is already saved.
    <details
      open={name !== ""}
      className="group flex flex-col gap-3 px-4 sm:px-0"
    >
      <summary className="flex cursor-pointer list-none items-baseline justify-between border-b-2 border-page-ink pb-2 [&::-webkit-details-marker]:hidden">
        <h2 className="text-xl font-semibold">Start my Watch too</h2>
        <span aria-hidden="true" className="text-base group-open:hidden">
          Set up
        </span>
      </summary>
      <div className="flex flex-col gap-3 pt-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-page-quiet">
            Shortcut name
          </span>
          <input
            type="text"
            className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold outline-none focus:border-page-ink"
            placeholder="Strut outdoor"
            autoCapitalize="none"
            autoCorrect="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-page-quiet">
            Shortcut to end it
          </span>
          <input
            type="text"
            className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold outline-none focus:border-page-ink"
            placeholder="Strut end"
            autoCapitalize="none"
            autoCorrect="off"
            value={endName}
            onChange={(event) => setEndName(event.target.value)}
          />
        </label>
        <p className="text-sm text-page-quiet">
          Both are optional. Start runs the first Shortcut to begin a workout on
          your Watch, then brings you back here. When your walk finishes, or you
          tap Reset, the second one ends it. Pause only pauses this timer, so
          your Watch keeps counting until the workout ends.
        </p>
      </div>
    </details>
  );
}
