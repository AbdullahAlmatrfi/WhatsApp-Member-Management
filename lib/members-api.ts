import { supabase } from "./supabase/client";
import type { Member } from "@/app/page";

// All member reads/writes go through Supabase. Row Level Security means
// only a logged-in user can touch these; a logged-out request returns nothing.

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
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
}

export async function setMemberSent(id: string, sent: boolean): Promise<void> {
  const { error } = await supabase.from("members").update({ sent }).eq("id", id);
  if (error) throw error;
}

export async function resetAllSent(): Promise<void> {
  const { error } = await supabase.from("members").update({ sent: false }).eq("sent", true);
  if (error) throw error;
}
