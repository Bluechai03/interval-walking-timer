import { getSupabase } from "./supabase";

export const ROOM_CODE_LENGTH = 4;
// A member who hasn't been heard from for this long drops off the list.
export const HERE_WITHIN_MS = 30_000;
export const HEARTBEAT_MS = 10_000;

export type Room = {
  id: string;
  code: string;
  host_id: string;
  status: "open" | "walking" | "closed";
  fast_seconds: number;
  slow_seconds: number;
  rounds: number;
  get_ready_seconds: number;
  start_at: string | null;
};

export type Member = {
  user_id: string;
  nickname: string;
  removed: boolean;
  last_seen_at: string;
};

// Whatever someone types or pastes becomes up to four capital letters.
export const normalizeCode = (raw: string): string =>
  raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, ROOM_CODE_LENGTH);

// Codes use consonants only, which keeps look-alikes and words out.
export const isCompleteCode = (code: string): boolean => /^[BCDFGHJKLMNPQRSTVWXZ]{4}$/.test(code);

export const roomLink = (origin: string, code: string): string => `${origin}/friends/join/${code}`;

// The members who are here right now, host first, then in the order they joined.
export const membersHere = (members: Member[], hostId: string, now: number): Member[] =>
  members
    .filter((m) => !m.removed && now - new Date(m.last_seen_at).getTime() <= HERE_WITHIN_MS)
    .sort((a, b) => Number(b.user_id === hostId) - Number(a.user_id === hostId));

const MESSAGES: Record<string, string> = {
  room_not_found: "We couldn't find that room. Check the four letters and try again.",
  room_full: "That room is full. Rooms hold up to 8 people.",
  name_taken: "Someone in that room already goes by that name. Try a different one.",
  removed: "The host has taken you out of that room.",
  not_host: "That one is up to the host. You could ask them.",
  already_started: "That walk has already begun, so there's nothing more to start.",
  cannot_remove_self: "That's you! If you want to go, you can leave the room.",
  try_again: "That didn't work just now. Please try again.",
};

const FALLBACK = "That didn't work just now. Please try again in a moment.";

// Turns an error from the database into something kind to read.
export const roomMessage = (error: { message?: string } | null | undefined): string => {
  const text = error?.message ?? "";
  for (const [code, message] of Object.entries(MESSAGES)) {
    if (text.includes(code)) return message;
  }
  if (text.includes("check constraint")) return "Check the name and plan, then try again.";
  return FALLBACK;
};

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export type NewRoomPlan = { fast: number; slow: number; rounds: number; getReady: number };

export const createRoom = async (
  plan: NewRoomPlan,
  nickname: string,
): Promise<Result<{ id: string; code: string }>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: FALLBACK };
  const { data, error } = await supabase.rpc("create_room", {
    fast: plan.fast,
    slow: plan.slow,
    total_rounds: plan.rounds,
    get_ready: plan.getReady,
    nickname,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return { ok: false, message: roomMessage(error) };
  return { ok: true, value: { id: row.room_id, code: row.code } };
};

export const joinRoom = async (code: string, nickname: string): Promise<Result<string>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: FALLBACK };
  const { data, error } = await supabase.rpc("join_room", { room_code: code, nickname });
  if (error || !data) return { ok: false, message: roomMessage(error) };
  return { ok: true, value: data as string };
};

const call = async (name: string, args: Record<string, string>): Promise<Result<null>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: FALLBACK };
  const { error } = await supabase.rpc(name, args);
  return error ? { ok: false, message: roomMessage(error) } : { ok: true, value: null };
};

export const leaveRoom = (room: string) => call("leave_room", { room });
export const removeMember = (room: string, member: string) => call("remove_member", { room, member });
export const touchRoom = (room: string) => call("touch_room", { room });

export const fetchRoom = async (
  id: string,
): Promise<Result<{ room: Room; members: Member[] } | null>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: FALLBACK };
  const [room, members] = await Promise.all([
    supabase.from("rooms").select("*").eq("id", id).maybeSingle(),
    supabase.from("room_members").select("user_id, nickname, removed, last_seen_at").eq("room_id", id),
  ]);
  if (room.error || members.error) return { ok: false, message: FALLBACK };
  // No row means the room is closed, gone, or this person isn't in it.
  if (!room.data) return { ok: true, value: null };
  return { ok: true, value: { room: room.data as Room, members: members.data as Member[] } };
};

// Starts the walk for everyone. The answer is the moment the first phase begins.
export const startRoom = async (room: string): Promise<Result<null>> => call("start_room", { room });

// The server's clock, in milliseconds since 1970, or null if it couldn't be read.
export const fetchServerTime = async (): Promise<number | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("server_time");
  if (error || typeof data !== "string") return null;
  const ms = Date.parse(data);
  return Number.isNaN(ms) ? null : ms;
};
