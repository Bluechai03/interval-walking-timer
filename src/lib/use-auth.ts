"use client";

import type { User } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { getSupabase } from "./supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: User };

const LOADING: AuthState = { status: "loading" };
const listeners = new Set<() => void>();
let state: AuthState = LOADING;
let started = false;

const start = () => {
  if (started) return;
  started = true;
  const supabase = getSupabase();
  if (!supabase) {
    state = { status: "unavailable" };
    return;
  }
  // Fires once straight away with the saved session, then on every change.
  supabase.auth.onAuthStateChange((_event, session) => {
    state = session?.user ? { status: "signed-in", user: session.user } : { status: "signed-out" };
    listeners.forEach((listener) => listener());
  });
};

const subscribe = (listener: () => void) => {
  start();
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

const getSnapshot = () => state;
const getServerSnapshot = () => LOADING;

export type GuestResult = { ok: true; userId: string } | { ok: false; message: string };

// Everyone is a guest: Supabase makes a nameless account for this browser, and
// the name is saved to it afterwards.
export const signInAsGuest = async (): Promise<GuestResult> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: "That didn't work just now. Please try again in a moment." };
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    return { ok: false, message: "That didn't work just now. Please try again in a moment." };
  }
  return { ok: true, userId: data.user.id };
};

export const useAuth = (): AuthState =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
