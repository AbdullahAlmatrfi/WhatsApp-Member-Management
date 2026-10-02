import { supabase } from "./supabase/client";

// Browser-side helpers that call the server route (app/api/admin-users) to
// create / delete / reset staff logins. The browser never holds the service_role
// key — it just forwards the signed-in admin's access token, and the server
// re-checks that the caller is really an admin before doing anything.

export type AdminUserResult =
  | { ok: true; id?: string; email?: string }
  | { ok: false; error: string };

type Action = "create" | "delete" | "reset_password" | "set_name";
type Payload = {
  action: Action;
  email?: string;
  password?: string;
  userId?: string;
  name?: string;
};

async function call(payload: Payload): Promise<AdminUserResult> {
  // The access token proves who the caller is to the server route.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "unauthorized" };

  let res: Response;
  try {
    res = await fetch("/api/admin-users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: "network" };
  }

  let json: { error?: string; id?: string; email?: string } = {};
  try {
    json = await res.json();
  } catch {
    // Non-JSON body (e.g. a proxy error page) — treat as a generic failure.
  }
  if (!res.ok) return { ok: false, error: json.error || "request_failed" };
  return { ok: true, id: json.id, email: json.email };
}

/** Create a staff login with an admin-set password and optional display name. */
export function createStaffAccount(email: string, password: string, name?: string) {
  return call({ action: "create", email, password, name });
}

/** Set (or clear) a staff member's friendly display name. */
export function setStaffName(userId: string, name: string) {
  return call({ action: "set_name", userId, name });
}

/** Permanently delete a staff login. */
export function deleteStaffAccount(userId: string) {
  return call({ action: "delete", userId });
}

/** Set a new password for a staff login (the "forgot my password" recovery path). */
export function resetStaffPassword(userId: string, password: string) {
  return call({ action: "reset_password", userId, password });
}

/** A readable, easy-to-type temporary password: no look-alike characters
 * (no 0/O, 1/l/I), 10 chars, mixed case + digits. */
export function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const n = 10;
  let out = "";
  const rand = new Uint32Array(n);
  crypto.getRandomValues(rand);
  for (let i = 0; i < n; i++) out += chars[rand[i] % chars.length];
  return out;
}
