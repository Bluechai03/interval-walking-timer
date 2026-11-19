"use client";

import { ACTIVITY_IDS, type ActivityId, activityWords, isActivity } from "@/lib/activity";
import { formatTime } from "@/lib/format-time";
import { GET_READY_LIMITS } from "@/lib/use-get-ready";
import {
  isValidPlanValue,
  PLAN_LIMITS,
  type PlanConfig,
} from "@/lib/plan";

// Phase lengths are shown in minutes; step converts back to stored seconds.
const FIELDS: { field: keyof PlanConfig; label: string; unit?: string }[] = [
  { field: "fastSeconds", label: "Fast", unit: "min" },
  { field: "slowSeconds", label: "Slow", unit: "min" },
  { field: "rounds", label: "Rounds" },
];

type Props = {
  config: PlanConfig;
  totalSeconds: number;
  disabled: boolean;
  activity: ActivityId;
  onActivityChange: (activity: ActivityId) => void;
  getReadySeconds: number;
  // The Watch workout sets the countdown, so this field has no effect.
  getReadyFromWatch?: boolean;
  onGetReadyChange: (seconds: number) => void;
  onChange: (config: PlanConfig) => void;
};

// Inputs are uncontrolled so that half-typed values don't snap back; only
// valid values are applied to the plan.
export function PlanSettings({
  config,
  totalSeconds,
  disabled,
  activity,
  onActivityChange,
  getReadySeconds,
  getReadyFromWatch = false,
  onGetReadyChange,
  onChange,
}: Props) {
  return (
    <section aria-labelledby="plan-heading" className="flex flex-col gap-3 px-4 sm:px-0">
      <div className="flex items-baseline justify-between border-b-2 border-page-ink pb-2">
        <h2 id="plan-heading" className="text-xl font-semibold">
          Plan
        </h2>
        <p className="text-base tabular-nums">Total {formatTime(totalSeconds)}</p>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-page-quiet">Activity</span>
        <select
          className="w-full border-b border-page-line bg-transparent py-2 text-2xl font-semibold outline-none focus:border-page-ink disabled:text-page-quiet"
          value={activity}
          disabled={disabled}
          onChange={(event) => {
            if (isActivity(event.target.value)) onActivityChange(event.target.value);
          }}
        >
          {ACTIVITY_IDS.map((id) => (
            <option key={id} value={id}>
              {activityWords(id).label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-3">
        {FIELDS.map(({ field, label, unit }) => {
          const { min, max, step } = PLAN_LIMITS[field];
          return (
            <label key={field} className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium text-page-quiet">
                {label}
                {unit && <span className="sr-only"> in minutes</span>}
              </span>
              <span className="flex items-baseline gap-1 border-b border-page-line focus-within:border-page-ink">
                <input
                  type="number"
                  inputMode="numeric"
                  // text-2xl keeps it above 16px, so iOS Safari doesn't zoom in.
                  className="w-full min-w-0 bg-transparent py-1 text-2xl font-semibold tabular-nums outline-none disabled:text-page-quiet"
                  defaultValue={config[field] / step}
                  min={min / step}
                  max={max / step}
                  disabled={disabled}
                  onChange={(event) => {
                    const value = event.target.valueAsNumber * step;
                    if (isValidPlanValue(field, value)) {
                      onChange({ ...config, [field]: value });
                    }
                  }}
                />
                {unit && (
                  <span aria-hidden="true" className="text-sm text-page-quiet">
                    {unit}
                  </span>
                )}
              </span>
            </label>
          );
        })}
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-page-quiet">
            Get ready{getReadyFromWatch && <span className="font-normal"> · set by Watch</span>}
          </span>
          <span className="flex items-baseline gap-1 border-b border-page-line focus-within:border-page-ink">
            <input
              type="number"
              inputMode="numeric"
              className="w-full min-w-0 bg-transparent py-1 text-2xl font-semibold tabular-nums outline-none disabled:text-page-quiet"
              defaultValue={getReadySeconds}
              min={GET_READY_LIMITS.min}
              max={GET_READY_LIMITS.max}
              disabled={disabled || getReadyFromWatch}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (Number.isInteger(value) && value >= GET_READY_LIMITS.min && value <= GET_READY_LIMITS.max) {
                  onGetReadyChange(value);
                }
              }}
            />
            <span aria-hidden="true" className="text-sm text-page-quiet">
              sec
            </span>
          </span>
        </label>
      </div>
      <p className={`text-sm text-page-quiet ${disabled ? "" : "invisible"}`}>
        Reset the timer to change the plan.
      </p>
    </section>
  );
}
