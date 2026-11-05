// Throwaway: the schedule for the push-notification test (see /lab/lock-test).
export type PushCue = { n: number; delaySeconds: number; title: string; body: string };

// Alternating "Walk fast" / "Walk slow" cues, one every intervalSeconds, starting after the first interval.
export function cueSchedule(count: number, intervalSeconds: number): PushCue[] {
  const safeCount = Math.min(Math.max(Math.trunc(count), 1), 12);
  const safeInterval = Math.min(Math.max(Math.trunc(intervalSeconds), 5), 60);
  return Array.from({ length: safeCount }, (_, i) => {
    const fast = i % 2 === 0;
    return {
      n: i + 1,
      delaySeconds: safeInterval,
      title: fast ? "Walk fast" : "Walk slow",
      body: `Cue ${i + 1} of ${safeCount}`,
    };
  });
}
