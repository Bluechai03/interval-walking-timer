// Saved records: things the app wrote down about a walk, kept on the phone for a
// limited time. Unlike a setting, a record goes stale. Each is declared here with the
// saved name it has always had, how to read it back and how long it stays valid, so
// whoever writes one and whoever reads it cannot disagree about its format.
import { readRaw, writeRaw } from "./phone-store";
import type { Room } from "./rooms";

type RecordKind<T> = {
  key: string;
  // Turns saved text into a value, or null when it is unusable.
  parse: (raw: string) => T | null;
  serialize: (value: T) => string;
  // Forgotten once it is older than this. Left out when the owner decides.
  keepMs?: number;
  savedAt?: (value: T) => number;
};

const record = <T>(kind: RecordKind<T>) => ({
  key: kind.key,
  read(now: number = Date.now()): T | null {
    const raw = readRaw(kind.key);
    if (raw === null) return null;
    let value: T | null = null;
    try {
      value = kind.parse(raw);
    } catch {
      // Damaged: nothing saved.
    }
    if (value === null) return null;
    if (kind.keepMs !== undefined && kind.savedAt && now - kind.savedAt(value) >= kind.keepMs) return null;
    return value;
  },
  write: (value: T) => writeRaw(kind.key, kind.serialize(value)),
  clear: () => writeRaw(kind.key, null),
});

const SIX_HOURS = 6 * 60 * 60 * 1000;

// The walk in progress, so it survives the page being discarded while the phone is
// locked. Whether it is still worth restoring depends on the plan, so that rule
// belongs to the timer.
export type SavedWalk = { accumulatedMs: number; startedAt: number | null; savedAt: number };
export const walkRecord = record<SavedWalk>({
  key: "walk-state",
  parse: (raw) => {
    const saved = JSON.parse(raw) as Partial<SavedWalk> | null;
    if (!saved || typeof saved.accumulatedMs !== "number" || typeof saved.savedAt !== "number") return null;
    return {
      accumulatedMs: saved.accumulatedMs,
      startedAt: typeof saved.startedAt === "number" ? saved.startedAt : null,
      savedAt: saved.savedAt,
    };
  },
  serialize: (saved) => JSON.stringify({ accumulatedMs: saved.accumulatedMs, startedAt: saved.startedAt, savedAt: saved.savedAt }),
});

// Whether a walk is saved as started, for screens that must not change the plan under it.
export const walkInProgress = (saved: SavedWalk | null): boolean =>
  !!saved && (saved.accumulatedMs > 0 || saved.startedAt !== null);

// A started Crew's walk, so a reload with no signal can carry on instead of showing an error.
export type SavedCrewWalk = { room: Room; savedAt: number };
export const crewWalkRecord = record<SavedCrewWalk>({
  key: "crew-walk",
  parse: (raw) => {
    const saved = JSON.parse(raw) as Partial<SavedCrewWalk> | null;
    return saved?.room && typeof saved.room.id === "string" ? { room: saved.room, savedAt: saved.savedAt ?? 0 } : null;
  },
  serialize: (saved) => JSON.stringify({ room: saved.room, savedAt: saved.savedAt }),
  keepMs: SIX_HOURS,
  savedAt: (saved) => saved.savedAt,
});

// The last good measure of how far the server's clock is ahead of this phone's.
export type SavedOffset = { offset: number; at: number };
export const serverOffsetRecord = record<SavedOffset>({
  key: "server-offset",
  parse: (raw) => {
    const saved = JSON.parse(raw) as Partial<SavedOffset> | null;
    return saved && typeof saved.offset === "number" ? { offset: saved.offset, at: saved.at ?? 0 } : null;
  },
  serialize: (saved) => JSON.stringify({ offset: saved.offset, at: saved.at }),
  keepMs: SIX_HOURS,
  savedAt: (saved) => saved.at,
});

// The reminders run that is scheduled for this walk, so it can be cancelled later.
export const pushRunRecord = record<string>({
  key: "phase-push-run",
  parse: (raw) => (raw === "" ? null : raw),
  serialize: (id) => id,
});
