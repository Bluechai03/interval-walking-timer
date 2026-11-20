// Values kept on this phone. Each lives in storage and in memory, so it still works
// when storage is unavailable (a private window), and any change tells the screens
// that read it, including a change made in another tab. Settings and saved records
// both go through here.

const memory = new Map<string, string | null>();
const listeners = new Set<() => void>();

export const readRaw = (key: string): string | null => {
  if (!memory.has(key)) {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      // Storage unavailable: nothing saved.
    }
    memory.set(key, raw);
  }
  return memory.get(key) ?? null;
};

// null removes the value.
export const writeRaw = (key: string, raw: string | null) => {
  memory.set(key, raw);
  try {
    if (raw === null) localStorage.removeItem(key);
    else localStorage.setItem(key, raw);
  } catch {
    // Not saved, but the in-memory value still applies.
  }
  listeners.forEach((listener) => listener());
};

// For tests: forget every in-memory copy, so the next read goes to storage again.
export const forgetMemory = () => memory.clear();

// Another tab changed storage: forget what was remembered and tell everyone.
const onOtherTab = (event: StorageEvent) => {
  if (event.key === null) memory.clear();
  else memory.delete(event.key);
  listeners.forEach((listener) => listener());
};

export const subscribe = (listener: () => void) => {
  if (listeners.size === 0) window.addEventListener("storage", onOtherTab);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onOtherTab);
  };
};

// A saved whole number that is in range, or the fallback for anything else.
export const parseWhole = (raw: string | null, min: number, max: number, fallback: number): number => {
  if (raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};
