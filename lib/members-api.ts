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
    .select("id,name,phone,sent")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, phone: r.phone, sent: r.sent }));
}

export async function insertMember(name: string, phone: string): Promise<Member> {
  const { data, error } = await supabase
    .from("members")
    .insert({ name, phone, sent: false })
    .select("id,name,phone,sent")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, phone: data.phone, sent: data.sent };
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
