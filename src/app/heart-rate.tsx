import { HeartIcon } from "@phosphor-icons/react";
import { heartRateTarget } from "@/lib/heart-rate";
import type { Phase } from "@/lib/plan";

type Props = {
  type: Phase["type"];
  // Pulse only while the timer is running.
  pulsing: boolean;
};

export function HeartRate({ type, pulsing }: Props) {
  const { min, max, average } = heartRateTarget(type);

  return (
    <div className="flex items-center justify-center gap-3 rounded-box bg-base-200 p-3">
      <HeartIcon
        weight="fill"
        size={32}
        aria-hidden="true"
        className="text-error"
        style={
          pulsing
            ? { animation: `heartbeat ${60 / average}s ease-in-out infinite` }
            : undefined
        }
      />
      <p className="text-sm">
        Target heart rate{" "}
        <span className="font-mono font-semibold">
          {min}–{max} bpm
        </span>
        <span className="block text-xs opacity-70">
          Pulse matches the {average} bpm average
        </span>
      </p>
    </div>
  );
}
