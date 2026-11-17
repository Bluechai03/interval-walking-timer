import { getSupabase } from "./supabase";

export const DEFAULT_STEPS_SHORTCUT = "Strut Steps";

// What the walker's Shortcut is given: which claim to fill in, which stretch of
// time to add up, and where to post the answer. The key is the project's public
// one, the same that is in the app, so there is nothing secret in it.
export type StepsShortcutInput = {
  code: string;
  start: string;
  end: string;
  url: string;
  key: string;
};

export const submitStepsUrl = (supabaseUrl: string): string =>
  `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/rpc/submit_steps`;

// Opens the named Shortcut and gives it the details as JSON text. Like the Watch
// Shortcuts there is no way back: the Shortcut posts the steps to the database
// itself, so it works whichever app the walker is in.
export const stepsShortcutUrl = (shortcutName: string, input: StepsShortcutInput): string | null => {
  const name = shortcutName.trim();
  if (!name) return null;
  const params = new URLSearchParams({ name, input: "text", text: JSON.stringify(input) });
  // URLSearchParams writes spaces as "+", which Shortcuts reads literally.
  return `shortcuts://run-shortcut?${params.toString().replaceAll("+", "%20")}`;
};

export type StepsResult<T> = { ok: true; value: T } | { ok: false; message: string };

const FAILED = "That didn't work just now. Please try again in a moment.";

export const stepsMessage = (error: { message?: string } | null | undefined): string => {
  const text = error?.message ?? "";
  if (text.includes("too_many_claims")) return "That's a lot of tries in an hour. Please wait a little and try again.";
  if (text.includes("check constraint")) return "That time window isn't one we can check. Try a shorter one.";
  return FAILED;
};

// Asks for a one-time code for adding up steps between two moments.
export const createStepClaim = async (start: Date, end: Date): Promise<StepsResult<string>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: FAILED };
  const { data, error } = await supabase.rpc("create_step_claim", {
    starts: start.toISOString(),
    ends: end.toISOString(),
  });
  if (error || typeof data !== "string") return { ok: false, message: stepsMessage(error) };
  return { ok: true, value: data };
};

// The steps the Shortcut posted, or null if it hasn't yet.
export const fetchClaimedSteps = async (code: string): Promise<StepsResult<number | null>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: FAILED };
  const { data, error } = await supabase.from("step_claims").select("steps").eq("code", code).maybeSingle();
  if (error) return { ok: false, message: FAILED };
  return { ok: true, value: data?.steps ?? null };
};
