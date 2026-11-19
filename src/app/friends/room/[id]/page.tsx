import type { Metadata } from "next";
import { FriendsShell } from "../../friends-shell";
import { RoomScreen } from "../../room-screen";

export const metadata: Metadata = {
  title: "Your crew · Strut",
};

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <FriendsShell>
      <RoomScreen roomId={id} />
    </FriendsShell>
  );
}
