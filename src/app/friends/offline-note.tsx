"use client";

import { useOnline } from "@/lib/use-online";

// Crews run on a live connection. With none, say so once, at the top.
export function OfflineNote() {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className="rounded-lg border-2 border-brass px-4 py-3 text-base">
      No signal right now. A crew needs one to keep everyone in step. The timer still works.
    </p>
  );
}
