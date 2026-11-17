"use client";

import { PauseIcon, PlayIcon, RotateCcwIcon } from "@animateicons/react/lucide";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildPlan, totalSeconds } from "@/lib/plan";
import { useCues } from "@/lib/use-cues";
import { useMuted } from "@/lib/use-muted";
import { usePhasePush } from "@/lib/use-phase-push";
import { usePlanConfig } from "@/lib/use-plan-config";
import { useGetReady } from "@/lib/use-get-ready";
import { useIos } from "@/lib/use-ios";
import { useWatchDelay } from "@/lib/use-watch-delay";
import { useWatchShortcuts } from "@/lib/use-shortcut-name";
import { useTimer } from "@/lib/use-timer";
import { useWakeLock } from "@/lib/use-wake-lock";
import {
  clearWorkoutFlag,
  isIos,
  markWorkoutStarted,
  takeWorkoutEnd,
  watchWorkoutUrl,
} from "@/lib/watch-workout";
import { AboutDialog } from "./about-dialog";
import { PhaseNotifications } from "./phase-notifications";
import { PlanSettings } from "./plan-settings";
import { WalkDisplay } from "./walk-display";
import { WatchWorkoutSetting } from "./watch-workout-setting";

// Lets the final cue play out before we leave for the end Shortcut.
const END_AFTER_DONE_MS = 2500;

const onIosDevice = () => isIos(navigator.userAgent, navigator.maxTouchPoints);
// Reading localStorage can itself throw (blocked storage).
const store = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

const BUTTON =
  "flex h-16 flex-1 items-center justify-center gap-2 rounded-lg text-xl font-semibold transition-[colors,transform] motion-safe:active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink disabled:opacity-40";

export function Timer() {
  const { config, setConfig, hydrated } = usePlanConfig();
  const getReady = useGetReady();
  const watchDelay = useWatchDelay();
  const ios = useIos();
  const { startShortcut: shortcutName, endShortcut: endShortcutName } = useWatchShortcuts();
  // With the Watch workout on, the countdown lasts as long as the Watch takes to
  // start, so the workout and the walk begin on the same beat.
  const watchOn = ios && shortcutName !== "";
  const countdownSeconds = watchOn ? watchDelay.seconds : getReady.seconds;
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
  });
  const elapsedSeconds =
    plan.slice(0, phaseIndex).reduce((sum, p) => sum + p.durationInSeconds, 0) +
    (done ? 0 : plan[phaseIndex].durationInSeconds - secondsLeft);
  const phasePush = usePhasePush({
    config,
    elapsedSeconds,
    ready,
    running: running && !counting,
    done,
  });
  // With reminders on, the phone can lock and still cue the walker.
  useWakeLock(running && phasePush.state !== "on");
  // Between Start and the finish the header is out of the way.
  const walking = started && !done;

  // Runs the walker's end Shortcut, once per walk and only if Strut started
  // the workout. `force` is for their own tap on the finished screen.
  const endWatchWorkout = useCallback(
    (force = false) => {
      const storage = store();
      if (!storage || !onIosDevice()) return;
      const url = watchWorkoutUrl(endShortcutName);
      if (url && takeWorkoutEnd(storage, force)) window.location.href = url;
    },
    [endShortcutName],
  );

  // Only a walk that finishes while we watch it ends the workout, not one
  // restored from storage after the page was reopened.
  const sawRunning = useRef(false);
  useEffect(() => {
    if (running) sawRunning.current = true;
  }, [running]);
  useEffect(() => {
    if (!done || !sawRunning.current) return;
    const id = setTimeout(() => endWatchWorkout(), END_AFTER_DONE_MS);
    return () => clearTimeout(id);
  }, [done, endWatchWorkout]);

  // Start opens the Shortcut from the app, so we are still the same walk when the
  // walker switches back. iOS often keeps sound locked after that; if it does,
  // the first touch unlocks it.
  const [soundLocked, setSoundLocked] = useState(false);
  const leftForShortcut = useRef(false);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !leftForShortcut.current) return;
      leftForShortcut.current = false;
      if (muted) return;
      void unlock().then((allowed) => {
        if (!allowed) setSoundLocked(true);
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [muted, unlock]);

  useEffect(() => {
    if (!soundLocked) return;
    const unlockOnTouch = () => {
      prime();
      setSoundLocked(false);
    };
    document.addEventListener("pointerdown", unlockOnTouch, { once: true });
    return () => document.removeEventListener("pointerdown", unlockOnTouch);
  }, [soundLocked, prime]);

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Mid-walk the header fades out so the countdown is the only thing on screen. It keeps its space, so nothing moves when a walk starts, and inert keeps the help button out of tab order. */}
      <div
        inert={walking}
        className={`flex items-center justify-between px-4 motion-safe:transition-opacity motion-safe:duration-300 sm:px-0 ${
          walking ? "opacity-0" : ""
        }`}
      >
        <h1 className="font-condensed text-[2rem] leading-none">Strut</h1>
        <AboutDialog />
      </div>
      <div className="flex flex-col gap-3">
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
        />

        <div className="flex gap-3 px-4 sm:px-0">
          {running && counting ? (
            // Backing out of the countdown, as if Start had not been tapped.
            <button
              className={`${BUTTON} border-2 border-page-ink`}
              onClick={() => {
                reset();
                endWatchWorkout();
              }}
            >
              Cancel
            </button>
          ) : running ? (
            <button
              className={`${BUTTON} bg-action text-action-ink`}
              onClick={pause}
            >
              <PauseIcon aria-hidden="true" />
              Pause
            </button>
          ) : (
            !done && (
              <button
                className={`${BUTTON} bg-action text-action-ink`}
                onClick={() => {
                  prime();
                  const first = !started;
                  // The walk starts here, in the app, so its reminders work. The
                  // countdown gives the Watch time to start its workout.
                  start();
                  if (!first) return;
                  const storage = store();
                  const url = ios ? watchWorkoutUrl(shortcutName) : null;
                  if (url && storage && markWorkoutStarted(storage)) {
                    leftForShortcut.current = true;
                    window.location.href = url;
                  } else if (storage) {
                    clearWorkoutFlag(storage);
                  }
                }}
              >
                <PlayIcon aria-hidden="true" />
                {started ? "Resume" : "Start"}
              </button>
            )
          )}
          {/* Only while paused or finished, so a tap mid-walk can't throw the walk away. */}
          {started && !running && (
            <button
              className={`${BUTTON} border-2 border-page-ink`}
              onClick={() => {
                reset();
                endWatchWorkout();
              }}
            >
              <RotateCcwIcon aria-hidden="true" />
              Reset
            </button>
          )}
          {/* The automatic end can be blocked by iOS, so the walker can always tap it. */}
          {done && endShortcutName && onIosDevice() && (
            <button
              className={`${BUTTON} border-2 border-page-ink`}
              onClick={() => endWatchWorkout(true)}
            >
              End Watch workout
            </button>
          )}
        </div>

        {soundLocked && (
          <p className="px-4 text-sm text-page-quiet sm:px-0">
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
        />
      </div>

      <PlanSettings
        // Remount once after hydration so the inputs show stored values.
        key={String(hydrated)}
        config={config}
        totalSeconds={totalSeconds(plan)}
        disabled={started}
        getReadySeconds={getReady.seconds}
        getReadyFromWatch={watchOn}
        onGetReadyChange={getReady.setSeconds}
        onChange={setConfig}
      />

      <WatchWorkoutSetting />
    </div>
  );
}
