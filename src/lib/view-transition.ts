import { flushSync } from "react-dom";

// Runs a state update inside a view transition so the browser animates the
// change between the old and new screen. Browsers without the API, and people
// who asked for less motion, just get the update.
export const withViewTransition = (update: () => void) => {
  const canAnimate =
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canAnimate) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
};
