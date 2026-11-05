"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Throwaway on-device test for steps 1-4 of the plan in docs/research/lock-screen-live-notifications.md.
// Run A: ticks, a Web Audio beep every 30 s and speech every 60 s. No <audio> element.
// Run B: A plus a 10-minute <audio> file (beeps baked in every 30 s) and Media Session metadata + position.
// Run C: B plus the Media Session title updated every 10 s while locked.

type Run = "A" | "B" | "C";
type SessionType = "default" | "auto" | "playback" | "ambient" | "transient" | "transient-solo";
type Options = { sessionType: SessionType; wakeLock: boolean };

// navigator.audioSession is experimental and not in the TypeScript DOM types yet.
type AudioSessionLike = { type: string };
const getAudioSession = () => (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
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

function startRun(run: Run, audio: HTMLAudioElement, options: Options): Runner {
  const timers: number[] = [];
  const startedAt = Date.now();
  addEntry(`start run ${run} (session ${options.sessionType}, wake lock ${options.wakeLock ? "on" : "off"})`);

  // Audio session type decides whether we mix with the music app or pause it. Must be set before audio plays.
  if (options.sessionType !== "default") {
    const session = getAudioSession();
    if (session) {
      try {
        session.type = options.sessionType;
        addEntry(`audioSession.type = ${session.type}`);
      } catch (e) {
        addEntry(`audioSession.type failed: ${String(e)}`);
      }
    } else {
      addEntry("navigator.audioSession not available");
    }
  }

  // Keep the screen on so the page stays visible; this is the option that lets music keep playing.
  let wakeLock: WakeLockSentinel | null = null;
  if (options.wakeLock && "wakeLock" in navigator) {
    navigator.wakeLock.request("screen").then(
      (lock) => {
        wakeLock = lock;
        addEntry("wake lock acquired");
        lock.addEventListener("release", () => addEntry("wake lock released"));
      },
      (e) => addEntry(`wake lock failed: ${String(e)}`),
    );
  }

  // Record when the page is hidden or shown (a locked screen hides the page), and what the audio element does.
  const onVisibility = () => addEntry(`page ${document.visibilityState}`);
  const onPageHide = () => addEntry("pagehide");
  const onPageShow = () => addEntry("pageshow");
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  const audioEvents = ["play", "pause", "ended", "stalled", "waiting"] as const;
  const onAudioEvent = (e: Event) => addEntry(`audio ${e.type}`);
  audioEvents.forEach((name) => audio.addEventListener(name, onAudioEvent));

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
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      audioEvents.forEach((name) => audio.removeEventListener(name, onAudioEvent));
      timers.forEach((id) => window.clearInterval(id));
      void wakeLock?.release();
      audio.pause();
      window.speechSynthesis?.cancel();
      void ctx.close();
      addEntry("stop");
    },
  };
}

type RunSummary = { run: string; startedAt: number; ticks: number; seconds: number; maxGap: number; lateTicks: number; hidden: number };

// Splits the log at each "start run" line and summarises every run on its own.
export function summarize(log: Entry[]): RunSummary[] {
  const runs: { run: string; entries: Entry[] }[] = [];
  for (const entry of log) {
    if (entry.kind.startsWith("start run ")) runs.push({ run: entry.kind.charAt(10), entries: [entry] });
    else runs.at(-1)?.entries.push(entry);
  }
  return runs.map(({ run, entries }) => {
    const ticks = entries.filter((e) => e.kind === "tick");
    const gaps = ticks.slice(1).map((e, i) => (e.t - ticks[i].t) / 1000);
    return {
      run,
      startedAt: entries[0].t,
      ticks: ticks.length,
      seconds: Math.round((entries.at(-1)!.t - entries[0].t) / 1000),
      maxGap: gaps.length ? Math.max(...gaps) : 0,
      lateTicks: gaps.filter((g) => g > (TICK_MS / 1000) * 1.5).length,
      hidden: entries.filter((e) => e.kind === "page hidden").length,
    };
  });
}

export function LockTest() {
  const log = useSyncExternalStore(subscribeLog, readLog, () => []);
  const ua = useSyncExternalStore(noSubscribe, () => navigator.userAgent, () => "");
  const [running, setRunning] = useState<Run | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>("default");
  const [wakeLock, setWakeLock] = useState(false);
  const runner = useRef<Runner | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => () => runner.current?.stop(), []);

  const summaries = summarize(log);

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
              runner.current = startRun(r, audioRef.current!, { sessionType, wakeLock });
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
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          Audio session type (set before you tap a run):
          <select
            value={sessionType}
            disabled={running !== null}
            onChange={(e) => setSessionType(e.target.value as SessionType)}
            className="rounded-md border px-2 py-1"
          >
            {["default", "auto", "playback", "ambient", "transient", "transient-solo"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={wakeLock} disabled={running !== null} onChange={(e) => setWakeLock(e.target.checked)} />
          Keep the screen on (wake lock)
        </label>
        <p className="opacity-70">
          Music test: start your music app, then try each type with Run B or C and note whether the music pauses and
          whether the beeps still sound with the phone locked. &ldquo;ambient&rdquo; should mix with music.
        </p>
      </div>
      <ul className="list-disc pl-5 text-sm">
        <li>Run A: ticks, Web Audio beep every 30 s, speech every 60 s. No audio element.</li>
        <li>Run B: A plus a 10-minute audio file with beeps every 30 s and a lock-screen Now Playing entry.</li>
        <li>Run C: B plus the lock-screen title changing every 10 s.</li>
      </ul>

      <audio ref={audioRef} playsInline />

      <section>
        <h2 className="font-semibold">Result</h2>
        <p>{running ? `Running run ${running}…` : "Not running."}</p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {summaries.map((r) => (
            <li key={r.startedAt}>
              Run {r.run} at {clock(r.startedAt)}: {r.seconds} s, {r.ticks} ticks, longest gap {r.maxGap.toFixed(0)} s,
              late ticks (over 15 s) {r.lateTicks}, times the page was hidden {r.hidden}.
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => writeLog([])} disabled={running !== null} className="mt-3 rounded-md border px-3 py-2 text-sm disabled:opacity-40">
          Clear log
        </button>
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
