"use client";

import { BellIcon, BellRingIcon } from "@animateicons/react/lucide";
import { useEffect, useRef } from "react";
import type { PushSupport, TestResult } from "@/lib/use-phase-push";
import { useSetting } from "@/lib/settings";

type Props = {
  state: PushSupport;
  // A walk is under way.
  walking?: boolean;
  failed: boolean;
  shouldAsk: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onDismissAsk: () => void;
  // On the workout screen the cards live in Settings; only a walk's own warnings and the
  // first-run question stay.
  quietWhenIdle?: boolean;
  // Settings only: sends one reminder now, so the walker can tell whether they reach this phone.
  onTest?: () => void;
  testResult?: TestResult;
};

const ALERT = "flex items-start gap-3 rounded-lg border-2 px-4 py-3 text-base";
const ACTION = "inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4 active:opacity-60";

// Asks once when the app is first opened, then stays out of the way. The
// button inside it is the tap iPhones require before allowing notifications.
function AskDialog({ onEnable, onDismissAsk }: Pick<Props, "onEnable" | "onDismissAsk">) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="push-ask-title"
      onCancel={onDismissAsk}
      className="m-auto w-[min(92vw,26rem)] rounded-xl border-2 border-page-line bg-page p-6 text-page-ink shadow-xl backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-brass text-midnight">
          <BellRingIcon aria-hidden="true" size={26} />
        </span>
        <h2 id="push-ask-title" className="text-2xl font-semibold">
          Want a nudge at each change?
        </h2>
        <p className="text-base">
          We&apos;ll send a short note when it&apos;s time to switch pace, so you can keep your phone in your pocket
          and the screen locked. You can turn it off any time.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onEnable}
            className="h-14 rounded-lg bg-action text-lg font-semibold text-action-ink"
          >
            Yes, remind me
          </button>
          <button type="button" onClick={onDismissAsk} className="h-12 rounded-lg text-base font-semibold">
            Not now
          </button>
        </div>
      </div>
    </dialog>
  );
}

const TEST_MESSAGE: Partial<Record<TestResult, string>> = {
  sent: "Sent. It should show up within a few seconds. If it doesn't, check Strut under Settings, Notifications, and your Focus.",
  "no-subscription":
    "This phone has no reminder link for Strut. Turn reminders off and on again, then send another test.",
  refused:
    "Strut couldn't use this phone's reminder link. Turn reminders off and on again, then send another test.",
  expired:
    "This phone's reminder link has stopped working. Turn reminders off and on again, then send another test.",
  left: "You left Strut before it answered. If a notification showed up, reminders work. If not, tap again and stay here until it says Sent.",
  "too-many": "That was a moment ago. Wait a few seconds and try again.",
  failed: "The test didn't go through. Check your signal and try again.",
};

// The test button and what came of it, shown inside the "Reminders are on" card.
function TestReminder({ onTest, testResult = "idle" }: { onTest: () => void; testResult?: TestResult }) {
  const sending = testResult === "sending";
  return (
    <>
      <button type="button" className={ACTION} onClick={onTest} disabled={sending}>
        {sending ? "Sending…" : "Send a test reminder"}
      </button>
      {/* The card around this is already a live region, so a new message is announced. */}
      {TEST_MESSAGE[testResult] && <p>{TEST_MESSAGE[testResult]}</p>}
    </>
  );
}

// Alert-style note under the controls: a tinted card with an icon, a title and one clear action.
export function PhaseNotifications({ state, walking = false, failed, shouldAsk, onEnable, onDisable, onDismissAsk, quietWhenIdle = false, onTest, testResult }: Props) {
  // The two cards that only explain something can be hidden for good, so they
  // don't nag someone who has already decided.
  const [noteHidden, setNoteHidden] = useSetting("remindersNoteHidden");
  const hide = () => setNoteHidden(true);
  if (state === "unsupported") return null;
  if (quietWhenIdle && !walking) {
    return shouldAsk ? <AskDialog onEnable={onEnable} onDismissAsk={onDismissAsk} /> : null;
  }

  if (state === "install" && walking) {
    return (
      <div className="px-4 sm:px-0">
        <div role="alert" className={`${ALERT} border-brass bg-page text-page-ink`}>
          <BellIcon aria-hidden="true" className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">This walk is in a browser tab</p>
            <p>
              Lock-screen reminders only work from the Strut app on your Home Screen. Keep this
              screen on, and open the Home Screen app for your next walk.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "install") {
    if (noteHidden) return null;
    return (
      <div className="px-4 sm:px-0">
        <div role="status" className={`${ALERT} border-brass bg-page text-page-ink`}>
          <BellIcon aria-hidden="true" className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Want reminders on your lock screen?</p>
            <p>Tap Share, then Add to Home Screen, and open the timer from there.</p>
            <button type="button" className={ACTION} onClick={hide}>
              Hide this
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {shouldAsk && <AskDialog onEnable={onEnable} onDismissAsk={onDismissAsk} />}

      <div className="px-4 sm:px-0">
        {state === "on" && failed ? (
          <div role="alert" className={`${ALERT} border-brass bg-page text-page-ink`}>
            <BellIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Reminders couldn&apos;t be set up</p>
              <p>Check your signal. The beeps and voice still work while the app is open.</p>
            </div>
          </div>
        ) : state === "on" ? (
          <div role="status" className={`${ALERT} border-page-line bg-transparent text-page-ink`}>
            <BellRingIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Reminders are on</p>
              <p>You&apos;ll get a note at each change, and your screen can sleep.</p>
              {onTest && !walking && <TestReminder onTest={onTest} testResult={testResult} />}
              <button type="button" className={ACTION} onClick={onDisable}>
                Turn off
              </button>
            </div>
          </div>
        ) : state === "denied" ? (
          noteHidden ? null : <div role="status" className={`${ALERT} border-brass bg-page text-page-ink`}>
            <BellIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Reminders are blocked</p>
              <p>You can switch notifications on for this app in your phone&apos;s settings.</p>
              <button type="button" className={ACTION} onClick={hide}>
                Hide this
              </button>
            </div>
          </div>
        ) : (
          <div role="status" className={`${ALERT} border-page-line bg-transparent text-page-ink`}>
            <BellIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Lock-screen reminders</p>
              <p>A short note at each change, so your phone can stay in your pocket and the screen can sleep.</p>
              <button type="button" className={ACTION} onClick={onEnable}>
                Turn on
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
