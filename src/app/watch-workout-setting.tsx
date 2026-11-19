"use client";

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
  if (!ios) return null;

  return (
    <div className="flex flex-col gap-3 px-4 sm:px-0">
      <div className="flex items-center justify-between border-b-2 border-page-ink pb-2">
        <h2 className="text-xl font-semibold">Start my Watch too</h2>
        {/* The switch is not inside the summary, so each is one control. The button is 44px tall, the track inside it 28px. */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Start my Watch too"
          onClick={() => setEnabled(!enabled)}
          className="flex h-11 w-14 shrink-0 items-center justify-center focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink"
        >
          <span
            aria-hidden="true"
            className={`relative block h-7 w-12 rounded-full border-2 border-page-ink transition-colors ${
              enabled ? "bg-page-ink" : "bg-transparent"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-5 rounded-full transition-transform ${
                enabled ? "translate-x-5 bg-page" : "bg-page-ink"
              }`}
            />
          </span>
        </button>
      </div>
      {enabled ? (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-page-quiet">
            Shortcut name
          </span>
          <input
            type="text"
            className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold min-h-11 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink focus:border-page-ink"
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
            className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold min-h-11 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink focus:border-page-ink"
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
            className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold tabular-nums min-h-11 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink focus:border-page-ink"
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
          With the switch on, Start begins the walk in this app and runs your Shortcut. This works from the Home Screen app only, not from a Safari tab. Switch back
          to Strut afterwards. The countdown lasts the Watch delay, so Strut&apos;s timer and your
          Watch&apos;s workout start together. If your Watch is ahead of Strut, make the delay shorter.
          If it is behind, make it longer. Pause only pauses this timer, so your Watch keeps counting
          until the workout ends. Leave a name blank to use the one shown.
        </p>
      </div>
      ) : (
        <p className="text-sm text-page-quiet">
          Runs your Shortcut when you tap Start, so your Apple Watch workout begins with the timer.
        </p>
      )}
    </div>
  );
}
