"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import {
  isSamePlan,
  isValidPlanValue,
  PLAN_LIMITS,
  PLAN_PRESETS,
  type PlanConfig,
} from "@/lib/plan";

type Field = keyof PlanConfig;

const TILES: { field: Field; label: string; unit?: string }[] = [
  { field: "fastSeconds", label: "Fast", unit: "min" },
  { field: "slowSeconds", label: "Slow", unit: "min" },
  { field: "rounds", label: "Rounds" },
];

const STEP_BUTTON =
  "flex h-12 flex-1 items-center justify-center rounded-lg border-2 border-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-30";

// The walk's plan as three big number tiles. Tap minus or plus, or type a number.
// Each tile shows minutes or rounds; the plan stores seconds.
function Tile({
  field,
  label,
  unit,
  config,
  onChange,
  onProblem,
}: {
  field: Field;
  label: string;
  unit?: string;
  config: PlanConfig;
  onChange: (config: PlanConfig) => void;
  onProblem: (field: Field, message: string | null) => void;
}) {
  const { min, max, step } = PLAN_LIMITS[field];
  const value = config[field] / step;
  // What is typed while it is still being typed; null once it is settled.
  const [draft, setDraft] = useState<string | null>(null);
  const range = `${label} can be ${min / step} to ${max / step}${unit ? ` ${unit}` : ""}.`;

  const set = (next: number) => {
    setDraft(null);
    onProblem(field, null);
    onChange({ ...config, [field]: next * step });
  };

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 rounded-xl border-2 border-current/30 px-2 pt-3 pb-2">
      <label htmlFor={`tile-${field}`} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={`tile-${field}`}
        type="number"
        inputMode="numeric"
        min={min / step}
        max={max / step}
        value={draft ?? String(value)}
        onChange={(event) => {
          setDraft(event.target.value);
          const typed = event.target.valueAsNumber * step;
          if (isValidPlanValue(field, typed)) {
            onProblem(field, null);
            onChange({ ...config, [field]: typed });
          } else {
            onProblem(field, range);
          }
        }}
        onBlur={() => {
          setDraft(null);
          onProblem(field, null);
        }}
        // text-6xl keeps it above 16px, so iOS Safari doesn't zoom in.
        className="type-numerals w-full min-w-0 bg-transparent text-center text-6xl tabular-nums outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="-mt-1 h-4 text-xs">{unit ?? " "}</span>
      <div className="flex w-full gap-1.5">
        <button
          type="button"
          aria-label={`Less ${label.toLowerCase()}`}
          className={STEP_BUTTON}
          disabled={value <= min / step}
          onClick={() => set(Math.max(min / step, value - 1))}
        >
          <MinusIcon aria-hidden="true" size={20} weight="bold" />
        </button>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          className={STEP_BUTTON}
          disabled={value >= max / step}
          onClick={() => set(Math.min(max / step, value + 1))}
        >
          <PlusIcon aria-hidden="true" size={20} weight="bold" />
        </button>
      </div>
    </div>
  );
}

// Presets above, tiles below. Inherits the colour it sits on.
export function PlanTiles({ config, onChange }: { config: PlanConfig; onChange: (config: PlanConfig) => void }) {
  const [problems, setProblems] = useState<Partial<Record<Field, string>>>({});
  const onProblem = (field: Field, message: string | null) =>
    setProblems((current) => {
      if (message === null) {
        if (!(field in current)) return current;
        const rest = { ...current };
        delete rest[field];
        return rest;
      }
      return { ...current, [field]: message };
    });

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Ready-made plans" className="flex gap-2">
        {PLAN_PRESETS.map((preset) => {
          const chosen = isSamePlan(config, preset.config);
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={chosen}
              onClick={() => {
                setProblems({});
                onChange(preset.config);
              }}
              className={`flex h-11 flex-1 items-center justify-center rounded-full border-2 border-current text-base font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current ${
                chosen ? "bg-current" : ""
              }`}
            >
              {/* The chosen chip is filled with the text colour, so its words switch to the field's. */}
              <span className={chosen ? "text-[var(--field-done)]" : ""}>{preset.label}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TILES.map((tile) => (
          <Tile key={tile.field} {...tile} config={config} onChange={onChange} onProblem={onProblem} />
        ))}
      </div>
      {Object.keys(problems).length > 0 && (
        <p role="alert" className="text-sm font-medium">
          {Object.values(problems).join(" ")}
        </p>
      )}
    </div>
  );
}
