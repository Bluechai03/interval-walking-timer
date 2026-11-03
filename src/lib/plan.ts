export type Phase = { type: "fast" | "slow"; durationInSeconds: number };

export type PlanConfig = {
  fastSeconds: number;
  slowSeconds: number;
  rounds: number;
};

// Phases are set in whole minutes but stored in seconds; step is the unit.
export const PLAN_LIMITS = {
  fastSeconds: { min: 60, max: 3600, step: 60 },
  slowSeconds: { min: 60, max: 3600, step: 60 },
  rounds: { min: 1, max: 20, step: 1 },
} as const;

// The classic interval walking plan: 3 minutes fast, 3 minutes slow, 5 rounds.
export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  fastSeconds: 180,
  slowSeconds: 180,
  rounds: 5,
};

export const isValidPlanValue = (
  field: keyof PlanConfig,
  value: unknown,
): value is number => {
  const { min, max, step } = PLAN_LIMITS[field];
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value % step === 0 &&
    value >= min &&
    value <= max
  );
};

// Falls back to the default for any field that is missing or out of range.
export const sanitizePlanConfig = (input: Partial<PlanConfig>): PlanConfig => ({
  fastSeconds: isValidPlanValue("fastSeconds", input.fastSeconds)
    ? input.fastSeconds
    : DEFAULT_PLAN_CONFIG.fastSeconds,
  slowSeconds: isValidPlanValue("slowSeconds", input.slowSeconds)
    ? input.slowSeconds
    : DEFAULT_PLAN_CONFIG.slowSeconds,
  rounds: isValidPlanValue("rounds", input.rounds)
    ? input.rounds
    : DEFAULT_PLAN_CONFIG.rounds,
});

export const buildPlan = (config: PlanConfig = DEFAULT_PLAN_CONFIG): Phase[] => {
  const plan: Phase[] = [];

  for (let i = 0; i < config.rounds; i++) {
    plan.push({ type: "fast", durationInSeconds: config.fastSeconds });
    plan.push({ type: "slow", durationInSeconds: config.slowSeconds });
  }

  return plan;
};

export const totalSeconds = (plan: Phase[]): number =>
  plan.reduce((sum, phase) => sum + phase.durationInSeconds, 0);
