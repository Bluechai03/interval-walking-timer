import type { Metadata } from "next";
import { FriendsShell } from "../../friends-shell";
import { Lobby } from "../../lobby";

export const metadata: Metadata = {
  title: "Your room · Strut",
};

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <FriendsShell>
      <Lobby roomId={id} />
    </FriendsShell>
  );
}
