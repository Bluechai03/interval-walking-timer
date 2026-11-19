"use client";

import { type ActivityId, activityWords } from "@/lib/activity";
import { buildPlan, totalSeconds, type PlanConfig } from "@/lib/plan";
import { MuteButton } from "./mute-button";
import { PlanTiles } from "./plan-tiles";
import { TrailProfile } from "./trail-profile";

type Props = {
  config: PlanConfig;
  onChange: (config: PlanConfig) => void;
  activity: ActivityId;
  muted: boolean;
  onToggleMute: () => void;
};

const minutes = (seconds: number) => `${seconds / 60} min`;

// Before the walk: the plan to set and a preview of its effort strip, on a calm
// field. The effort colours are kept for the walk itself.
export function ReadyCard({ config, onChange, activity, muted, onToggleMute }: Props) {
  const words = activityWords(activity);
  const plan = buildPlan(config);

  return (
    <section
      aria-label="Your plan"
      className="flex flex-col gap-5 bg-field-done px-5 pt-5 pb-6 text-field-done-ink sm:rounded-xl"
    >
      <div className="flex flex-col gap-1">
        <div className="flex min-h-11 items-center justify-between gap-4">
          <p className="text-base font-medium">{words.label}</p>
          <MuteButton muted={muted} onToggle={onToggleMute} />
        </div>
        <p className="type-instruction text-[clamp(2rem,9.5vw,2.75rem)] leading-none">Ready to go</p>
        <p className="mt-2 text-base tabular-nums">
          {config.rounds} rounds · {minutes(config.fastSeconds)} fast · {minutes(config.slowSeconds)} slow ·{" "}
          {minutes(totalSeconds(plan))} in all
        </p>
      </div>

      <PlanTiles config={config} onChange={onChange} />

      <div className="flex flex-col gap-2">
        <p className="text-base font-medium">Your effort, round by round</p>
        <TrailProfile plan={plan} phaseIndex={0} fractionLeft={1} done={false} activity={activity} />
      </div>
    </section>
  );
}
