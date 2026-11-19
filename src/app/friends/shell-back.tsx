"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LINK } from "./styles";

// The tab bar is the way back everywhere except a crew's own walk, which has none.
export function ShellBack() {
  const path = usePathname() ?? "";
  if (!path.startsWith("/friends/room/")) return null;
  return (
    <Link href="/" className={LINK}>
      Back to the timer
    </Link>
  );
}
