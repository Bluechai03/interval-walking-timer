"use client";

import { GearSixIcon, TimerIcon, UsersThreeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Workout", Icon: TimerIcon, active: (path: string) => path === "/" },
  { href: "/friends", label: "Crew", Icon: UsersThreeIcon, active: (path: string) => path.startsWith("/friends") },
  { href: "/settings", label: "Settings", Icon: GearSixIcon, active: (path: string) => path.startsWith("/settings") },
] as const;

// The three places in the app, along the bottom where a thumb reaches. A crew's own
// walk screen and a walk in progress have none, so nothing pulls attention away.
export function BottomTabs({ hidden = false }: { hidden?: boolean }) {
  const path = usePathname() ?? "/";
  if (hidden || path.startsWith("/friends/room/")) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-page-line bg-page pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, Icon, active }) => {
          const current = active(path);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 border-t-4 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-page-ink ${
                  current ? "border-marker text-page-ink" : "border-transparent text-page-quiet"
                }`}
              >
                <Icon aria-hidden="true" size={26} weight={current ? "fill" : "regular"} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
