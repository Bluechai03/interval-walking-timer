"use client";

import { useEffect, useState } from "react";
import { checkName, NAME_LIMITS, suggestName } from "@/lib/name-rules";
import { fetchDisplayName, saveDisplayName } from "@/lib/profile";
import { signInWithGoogle, signOut, useAuth } from "@/lib/use-auth";

const BUTTON =
  "flex h-14 w-full items-center justify-center rounded-lg text-lg font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-page-ink disabled:opacity-40";

export function FriendsAccount() {
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

  if (auth.status === "signed-out") {
    return (
      <section className="flex flex-col gap-4">
        <p className="text-lg">
          Sign in to set your name. Soon you&apos;ll be able to start a room and walk in step with
          friends.
        </p>
        <button
          className={`${BUTTON} bg-action text-action-ink`}
          onClick={() => void signInWithGoogle()}
        >
          Continue with Google
        </button>
        <p className="text-sm text-page-quiet">
          Strut only keeps your name. Your email isn&apos;t shown to anyone.
        </p>
      </section>
    );
  }

  return (
    <SignedIn
      // A fresh form for each person who signs in.
      key={auth.user.id}
      userId={auth.user.id}
      suggestion={suggestName(auth.user.user_metadata?.full_name ?? auth.user.user_metadata?.name)}
    />
  );
}

function SignedIn({ userId, suggestion }: { userId: string; suggestion: string }) {
  // undefined while loading, null when there is no name yet.
  const [saved, setSaved] = useState<string | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(suggestion);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    void fetchDisplayName(userId).then((result) => {
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
  }, [userId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const check = checkName(draft);
    if (!check.ok) return setMessage(check.message);
    setBusy(true);
    const result = await saveDisplayName(userId, check.name);
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setSaved(result.value);
    setEditing(false);
    setMessage(null);
  };

  if (saved === undefined) return <p className="text-page-quiet">One moment…</p>;

  const showForm = saved === null || editing;

  return (
    <section className="flex flex-col gap-4">
      {showForm ? (
        <form onSubmit={save} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-page-quiet">
              {saved === null ? "What should friends call you?" : "Your name"}
            </span>
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
          <button className={`${BUTTON} bg-action text-action-ink`} disabled={busy} type="submit">
            {busy ? "Saving…" : "Save my name"}
          </button>
          {saved !== null && (
            <button type="button" className={`${BUTTON} border-2 border-page-ink`} onClick={() => setEditing(false)}>
              Cancel
            </button>
          )}
        </form>
      ) : (
        <>
          <p className="text-3xl font-semibold">Hi, {saved}</p>
          <p className="text-page-quiet">Rooms are on their way. Your name is ready for them.</p>
          <button className={`${BUTTON} border-2 border-page-ink`} onClick={() => setEditing(true)}>
            Change my name
          </button>
        </>
      )}
      {message && (
        <p role="alert" className="text-sm text-page-quiet">
          {message}
        </p>
      )}
      <button className="self-start text-sm font-medium text-page-quiet underline underline-offset-4" onClick={() => void signOut()}>
        Sign out
      </button>
    </section>
  );
}
