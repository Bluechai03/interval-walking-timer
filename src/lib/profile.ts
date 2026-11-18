import { getSupabase } from "./supabase";

export type ProfileResult<T> = { ok: true; value: T } | { ok: false; message: string };

const FAILED = "That didn't work just now. Please try again in a moment.";

export const fetchDisplayName = async (userId: string): Promise<ProfileResult<string | null>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: FAILED };
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false, message: FAILED };
  return { ok: true, value: data?.display_name ?? null };
};

export const saveDisplayName = async (userId: string, name: string): Promise<ProfileResult<string>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: FAILED };
  const { error } = await supabase.from("profiles").upsert({ id: userId, display_name: name });
  if (error) return { ok: false, message: FAILED };
  return { ok: true, value: name };
};

// Removes this person's account and everything that goes with it: their name,
// their place in every room, and any rooms they started.
export const deleteMyData = async (): Promise<ProfileResult<null>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: FAILED };
  const { error } = await supabase.rpc("delete_my_data");
  if (error) return { ok: false, message: FAILED };
  // The account is gone, so this phone's login has to go too.
  await supabase.auth.signOut();
  return { ok: true, value: null };
};
