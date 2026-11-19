"use client";

import { useState } from "react";
import { type ActivityId, activityWords } from "@/lib/activity";
import { buildPlan, totalSeconds, type PlanConfig } from "@/lib/plan";
import { MuteButton } from "./mute-button";
import { PlanSheet } from "./plan-sheet";
import { TrailProfile } from "./trail-profile";

type Props = {
  config: PlanConfig;
  onChange: (config: PlanConfig) => void;
  activity: ActivityId;
  muted: boolean;
  onToggleMute: () => void;
};

// Before the walk: the plan at a glance, on a calm field. Changing it is one tap
// away, in a sheet, so the first screen is the plan and Start. The effort colours
// are kept for the walk itself.
export function ReadyCard({ config, onChange, activity, muted, onToggleMute }: Props) {
  const words = activityWords(activity);
  const plan = buildPlan(config);
  const [editing, setEditing] = useState(false);

  const stats = [
    { value: config.fastSeconds / 60, label: "min fast" },
    { value: config.slowSeconds / 60, label: "min slow" },
    { value: config.rounds, label: config.rounds === 1 ? "round" : "rounds" },
  ];

  return (
    <section
      aria-label="Your plan"
      className="flex flex-col gap-6 bg-field-done px-5 pt-5 pb-6 text-field-done-ink sm:rounded-xl"
    >
      <div className="flex flex-col gap-1">
        <div className="flex min-h-11 items-center justify-between gap-4">
          <p className="text-base font-medium">{words.label}</p>
          <MuteButton muted={muted} onToggle={onToggleMute} />
        </div>
        <p className="type-instruction text-[clamp(2rem,9.5vw,2.75rem)] leading-none">Ready to go</p>
      </div>

      <div className="flex flex-col gap-2">
        <dl className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <dd className="type-numerals order-1 text-[clamp(3.5rem,18vw,5rem)] leading-none tabular-nums">
                {stat.value}
              </dd>
              <dt className="order-2 text-base">{stat.label}</dt>
            </div>
          ))}
        </dl>
        <p className="text-base tabular-nums">{totalSeconds(plan) / 60} min in all</p>
      </div>

      <TrailProfile plan={plan} phaseIndex={0} fractionLeft={1} done={false} activity={activity} />

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex h-12 items-center justify-center rounded-full border-2 border-current text-base font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Change plan
      </button>

      {editing && <PlanSheet config={config} onChange={onChange} onClose={() => setEditing(false)} />}
    </section>
  );
}
