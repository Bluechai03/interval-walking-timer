"use client";

import { type ActivityId, activityWords, DEFAULT_ACTIVITY } from "@/lib/activity";
import { formatTime } from "@/lib/format-time";
import { totalSeconds, type Phase } from "@/lib/plan";
import { HeartRate } from "./heart-rate";
import { MuteButton } from "./mute-button";
import { TrailProfile } from "./trail-profile";

// Countdown blinks once this many seconds (or fewer) remain in a phase.
const BLINK_THRESHOLD_SECONDS = 3;

const PHASE_FIELD = {
  fast: "bg-brick text-mist",
  slow: "bg-slate text-mist",
  done: "bg-charcoal text-mist",
};

type Props = {
  plan: Phase[];
  rounds: number;
  fastSeconds: number;
  slowSeconds: number;
  phaseIndex: number;
  secondsLeft: number;
  fractionLeft: number;
  done: boolean;
  // In the "get ready" countdown before the first phase.
  counting: boolean;
  getReadyLeft: number;
  running: boolean;
  muted: boolean;
  onToggleMute: () => void;
  // Changes the words on the screen. Walking if left out.
  activity?: ActivityId;
};

// The big coloured screen: what to do now, the countdown, and where you are in
// the walk. Shared by the solo timer and walks in a room.
export function WalkDisplay({
  plan,
  rounds,
  fastSeconds,
  slowSeconds,
  phaseIndex,
  secondsLeft,
  fractionLeft,
  done,
  counting,
  getReadyLeft,
  running,
  muted,
  onToggleMute,
  activity = DEFAULT_ACTIVITY,
}: Props) {
  const words = activityWords(activity);
  const current = plan[phaseIndex];
  const blinking = running && !counting && secondsLeft <= BLINK_THRESHOLD_SECONDS;
  // Each round is one fast phase followed by one slow phase.
  const round = Math.floor(phaseIndex / 2) + 1;

  return (
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
            ? words.done
            : counting
              ? "Get ready"
              : current.type === "fast"
              ? words.fast
              : words.slow}
        </p>
        {/* The negative margin keeps the taller button from stretching the row. */}
        {!done && (
          <div className="-my-1">
            <MuteButton muted={muted} onToggle={onToggleMute} />
          </div>
        )}
      </div>

      <p
        role="timer"
        aria-label={
          done
            ? words.total(formatTime(totalSeconds(plan)))
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
          {rounds} rounds of {formatTime(fastSeconds)} fast and{" "}
          {formatTime(slowSeconds)} slow
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-base font-medium opacity-80">
            {done ? words.timeDone : `Round ${round} of ${rounds}`}
          </p>
          <TrailProfile
            plan={plan}
            phaseIndex={phaseIndex}
            fractionLeft={fractionLeft}
            done={done}
            activity={activity}
          />
        </div>
      )}
    </section>

  );
}
