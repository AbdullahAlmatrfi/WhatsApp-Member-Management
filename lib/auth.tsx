"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
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
  /** True once the role for the CURRENT session has actually been fetched. Lets
   * the UI hold a spinner (not flash the approval gate) until the role lands. */
  roleResolved: boolean;
  /** True when the role probe itself failed (network/timeout) — a blip, NOT a
   * rejection. The UI shows a retry only when the role isn't already approved. */
  roleError: boolean;
  /** Re-check the role (catches access revoked mid-session). Resolves to the
   * fetched role, null (no profile), or undefined when the probe errored. */
  refreshRole: () => Promise<Role | null | undefined>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [roleResolved, setRoleResolved] = useState(false);
  const [roleError, setRoleError] = useState(false);
  const [loading, setLoading] = useState(true);
  // The user id the current role value belongs to — lets us drop a stale probe
  // response that lands after the user switched, and avoid re-probing on a
  // same-user token refresh.
  const currentUidRef = useRef<string | undefined>(undefined);

  // Fetch the role for `uid`. On SUCCESS sets the known role (pending/staff/admin
  // or null = no profile) and marks it resolved. On ERROR flags roleError and
  // does NOT downgrade the role — a flaky network must never look like "not
  // approved". Stale responses (user already switched) are dropped. Returns the
  // role, null, or undefined (errored) so callers can branch.
  const resolveRole = useCallback(async (uid: string): Promise<Role | null | undefined> => {
    try {
      const r = await fetchMyRole(uid);
      if (currentUidRef.current !== uid) return undefined;
      setRole(r);
      setRoleError(false);
      setRoleResolved(true);
      return r;
    } catch {
      if (currentUidRef.current !== uid) return undefined;
      setRoleError(true);
      return undefined;
    }
  }, []);

  const refreshRole = useCallback(() => {
    const uid = currentUidRef.current;
    return uid ? resolveRole(uid) : Promise.resolve(undefined);
  }, [resolveRole]);

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
        const s = data.session;
        currentUidRef.current = s?.user.id;
        setSession(s);
        if (s) await resolveRole(s.user.id);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const newUid = s?.user.id;
      const prevUid = currentUidRef.current;
      currentUidRef.current = newUid;
      setSession(s);
      if (!s) {
        setRole(null);
        setRoleError(false);
        setRoleResolved(false);
        return;
      }
      // Only (re)probe when the user actually changed (new login / switch). A
      // same-user token refresh keeps the role we already have — no flash, no
      // duplicate fetch alongside the getSession probe above.
      if (newUid !== prevUid) {
        setRole(null);
        setRoleError(false);
        setRoleResolved(false);
        resolveRole(newUid as string);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [resolveRole]);

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
    // Forget any admin "staff view" choice so the next login lands on the
    // control panel again (and the next person on a shared PC starts clean).
    try {
      sessionStorage.removeItem("gc_staff_view");
    } catch {}
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
      value={{ session, user: session?.user ?? null, loading, role, roleResolved, roleError, refreshRole, signIn, signOut }}
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
