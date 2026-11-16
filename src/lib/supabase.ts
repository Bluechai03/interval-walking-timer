import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

// The browser's connection to Supabase, or null when it isn't set up (no env
// values), so the solo timer never depends on it.
export const getSupabase = (): SupabaseClient | null => {
  if (client === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    client = url && key ? createClient(url, key) : null;
  }
  return client;
};
