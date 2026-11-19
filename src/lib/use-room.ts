"use client";

import { useEffect, useState } from "react";
import { fetchRoom, HEARTBEAT_MS, membersHere, touchRoom, type Member, type Room } from "./rooms";
import { getSupabase } from "./supabase";
import { useServerOffset } from "./use-server-offset";

export type RoomState =
  | { status: "loading" }
  // Closed, gone, or you aren't in it. The database doesn't say which.
  | { status: "missing" }
  | { status: "error"; message: string }
  // `connected` is false while the latest check failed and the last good copy is shown.
  | { status: "ready"; room: Room; here: Member[]; reload: () => void; connected: boolean };

// The walk of a started crew is kept on the phone, so a reload with no signal can
// carry on with the same plan and start moment instead of showing an error.
const SAVED_KEY = "crew-walk";
const SAVED_FOR_MS = 6 * 60 * 60 * 1000;

const readSaved = (id: string): Room | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null") as { room?: Room; savedAt?: number } | null;
    if (saved?.room?.id === id && saved.room.start_at && Date.now() - (saved.savedAt ?? 0) < SAVED_FOR_MS) return saved.room;
  } catch {
    // Storage unavailable or damaged: nothing saved.
  }
  return null;
};

const writeSaved = (room: Room) => {
  if (!room.start_at) return;
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify({ room, savedAt: Date.now() }));
  } catch {
    // Storage unavailable: the walk just won't survive a reload with no signal.
  }
};

// Short, so a guest still hears about the start quickly if live updates are missed.
const REFRESH_MS = 4_000;
const TICK_MS = 5_000;

// A room as the people in it see it: the room, who is here, kept up to date.
export const useRoom = (roomId: string): RoomState => {
  const [reloadCount, setReloadCount] = useState(0);
  const [loaded, setLoaded] = useState<
    { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; room: Room; members: Member[]; connected: boolean }
  >({ status: "loading" });
  const [now, setNow] = useState(() => Date.now());
  // last_seen_at comes from the server, so compare it with the server's time.
  const serverOffset = useServerOffset() ?? 0;

  useEffect(() => {
    let active = true;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const load = () =>
      void fetchRoom(roomId).then((result) => {
        if (!active) return;
        if (!result.ok) {
          // No answer. Keep showing what was there, or the saved walk, rather than
          // an error in the middle of a walk.
          setLoaded((current) => {
            if (current.status === "ready") return { ...current, connected: false };
            const saved = readSaved(roomId);
            return saved
              ? { status: "ready", room: saved, members: [], connected: false }
              : { status: "error", message: result.message };
          });
        } else if (!result.value) setLoaded({ status: "missing" });
        else {
          writeSaved(result.value.room);
          setLoaded({ status: "ready", ...result.value, connected: true });
        }
      });
    // Changes often arrive in bursts, so fetch once after they settle.
    const refresh = () => {
      clearTimeout(pending);
      pending = setTimeout(load, 200);
    };
    load();

    const supabase = getSupabase();
    const channel = supabase
      ?.channel(`room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, refresh)
      .subscribe();

    // A slow refresh as well, in case live updates are ever missed.
    const poll = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearTimeout(pending);
      clearInterval(poll);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [roomId, reloadCount]);

  // Tell the others we're here, while this page is showing.
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") void touchRoom(roomId);
    };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [roomId]);

  // Re-checks who has gone quiet, even when nothing else changes.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (loaded.status !== "ready") return loaded;
  return {
    status: "ready",
    room: loaded.room,
    here: membersHere(loaded.members, loaded.room.host_id, now + serverOffset),
    // For right after our own change, so the screen doesn't wait for the next refresh.
    reload: () => setReloadCount((count) => count + 1),
    connected: loaded.connected,
  };
};
