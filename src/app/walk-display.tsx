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
  fast: "bg-field-hard text-field-hard-ink",
  slow: "bg-field-easy text-field-easy-ink",
  done: "bg-field-done text-field-done-ink",
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
  // For the heart rate target. 23 if left out.
  age?: number;
  // The solo timer has no header above it, so it can stand taller.
  extraSpace?: boolean;
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
  age,
  extraSpace = false,
}: Props) {
  const words = activityWords(activity);
  const current = plan[phaseIndex];
  const blinking = running && !counting && secondsLeft <= BLINK_THRESHOLD_SECONDS;
  // Each round is one fast phase followed by one slow phase.
  const round = Math.floor(phaseIndex / 2) + 1;
  // A time of ten minutes or more has five characters, which need smaller numerals
  // to fit. Chosen from the longest time this screen will show, so it never changes mid-walk.
  const longest = done ? totalSeconds(plan) : Math.max(...plan.map((phase) => phase.durationInSeconds));
  const longTime = formatTime(longest).length >= 5;

  return (
    <section
      aria-label="Current phase"
      // Tall enough on phones that the buttons land within thumb reach.
      className={`flex ${extraSpace ? "min-h-[calc(64svh_+_4.75rem)]" : "min-h-[64svh]"} flex-col justify-between gap-6 px-5 pt-5 pb-6 transition-colors duration-500 sm:min-h-0 sm:rounded-xl ${
        PHASE_FIELD[done ? "done" : current.type]
      }`}
    >
      <div className="flex flex-col gap-1">
        {/* The sound button has its own row, so a longer phase word can never push it down. The row keeps its height when the button goes at the end. */}
        <div className="flex min-h-11 items-center justify-between gap-4">
          <p className="text-base font-medium">{words.label}</p>
          {!done && <MuteButton muted={muted} onToggle={onToggleMute} />}
        </div>
        {/* A status, so screen readers say it when the phase changes. The countdown is not in it, so it is not read every second. The height always holds two lines, so a long word that wraps moves nothing below it. */}
        <p
          role="status"
          className="type-instruction min-h-[2em] break-words text-[clamp(2rem,9.5vw,2.75rem)] leading-none"
        >
          {done
            ? words.done
            : counting
              ? "Get ready"
              : current.type === "fast"
                ? words.fast
                : words.slow}
        </p>
      </div>

      {/* The box is as tall as the biggest numerals, so a longer time that needs smaller
          numerals, such as 30:00 at the end, changes nothing around it. */}
      <div className="flex h-[clamp(122px,46vw,190px)] items-start">
        <p
          role="timer"
          aria-label={
            done
              ? words.total(formatTime(totalSeconds(plan)))
              : counting
                ? `${getReadyLeft} seconds until the walk starts`
                : `${formatTime(secondsLeft)} left`
          }
          className={`type-numerals ${
            longTime ? "text-[clamp(112px,42vw,176px)]" : "text-[clamp(144px,54vw,224px)]"
          } leading-[0.85] tabular-nums ${blinking ? "animate-blink" : ""}`}
        >
          {counting ? getReadyLeft : formatTime(done ? totalSeconds(plan) : secondsLeft)}
        </p>
      </div>

      {/* Holds its place when there is no heart rate to show. */}
      <div className="min-h-14">
        {!done && !counting && <HeartRate type={current.type} pulsing={running} age={age} />}
      </div>

      {/* Where you are in the walk, written above the trail it describes. The block
          is as tall with the countdown's one line as with the trail, and its first line stays put. */}
      <div className="flex min-h-24 flex-col justify-start gap-2">
        {counting ? (
          <p className="text-base font-medium">
            {rounds} rounds of {formatTime(fastSeconds)} fast and{" "}
            {formatTime(slowSeconds)} slow
          </p>
        ) : (
          <>
            <p className="text-base font-medium">
              {done ? words.timeDone : `Round ${round} of ${rounds}`}
            </p>
            <TrailProfile
              plan={plan}
              phaseIndex={phaseIndex}
              fractionLeft={fractionLeft}
              done={done}
              activity={activity}
            />
          </>
        )}
      </div>
    </section>

  );
}
