import { HeartIcon } from "@phosphor-icons/react";
import { ASSUMED_AGE, effortWords, heartRateTarget } from "@/lib/heart-rate";
import type { Phase } from "@/lib/plan";

type Props = {
  type: Phase["type"];
  // Pulse only while the timer is running.
  pulsing: boolean;
  age?: number;
};

// Inherits the phase field's text color so it reads on both backgrounds.
export function HeartRate({ type, pulsing, age = ASSUMED_AGE }: Props) {
  const { min, max, average } = heartRateTarget(type, age);

  return (
    <div className="flex items-center gap-3">
      <HeartIcon
        weight="fill"
        size={28}
        aria-hidden="true"
        className="heartbeat shrink-0"
        style={
          pulsing
            ? { animation: `heartbeat ${60 / average}s ease-in-out infinite` }
            : undefined
        }
      />
      <p className="text-lg leading-tight">
        <span className="font-semibold">{effortWords(type)}</span>
        <span className="block text-base">
          Target {min}–{max} bpm, for{" "}
          <a href="#age" className="underline underline-offset-4">
            age {age}
          </a>
        </span>
      </p>
    </div>
  );
}
