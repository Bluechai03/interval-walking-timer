"use client";

import { SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react";

type Props = {
  muted: boolean;
  onToggle: () => void;
};

// Silences the beeps and spoken words of the cues. Vibration is unaffected, and
// so are the lock-screen reminders, which have their own switch. The state is
// written under the icon, so a walker never starts thinking the cues play. The
// width is fixed and the negative margins keep the button out of the row's
// height, so switching it moves nothing else.
export function MuteButton({ muted, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="-my-3 -mr-2 flex min-h-11 w-[4.5rem] flex-col items-center justify-center rounded-lg text-sm leading-tight font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      {muted ? (
        <SpeakerSlashIcon aria-hidden="true" size={24} weight="fill" />
      ) : (
        <SpeakerHighIcon aria-hidden="true" size={24} weight="bold" />
      )}
      <span>{muted ? "Sound off" : "Sound on"}</span>
    </button>
  );
}
