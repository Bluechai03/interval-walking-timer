"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkName, NAME_LIMITS, suggestNickname } from "@/lib/name-rules";
import { fetchDisplayName, saveDisplayName } from "@/lib/profile";
import { usePlanConfig } from "@/lib/use-plan-config";
import { useGetReady } from "@/lib/use-get-ready";
import { createRoom, isCompleteCode, joinRoom, normalizeCode } from "@/lib/rooms";
import { signInAsGuest, useAuth } from "@/lib/use-auth";
import { primeAudio } from "@/lib/use-cues";
import { PRIMARY, SECONDARY } from "./styles";

export function FriendsAccount({ joinCode }: { joinCode?: string }) {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <p className="text-page-quiet">One moment…</p>;
  }

  if (auth.status === "unavailable") {
    return (
      <p className="text-page-quiet">
        Walking with friends isn&apos;t switched on here yet. The timer works as usual.
      </p>
    );
  }

  // No account needed: the first name you pick creates one for this phone. The
  // form must not be rebuilt when that happens, so it only reads who was signed
  // in when it first appeared.
  return (
    <NameForm
      initialUserId={auth.status === "signed-in" ? auth.user.id : null}
      joinCode={joinCode}
    />
  );
}

function NameForm({ initialUserId, joinCode }: { initialUserId: string | null; joinCode?: string }) {
  // Who was signed in when this form appeared. Fixed on purpose: the guest
  // account made by saving a name must not look like a new arrival.
  const [arrivedAs] = useState(initialUserId);
  // Set once a guest account is made here, so the next save reuses it.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const userId = createdId ?? arrivedAs;
  // undefined while loading, null when there is no name yet.
  const [saved, setSaved] = useState<string | null | undefined>(arrivedAs ? undefined : null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => suggestNickname());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Looks up a name already saved by someone who was signed in on arrival.
  useEffect(() => {
    if (!arrivedAs) return;
    let current = true;
    void fetchDisplayName(arrivedAs).then((result) => {
      if (!current) return;
      if (result.ok) setSaved(result.value);
      else {
        setSaved(null);
        setMessage(result.message);
      }
    });
    return () => {
      current = false;
    };
  }, [arrivedAs]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const check = checkName(draft);
    if (!check.ok) return setMessage(check.message);
    setBusy(true);
    setMessage(null);
    let id = userId;
    if (!id) {
      const guest = await signInAsGuest();
      if (!guest.ok) {
        setBusy(false);
        return setMessage(guest.message);
      }
      id = guest.userId;
      setCreatedId(id);
    }
    const result = await saveDisplayName(id, check.name);
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setSaved(result.value);
    setEditing(false);
  };

  if (saved === undefined) return <p className="text-page-quiet">One moment…</p>;

  if (saved === null || editing) {
    return (
      <section className="flex flex-col gap-4">
        <form onSubmit={save} className="flex flex-col gap-4">
          <p className="text-lg">
            {saved === null
              ? "Pick a name so your friends know it's you. No account needed."
              : "Pick a new name."}
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-page-quiet">Your name</span>
            <input
              type="text"
              // text-2xl keeps it above 16px, so iOS Safari doesn't zoom in.
              className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold outline-none focus:border-page-ink"
              value={draft}
              maxLength={NAME_LIMITS.max * 2}
              autoComplete="nickname"
              autoCapitalize="words"
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <button className={PRIMARY} disabled={busy} type="submit">
            {busy ? "Saving…" : "Save my name"}
          </button>
          {saved !== null && (
            <button type="button" className={SECONDARY} onClick={() => setEditing(false)}>
              Cancel
            </button>
          )}
        </form>
        {message && <Notice>{message}</Notice>}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <p className="text-3xl font-semibold">Hi, {saved}</p>
      {joinCode !== undefined ? <JoinLink code={joinCode} name={saved} /> : <RoomActions name={saved} />}
      <button
        className="self-start text-sm font-medium text-page-quiet underline underline-offset-4"
        onClick={() => {
          setDraft(saved);
          setEditing(true);
        }}
      >
        Change my name
      </button>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm text-page-quiet">
      {children}
    </p>
  );
}

// Start a room of your own, or type the four letters a friend gave you.
function RoomActions({ name }: { name: string }) {
  const router = useRouter();
  const { config } = usePlanConfig();
  const getReady = useGetReady();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const start = async () => {
    primeAudio();
    setBusy(true);
    setMessage(null);
    const result = await createRoom(
      { fast: config.fastSeconds, slow: config.slowSeconds, rounds: config.rounds, getReady: getReady.seconds },
      name,
    );
    if (!result.ok) {
      setBusy(false);
      return setMessage(result.message);
    }
    router.push(`/friends/room/${result.value.id}`);
  };

  const join = async (event: React.FormEvent) => {
    event.preventDefault();
    primeAudio();
    setBusy(true);
    setMessage(null);
    const result = await joinRoom(code, name);
    if (!result.ok) {
      setBusy(false);
      return setMessage(result.message);
    }
    router.push(`/friends/room/${result.value}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <button className={PRIMARY} disabled={busy} onClick={() => void start()}>
          Start a room
        </button>
        <p className="text-sm text-page-quiet">
          You&apos;ll walk the plan you set on the timer. Friends join with a code.
        </p>
      </div>
      <form onSubmit={join} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-page-quiet">Got a code from a friend?</span>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ABCD"
            className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold tracking-[0.3em] uppercase outline-none focus:border-page-ink"
            value={code}
            onChange={(event) => setCode(normalizeCode(event.target.value))}
          />
        </label>
        <button className={SECONDARY} disabled={busy || !isCompleteCode(code)} type="submit">
          Join the room
        </button>
      </form>
      {message && <Notice>{message}</Notice>}
    </div>
  );
}

// Arriving from a friend's link: the code is already known.
function JoinLink({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const clean = normalizeCode(code);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isCompleteCode(clean)) {
    return (
      <div className="flex flex-col gap-3">
        <p>That link doesn&apos;t look right. Ask your friend for the four letters.</p>
        <button className={SECONDARY} onClick={() => router.push("/friends")}>
          Enter a code instead
        </button>
      </div>
    );
  }

  const join = async () => {
    primeAudio();
    setBusy(true);
    setMessage(null);
    const result = await joinRoom(clean, name);
    if (!result.ok) {
      setBusy(false);
      return setMessage(result.message);
    }
    router.push(`/friends/room/${result.value}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg">
        You&apos;re invited to room <span className="font-semibold tracking-[0.2em]">{clean}</span>.
      </p>
      <button className={PRIMARY} disabled={busy} onClick={() => void join()}>
        Join as {name}
      </button>
      {message && <Notice>{message}</Notice>}
    </div>
  );
}
