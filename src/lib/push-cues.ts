import { heartRateTarget } from "./heart-rate";
import { totalSeconds, type Phase } from "./plan";

export type PushCue = { delaySeconds: number; title: string; body: string };

const PACE = { fast: "Fast pace", slow: "Easy pace" } as const;

const minutes = (seconds: number) => `${Math.round(seconds / 60)} min`;

// Most important first when glanced at mid-walk: pace, length, target heart
// rate, then the round. The notifications for the rest of a walk: one at each phase change and one
// at the end. delaySeconds counts from now, so a resumed walk only gets what
// is left. The page plays its own cue at Start, so none is made for that.
export const pushCues = (plan: Phase[], elapsedSeconds: number): PushCue[] => {
  const cues: PushCue[] = [];
  const rounds = Math.ceil(plan.length / 2);
  let phaseEnd = 0;

  plan.forEach((phase, i) => {
    phaseEnd += phase.durationInSeconds;
    if (phaseEnd <= elapsedSeconds) return;
    const delaySeconds = phaseEnd - elapsedSeconds;
    const next = plan[i + 1];

    if (!next) {
      cues.push({
        delaySeconds,
        title: "Walk done",
        body: `Well done, ${minutes(totalSeconds(plan))} walked`,
      });
      return;
    }

    const round = Math.floor((i + 1) / 2) + 1;
    const { min, max } = heartRateTarget(next.type);
    cues.push({
      delaySeconds,
      title: `${PACE[next.type]} · ${minutes(next.durationInSeconds)}`,
      body: `Target ${min}–${max} bpm\nRound ${round} of ${rounds}`,
    });
  });

  return cues;
};
