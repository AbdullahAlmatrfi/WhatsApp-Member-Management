"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase/client";
import { fetchMyRole, type Role } from "./members-api";

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
  /** The signed-in user's role; null when unknown/no profile. */
  role: Role | null;
  /** True when the role probe itself failed (network/timeout) — a blip, NOT a
   * rejection. The UI shows a retry, never the approval gate, in this case. */
  roleError: boolean;
  /** Re-check the role (used to catch access revoked mid-session). */
  refreshRole: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [roleError, setRoleError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Re-check the role. On SUCCESS it sets the known role (pending/staff/admin
  // or null = no profile). On ERROR it flags roleError and does NOT downgrade
  // the role — a flaky network must never masquerade as "not approved".
  const refreshRole = useCallback(async () => {
    try {
      const r = await fetchMyRole();
      setRole(r);
      setRoleError(false);
    } catch {
      setRoleError(true);
    }
  }, []);

  useEffect(() => {
    // Unconfigured: don't fire a doomed request at the placeholder host — just
    // stop loading so the app can show the "setup needed" screen.
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session) await refreshRole();
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        refreshRole();
      } else {
        setRole(null);
        setRoleError(false);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshRole]);

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
    // On a flaky network the server logout can fail and auth-js then KEEPS the
    // session — dangerous on a shared reception PC. Force a local clear so the
    // next person never inherits the session.
    const { error } = await supabase.auth.signOut();
    if (error) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, role, roleError, refreshRole, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
