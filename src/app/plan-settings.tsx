"use client";

import { useState } from "react";
import { ACTIVITY_IDS, type ActivityId, activityWords, isActivity } from "@/lib/activity";
import { AGE_LIMITS } from "@/lib/heart-rate";
import { GET_READY_LIMITS } from "@/lib/use-get-ready";

type Props = {
  disabled: boolean;
  activity: ActivityId;
  onActivityChange: (activity: ActivityId) => void;
  // For the heart rate targets.
  age: number;
  onAgeChange: (age: number) => void;
  getReadySeconds: number;
  // The Watch workout sets the countdown, so this field has no effect.
  getReadyFromWatch?: boolean;
  onGetReadyChange: (seconds: number) => void;
};

// Inputs are uncontrolled so that half-typed values don't snap back; only
// valid values are applied to the plan.
export function PlanSettings({
  disabled,
  activity,
  onActivityChange,
  age,
  onAgeChange,
  getReadySeconds,
  getReadyFromWatch = false,
  onGetReadyChange,
}: Props) {
  // A field's message while what is typed is out of range. Gone once it is fine.
  const [problems, setProblems] = useState<Record<string, string>>({});
  const check = (key: string, ok: boolean, message: string) =>
    setProblems((current) => {
      if (ok) {
        if (!(key in current)) return current;
        const rest = { ...current };
        delete rest[key];
        return rest;
      }
      return { ...current, [key]: message };
    });
  return (
    <section aria-labelledby="plan-heading" className="flex flex-col gap-3 px-4 sm:px-0">
      <h2 id="plan-heading" className="border-b-2 border-page-ink pb-2 text-xl font-semibold">
        Your workout
      </h2>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-page-quiet">Activity</span>
        <select
          className="w-full border-b border-page-line bg-transparent py-2 text-2xl font-semibold min-h-11 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink focus:border-page-ink disabled:text-page-quiet"
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
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-page-quiet">
            Get ready{getReadyFromWatch && <span className="font-normal"> · set by Watch</span>}
          </span>
          <span className="flex items-center gap-1 border-b border-page-line focus-within:border-page-ink focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-page-ink min-h-11">
            <input
              type="number"
              inputMode="numeric"
              className="w-full min-w-0 bg-transparent min-h-11 py-1 text-2xl font-semibold tabular-nums outline-none disabled:text-page-quiet"
              defaultValue={getReadySeconds}
              min={GET_READY_LIMITS.min}
              max={GET_READY_LIMITS.max}
              disabled={disabled || getReadyFromWatch}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                const ok = Number.isInteger(value) && value >= GET_READY_LIMITS.min && value <= GET_READY_LIMITS.max;
                check("getReady", ok, `Get ready can be ${GET_READY_LIMITS.min} to ${GET_READY_LIMITS.max} sec.`);
                if (ok) onGetReadyChange(value);
              }}
            />
            <span aria-hidden="true" className="text-sm text-page-quiet">
              sec
            </span>
          </span>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium text-page-quiet">Age</span>
          <span className="flex items-center gap-1 border-b border-page-line focus-within:border-page-ink focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-page-ink min-h-11">
            <input
              id="age"
              type="number"
              inputMode="numeric"
              className="w-full min-w-0 bg-transparent min-h-11 py-1 text-2xl font-semibold tabular-nums outline-none disabled:text-page-quiet"
              disabled={disabled}
              defaultValue={age}
              min={AGE_LIMITS.min}
              max={AGE_LIMITS.max}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                const ok = Number.isInteger(value) && value >= AGE_LIMITS.min && value <= AGE_LIMITS.max;
                check("age", ok, `Age can be ${AGE_LIMITS.min} to ${AGE_LIMITS.max}.`);
                if (ok) onAgeChange(value);
              }}
            />
          </span>
        </label>
      </div>
      {Object.keys(problems).length > 0 && (
        <p role="alert" className="text-sm font-medium">
          {Object.values(problems).join(" ")}
        </p>
      )}
      <p className={`text-sm text-page-quiet ${disabled ? "" : "invisible"}`}>
        End the walk to change these.
      </p>
    </section>
  );
}
