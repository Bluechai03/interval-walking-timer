"use client";

import { SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react";

type Props = {
  muted: boolean;
  onToggle: () => void;
};

// Silences the beeps and spoken words of the cues. Vibration is unaffected, and
// so are the lock-screen reminders, which have their own switch. The state is
// written beside the icon, so a walker never starts thinking the cues play. The
// width is fixed, so switching it changes nothing around it.
export function MuteButton({ muted, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex min-h-11 min-w-[8.5rem] items-center justify-center gap-2 rounded-full border-2 border-current px-4 text-base font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      {muted ? (
        <SpeakerSlashIcon aria-hidden="true" size={22} weight="fill" />
      ) : (
        <SpeakerHighIcon aria-hidden="true" size={22} weight="bold" />
      )}
      <span>{muted ? "Sound off" : "Sound on"}</span>
    </button>
  );
}
