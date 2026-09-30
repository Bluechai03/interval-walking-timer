"use client";

import type { Phase } from "@/lib/plan";
import { useCues } from "@/lib/use-cues";
import { useTimer } from "@/lib/use-timer";
import { useWakeLock } from "@/lib/use-wake-lock";

// Countdown blinks once this many seconds (or fewer) remain in a phase.
const BLINK_THRESHOLD_SECONDS = 3;

const RING_RADIUS = 90;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function Timer({ plan }: { plan: Phase[] }) {
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

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div
        className={`card w-full ${
          done
            ? "bg-neutral text-neutral-content"
            : current.type === "fast"
              ? "bg-primary text-primary-content"
              : "bg-secondary text-secondary-content"
        }`}
      >
        <div className="card-body items-center text-center">
          <div
            className={`relative size-64 ${blinking ? "animate-blink" : ""}`}
          >
            <svg viewBox="0 0 200 200" className="size-full -rotate-90">
              <circle
                cx="100"
                cy="100"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.2}
                strokeWidth={10}
              />
              <circle
                cx="100"
                cy="100"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - fractionLeft)}
                className="transition-[stroke-dashoffset] duration-300 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-mono text-6xl tabular-nums grow-0">
                {formatTime(secondsLeft)}
              </p>
              <p className="text-2xl font-semibold uppercase grow-0">
                {done ? "Done" : current.type}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {running ? (
          <button className="btn btn-warning" onClick={pause}>
            Pause
          </button>
        ) : (
          !done && (
            <button
              className="btn btn-primary"
              onClick={() => {
                prime();
                start();
              }}
            >
              {started ? "Resume" : "Start"}
            </button>
          )
        )}
        <button className="btn btn-outline" onClick={reset} disabled={!started}>
          Reset
        </button>
      </div>

      <ul className="menu w-full rounded-box bg-base-200">
        {plan.map((item, i) => (
          <li key={i} className={done || i < phaseIndex ? "opacity-40" : ""}>
            <span className={!done && i === phaseIndex ? "menu-active" : ""}>
              <span className="capitalize">{item.type}</span>
              <span className="ml-auto font-mono">
                {formatTime(item.durationInSeconds)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
