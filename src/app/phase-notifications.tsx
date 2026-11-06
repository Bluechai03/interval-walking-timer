"use client";

import type { PushSupport } from "@/lib/use-phase-push";

type Props = { state: PushSupport; onEnable: () => void; onDisable: () => void };

// Opt-in: a quiet line under the controls, so the timer stays uncluttered.
export function PhaseNotifications({ state, onEnable, onDisable }: Props) {
  if (state === "unsupported") return null;

  return (
    <div className="flex flex-col gap-1 px-4 text-sm sm:px-0">
      {state === "denied" ? (
        <p>Notifications are turned off for this app. You can switch them on in your phone&apos;s settings.</p>
      ) : (
        <>
          <p>
            Lock-screen reminders: a short note at each change, so you can keep your phone in your pocket.
          </p>
          <button
            type="button"
            className="self-start font-semibold underline underline-offset-4"
            onClick={state === "on" ? onDisable : onEnable}
          >
            {state === "on" ? "Turn reminders off" : "Turn reminders on"}
          </button>
        </>
      )}
    </div>
  );
}
