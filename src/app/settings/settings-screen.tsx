"use client";

import { useActivity } from "@/lib/use-activity";
import { useAge } from "@/lib/use-age";
import { useGetReady } from "@/lib/use-get-ready";
import { usePhasePush } from "@/lib/use-phase-push";
import { usePlanConfig } from "@/lib/use-plan-config";
import { useWalkInProgress } from "@/lib/use-walk-in-progress";
import { useWatchSetup } from "@/lib/use-watch-workout";
import { BottomTabs } from "../bottom-tabs";
import { PhaseNotifications } from "../phase-notifications";
import { PlanSettings } from "../plan-settings";
import { WatchWorkoutSetting } from "../watch-workout-setting";

// Everything that is set once and left: the activity, the countdown, the age for
// the heart rate, the lock-screen reminders and the Apple Watch.
export function SettingsScreen() {
  const { config } = usePlanConfig();
  const getReady = useGetReady();
  const { activity, setActivity } = useActivity();
  const { age, setAge } = useAge();
  const watchSetup = useWatchSetup();
  const walkInProgress = useWalkInProgress();
  // Only here to turn reminders on or off; no walk is running on this screen.
  const phasePush = usePhasePush({ config, activity, age, elapsedSeconds: 0, ready: true, running: false, done: false });

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="px-4 sm:px-0">
        <h1 className="font-condensed text-[2rem] leading-none">Settings</h1>
      </header>

      <PlanSettings
        disabled={walkInProgress}
        activity={activity}
        onActivityChange={setActivity}
        age={age}
        onAgeChange={setAge}
        getReadySeconds={getReady.seconds}
        getReadyFromWatch={watchSetup.on}
        onGetReadyChange={getReady.setSeconds}
      />

      <section aria-labelledby="reminders-heading" className="flex flex-col gap-3">
        <h2 id="reminders-heading" className="mx-4 border-b-2 border-page-ink pb-2 text-xl font-semibold sm:mx-0">
          Reminders
        </h2>
        <PhaseNotifications
          state={phasePush.state}
          failed={phasePush.failed}
          shouldAsk={false}
          onEnable={() => void phasePush.enable()}
          onDisable={() => void phasePush.disable()}
          onDismissAsk={phasePush.dismissAsk}
        />
      </section>

      <WatchWorkoutSetting />

      <BottomTabs />
    </main>
  );
}
