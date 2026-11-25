type Props = {
  // The Watch switch is on in this app, so Start will open a Shortcut.
  watchOn: boolean;
  // A walk has begun in this app, and it may have finished.
  started: boolean;
  // A walk is under way in this app.
  walking: boolean;
  // This app opened the Shortcut during this visit.
  leftForShortcut: boolean;
};

const CLASS = "px-4 text-sm text-page-quiet sm:px-0";

// Shortcuts can't send the walker back to the Home Screen app, so they sometimes land
// in a different Strut, one with no walk, and start over there. The walk keeps running
// in the first app, and its reminders keep coming. This says where the walk is.
export function WatchReturnHint({ watchOn, started, walking, leftForShortcut }: Props) {
  if (walking && leftForShortcut) {
    return (
      <p role="status" className={CLASS}>
        Your walk is running in this app. If a different Strut opened after the Shortcut, switch back to this one.
      </p>
    );
  }
  if (watchOn && !started) {
    return (
      <p className={CLASS}>
        Start opens your Watch Shortcut. When it finishes, switch back to this Strut. If a different Strut opens,
        don&apos;t start a new walk there.
      </p>
    );
  }
  return null;
}
