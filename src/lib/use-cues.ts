"use client";

import { useCallback, useEffect, useRef } from "react";
import { createAudioContext, playCue } from "./cues";
import type { Phase } from "./plan";

type Options = {
  plan: Phase[];
  phaseIndex: number;
  running: boolean;
  started: boolean;
  done: boolean;
};

// Plays a sound, vibration and spoken cue whenever the phase changes.
export const useCues = ({ plan, phaseIndex, running, started, done }: Options) => {
  const audioContext = useRef<AudioContext | null>(null);
  const lastCued = useRef<string | null>(null);

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

    playCue(done ? "done" : plan[phaseIndex].type, audioContext.current);
  }, [plan, phaseIndex, running, started, done]);

  return { prime };
};
