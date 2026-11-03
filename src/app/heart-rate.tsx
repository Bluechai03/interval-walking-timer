import { HeartIcon } from "@phosphor-icons/react";
import { ASSUMED_AGE, heartRateTarget } from "@/lib/heart-rate";
import type { Phase } from "@/lib/plan";

type Props = {
  type: Phase["type"];
  // Pulse only while the timer is running.
  pulsing: boolean;
};

// Inherits the phase field's text color so it reads on both backgrounds.
export function HeartRate({ type, pulsing }: Props) {
  const { min, max, average } = heartRateTarget(type);

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
        <span className="font-semibold tabular-nums">
          {min}–{max} bpm
        </span>{" "}
        target heart rate
        <span className="block text-sm opacity-75">
          For age {ASSUMED_AGE}. The heart pulses at {average} bpm
        </span>
      </p>
    </div>
  );
}
