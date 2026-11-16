import type { Metadata } from "next";
import { FriendsAccount } from "../../friends-account";
import { FriendsShell } from "../../friends-shell";

export const metadata: Metadata = {
  title: "Join a walk · Strut",
};

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <FriendsShell>
      <FriendsAccount joinCode={code} />
    </FriendsShell>
  );
}
