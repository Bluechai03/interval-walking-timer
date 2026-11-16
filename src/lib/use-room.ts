"use client";

import { useEffect, useState } from "react";
import { fetchRoom, HEARTBEAT_MS, membersHere, touchRoom, type Member, type Room } from "./rooms";
import { getSupabase } from "./supabase";

export type RoomState =
  | { status: "loading" }
  // Closed, gone, or you aren't in it. The database doesn't say which.
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; room: Room; here: Member[] };

const REFRESH_MS = 10_000;
const TICK_MS = 5_000;

// A room as the people in it see it: the room, who is here, kept up to date.
export const useRoom = (roomId: string): RoomState => {
  const [loaded, setLoaded] = useState<
    { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; room: Room; members: Member[] }
  >({ status: "loading" });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const load = () =>
      void fetchRoom(roomId).then((result) => {
        if (!active) return;
        if (!result.ok) setLoaded({ status: "error", message: result.message });
        else if (!result.value) setLoaded({ status: "missing" });
        else setLoaded({ status: "ready", ...result.value });
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
  }, [roomId]);

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
  return { status: "ready", room: loaded.room, here: membersHere(loaded.members, loaded.room.host_id, now) };
};
