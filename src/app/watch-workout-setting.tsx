"use client";

import { useEffect, useRef } from "react";
import { useIos } from "@/lib/use-ios";
import { useWatchDelay, WATCH_DELAY_LIMITS } from "@/lib/use-watch-delay";
import {
  DEFAULT_END_SHORTCUT,
  DEFAULT_START_SHORTCUT,
  useWatchShortcuts,
} from "@/lib/use-shortcut-name";

// Only offered on iPhone and iPad, where Shortcuts exists.
export function WatchWorkoutSetting() {
  const ios = useIos();
  const delay = useWatchDelay();
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
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-page-quiet">Watch delay (seconds)</span>
          <input
            type="number"
            inputMode="numeric"
            className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold tabular-nums outline-none focus:border-page-ink"
            defaultValue={delay.seconds}
            min={WATCH_DELAY_LIMITS.min}
            max={WATCH_DELAY_LIMITS.max}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (Number.isInteger(value) && value >= WATCH_DELAY_LIMITS.min && value <= WATCH_DELAY_LIMITS.max) {
                delay.setSeconds(value);
              }
            }}
          />
        </label>
        <p className="text-sm text-page-quiet">
          With the switch on, Start begins the walk in this app and runs your Shortcut. Switch back
          to Strut afterwards. The countdown lasts the Watch delay, so Strut&apos;s timer and your
          Watch&apos;s workout start together. If your Watch is ahead of Strut, make the delay shorter.
          If it is behind, make it longer. Pause only pauses this timer, so your Watch keeps counting
          until the workout ends. Leave a name blank to use the one shown.
        </p>
      </div>
    </details>
  );
}
