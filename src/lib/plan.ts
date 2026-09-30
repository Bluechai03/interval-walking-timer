export type Phase = { type: "fast" | "slow"; durationInSeconds: number };

const PHASE_SECONDS = 10;

const ROUNDS = 5;

export const buildPlan = (): Phase[] => {
  const plan: Phase[] = [];

  for (let i = 0; i < ROUNDS * 2; i++) {
    plan.push(
      i % 2 === 0
        ? { type: "fast", durationInSeconds: PHASE_SECONDS }
        : { type: "slow", durationInSeconds: PHASE_SECONDS },
    );
  }

  return plan;
};
