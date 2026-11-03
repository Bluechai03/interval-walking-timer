import { formatTime } from "@/lib/format-time";
import type { Phase } from "@/lib/plan";

type Props = {
  plan: Phase[];
  phaseIndex: number;
  fractionLeft: number;
  done: boolean;
};

// The session drawn like a trail's elevation profile: fast phases are tall,
// slow phases low, and each segment's width follows its duration. Walked
// segments are solid and the current one fills as it runs.
export function TrailProfile({ plan, phaseIndex, fractionLeft, done }: Props) {
  return (
    <ol aria-label="Session" className="flex h-12 items-end gap-1">
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
            <span className="absolute inset-0 bg-current opacity-15" />
            <span
              className="absolute inset-0 origin-left bg-current transition-transform duration-300 ease-linear"
              style={{ transform: `scaleX(${fill})` }}
            />
            <span className="sr-only">
              {phase.type === "fast" ? "Fast" : "Slow"}{" "}
              {formatTime(phase.durationInSeconds)}
              {walked ? ", walked" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
