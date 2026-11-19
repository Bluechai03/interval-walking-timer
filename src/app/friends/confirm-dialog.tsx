"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// A "are you sure?" box. The safe choice has the focus, and Escape or tapping
// outside counts as the safe choice too.
export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, busy = false, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      // The box has no padding of its own, so a tap that lands on the box itself
      // is a tap on the dimmed page around the card.
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-xl border-2 border-page-line bg-page p-0 text-page-ink shadow-xl backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-2xl font-semibold">
          {title}
        </h2>
        <p id={bodyId} className="text-base">
          {body}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="h-14 rounded-lg bg-action text-lg font-semibold text-action-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="h-12 rounded-lg border-2 border-page-ink text-base font-semibold disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
