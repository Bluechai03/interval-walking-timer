"use client";

import { useEffect, useState } from "react";
import { checkName, NAME_LIMITS, suggestNickname } from "@/lib/name-rules";
import { fetchDisplayName, saveDisplayName } from "@/lib/profile";
import { signInAsGuest, useAuth } from "@/lib/use-auth";

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

  // No account needed: the first name you pick creates one for this phone.
  return (
    <NameForm
      key={auth.status === "signed-in" ? auth.user.id : "guest"}
      userId={auth.status === "signed-in" ? auth.user.id : null}
    />
  );
}

function NameForm({ userId }: { userId: string | null }) {
  // undefined while loading, null when there is no name yet.
  const [saved, setSaved] = useState<string | null | undefined>(userId ? undefined : null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => suggestNickname());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
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
    setMessage(null);
    let id = userId;
    if (!id) {
      const guest = await signInAsGuest();
      if (!guest.ok) {
        setBusy(false);
        return setMessage(guest.message);
      }
      id = guest.userId;
    }
    const result = await saveDisplayName(id, check.name);
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    setSaved(result.value);
    setEditing(false);
  };

  if (saved === undefined) return <p className="text-page-quiet">One moment…</p>;

  const showForm = saved === null || editing;

  return (
    <section className="flex flex-col gap-4">
      {showForm ? (
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
          <button className={`${BUTTON} bg-action text-action-ink`} disabled={busy} type="submit">
            {busy ? "Saving…" : "Save my name"}
          </button>
          {saved !== null && (
            <button
              type="button"
              className={`${BUTTON} border-2 border-page-ink`}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          )}
        </form>
      ) : (
        <>
          <p className="text-3xl font-semibold">Hi, {saved}</p>
          <p className="text-page-quiet">Rooms are on their way. Your name is ready for them.</p>
          <button className={`${BUTTON} border-2 border-page-ink`} onClick={() => { setDraft(saved); setEditing(true); }}>
            Change my name
          </button>
        </>
      )}
      {message && (
        <p role="alert" className="text-sm text-page-quiet">
          {message}
        </p>
      )}
    </section>
  );
}
