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

export const signInWithGoogle = async () => {
  await getSupabase()?.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/friends` },
  });
};

export const signOut = async () => {
  await getSupabase()?.auth.signOut();
};

export const useAuth = (): AuthState =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
