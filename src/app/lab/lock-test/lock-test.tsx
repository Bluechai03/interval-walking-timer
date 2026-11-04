"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Throwaway on-device test for steps 1-4 of the plan in docs/research/lock-screen-live-notifications.md.
// Run A: ticks, a Web Audio beep every 30 s and speech every 60 s. No <audio> element.
// Run B: A plus a 10-minute <audio> file (beeps baked in every 30 s) and Media Session metadata + position.
// Run C: B plus the Media Session title updated every 10 s while locked.

type Run = "A" | "B" | "C";
type Entry = { t: number; kind: string };

const LOG_KEY = "lock-test-log";
const TICK_MS = 10_000;
const BEEP_MS = 30_000;
const SPEECH_MS = 60_000;
const TRACK_SECONDS = 600;
const SAMPLE_RATE = 8000;

// 10 minutes of 8-bit mono silence with a 0.3 s 880 Hz beep every 30 s. Built in the browser, so no file in the repo.
function makeBeepTrackUrl(): string {
  const samples = new Uint8Array(TRACK_SECONDS * SAMPLE_RATE).fill(128);
  for (let start = BEEP_MS / 1000; start < TRACK_SECONDS; start += BEEP_MS / 1000) {
    for (let i = 0; i < SAMPLE_RATE * 0.3; i++) {
      samples[start * SAMPLE_RATE + i] = 128 + Math.round(90 * Math.sin((2 * Math.PI * 880 * i) / SAMPLE_RATE));
    }
  }
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const write = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  write(0, "RIFF");
  v.setUint32(4, 36 + samples.length, true);
  write(8, "WAVE");
  write(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  write(36, "data");
  v.setUint32(40, samples.length, true);
  return URL.createObjectURL(new Blob([header, samples], { type: "audio/wav" }));
}

function loadLog(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]") as Entry[];
  } catch {
    return [];
  }
}

function clock(t: number) {
  return new Date(t).toLocaleTimeString([], { hour12: false });
}

// Log store: kept outside React so the imperative timers can write to it, and so it survives a reload.
let logCache: Entry[] | null = null;
const listeners = new Set<() => void>();

function readLog(): Entry[] {
  if (logCache === null) logCache = loadLog();
  return logCache;
}

function writeLog(next: Entry[]) {
  logCache = next;
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    // storage can be unavailable; the on-screen log still works
  }
  listeners.forEach((l) => l());
}

function addEntry(kind: string) {
  writeLog([...readLog(), { t: Date.now(), kind }]);
}

function subscribeLog(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const noSubscribe = () => () => {};

// Everything below touches timers, audio and the lock screen, so it lives outside the component.
type Runner = { stop: () => void };

function startRun(run: Run, audio: HTMLAudioElement): Runner {
  const timers: number[] = [];
  const startedAt = Date.now();
  writeLog([]);
  addEntry(`start run ${run}`);

  const ctx = new AudioContext();
  timers.push(window.setInterval(() => addEntry("tick"), TICK_MS));
  timers.push(
    window.setInterval(() => {
      const osc = ctx.createOscillator();
      osc.frequency.value = 660;
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      addEntry("web-audio beep fired");
    }, BEEP_MS),
  );
  timers.push(
    window.setInterval(() => {
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance("Walk fast"));
      addEntry("speech fired");
    }, SPEECH_MS),
  );

  if (run !== "A") {
    audio.src = makeBeepTrackUrl();
    void audio.play().then(
      () => addEntry("audio element playing"),
      (e) => addEntry(`audio play failed: ${String(e)}`),
    );

    if ("mediaSession" in navigator) {
      const ms = navigator.mediaSession;
      const setTitle = (title: string) => {
        ms.metadata = new MediaMetadata({ title, artist: "Lock-screen test", album: `Run ${run}` });
      };
      const updatePosition = () => {
        try {
          ms.setPositionState({
            duration: TRACK_SECONDS,
            position: Math.min(audio.currentTime, TRACK_SECONDS),
            playbackRate: 1,
          });
        } catch {
          // some browsers reject position state
        }
      };
      setTitle("Walk fast");
      for (const action of ["play", "pause"] as const) {
        ms.setActionHandler(action, () => {
          addEntry(`lock-screen ${action} pressed`);
          if (action === "play") void audio.play();
          else audio.pause();
        });
      }
      audio.addEventListener("playing", updatePosition);
      updatePosition();

      if (run === "C") {
        timers.push(
          window.setInterval(() => {
            const left = Math.max(0, TRACK_SECONDS - Math.round((Date.now() - startedAt) / 1000));
            setTitle(`Walk fast, ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left`);
            addEntry("lock-screen title updated");
            updatePosition();
          }, TICK_MS),
        );
      }
    } else {
      addEntry("mediaSession not available");
    }
  }

  return {
    stop() {
      timers.forEach((id) => window.clearInterval(id));
      audio.pause();
      window.speechSynthesis?.cancel();
      void ctx.close();
      addEntry("stop");
    },
  };
}

