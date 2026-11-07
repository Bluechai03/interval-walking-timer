"use client";

import { useCallback, useEffect, useRef } from "react";
import { createAudioContext, playCue, playHeadsUp } from "./cues";
import type { Phase } from "./plan";

// Seconds before a phase ends that the heads-up is spoken, and the shortest
// phase that gets one (a shorter phase would be warned as soon as it starts).
const HEADS_UP_SECONDS = 10;
const MIN_PHASE_FOR_HEADS_UP = 30;

type Options = {
  plan: Phase[];
  phaseIndex: number;
  running: boolean;
  started: boolean;
  done: boolean;
  secondsLeft?: number;
  muted?: boolean;
};

// Plays a sound, vibration and spoken cue whenever the phase changes, with a
// spoken heads-up shortly before.
export const useCues = ({ plan, phaseIndex, running, started, done, secondsLeft, muted = false }: Options) => {
  const audioContext = useRef<AudioContext | null>(null);
  const lastCued = useRef<string | null>(null);
  const lastWarned = useRef<number | null>(null);

  // Browsers only allow audio after a user gesture, so call this from the
  // start button's click handler.
  const prime = useCallback(() => {
    audioContext.current ??= createAudioContext();
    void audioContext.current?.resume();
  }, []);

  useEffect(() => {
    if (!started) {
      lastCued.current = null;
      return;
    }
    // Stay quiet while paused, and don't repeat a cue on resume.
    if (!running && !done) return;

    const key = done ? "done" : String(phaseIndex);
    if (lastCued.current === key) return;
    lastCued.current = key;

    playCue(done ? "done" : plan[phaseIndex].type, audioContext.current, muted);
    // Muting mid-phase must not replay the cue, so muted is read but not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, phaseIndex, running, started, done]);

  useEffect(() => {
    if (!started) lastWarned.current = null;
    if (!running || done || secondsLeft === undefined) return;
    if (secondsLeft > HEADS_UP_SECONDS) return;
    if (plan[phaseIndex].durationInSeconds < MIN_PHASE_FOR_HEADS_UP) return;
    if (lastWarned.current === phaseIndex) return;
    lastWarned.current = phaseIndex;
    playHeadsUp(muted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, phaseIndex, running, started, done, secondsLeft]);

  return { prime };
};
