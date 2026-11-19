import type { ReactNode } from "react";
import { BottomTabs } from "../bottom-tabs";
import { OfflineNote } from "./offline-note";
import { ShellBack } from "./shell-back";

export function FriendsShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between">
        <h1 className="font-condensed text-[2rem] leading-none">Walk with friends</h1>
        <ShellBack />
      </header>
      <OfflineNote />
      {children}
      <BottomTabs />
    </main>
  );
}
