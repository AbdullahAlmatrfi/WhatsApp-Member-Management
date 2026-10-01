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

// Give every request a ceiling so a dead network / paused project can't leave
// an action hanging forever (which would freeze an optimistic update with no
// confirmation). A timed-out request rejects like any other network error.
const REQUEST_TIMEOUT_MS = 15_000;
const fetchWithTimeout: typeof fetch = (input, init = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
};

export const supabase = createClient(url ?? "", anonKey ?? "", {
  global: { fetch: fetchWithTimeout },
});

export type MemberRow = {
  id: string;
  name: string;
  phone: string;
  sent: boolean;
  created_at: string;
};
