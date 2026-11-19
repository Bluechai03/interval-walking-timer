"use client";

import { PauseIcon, PlayIcon, RotateCcwIcon } from "@animateicons/react/lucide";
import { CheckIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { buildPlan } from "@/lib/plan";
import { useActivity } from "@/lib/use-activity";
import { useAge } from "@/lib/use-age";
import { useCues } from "@/lib/use-cues";
import { useMuted } from "@/lib/use-muted";
import { usePhasePush } from "@/lib/use-phase-push";
import { usePlanConfig } from "@/lib/use-plan-config";
import { useGetReady } from "@/lib/use-get-ready";
import { useTimer } from "@/lib/use-timer";
import { useWakeLock } from "@/lib/use-wake-lock";
import { useWatchSetup, useWatchWorkout } from "@/lib/use-watch-workout";
import { AboutDialog } from "./about-dialog";
import { BottomTabs } from "./bottom-tabs";
import { PhaseNotifications } from "./phase-notifications";
import { ReadyCard } from "./ready-card";
import { WalkDisplay } from "./walk-display";

const BUTTON =
  "flex h-16 flex-1 items-center justify-center gap-2 rounded-lg text-xl font-semibold transition-[colors,transform] motion-safe:active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink disabled:opacity-40";

export function Timer() {
  const { config, setConfig } = usePlanConfig();
  const getReady = useGetReady();
  const { activity } = useActivity();
  const { age } = useAge();
  // Which way the walk screen glides when a tap changes whether the header is there.
  const [glide, setGlide] = useState<"up" | "down" | null>(null);
  // Done ends a walk in progress, so the first tap only asks.
  const [confirmEnd, setConfirmEnd] = useState(false);
  const watchSetup = useWatchSetup();
  // With the Watch workout on, the countdown lasts as long as the Watch takes to
  // start, so the workout and the walk begin on the same beat.
  const watchOn = watchSetup.on;
  const countdownSeconds = watchOn ? watchSetup.delaySeconds : getReady.seconds;
  const plan = useMemo(() => buildPlan(config), [config]);
  const {
    phaseIndex,
    secondsLeft,
    fractionLeft,
    done,
    ready,
    running,
    getReadyLeft,
    started,
    start,
    pause,
    reset,
  } = useTimer(plan, countdownSeconds);
  const { muted, setMuted } = useMuted();
  const counting = getReadyLeft > 0;
  // The walk's cues and reminders begin when the countdown ends.
  const { prime, unlock } = useCues({
    plan,
    phaseIndex,
    running: running && !counting,
    started: started && !counting,
    done,
    secondsLeft,
    muted,
    getReadyLeft,
    activity,
    age,
  });
  const elapsedSeconds =
    plan.slice(0, phaseIndex).reduce((sum, p) => sum + p.durationInSeconds, 0) +
    (done ? 0 : plan[phaseIndex].durationInSeconds - secondsLeft);
  const phasePush = usePhasePush({
    config,
    activity,
    age,
    elapsedSeconds,
    ready,
    running: running && !counting,
    done,
  });
  // With reminders on, the phone can lock and still cue the walker.
  useWakeLock(running && phasePush.state !== "on");
  // Between Start and the finish the header is out of the way.
  const walking = started && !done;

  // Start and end the Watch workout through the walker's Shortcuts. Start opens
  // the Shortcut from this app, so it is still the same walk when they switch back.
  const watch = useWatchWorkout(watchSetup, { running, done, muted, prime, unlock });

  return (
    <div className={`relative flex w-full flex-col gap-8 ${walking ? "" : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]"}`}>
      {/* Once a walk has started the header leaves the page flow, so the walk can use its room. It stays in the page for screen readers, fades out, and inert keeps the help button out of tab order. It comes back when the walk is reset, not when it finishes by itself, so nothing moves without a tap. */}
      <div
        className={`flex h-11 items-center justify-between px-4 motion-safe:transition-opacity motion-safe:duration-300 sm:px-0 ${
          started ? "pointer-events-none absolute inset-x-0 top-0 opacity-0" : ""
        }`}
      >
        <h1 className="font-condensed text-[2rem] leading-none">Strut</h1>
        <div inert={started}>
          <AboutDialog />
        </div>
      </div>
      {/* The glide is a transform, so it costs the page no layout work. */}
      <div
        className={`flex flex-col gap-3 ${
          glide === "up" ? "motion-safe:animate-glide-up" : glide === "down" ? "motion-safe:animate-glide-down" : ""
        }`}
      >
        {/* Before the walk, the plan on a calm field; the effort colours come with the walk. */}
        {!started ? (
          <ReadyCard
            config={config}
            onChange={setConfig}
            activity={activity}
            muted={muted}
            onToggleMute={() => setMuted(!muted)}
          />
        ) : (
        <WalkDisplay
          plan={plan}
          rounds={config.rounds}
          fastSeconds={config.fastSeconds}
          slowSeconds={config.slowSeconds}
          phaseIndex={phaseIndex}
          secondsLeft={secondsLeft}
          fractionLeft={fractionLeft}
          done={done}
          counting={counting}
          getReadyLeft={getReadyLeft}
          running={running}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          activity={activity}
          age={age}
          extraSpace
        />
        )}

        {/* The main buttons stay in reach above the tab bar, so Start is never hidden behind it
            however tall the screen above is. */}
        <div
          className={`sticky z-10 flex gap-3 bg-page px-4 py-3 sm:px-0 ${
            walking ? "bottom-[env(safe-area-inset-bottom)]" : "bottom-[calc(4.25rem+env(safe-area-inset-bottom))]"
          }`}
        >
          {running && counting ? (
            // Backing out of the countdown, as if Start had not been tapped.
            <button
              className={`${BUTTON} border-2 border-page-ink`}
              onClick={() => {
                setGlide("down");
                reset();
                watch.end();
              }}
            >
              Cancel
            </button>
          ) : running ? (
            <button
              className={`${BUTTON} bg-marker text-midnight`}
              onClick={() => {
                setConfirmEnd(false);
                pause();
              }}
            >
              <PauseIcon aria-hidden="true" />
              Pause
            </button>
          ) : (
            !done && (
              <button
                className={`${BUTTON} bg-marker text-midnight`}
                onClick={() => {
                  prime();
                  const first = !started;
                  // The walk starts here, in the app, so its reminders work. The
                  // countdown gives the Watch time to start its workout.
                  start();
                  if (first) {
                    setGlide("up");
                    watch.start();
                  }
                }}
              >
                <PlayIcon aria-hidden="true" />
                {started ? "Resume" : "Start"}
              </button>
            )
          )}
          {/* Ends the whole session: the timer, the Watch workout and the reminders. The first tap asks, so a stray tap mid-walk can't throw the walk away. */}
          {started && !done && !counting && (
            <button
              className={`${BUTTON} whitespace-nowrap border-2 border-page-ink`}
              onClick={() => {
                if (!confirmEnd) {
                  setConfirmEnd(true);
                  return;
                }
                setConfirmEnd(false);
                setGlide("down");
                reset();
                watch.end();
              }}
              onBlur={() => setConfirmEnd(false)}
            >
              <CheckIcon aria-hidden="true" weight="bold" size={24} />
              {confirmEnd ? "Yes, end" : "Done"}
            </button>
          )}
          {/* After the finish, back to the start. */}
          {done && (
            <button
              className={`${BUTTON} border-2 border-page-ink`}
              onClick={() => {
                setGlide("down");
                reset();
                watch.end();
              }}
            >
              <RotateCcwIcon aria-hidden="true" />
              Reset
            </button>
          )}
          {/* The automatic end can be blocked by iOS, so the walker can always tap it. */}
          {done && watchSetup.canEnd && (
            <button
              className={`${BUTTON} border-2 border-page-ink`}
              onClick={() => watch.end(true)}
            >
              End Watch workout
            </button>
          )}
        </div>

        {watchSetup.blockedInBrowser && walking && (
          <p role="status" className="px-4 text-sm text-page-quiet sm:px-0">
            Your Watch workout only starts from the Strut app on your Home Screen, so it
            didn&apos;t start here. Open Strut from there next time.
          </p>
        )}
        {watch.soundLocked && (
          <p role="status" className="px-4 text-sm text-page-quiet sm:px-0">
            Tap anywhere to turn sound on. iOS keeps it off after a trip to Shortcuts.
          </p>
        )}

        <PhaseNotifications
          state={phasePush.state}
          walking={walking}
          failed={phasePush.failed}
          shouldAsk={phasePush.shouldAsk}
          onEnable={() => void phasePush.enable()}
          onDisable={() => void phasePush.disable()}
          onDismissAsk={phasePush.dismissAsk}
          quietWhenIdle
        />
      </div>

      {/* A walk in progress has nothing but itself on screen. */}
      <BottomTabs hidden={walking} />
    </div>
  );
}
