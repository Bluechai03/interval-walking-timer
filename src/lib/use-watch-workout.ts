"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIos } from "./use-ios";
import { useStandalone } from "./use-standalone";
import { useWatchShortcuts } from "./use-shortcut-name";
import { useWatchDelay } from "./use-watch-delay";
import {
  clearWorkoutFlag,
  markWorkoutStarted,
  openShortcut,
  takeWorkoutEnd,
  watchWorkoutUrl,
} from "./watch-workout";

// Lets the final cue play out before we leave for the end Shortcut.
export const END_AFTER_DONE_MS = 2500;

// Reading localStorage can itself throw (blocked storage).
const store = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

// What the walker has set up. It is needed before a walk exists, because the
// countdown's length depends on it.
export const useWatchSetup = () => {
  const ios = useIos();
  const standalone = useStandalone();
  const { startShortcut, endShortcut } = useWatchShortcuts();
  const { seconds: delaySeconds } = useWatchDelay();
  return {
    ios,
    standalone,
    startShortcut,
    endShortcut,
    // The switch is on, on a phone that has Shortcuts, in the Home Screen app. A
    // Safari tab is left out: a Shortcut that ends by opening the Home Screen app
    // would pull the walker away from the tab where the walk is running.
    on: ios && standalone && startShortcut !== "",
    // The switch is on, but this is a browser tab, so the workout won't start.
    blockedInBrowser: ios && !standalone && startShortcut !== "",
    // There is an End Shortcut to run, and this is the app that started it.
    canEnd: ios && standalone && endShortcut !== "",
    // How long after the Shortcut opens the Watch's workout begins.
    delaySeconds,
  };
};

export type WatchSetup = ReturnType<typeof useWatchSetup>;

type Options = {
  // Where the walk is: under way, and finished.
  running: boolean;
  done: boolean;
  muted: boolean;
  // Sound needs a tap, and often has to be asked for again after Shortcuts.
  prime: () => void;
  unlock: () => Promise<boolean>;
};

// Starting and ending the Apple Watch workout by running the walker's Shortcuts.
// Used by the solo timer and by walks in a room, so they behave the same way.
//
//   start()  opens the start Shortcut; true if it did. Call it at most once a walk.
//   end()    opens the end Shortcut, once per walk and only if Strut started the
//            workout. `force` is for the walker's own tap.
//
// It also ends the workout itself after a walk that finished while we watched,
// and unlocks sound with the first touch after coming back from Shortcuts.
export const useWatchWorkout = (setup: WatchSetup, { running, done, muted, prime, unlock }: Options) => {
  const { ios, standalone, startShortcut, endShortcut } = setup;
  // Whether the start Shortcut has been opened during this visit.
  const [started, setStarted] = useState(false);
  const [soundLocked, setSoundLocked] = useState(false);
  const leftForShortcut = useRef(false);

  const start = useCallback((): boolean => {
    const storage = store();
    const url = ios && standalone ? watchWorkoutUrl(startShortcut) : null;
    if (url && storage && markWorkoutStarted(storage)) {
      leftForShortcut.current = true;
      setStarted(true);
      openShortcut(url);
      return true;
    }
    // Nothing started, so there is nothing for a later end to end.
    if (storage) clearWorkoutFlag(storage);
    return false;
  }, [ios, standalone, startShortcut]);

  const end = useCallback(
    (force = false) => {
      const storage = store();
      if (!storage || !ios || !standalone) return;
      const url = watchWorkoutUrl(endShortcut);
      if (url && takeWorkoutEnd(storage, force)) openShortcut(url);
    },
    [ios, standalone, endShortcut],
  );

  // Only a walk that finishes while we watch it ends the workout, not one
  // restored from storage after the page was reopened.
  const sawRunning = useRef(false);
  useEffect(() => {
    if (running) sawRunning.current = true;
  }, [running]);
  useEffect(() => {
    if (!done || !sawRunning.current) return;
    const id = setTimeout(() => end(), END_AFTER_DONE_MS);
    return () => clearTimeout(id);
  }, [done, end]);

  // iOS often keeps sound locked after a trip to Shortcuts; if it does, the first
  // touch unlocks it.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !leftForShortcut.current) return;
      leftForShortcut.current = false;
      if (muted) return;
      void unlock().then((allowed) => {
        if (!allowed) setSoundLocked(true);
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [muted, unlock]);

  useEffect(() => {
    if (!soundLocked) return;
    const unlockOnTouch = () => {
      prime();
      setSoundLocked(false);
    };
    document.addEventListener("pointerdown", unlockOnTouch, { once: true });
    return () => document.removeEventListener("pointerdown", unlockOnTouch);
  }, [soundLocked, prime]);

  return { started, soundLocked, start, end };
};
