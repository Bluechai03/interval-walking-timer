// Starting a Watch workout means running an iOS Shortcut the walker made
// (see docs/watch-workout.md). The page can only open it by URL.

export const isIos = (userAgent: string, maxTouchPoints = 0): boolean =>
  /iPhone|iPad|iPod/.test(userAgent) ||
  // iPadOS reports itself as a Mac.
  (/Macintosh/.test(userAgent) && maxTouchPoints > 1);

// x-success, x-error and x-cancel all bring the walker back to the timer.
export const watchWorkoutUrl = (
  shortcutName: string,
  returnUrl: string | { success: string; error: string; cancel: string },
): string | null => {
  const name = shortcutName.trim();
  if (!name) return null;
  const back =
    typeof returnUrl === "string"
      ? { success: returnUrl, error: returnUrl, cancel: returnUrl }
      : returnUrl;
  const params = new URLSearchParams({
    name,
    "x-success": back.success,
    "x-error": back.error,
    "x-cancel": back.cancel,
  });
  // URLSearchParams writes spaces as "+", which Shortcuts reads literally.
  return `shortcuts://x-callback-url/run-shortcut?${params.toString().replaceAll("+", "%20")}`;
};

// What Strut has done for the current walk. Kept in storage because the page
// may be reloaded when we come back from Shortcuts.
const FLAG_KEY = "watch-workout";
type Flag = "started" | "ended";
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const read = (store: Store): Flag | null => {
  try {
    const value = store.getItem(FLAG_KEY);
    return value === "started" || value === "ended" ? value : null;
  } catch {
    return null;
  }
};

const write = (store: Store, flag: Flag | null): boolean => {
  try {
    if (flag) store.setItem(FLAG_KEY, flag);
    else store.removeItem(FLAG_KEY);
    return true;
  } catch {
    return false;
  }
};

// Call just before opening the start Shortcut. False means we couldn't
// remember it, so the start Shortcut should not run either.
export const markWorkoutStarted = (store: Store): boolean => write(store, "started");

// Call on Start when no workout is being launched.
export const clearWorkoutFlag = (store: Store): void => void write(store, null);

// True once per walk, and only if Strut started the workout. Call just before
// opening the end Shortcut. `force` is for the walker's own tap.
export const takeWorkoutEnd = (store: Store, force = false): boolean => {
  const flag = read(store);
  if (flag !== "started" && !(force && flag === "ended")) return false;
  return write(store, "ended");
};

export type WatchReturn = "ok" | "error" | "cancel";

// Where the start Shortcut sends the walker back to, so the timer can begin
// once the Watch has been asked to start.
export const startReturnUrls = (origin: string) => ({
  success: `${origin}/?watch=ok`,
  error: `${origin}/?watch=error`,
  cancel: `${origin}/?watch=cancel`,
});

export const watchReturn = (search: string): WatchReturn | null => {
  const value = new URLSearchParams(search).get("watch");
  return value === "ok" || value === "error" || value === "cancel" ? value : null;
};
