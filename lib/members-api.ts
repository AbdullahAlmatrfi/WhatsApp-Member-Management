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

export async function deleteMemberById(id: string): Promise<void> {
  // .select() so a 0-row result (row already gone / RLS-blocked) is a failure,
  // not a silent success — the caller then rolls back the optimistic update.
  const { data, error } = await supabase.from("members").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("member not found or not permitted");
}

export async function setMemberSent(id: string, sent: boolean): Promise<void> {
  const { data, error } = await supabase.from("members").update({ sent }).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("member not found or not permitted");
}

export async function resetAllSent(): Promise<void> {
  const { error } = await supabase.from("members").update({ sent: false }).eq("sent", true);
  if (error) throw error;
}
