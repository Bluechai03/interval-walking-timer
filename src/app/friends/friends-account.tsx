"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkName, NAME_LIMITS, suggestNickname } from "@/lib/name-rules";
import { deleteMyData, fetchDisplayName, saveDisplayName } from "@/lib/profile";
import { usePlanConfig } from "@/lib/use-plan-config";
import { useActivity } from "@/lib/use-activity";
import { useGetReady } from "@/lib/use-get-ready";
import { createRoom, isCompleteCode, joinRoom, normalizeCode, roomCountdownSeconds } from "@/lib/rooms";
import { signInAsGuest, useAuth } from "@/lib/use-auth";
import { primeAudio } from "@/lib/use-cues";
import { ConfirmDialog } from "./confirm-dialog";
import { LINK, PRIMARY, SECONDARY } from "./styles";

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
  // account made by saving a name must not look like a new arrival. Only used
  // for the first look-up of a saved name.
  const [arrivedAs] = useState(initialUserId);
  // Whose account a save goes to. Set when a guest account is made here, so the
  // next save reuses it, and cleared when the data is deleted.
  const [ownerId, setOwnerId] = useState<string | null>(initialUserId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
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
    let id = ownerId;
    if (!id) {
      const guest = await signInAsGuest();
      if (!guest.ok) {
        setBusy(false);
        return setMessage(guest.message);
      }
      id = guest.userId;
      setOwnerId(id);
    }
    const result = await saveDisplayName(id, check.name);
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setSaved(result.value);
    setEditing(false);
    setDeleted(false);
  };

  const deleteData = async () => {
    setBusy(true);
    const result = await deleteMyData();
    setBusy(false);
    setConfirmingDelete(false);
    if (!result.ok) return setMessage(result.message);
    // Back to the start, as if this phone had never been here.
    setOwnerId(null);
    setSaved(null);
    setEditing(false);
    setMessage(null);
    setDraft(suggestNickname());
    setDeleted(true);
  };

  if (saved === undefined) return <p className="text-page-quiet">One moment…</p>;

  if (saved === null || editing) {
    return (
      <section className="flex flex-col gap-4">
        {deleted && saved === null && (
          <p role="status" className="text-lg">
            All done. Your name and your crews are deleted.
          </p>
        )}
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
              className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold min-h-11 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink focus:border-page-ink"
              value={draft}
              maxLength={NAME_LIMITS.max * 2}
              autoComplete="nickname"
              autoCapitalize="words"
              aria-describedby={message ? "name-message" : undefined}
              aria-invalid={message ? true : undefined}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          {message && <Notice id="name-message">{message}</Notice>}
          <button className={PRIMARY} disabled={busy} type="submit">
            {busy ? "Saving…" : "Save my name"}
          </button>
          {saved !== null && (
            <button type="button" className={SECONDARY} onClick={() => setEditing(false)}>
              Cancel
            </button>
          )}
        </form>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <p className="text-3xl font-semibold">Hi, {saved}</p>
      {joinCode !== undefined ? <JoinLink code={joinCode} name={saved} /> : <RoomActions name={saved} />}
      <button
        className={`${LINK} self-start`}
        onClick={() => {
          setDraft(saved);
          setEditing(true);
        }}
      >
        Change my name
      </button>
      <button
        className={`${LINK} self-start`}
        onClick={() => setConfirmingDelete(true)}
      >
        Delete my data
      </button>
      {message && <Notice>{message}</Notice>}
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete your data?"
          body="This removes your name and takes you out of every crew. Any crew you started is removed for everyone in it. You can pick a new name whenever you like."
          cancelLabel="Keep my data"
          confirmLabel="Delete my data"
          busy={busy}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => void deleteData()}
        />
      )}
    </section>
  );
}

function Notice({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} role="alert" className="text-sm text-page-quiet">
      {children}
    </p>
  );
}

// Start a crew of your own, or type the four letters a friend gave you.
function RoomActions({ name }: { name: string }) {
  const router = useRouter();
  const { config } = usePlanConfig();
  const getReady = useGetReady();
  const { activity } = useActivity();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Which button was tapped, so its label can say what is happening.
  const [doing, setDoing] = useState<"start" | "join" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const start = async () => {
    primeAudio();
    setDoing("start");
    setBusy(true);
    setMessage(null);
    const result = await createRoom(
      { fast: config.fastSeconds, slow: config.slowSeconds, rounds: config.rounds, getReady: roomCountdownSeconds(getReady.seconds), activity },
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
    setDoing("join");
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
          {busy && doing === "start" ? "Starting…" : "Start a crew"}
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
            className="w-full border-b border-page-line bg-transparent py-1 text-2xl font-semibold tracking-[0.3em] uppercase min-h-11 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink focus:border-page-ink"
            value={code}
            onChange={(event) => setCode(normalizeCode(event.target.value))}
          />
        </label>
        <button className={SECONDARY} disabled={busy || !isCompleteCode(code)} type="submit">
          {busy && doing === "join" ? "Joining…" : "Join the crew"}
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
        You&apos;re invited to the crew <span className="font-semibold tracking-[0.2em]">{clean}</span>.
      </p>
      <button className={PRIMARY} disabled={busy} onClick={() => void join()}>
        {busy ? "Joining…" : `Join as ${name}`}
      </button>
      {message && <Notice>{message}</Notice>}
    </div>
  );
}
