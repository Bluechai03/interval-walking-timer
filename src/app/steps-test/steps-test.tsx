"use client";

import { useEffect, useRef, useState } from "react";
import {
  createStepClaim,
  DEFAULT_STEPS_SHORTCUT,
  fetchClaimedSteps,
  stepsShortcutUrl,
  submitStepsUrl,
} from "@/lib/steps";
import { signInAsGuest, useAuth } from "@/lib/use-auth";

const POLL_MS = 2000;
const GIVE_UP_MS = 3 * 60 * 1000;
const WINDOWS = [15, 30, 60, 120];

type Run =
  | { status: "idle" }
  | { status: "waiting"; code: string; start: Date; end: Date; openedAt: number }
  | { status: "received"; code: string; steps: number; start: Date; end: Date; seconds: number }
  | { status: "gave-up"; code: string }
  | { status: "failed"; message: string };

const time = (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// A throwaway page for finding out whether a Shortcut can read steps from Apple
// Health and post them to the database. The real feature will look different.
export function StepsTest() {
  const auth = useAuth();
  const [name, setName] = useState(DEFAULT_STEPS_SHORTCUT);
  const [minutes, setMinutes] = useState(30);
  const [run, setRun] = useState<Run>({ status: "idle" });
  const active = useRef(0);

  // While waiting, keep asking whether the Shortcut has posted its answer.
  const waiting = run.status === "waiting" ? run : null;
  useEffect(() => {
    if (!waiting) return;
    let current = true;
    const check = () =>
      void fetchClaimedSteps(waiting.code).then((result) => {
        if (!current) return;
        if (result.ok && result.value !== null) {
          setRun({
            status: "received",
            code: waiting.code,
            steps: result.value,
            start: waiting.start,
            end: waiting.end,
            seconds: Math.round((Date.now() - waiting.openedAt) / 1000),
          });
        } else if (Date.now() - waiting.openedAt > GIVE_UP_MS) {
          setRun({ status: "gave-up", code: waiting.code });
        }
      });
    const id = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      current = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [waiting]);

  if (auth.status === "loading") return <p className="text-page-quiet">One moment…</p>;
  if (auth.status === "unavailable") return <p className="text-page-quiet">Supabase isn&apos;t set up here.</p>;

  const begin = async () => {
    const mine = ++active.current;
    if (auth.status === "signed-out") {
      const guest = await signInAsGuest();
      if (!guest.ok) return setRun({ status: "failed", message: guest.message });
    }
    const end = new Date();
    const start = new Date(end.getTime() - minutes * 60_000);
    const claim = await createStepClaim(start, end);
    if (!claim.ok) return setRun({ status: "failed", message: claim.message });
    if (mine !== active.current) return;

    const url = stepsShortcutUrl(name, {
      code: claim.value,
      start: start.toISOString(),
      end: end.toISOString(),
      url: submitStepsUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    });
    if (!url) return setRun({ status: "failed", message: "Type the name of your Shortcut first." });
    setRun({ status: "waiting", code: claim.value, start, end, openedAt: Date.now() });
    window.location.href = url;
  };

  return (
    <section className="flex flex-col gap-6">
      <p className="text-page-quiet">
        Checks whether your Shortcut can read your steps from Apple Health and send them back
        here. Nothing is saved except the number.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-page-quiet">Shortcut name</span>
        <input
          type="text"
          className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold outline-none focus:border-page-ink"
          value={name}
          autoCapitalize="none"
          autoCorrect="off"
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-page-quiet">Add up the steps from the last</span>
        <select
          className="w-full border-b border-page-line bg-transparent py-2 text-2xl font-semibold outline-none focus:border-page-ink"
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
        >
          {WINDOWS.map((value) => (
            <option key={value} value={value}>
              {value} minutes
            </option>
          ))}
        </select>
      </label>

      <button
        className="flex h-14 w-full items-center justify-center rounded-lg bg-action text-lg font-semibold text-action-ink disabled:opacity-40"
        disabled={run.status === "waiting"}
        onClick={() => void begin()}
      >
        Check my steps
      </button>

      {run.status === "waiting" && (
        <p role="status" className="text-page-quiet">
          Waiting for your Shortcut… If it opened, switch back to Strut when it finishes. The
          code is {run.code}.
        </p>
      )}

      {run.status === "received" && (
        <div role="status" className="flex flex-col gap-2">
          <p className="text-3xl font-semibold">{run.steps.toLocaleString()} steps</p>
          <p className="text-page-quiet">
            From {time(run.start)} to {time(run.end)}, and it came back {run.seconds} seconds after
            the Shortcut opened. Compare it with Apple Health: open Health, tap Steps, and look at
            the same time window. If this number is about double, your phone and Watch were
            counted twice.
          </p>
        </div>
      )}

      {run.status === "gave-up" && (
        <p role="alert" className="text-page-quiet">
          Nothing came back in 3 minutes. Run the Shortcut by hand to see where it stops, then
          tell me what it showed.
        </p>
      )}

      {run.status === "failed" && (
        <p role="alert" className="text-page-quiet">
          {run.message}
        </p>
      )}
    </section>
  );
}
