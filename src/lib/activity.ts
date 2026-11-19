// What the walker is doing. It only changes the words people read and hear:
// the plan, the timer and the rooms work the same for every activity.

export const ACTIVITY_IDS = ["walk", "elliptical", "bike", "run"] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];
export const DEFAULT_ACTIVITY: ActivityId = "walk";

type Words = {
  // The name in the setting.
  label: string;
  // What the screen says for each phase, and at the end.
  fast: string;
  slow: string;
  done: string;
  // The line above the trail when it's over, and the total read by screen readers.
  timeDone: string;
  total: (time: string) => string;
  // The trail's text for a finished phase, for screen readers.
  phaseDone: string;
  // The notification for the end.
  doneTitle: string;
  doneBody: (minutes: string) => string;
};

const WORDS: Record<ActivityId, Words> = {
  walk: {
    label: "Walk",
    fast: "Walk fast",
    slow: "Walk slow",
    done: "Walk complete",
    timeDone: "Time walked",
    total: (time) => `${time} walked`,
    phaseDone: "walked",
    doneTitle: "Walk done",
    doneBody: (minutes) => `Well done, ${minutes} walked`,
  },
  elliptical: {
    label: "Elliptical",
    fast: "Push harder",
    slow: "Ease off",
    done: "Workout complete",
    timeDone: "Total time",
    total: (time) => `${time} in total`,
    phaseDone: "done",
    doneTitle: "Workout done",
    doneBody: (minutes) => `Well done, ${minutes} in total`,
  },
  bike: {
    label: "Bike",
    fast: "Pedal hard",
    slow: "Pedal easy",
    done: "Ride complete",
    timeDone: "Time ridden",
    total: (time) => `${time} ridden`,
    phaseDone: "ridden",
    doneTitle: "Ride done",
    doneBody: (minutes) => `Well done, ${minutes} ridden`,
  },
  run: {
    label: "Run",
    fast: "Run fast",
    slow: "Jog easy",
    done: "Run complete",
    timeDone: "Time run",
    total: (time) => `${time} run`,
    phaseDone: "run",
    doneTitle: "Run done",
    doneBody: (minutes) => `Well done, ${minutes} run`,
  },
};

export const activityWords = (id: ActivityId): Words => WORDS[id];

export const isActivity = (value: unknown): value is ActivityId =>
  typeof value === "string" && (ACTIVITY_IDS as readonly string[]).includes(value);

// Anything unknown means the default, so an old or odd value never breaks a screen.
export const parseActivity = (value: unknown): ActivityId => (isActivity(value) ? value : DEFAULT_ACTIVITY);