export function LockTest() {
  const log = useSyncExternalStore(subscribeLog, readLog, () => []);
  const ua = useSyncExternalStore(noSubscribe, () => navigator.userAgent, () => "");
  const [running, setRunning] = useState<Run | null>(null);
  const runner = useRef<Runner | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => () => runner.current?.stop(), []);

  const ticks = log.filter((e) => e.kind === "tick");
  const gaps = ticks.slice(1).map((e, i) => (e.t - ticks[i].t) / 1000);
  const maxGap = gaps.length ? Math.max(...gaps) : 0;
  const lateTicks = gaps.filter((g) => g > (TICK_MS / 1000) * 1.5).length;

  return (
    <main className="mx-auto max-w-xl space-y-5 p-5 pb-16 font-sans text-base">
      <h1 className="text-2xl font-semibold">Lock-screen test</h1>
      <p>
        Add this page to the Home Screen, tap a run, lock the phone and walk. Then unlock and read the log. Gaps much
        longer than 10 s mean the page was suspended.
      </p>
      <p className="text-sm opacity-70">Step 1: note your iOS version (Settings → General → About). {ua}</p>

      <div className="flex flex-wrap gap-3">
        {(["A", "B", "C"] as const).map((r) => (
          <button
            key={r}
            type="button"
            disabled={running !== null}
            onClick={() => {
              runner.current = startRun(r, audioRef.current!);
              setRunning(r);
            }}
            className="rounded-md border px-4 py-3 font-semibold disabled:opacity-40"
          >
            Run {r}
          </button>
        ))}
        <button
          type="button"
          disabled={running === null}
          onClick={() => {
            runner.current?.stop();
            runner.current = null;
            setRunning(null);
          }}
          className="rounded-md border px-4 py-3 font-semibold disabled:opacity-40"
        >
          Stop
        </button>
      </div>
      <ul className="list-disc pl-5 text-sm">
        <li>Run A: ticks, Web Audio beep every 30 s, speech every 60 s. No audio element.</li>
        <li>Run B: A plus a 10-minute audio file with beeps every 30 s and a lock-screen Now Playing entry.</li>
        <li>Run C: B plus the lock-screen title changing every 10 s.</li>
      </ul>

      <audio ref={audioRef} playsInline />

      <section>
        <h2 className="font-semibold">Result</h2>
        <p>
          {running ? `Running run ${running}…` : "Not running."} Ticks: {ticks.length}. Longest gap between ticks:{" "}
          {maxGap.toFixed(0)} s. Late ticks (over 15 s): {lateTicks}.
        </p>
        <ol className="mt-3 max-h-80 overflow-auto font-mono text-xs">
          {log
            .slice()
            .reverse()
            .map((e, i) => (
              <li key={i}>
                {clock(e.t)} {e.kind}
              </li>
            ))}
        </ol>
      </section>
    </main>
  );
}
