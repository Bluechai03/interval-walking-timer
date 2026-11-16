import type { Metadata } from "next";
import { FriendsAccount } from "./friends-account";
import { FriendsShell } from "./friends-shell";

export const metadata: Metadata = {
  title: "Walk with friends · Strut",
};

export default function FriendsPage() {
  return (
    <FriendsShell>
      <FriendsAccount />
    </FriendsShell>
  );
}
