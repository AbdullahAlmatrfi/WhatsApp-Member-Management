import { createClient } from "@supabase/supabase-js";

// Single browser Supabase client for the whole app.
// The URL + anon key are safe to expose to the front-end (that's what
// the "anon public" key is for). Real protection comes from Row Level
// Security (see supabase/schema.sql) — a logged-out user can read nothing.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Helpful message during setup if the env vars are missing.
  console.warn(
    "[GymConnect] Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (and in Vercel)."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");

export type MemberRow = {
  id: string;
  name: string;
  phone: string;
  sent: boolean;
  created_at: string;
};
