"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buildPlan } from "@/lib/plan";
import { leaveRoom, type Room } from "@/lib/rooms";
import { primeAudio, useCues } from "@/lib/use-cues";
import { useMuted } from "@/lib/use-muted";
import { usePhasePush } from "@/lib/use-phase-push";
import { useRoomTimer } from "@/lib/use-room-timer";
import { useServerOffset } from "@/lib/use-server-offset";
import { useWakeLock } from "@/lib/use-wake-lock";
import { PhaseNotifications } from "../phase-notifications";
import { WalkDisplay } from "../walk-display";
import { LINK, SECONDARY } from "./styles";

// A walk everyone in the room is taking together. It follows the host's start
// moment on the server's clock, so it needs no Start, Pause or Reset of its own.
export function RoomWalk({ room, roomId }: { room: Room; roomId: string }) {
  const offset = useServerOffset();
  if (offset === null || room.start_at === null) {
    return <p className="text-page-quiet">One moment…</p>;
  }
  return <Walking room={room} roomId={roomId} startAt={room.start_at} offset={offset} />;
}

function Walking({
  room,
  roomId,
  startAt,
  offset,
}: {
  room: Room;
  roomId: string;
  startAt: string;
  offset: number;
}) {
  const router = useRouter();
  const config = useMemo(
    () => ({ fastSeconds: room.fast_seconds, slowSeconds: room.slow_seconds, rounds: room.rounds }),
    [room.fast_seconds, room.slow_seconds, room.rounds],
  );
  const plan = useMemo(() => buildPlan(config), [config]);
  const timer = useRoomTimer(plan, startAt, offset);
  const { phaseIndex, secondsLeft, fractionLeft, done, running, getReadyLeft, elapsedSeconds } = timer;
  const counting = getReadyLeft > 0;
  const { muted, setMuted } = useMuted();
  const [leaving, setLeaving] = useState(false);

  const { unlock } = useCues({
    plan,
    phaseIndex,
    running: running && !counting,
    started: !counting,
    done,
    secondsLeft,
    muted,
    getReadyLeft,
  });

  // Reminders follow the room's clock, so a late joiner's match everyone else's.
  const phasePush = usePhasePush({
    config: { ...config },
    elapsedSeconds,
    ready: true,
    running: running && !counting,
    done,
  });
  useWakeLock(running && phasePush.state !== "on");

  // Sound needs a tap on this phone. Joining or starting usually gave it; if
  // not, the first touch anywhere does.
  const [soundLocked, setSoundLocked] = useState(false);
  useEffect(() => {
    if (muted) return;
    let active = true;
    void unlock().then((allowed) => {
      if (active && !allowed) setSoundLocked(true);
    });
    return () => {
      active = false;
    };
  }, [muted, unlock]);
  useEffect(() => {
    if (!soundLocked) return;
    const onTouch = () => {
      primeAudio();
      setSoundLocked(false);
    };
    document.addEventListener("pointerdown", onTouch, { once: true });
    return () => document.removeEventListener("pointerdown", onTouch);
  }, [soundLocked]);

  const leave = async () => {
    setLeaving(true);
    await leaveRoom(roomId);
    router.push("/friends");
  };

  return (
    <div className="flex flex-col gap-3">
      <WalkDisplay
        plan={plan}
        rounds={room.rounds}
        fastSeconds={room.fast_seconds}
        slowSeconds={room.slow_seconds}
        phaseIndex={phaseIndex}
        secondsLeft={secondsLeft}
        fractionLeft={fractionLeft}
        done={done}
        counting={counting}
        getReadyLeft={getReadyLeft}
        running={running}
        muted={muted}
        onToggleMute={() => setMuted(!muted)}
      />

      {soundLocked && (
        <p className="text-sm text-page-quiet">Tap anywhere to turn sound on.</p>
      )}

      <PhaseNotifications
        state={phasePush.state}
        walking={!done}
        failed={phasePush.failed}
        // No pop-up over a shared countdown: the card below is enough.
        shouldAsk={false}
        onEnable={() => void phasePush.enable()}
        onDisable={() => void phasePush.disable()}
        onDismissAsk={phasePush.dismissAsk}
      />

      {done ? (
        <div className="flex flex-col gap-3">
          <button className={SECONDARY} disabled={leaving} onClick={() => void leave()}>
            Leave the room
          </button>
          <Link href="/" className={`${LINK} self-center`}>
            Back to the timer
          </Link>
        </div>
      ) : (
        <button className={`${LINK} self-center`} disabled={leaving} onClick={() => void leave()}>
          Leave this walk
        </button>
      )}
    </div>
  );
}
