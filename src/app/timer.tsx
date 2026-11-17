"use client";

import { PauseIcon, PlayIcon, RotateCcwIcon } from "@animateicons/react/lucide";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "@/lib/format-time";
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
import { HeartRate } from "./heart-rate";
import { MuteButton } from "./mute-button";
import { PhaseNotifications } from "./phase-notifications";
import { PlanSettings } from "./plan-settings";
import { TrailProfile } from "./trail-profile";
import { WatchWorkoutSetting } from "./watch-workout-setting";

// Countdown blinks once this many seconds (or fewer) remain in a phase.
const BLINK_THRESHOLD_SECONDS = 3;

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

const PHASE_FIELD = {
  fast: "bg-brick text-mist",
  slow: "bg-slate text-mist",
  done: "bg-charcoal text-mist",
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
  const current = plan[phaseIndex];
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

  const blinking = running && !counting && secondsLeft <= BLINK_THRESHOLD_SECONDS;
  // Each round is one fast phase followed by one slow phase.
  const round = Math.floor(phaseIndex / 2) + 1;

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
        <section
          aria-label="Current phase"
          // Tall enough on phones that the buttons land within thumb reach.
          className={`flex min-h-[64svh] flex-col justify-between gap-6 px-5 pt-5 pb-6 transition-colors duration-500 sm:min-h-0 sm:rounded-xl ${
            PHASE_FIELD[done ? "done" : current.type]
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-3xl font-semibold">
              {done
                ? "Walk complete"
                : counting
                  ? "Get ready"
                  : current.type === "fast"
                  ? "Walk fast"
                  : "Walk slow"}
            </p>
            {/* The negative margin keeps the taller button from stretching the row. */}
            {!done && (
              <div className="-my-1">
                <MuteButton muted={muted} onToggle={() => setMuted(!muted)} />
              </div>
            )}
          </div>

          <p
            role="timer"
            aria-label={
              done
                ? `${formatTime(totalSeconds(plan))} walked`
                : counting
                  ? `${getReadyLeft} seconds until the walk starts`
                  : `${formatTime(secondsLeft)} left`
            }
            className={`-my-4 font-condensed text-[clamp(7rem,42vw,11rem)] leading-none tabular-nums ${
              blinking ? "animate-blink" : ""
            }`}
          >
            {counting ? getReadyLeft : formatTime(done ? totalSeconds(plan) : secondsLeft)}
          </p>

          {!done && !counting && <HeartRate type={current.type} pulsing={running} />}

          {/* Where you are in the walk, written above the trail it describes. */}
          {counting ? (
            <p className="text-base font-medium opacity-80">
              {config.rounds} rounds of {formatTime(config.fastSeconds)} fast and{" "}
              {formatTime(config.slowSeconds)} slow
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-base font-medium opacity-80">
                {done ? "Time walked" : `Round ${round} of ${config.rounds}`}
              </p>
              <TrailProfile
                plan={plan}
                phaseIndex={phaseIndex}
                fractionLeft={fractionLeft}
                done={done}
              />
            </div>
          )}
        </section>

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
