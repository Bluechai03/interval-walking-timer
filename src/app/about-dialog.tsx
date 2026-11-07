"use client";

import { QuestionIcon, XIcon } from "@phosphor-icons/react";
import { useRef } from "react";
import { ASSUMED_AGE } from "@/lib/heart-rate";

const HEADING = "text-xl font-semibold";

// A help button that opens a short explanation of the app and the method.
export function AboutDialog() {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label="About Strut and interval walking"
        onClick={() => ref.current?.showModal()}
        className="flex size-11 items-center justify-center rounded-full border-2 border-page-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink"
      >
        <QuestionIcon aria-hidden="true" size={22} weight="bold" />
      </button>

      <dialog
        ref={ref}
        aria-labelledby="about-title"
        className="m-auto max-h-[90svh] w-[min(92vw,28rem)] overflow-y-auto rounded-xl border-2 border-page-line bg-page p-6 text-page-ink shadow-xl backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <h2 id="about-title" className="text-2xl font-semibold">
              About Strut
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => ref.current?.close()}
              className="flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink"
            >
              <XIcon aria-hidden="true" size={22} weight="bold" />
            </button>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className={HEADING}>Why it exists</h3>
            <p className="text-base">
              Interval walking works best when you stop watching the clock, but
              most timers make you glance at the screen to know when to switch.
              Strut tells you instead, with a beep, a vibration and a short
              spoken cue, and it can send a lock-screen reminder too. Your phone
              can stay in your pocket and your eyes on the path.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className={HEADING}>What Japanese interval walking is</h3>
            <p className="text-base">
              Researchers at Shinshu University in Japan, led by Hiroshi Nose and
              Shizue Masuki, developed it as a way to get more from walking. You
              alternate fast and slow walking instead of keeping one pace. The
              classic plan is 3 minutes fast, then 3 minutes slow, five times,
              which makes 30 minutes.
            </p>
            <p className="text-base">
              In their studies, middle-aged and older adults who walked this way
              for several months improved their fitness and leg strength more
              than people who walked at a steady pace. It&apos;s often
              recommended for at least four days a week.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className={HEADING}>How fast is fast?</h3>
            <p className="text-base">
              Fast is brisk: you can only speak in short sentences. Slow is easy:
              you can chat. The heart rate targets on screen are estimates, based
              on an assumed age of {ASSUMED_AGE}, so trust how it feels over the
              number.
            </p>
          </section>

          <p className="text-base text-page-quiet">
            Strut is a walking timer, not medical advice. If you have a health
            condition or you&apos;re unsure, check with your doctor before you
            start.
          </p>

          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="h-14 rounded-lg bg-action text-lg font-semibold text-action-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink"
          >
            Got it
          </button>
        </div>
      </dialog>
    </>
  );
}
