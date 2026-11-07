"use client";

import { SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react";

type Props = {
  muted: boolean;
  onToggle: () => void;
};

// Silences the beeps and spoken words of the cues. Vibration is unaffected, and
// so are the lock-screen reminders, which have their own switch. It says
// "Muted" in words while on, so a walker never starts thinking the cues play.
export function MuteButton({ muted, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-label="Mute cue sounds"
      aria-pressed={muted}
      onClick={onToggle}
      className="-my-2 -mr-2 flex min-h-11 items-center gap-2 rounded-full px-3 text-base font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      {muted && <span>Muted</span>}
      {muted ? (
        <SpeakerSlashIcon aria-hidden="true" size={24} weight="fill" />
      ) : (
        <SpeakerHighIcon aria-hidden="true" size={24} weight="bold" />
      )}
    </button>
  );
}
