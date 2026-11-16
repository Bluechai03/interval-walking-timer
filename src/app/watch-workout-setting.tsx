"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { isIos } from "@/lib/watch-workout";
import {
  DEFAULT_END_SHORTCUT,
  DEFAULT_START_SHORTCUT,
  useWatchShortcuts,
} from "@/lib/use-shortcut-name";

const subscribe = () => () => {};
const onIos = () => isIos(navigator.userAgent, navigator.maxTouchPoints);

// Only offered on iPhone and iPad, where Shortcuts exists.
export function WatchWorkoutSetting() {
  const ios = useSyncExternalStore(subscribe, onIos, () => false);
  const { enabled, setEnabled, start, end } = useWatchShortcuts();
  const { name, setName } = start;
  const { name: endName, setName: setEndName } = end;
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
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Start my Watch too"
          onClick={() => setEnabled(!enabled)}
          className={`relative h-7 w-12 shrink-0 self-center rounded-full border-2 border-page-ink transition-colors ${
            enabled ? "bg-page-ink" : "bg-transparent"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-0.5 left-0.5 size-5 rounded-full transition-transform ${
              enabled ? "translate-x-5 bg-page" : "bg-page-ink"
            }`}
          />
        </button>
      </summary>
      <div className="flex flex-col gap-3 pt-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-page-quiet">
            Shortcut name
          </span>
          <input
            type="text"
            className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold outline-none focus:border-page-ink"
            placeholder={DEFAULT_START_SHORTCUT}
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
            placeholder={DEFAULT_END_SHORTCUT}
            autoCapitalize="none"
            autoCorrect="off"
            value={endName}
            onChange={(event) => setEndName(event.target.value)}
          />
        </label>
        <p className="text-sm text-page-quiet">
          With the switch on, Start runs the first Shortcut to begin a workout on your Watch, then
          brings you back here. When your walk finishes, or you tap Reset, the second one ends it.
          Leave a name blank to use the one shown. Pause only pauses this timer, so your Watch
          keeps counting until the workout ends.
        </p>
      </div>
    </details>
  );
}
