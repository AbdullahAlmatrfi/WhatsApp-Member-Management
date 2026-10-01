"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase/client";

/** Why a sign-in failed, so the UI can tell the truth instead of always
 * blaming the password. */
export type AuthFailure = "credentials" | "connection";
export type SignInResult = { ok: true } | { ok: false; reason: AuthFailure };

/** Bad email/password → "credentials"; anything else (offline, timeout,
 * paused project, server error) → "connection". Pure, so it's unit-testable. */
export function classifyAuthError(
  error: { status?: number | null; code?: string | null } | null | undefined
): AuthFailure {
  if (!error) return "connection";
  const credentialStatus =
    error.status === 400 || error.status === 401 || error.status === 422;
  if (error.code === "invalid_credentials" || credentialStatus) return "credentials";
  return "connection";
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Unconfigured: don't fire a doomed request at the placeholder host — just
    // stop loading so the app can show the "setup needed" screen.
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    if (!isSupabaseConfigured) return { ok: false, reason: "connection" };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return { ok: true };
      return { ok: false, reason: classifyAuthError(error) };
    } catch {
      // Network failure / timeout throws rather than returning an error.
      return { ok: false, reason: "connection" };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
