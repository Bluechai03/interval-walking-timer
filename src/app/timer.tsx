"use client";

import { PauseIcon, PlayIcon, RotateCcwIcon } from "@animateicons/react/lucide";
import { useMemo } from "react";
import { formatTime } from "@/lib/format-time";
import { buildPlan, totalSeconds } from "@/lib/plan";
import { useCues } from "@/lib/use-cues";
import { usePlanConfig } from "@/lib/use-plan-config";
import { useTimer } from "@/lib/use-timer";
import { useWakeLock } from "@/lib/use-wake-lock";
import { HeartRate } from "./heart-rate";
import { PlanSettings } from "./plan-settings";
import { TrailProfile } from "./trail-profile";

// Countdown blinks once this many seconds (or fewer) remain in a phase.
const BLINK_THRESHOLD_SECONDS = 3;

const PHASE_FIELD = {
  fast: "bg-blaze text-ink",
  slow: "bg-pine text-mist",
  done: "bg-ink text-mist",
};

const BUTTON =
  "flex h-16 flex-1 items-center justify-center gap-2 rounded-lg text-xl font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink disabled:opacity-40";

export function Timer() {
  const { config, setConfig, hydrated } = usePlanConfig();
  const plan = useMemo(() => buildPlan(config), [config]);
  const {
    phaseIndex,
    secondsLeft,
    fractionLeft,
    done,
    running,
    started,
    start,
    pause,
    reset,
  } = useTimer(plan);
  const { prime } = useCues({ plan, phaseIndex, running, started, done });
  useWakeLock(running);
  const current = plan[phaseIndex];
  const blinking = running && secondsLeft <= BLINK_THRESHOLD_SECONDS;
  // Each round is one fast phase followed by one slow phase.
  const round = Math.floor(phaseIndex / 2) + 1;

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-3">
        <section
          aria-label="Current phase"
          // Tall enough on phones that the buttons land within thumb reach.
          className={`flex min-h-[64dvh] flex-col justify-between gap-6 px-5 pt-5 pb-6 transition-colors duration-500 sm:min-h-0 sm:rounded-xl ${
            PHASE_FIELD[done ? "done" : current.type]
          }`}
        >
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-3xl font-semibold">
              {done
                ? "Walk complete"
                : current.type === "fast"
                  ? "Walk fast"
                  : "Walk slow"}
            </p>
            <p className="text-base font-medium opacity-80">
              {done ? "Time walked" : `Round ${round} of ${config.rounds}`}
            </p>
          </div>

          <p
            role="timer"
            aria-label={
              done
                ? `${formatTime(totalSeconds(plan))} walked`
                : `${formatTime(secondsLeft)} left`
            }
            className={`-my-4 font-condensed text-[clamp(7rem,42vw,11rem)] leading-none tabular-nums ${
              blinking ? "animate-blink" : ""
            }`}
          >
            {formatTime(done ? totalSeconds(plan) : secondsLeft)}
          </p>

          {!done && <HeartRate type={current.type} pulsing={running} />}

          <TrailProfile
            plan={plan}
            phaseIndex={phaseIndex}
            fractionLeft={fractionLeft}
            done={done}
          />
        </section>

        <div className="flex gap-3 px-4 sm:px-0">
          {running ? (
            <button
              className={`${BUTTON} bg-page-ink text-page`}
              onClick={pause}
            >
              <PauseIcon aria-hidden="true" />
              Pause
            </button>
          ) : (
            !done && (
              <button
                className={`${BUTTON} bg-page-ink text-page`}
                onClick={() => {
                  prime();
                  start();
                }}
              >
                <PlayIcon aria-hidden="true" />
                {started ? "Resume" : "Start"}
              </button>
            )
          )}
          <button
            className={`${BUTTON} border-2 border-page-ink`}
            onClick={reset}
            disabled={!started}
          >
            <RotateCcwIcon aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      <PlanSettings
        // Remount once after hydration so the inputs show stored values.
        key={String(hydrated)}
        config={config}
        totalSeconds={totalSeconds(plan)}
        disabled={started}
        onChange={setConfig}
      />
    </div>
  );
}
