"use client";

import { BellIcon, BellRingIcon } from "@animateicons/react/lucide";
import { useEffect, useRef } from "react";
import type { PushSupport } from "@/lib/use-phase-push";

type Props = {
  state: PushSupport;
  shouldAsk: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onDismissAsk: () => void;
};

const ALERT = "flex items-start gap-3 rounded-lg border-2 px-4 py-3 text-base";
const ACTION = "self-start font-semibold underline underline-offset-4";

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
        <span className="flex size-12 items-center justify-center rounded-full bg-blaze text-ink">
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
            className="h-14 rounded-lg bg-page-ink text-lg font-semibold text-page"
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

// Alert-style note under the controls: a tinted card with an icon, a title and one clear action.
export function PhaseNotifications({ state, shouldAsk, onEnable, onDisable, onDismissAsk }: Props) {
  if (state === "unsupported") return null;

  return (
    <>
      {shouldAsk && <AskDialog onEnable={onEnable} onDismissAsk={onDismissAsk} />}

      <div className="px-4 sm:px-0">
        {state === "on" ? (
          <div role="status" className={`${ALERT} border-pine bg-pine text-mist`}>
            <BellRingIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Reminders are on</p>
              <p>You&apos;ll get a note at each change, even with your phone locked.</p>
              <button type="button" className={ACTION} onClick={onDisable}>
                Turn off
              </button>
            </div>
          </div>
        ) : state === "denied" ? (
          <div role="status" className={`${ALERT} border-blaze bg-page text-page-ink`}>
            <BellIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Reminders are blocked</p>
              <p>You can switch notifications on for this app in your phone&apos;s settings.</p>
            </div>
          </div>
        ) : (
          <div role="status" className={`${ALERT} border-blaze bg-blaze text-ink`}>
            <BellIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Lock-screen reminders</p>
              <p>A short note at each change, so your phone can stay in your pocket.</p>
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
