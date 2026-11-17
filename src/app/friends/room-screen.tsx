"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { formatTime } from "@/lib/format-time";
import { leaveRoom, removeMember, roomLink, startRoom, type Room } from "@/lib/rooms";
import { primeAudio } from "@/lib/use-cues";
import { useAuth } from "@/lib/use-auth";
import { useRoom } from "@/lib/use-room";
import { RoomWalk } from "./room-walk";
import { LINK, PRIMARY, SECONDARY } from "./styles";

export function RoomScreen({ roomId }: { roomId: string }) {
  const auth = useAuth();
  const state = useRoom(roomId);

  // A phone only allows sound after a tap, so any tap while waiting counts.
  useEffect(() => {
    document.addEventListener("pointerdown", primeAudio, { once: true });
    return () => document.removeEventListener("pointerdown", primeAudio);
  }, []);

  if (auth.status === "loading" || state.status === "loading") {
    return <p className="text-page-quiet">One moment…</p>;
  }

  if (auth.status === "unavailable") {
    return <p className="text-page-quiet">Walking with friends isn&apos;t switched on here yet.</p>;
  }

  if (auth.status === "signed-out" || state.status === "missing") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-lg">
          This room isn&apos;t available to you. It may have closed, or you may need to join it
          with the code first.
        </p>
        <Link href="/friends" className={PRIMARY}>
          Back to Walk with friends
        </Link>
      </div>
    );
  }

  if (state.status === "error") {
    return <p role="alert" className="text-page-quiet">{state.message}</p>;
  }

  if (state.room.status === "closed") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-lg">This room has closed. The host may have left before the walk began.</p>
        <Link href="/friends" className={PRIMARY}>
          Back to Walk with friends
        </Link>
      </div>
    );
  }

  // Once the host has started, the room becomes the walk.
  if (state.room.start_at !== null) return <RoomWalk room={state.room} roomId={roomId} />;

  const me = auth.user.id;
  const isHost = state.room.host_id === me;

  return (
    <section className="flex flex-col gap-8">
      <RoomCode room={state.room} />

      <p className="text-page-quiet">
        {state.room.rounds} rounds of {formatTime(state.room.fast_seconds)} fast and{" "}
        {formatTime(state.room.slow_seconds)} slow.
      </p>

      <div className="flex flex-col gap-2">
        <h2 className="border-b-2 border-page-ink pb-2 text-xl font-semibold">
          Here now ({state.here.length})
        </h2>
        <ul className="flex flex-col">
          {state.here.map((member) => (
            <li
              key={member.user_id}
              className="flex items-center justify-between gap-3 border-b border-page-line py-3"
            >
              <span className="text-xl font-semibold">
                {member.nickname}
                {member.user_id === me && <span className="font-normal text-page-quiet"> (you)</span>}
                {member.user_id === state.room.host_id && (
                  <span className="text-sm font-medium text-page-quiet"> · host</span>
                )}
              </span>
              {isHost && member.user_id !== me && (
                <RemoveButton roomId={roomId} memberId={member.user_id} name={member.nickname} />
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <StartButton roomId={roomId} getReady={state.room.get_ready_seconds} onStarted={state.reload} />
      ) : (
        <p className="text-page-quiet">Waiting for the host to start the walk.</p>
      )}

      <LeaveButton roomId={roomId} isHost={isHost} />
    </section>
  );
}

function StartButton({ roomId, getReady, onStarted }: { roomId: string; getReady: number; onStarted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        className={PRIMARY}
        disabled={busy}
        onClick={async () => {
          // This tap is what lets this phone play sound for the walk.
          primeAudio();
          setBusy(true);
          setMessage(null);
          const result = await startRoom(roomId);
          setBusy(false);
          if (!result.ok) return setMessage(result.message);
          onStarted();
        }}
      >
        Start the walk
      </button>
      <p className="text-sm text-page-quiet">
        {getReady > 0
          ? `Everyone sees a ${getReady} second countdown at the same moment.`
          : "Everyone starts at the same moment."}
      </p>
      {message && (
        <p role="alert" className="text-sm text-page-quiet">
          {message}
        </p>
      )}
    </div>
  );
}

function RoomCode({ room }: { room: Room }) {
  const [link, setLink] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  useEffect(() => {
    // The link needs the browser's address, so it is made once the page is showing.
    const url = roomLink(window.location.origin, room.code);
    let current = true;
    void QRCode.toDataURL(url, { margin: 1, width: 240 }).then((data) => {
      if (!current) return;
      setLink(url);
      setQr(data);
    });
    return () => {
      current = false;
    };
  }, [room.code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is still shown to copy by hand.
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-action px-5 py-6 text-action-ink">
      <p className="text-sm font-medium opacity-80">Join code</p>
      <p aria-label={`Join code ${room.code.split("").join(" ")}`} className="font-condensed text-[5.5rem] leading-none tracking-[0.18em]">
        {room.code}
      </p>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR code that opens the room" width={160} height={160} className="rounded-md bg-white p-1" />
      )}
      {link && <p className="max-w-full break-all text-center text-sm opacity-80">{link}</p>}
      <div className="flex w-full gap-3">
        <button
          className="flex h-12 flex-1 items-center justify-center rounded-lg border-2 border-action-ink text-base font-semibold"
          onClick={() => void copy()}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        {canShare && (
          <button
            className="flex h-12 flex-1 items-center justify-center rounded-lg border-2 border-action-ink text-base font-semibold"
            onClick={() => void navigator.share({ title: "Walk with me on Strut", url: link }).catch(() => {})}
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}

function RemoveButton({ roomId, memberId, name }: { roomId: string; memberId: string; name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={LINK}
      disabled={busy}
      aria-label={`Remove ${name}`}
      onClick={async () => {
        setBusy(true);
        await removeMember(roomId, memberId);
        setBusy(false);
      }}
    >
      Remove
    </button>
  );
}

function LeaveButton({ roomId, isHost }: { roomId: string; isHost: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={SECONDARY}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await leaveRoom(roomId);
        router.push("/friends");
      }}
    >
      {isHost ? "Close the room" : "Leave the room"}
    </button>
  );
}
