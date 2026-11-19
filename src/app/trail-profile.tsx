import { formatTime } from "@/lib/format-time";
import { type ActivityId, activityWords, DEFAULT_ACTIVITY } from "@/lib/activity";
import type { Phase } from "@/lib/plan";

type Props = {
  plan: Phase[];
  phaseIndex: number;
  fractionLeft: number;
  done: boolean;
  activity?: ActivityId;
};

// The effort strip: the workout drawn like an elevation profile. Hard phases are
// tall, easy ones low, and each segment's width follows its duration. Finished
// segments are solid, the current one fills as it runs, and a bright line marks
// where you are right now.
export function TrailProfile({ plan, phaseIndex, fractionLeft, done, activity = DEFAULT_ACTIVITY }: Props) {
  const words = activityWords(activity);
  return (
    <ol aria-label={words.label} className="flex h-16 items-end gap-1">
      {plan.map((phase, i) => {
        const walked = done || i < phaseIndex;
        const isCurrent = !done && i === phaseIndex;
        const fill = walked ? 1 : isCurrent ? 1 - fractionLeft : 0;

        return (
          <li
            key={i}
            aria-current={isCurrent ? "step" : undefined}
            className={`relative overflow-hidden rounded-sm ${
              phase.type === "fast" ? "h-full" : "h-[40%]"
            }`}
            style={{ flexGrow: phase.durationInSeconds, flexBasis: 0 }}
          >
            <span className="absolute inset-0 rounded-sm border-2 border-current bg-current/15" />
            <span
              className="absolute inset-0 origin-left bg-current transition-transform duration-1000 ease-linear"
              style={{ transform: `scaleX(${fill})` }}
            />
            {isCurrent && (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 w-[3px] bg-marker"
                style={{ left: `calc(${fill * 100}% - 1.5px)` }}
              />
            )}
            <span className="sr-only">
              {phase.type === "fast" ? "Fast" : "Slow"}{" "}
              {formatTime(phase.durationInSeconds)}
              {walked ? `, ${words.phaseDone}` : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
