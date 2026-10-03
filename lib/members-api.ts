import { supabase } from "./supabase/client";
import type { Member } from "@/app/page";

// All member reads/writes go through Supabase. Row Level Security means
// only a logged-in user can touch these; a logged-out request returns nothing.

/** Postgres/PostgREST error code (e.g. "23505" unique violation, "23514" check violation). */
export function getDbErrorCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("id,name,phone,sent,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    sent: r.sent,
    createdAt: r.created_at,
  }));
}

export async function insertMember(name: string, phone: string): Promise<Member> {
  const { data, error } = await supabase
    .from("members")
    .insert({ name, phone, sent: false })
    .select("id,name,phone,sent,created_at")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, phone: data.phone, sent: data.sent, createdAt: data.created_at };
}

/** The auto-delete window (hours) from the singleton settings row. Any signed-in
 * user may read it (RLS `settings_read`); callers fall back to a default on error. */
export async function fetchAutoDeleteHours(): Promise<number> {
  const { data, error } = await supabase
    .from("settings")
    .select("auto_delete_hours")
    .eq("id", 1)
    .single();
  if (error) throw error;
  // Validate + clamp: a bad/hostile value (NaN, 0, negative, or an absurdly
  // large number) must never silently disable the "leaving soon" cue. Non-finite
  // or non-positive throws so the caller keeps its safe default; huge values are
  // capped at 1 year.
  const h = Number(data.auto_delete_hours);
  if (!Number.isFinite(h) || h <= 0) throw new Error("invalid auto_delete_hours");
  return Math.min(h, 8760);
}

/** Bulk delete. Returns how many rows were actually removed (RLS still applies:
 * a staff caller can't delete admin-private rows, so those simply aren't counted).
 * 0 while rows were expected means already-gone or RLS-blocked — the caller
 * re-checks the role, same as the single delete. Only a real DB error throws. */
export async function deleteMembersByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  // Chunk so a large selection can't blow past the request URL length limit
  // (every id goes in the query string). Sum how many actually deleted.
  const CHUNK = 100;
  let removed = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("members").delete().in("id", slice).select("id");
    if (error) throw error;
    removed += data?.length ?? 0;
  }
  return removed;
}

export async function deleteMemberById(id: string): Promise<number> {
  // Returns how many rows were deleted. 0 is NOT an error here: it means the row
  // was already gone (idempotent — a colleague deleted it or the sweep ran) OR
  // the delete was RLS-blocked (revoked access). The caller re-checks the role
  // to tell those apart, so a revoked user never sees a false "deleted". Only a
  // real DB/network error throws.
  const { data, error } = await supabase.from("members").delete().eq("id", id).select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * Marks a member sent/unsent. Returns whether the change actually landed.
 *
 * An RLS-blocked or no-match UPDATE returns 0 rows with NO error code, so we
 * can't trust "no error" to mean "it worked." We select the row back and verify
 * `sent` is really the value we set. A 0-row / unverified result returns `false`
 * instead of silently succeeding — so the caller never shows someone as
 * "Messaged" who wasn't. Only a real DB/network error throws.
 */
export async function setMemberSent(id: string, sent: boolean): Promise<boolean> {
  const { data, error } = await supabase
    .from("members")
    .update({ sent })
    .eq("id", id)
    .select("id,sent");
  if (error) throw error;
  return (data ?? []).some((r) => r.id === id && r.sent === sent);
}

/** How many rows were cleared. 0 while some were marked sent means the update
 * was RLS-blocked (revoked access) — the caller re-checks the role rather than
 * showing a false "reset". */
export async function resetAllSent(): Promise<number> {
  const { data, error } = await supabase
    .from("members")
    .update({ sent: false })
    .eq("sent", true)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

/** The signed-in user's role from their own profile row (RLS `profiles_self_read`
 * only ever returns their row). null when there's no profile / not signed in.
 * Drives the approval gate and the revoked-mid-session routing. */
export type Role = "pending" | "staff" | "admin";
export async function fetchMyRole(userId: string): Promise<Role | null> {
  // Scope to the caller's own id explicitly. RLS already returns only their row
  // today, but an admin "read all profiles" policy (v2) would make an unscoped
  // maybeSingle() throw on multiple rows and lock admins out — so filter here.
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.role ?? null) as Role | null;
}

/** Only these roles may use the app; anything else sees the approval gate. */
export function isApprovedRole(role: Role | null | undefined): boolean {
  return role === "staff" || role === "admin";
}

// ---- v2 Admin Console: user management + settings -------------------------

export type Account = {
  id: string;
  email: string | null;
  role: Role;
  displayName: string | null;
  createdAt: string;
};

/** All accounts (admin only — RLS `profiles_admin_read` returns nothing to
 * non-admins). Newest first. */
export async function fetchAllAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,role,display_name,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    email: r.email ?? null,
    role: r.role as Role,
    displayName: r.display_name ?? null,
    createdAt: r.created_at,
  }));
}

/** The signed-in user's own display name (friendly name set by the admin), or
 * null. Scoped to their own profile row via `profiles_self_read`. */
export async function fetchMyDisplayName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.display_name ?? null) as string | null;
}

/** The gym's name (shown across the staff screen). Any approved account may read
 * it (RLS `settings_read`); null when it hasn't been set yet. */
export async function fetchGymName(): Promise<string | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("gym_name")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return (data?.gym_name ?? null) as string | null;
}

/** Admin sets the gym name (RLS `settings_admin_update` enforces admin-only). */
export async function updateGymName(name: string): Promise<boolean> {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 40);
  const { data, error } = await supabase
    .from("settings")
    .update({ gym_name: clean.length ? clean : null })
    .eq("id", 1)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Change an account's role (approve → staff, revoke → pending, etc). Admin-only
 * via RLS; the DB guard blocks removing the last admin or self-demotion (those
 * surface as a thrown error). Returns whether a row actually changed. */
export async function setUserRole(id: string, role: Role): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select("id,role");
  if (error) throw error;
  return (data ?? []).some((r) => r.id === id && r.role === role);
}

/** Admin sets the auto-delete window (hours). RLS `settings_admin_update` +
 * the CHECK (7/24/48/72) enforce it server-side. */
export async function updateAutoDeleteHours(hours: number): Promise<boolean> {
  const { data, error } = await supabase
    .from("settings")
    .update({ auto_delete_hours: hours })
    .eq("id", 1)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}
