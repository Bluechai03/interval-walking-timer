// Starting a Watch workout means running an iOS Shortcut the walker made
// (see docs/watch-workout.md). The page can only open it by URL.

export const isIos = (userAgent: string, maxTouchPoints = 0): boolean =>
  /iPhone|iPad|iPod/.test(userAgent) ||
  // iPadOS reports itself as a Mac.
  (/Macintosh/.test(userAgent) && maxTouchPoints > 1);

// x-success brings the walker back to the timer once the Shortcut has run.
export const watchWorkoutUrl = (shortcutName: string, returnUrl: string): string | null => {
  const name = shortcutName.trim();
  if (!name) return null;
  const params = new URLSearchParams({ name, "x-success": returnUrl });
  // URLSearchParams writes spaces as "+", which Shortcuts reads literally.
  return `shortcuts://x-callback-url/run-shortcut?${params.toString().replaceAll("+", "%20")}`;
};
