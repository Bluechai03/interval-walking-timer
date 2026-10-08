"use client";

import { formatTime } from "@/lib/format-time";
import {
  isValidPlanValue,
  PLAN_LIMITS,
  type PlanConfig,
} from "@/lib/plan";

const FIELDS: { field: keyof PlanConfig; label: string }[] = [
  { field: "fastSeconds", label: "Fast (sec)" },
  { field: "slowSeconds", label: "Slow (sec)" },
  { field: "rounds", label: "Rounds" },
];

type Props = {
  config: PlanConfig;
  totalSeconds: number;
  disabled: boolean;
  onChange: (config: PlanConfig) => void;
};

// Inputs are uncontrolled so that half-typed values don't snap back; only
// valid values are applied to the plan.
export function PlanSettings({ config, totalSeconds, disabled, onChange }: Props) {
  return (
    <div className="w-full rounded-box bg-base-200 p-4">
      <div className="grid grid-cols-3 gap-3">
        {FIELDS.map(({ field, label }) => (
          <label key={field} className="flex min-w-0 flex-col gap-1 text-sm">
            {label}
            <input
              type="number"
              inputMode="numeric"
              // text-base: iOS Safari zooms in on inputs smaller than 16px.
              className="input w-full min-w-0 text-base"
              defaultValue={config[field]}
              min={PLAN_LIMITS[field].min}
              max={PLAN_LIMITS[field].max}
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (isValidPlanValue(field, value)) {
                  onChange({ ...config, [field]: value });
                }
              }}
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-sm opacity-70">
        <span className={disabled ? "" : "invisible"}>
          Reset the timer to change the plan.{" "}
        </span>
        Total: {formatTime(totalSeconds)}
      </p>
    </div>
  );
}
