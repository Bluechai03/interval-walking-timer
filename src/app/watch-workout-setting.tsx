"use client";

import { useSyncExternalStore } from "react";
import { isIos } from "@/lib/watch-workout";
import { useShortcutName } from "@/lib/use-shortcut-name";

const subscribe = () => () => {};
const onIos = () => isIos(navigator.userAgent, navigator.maxTouchPoints);

// Only offered on iPhone and iPad, where Shortcuts exists.
export function WatchWorkoutSetting() {
  const ios = useSyncExternalStore(subscribe, onIos, () => false);
  const { name, setName } = useShortcutName();
  if (!ios) return null;

  return (
    <section aria-labelledby="watch-heading" className="flex flex-col gap-3 px-4 sm:px-0">
      <h2 id="watch-heading" className="border-b-2 border-page-ink pb-2 text-xl font-semibold">
        Apple Watch workout
      </h2>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-page-quiet">Shortcut name</span>
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
      <p className="text-sm text-page-quiet">
        Optional. Start runs this Shortcut to begin a workout on your Watch, then brings you back
        here. You end the workout on your Watch, or from the bar at the top of your phone.
      </p>
    </section>
  );
}
