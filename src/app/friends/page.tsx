import type { Metadata } from "next";
import Link from "next/link";
import { FriendsAccount } from "./friends-account";

export const metadata: Metadata = {
  title: "Walk with friends · Strut",
};

export default function FriendsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between">
        <h1 className="font-condensed text-[2rem] leading-none">Walk with friends</h1>
        <Link href="/" className="text-sm font-medium text-page-quiet underline underline-offset-4">
          Back to the timer
        </Link>
      </header>
      <FriendsAccount />
    </main>
  );
}
