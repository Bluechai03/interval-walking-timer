"use client";

import { useCallback, useEffect, useRef } from "react";
import { type ActivityId, DEFAULT_ACTIVITY } from "./activity";
import { createAudioContext, playCue, playHeadsUp, playTick } from "./cues";
import type { Phase } from "./plan";

// One audio context for the whole app. A phone only allows sound after a tap, so
// a tap anywhere earlier (such as joining a room) unlocks it for the walk that
// follows on another screen.
let shared: AudioContext | null = null;
const sharedContext = (): AudioContext | null => (shared ??= createAudioContext());

export const primeAudio = () => {
  void sharedContext()?.resume();
};

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
  /** Seconds of "get ready" left; a tick plays for each. */
  getReadyLeft?: number;
  // Changes the words spoken at the end. Walking if left out.
  activity?: ActivityId;
};

// Plays a sound, vibration and spoken cue whenever the phase changes, with a
// spoken heads-up shortly before.
export const useCues = ({ plan, phaseIndex, running, started, done, secondsLeft, muted = false, getReadyLeft = 0, activity = DEFAULT_ACTIVITY }: Options) => {
  const audioContext = useRef<AudioContext | null>(shared);
  const lastCued = useRef<string | null>(null);
  const lastWarned = useRef<number | null>(null);

  // Browsers only allow audio after a user gesture, so call this from the
  // start button's click handler.
  const prime = useCallback(() => {
    audioContext.current = sharedContext();
    void audioContext.current?.resume();
  }, []);

  // Resolves true if sound is allowed without a tap (it often isn't after
  // coming back from another app). Gives up after a moment.
  const unlock = useCallback(async (): Promise<boolean> => {
    audioContext.current = sharedContext();
    const ctx = audioContext.current;
    if (!ctx) return false;
    if (ctx.state === "running") return true;
    const allowed = ctx.resume().then(() => ctx.state === "running");
    const gaveUp = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 300));
    return Promise.race([allowed.catch(() => false), gaveUp]);
  }, []);

  useEffect(() => {
    if (getReadyLeft > 0) playTick((audioContext.current ??= shared), muted);
    // Muting mid-countdown must not replay a tick, so muted is read but not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getReadyLeft]);

  // Coming back from another app can leave audio suspended.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && started) void audioContext.current?.resume();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [started]);

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

    playCue(done ? "done" : plan[phaseIndex].type, (audioContext.current ??= shared), muted, activity);
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

  return { prime, unlock };
};
