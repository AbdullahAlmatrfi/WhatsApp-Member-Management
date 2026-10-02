import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Server-only route that creates / deletes / resets STAFF logins.
//
// Why a server route: creating an auth user needs Supabase's ADMIN API, which
// needs the service_role key. That key bypasses ALL Row Level Security — it is
// effectively the database superuser — so it must NEVER reach the browser. It
// lives only in the server env var SUPABASE_SERVICE_ROLE_KEY (set in Netlify),
// is read only here, and is never sent to the client.
//
// Every call is double-checked: we verify the caller's JWT and that the caller
// is actually an admin BEFORE doing anything, so a staff or signed-out user
// (or a direct curl) gets 401/403 and nothing happens.

export const runtime = "nodejs"; // needs Node + the secret env var, not the edge
export const dynamic = "force-dynamic"; // never statically cached

type Action = "create" | "delete" | "reset_password" | "set_name";
type Body = { action?: Action; email?: string; password?: string; userId?: string; name?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt hard limit; anything longer is silently truncated
const MAX_NAME = 40;

/** Clean a display name: trim, collapse spaces, cap length. Empty → null. */
function cleanName(raw: string | undefined): string | null {
  const n = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  return n.length ? n : null;
}

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** The admin (service_role) client, or null when the server isn't configured. */
function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  const admin = serviceClient();
  if (!admin) {
    // The service_role key hasn't been added to the server env yet.
    return bad(500, "server_not_configured");
  }

  // ---- who is calling? (JWT from the browser session) ----
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) return bad(401, "unauthorized");

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const caller = userData?.user;
  if (userErr || !caller) return bad(401, "unauthorized");

  // ---- is the caller an admin? (service_role read bypasses RLS) ----
  const { data: callerProfile, error: callerErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();
  if (callerErr || callerProfile?.role !== "admin") return bad(403, "forbidden");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad(400, "bad_request");
  }
  const action = body.action;

  // ---------------------------------------------------------------- create ----
  if (action === "create") {
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!EMAIL_RE.test(email)) return bad(400, "invalid_email");
    if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
      return bad(400, "invalid_password");
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // admin-created: no confirmation email, usable at once
    });
    if (createErr || !created?.user) {
      // Most common real failure: the email already exists.
      const msg = (createErr?.message ?? "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return bad(409, "email_exists");
      }
      return bad(400, "create_failed");
    }

    // The signup trigger defaults new rows to 'pending'; promote to 'staff' now.
    // service_role bypasses RLS, so this always lands. If it somehow fails the
    // account stays 'pending' (no access) — fails closed, never open.
    const { error: roleErr } = await admin
      .from("profiles")
      .update({ role: "staff", email, display_name: cleanName(body.name) })
      .eq("id", created.user.id);
    if (roleErr) {
      // Roll back the half-made account so there's no stuck 'pending' login.
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      return bad(500, "create_failed");
    }

    return NextResponse.json({ id: created.user.id, email });
  }

  // ---------------------------------------------------------------- delete ----
  if (action === "delete") {
    const userId = (body.userId ?? "").trim();
    if (!userId) return bad(400, "bad_request");
    if (userId === caller.id) return bad(400, "cannot_delete_self");

    const { data: target } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    // Never delete another admin via this route (protects the last admin).
    if (target?.role === "admin") return bad(403, "cannot_delete_admin");

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return bad(400, "delete_failed");
    return NextResponse.json({ ok: true });
  }

  // -------------------------------------------------------- reset_password ----
  if (action === "reset_password") {
    const userId = (body.userId ?? "").trim();
    const password = body.password ?? "";
    if (!userId) return bad(400, "bad_request");
    if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
      return bad(400, "invalid_password");
    }
    // Don't let one admin reset another admin's password (only yourself).
    if (userId !== caller.id) {
      const { data: target } = await admin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (target?.role === "admin") return bad(403, "forbidden");
    }

    const { error: resetErr } = await admin.auth.admin.updateUserById(userId, {
      password,
    });
    if (resetErr) return bad(400, "reset_failed");
    return NextResponse.json({ ok: true });
  }

  // ---------------------------------------------------------------- set_name --
  if (action === "set_name") {
    const userId = (body.userId ?? "").trim();
    if (!userId) return bad(400, "bad_request");
    const { error: nameErr } = await admin
      .from("profiles")
      .update({ display_name: cleanName(body.name) })
      .eq("id", userId);
    if (nameErr) return bad(400, "save_failed");
    return NextResponse.json({ ok: true });
  }

  return bad(400, "unknown_action");
}
