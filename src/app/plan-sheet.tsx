"use client";

import { useEffect, useId, useRef } from "react";
import type { PlanConfig } from "@/lib/plan";
import { PlanTiles } from "./plan-tiles";

type Props = {
  config: PlanConfig;
  onChange: (config: PlanConfig) => void;
  onClose: () => void;
};

// The plan's controls, out of sight until asked for. Closing keeps whatever was set.
export function PlanSheet({ config, onChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    // After opening, so it is the title that has focus and not the first preset.
    title.current?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // The box has no padding of its own, so a tap that lands on it is a tap on the dimmed page.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(94vw,28rem)] rounded-xl border-2 border-page-line bg-page p-0 text-page-ink shadow-xl backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-5 p-5">
        {/* Focus starts on the title, so a screen reader says where it is and no button
            wears a focus ring before anyone has touched the keyboard. */}
        <h2 ref={title} id={titleId} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Your plan
        </h2>
        <PlanTiles config={config} onChange={onChange} />
        <button
          type="button"
          onClick={onClose}
          className="flex h-14 items-center justify-center rounded-lg bg-marker text-lg font-semibold text-midnight focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink"
        >
          Done
        </button>
      </div>
    </dialog>
  );
}
