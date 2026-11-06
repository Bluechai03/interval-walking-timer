import { effortWords } from "./heart-rate";
import { totalSeconds, type Phase } from "./plan";

export type PushCue = { delaySeconds: number; title: string; body: string };

const NAME = { fast: "Fast", slow: "Slow" } as const;

const minutes = (seconds: number) => `${Math.round(seconds / 60)} min`;

// The notifications for the rest of a walk: one at each phase change and one
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
        body: `${minutes(totalSeconds(plan))} walked`,
      });
      return;
    }

    const round = Math.floor((i + 1) / 2) + 1;
    const after = plan[i + 2];
    cues.push({
      delaySeconds,
      title: `${NAME[next.type]} · ${minutes(next.durationInSeconds)}`,
      body: `Round ${round} of ${rounds} · ${effortWords(next.type)} · ${after ? `next: ${NAME[after.type]}` : "last phase"}`,
    });
  });

  return cues;
};
