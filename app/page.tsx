"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings2, Send, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { AddMemberForm } from "@/components/add-member-form";
import { MembersList } from "@/components/members-list";
import { StatsRow } from "@/components/stats-row";
import { Toast, type ToastVariant } from "@/components/toast";
import { DeleteDialog } from "@/components/delete-dialog";
import { SettingsPanel } from "@/components/settings-panel";
import { BroadcastPanel } from "@/components/broadcast-panel";
import { LoginScreen } from "@/components/login-screen";
import { PendingGate } from "@/components/pending-gate";
import { useApp } from "@/lib/translations";
import { useAuth } from "@/lib/auth";
import {
  fetchMembers,
  fetchAutoDeleteHours,
  fetchGymName,
  fetchMyDisplayName,
  getDbErrorCode,
  insertMember,
  deleteMemberById,
  deleteMembersByIds,
  setMemberSent,
  resetAllSent,
  isApprovedRole,
} from "@/lib/members-api";
import { toStoredPhone } from "@/lib/phone";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const DEFAULT_RETENTION_HOURS = 72;

export interface Member {
  id: string;
  name: string;
  phone: string;
  sent: boolean;
  /** ISO timestamp (UTC) the member was added — drives the "Added" tag + auto-delete. */
  createdAt: string;
}

/** Session flag: an admin explicitly switched to the staff view, so `/` should
 * NOT bounce them back to the control panel. Read synchronously on first render
 * so a chosen staff view never flashes a redirect. Cleared on sign-out. */
const STAFF_VIEW_KEY = "gc_staff_view";

export default function Home() {
  const { t, lang, waPreference } = useApp();
  const { session, loading: authLoading, role, roleResolved, roleError, refreshRole, signOut } = useAuth();
  const router = useRouter();

  // Admins land on the control panel by default; this is true only when they've
  // chosen the staff view this session.
  const [staffView] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(STAFF_VIEW_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  // The auto-delete window drives the "leaving soon" tag; default until it loads.
  const [retentionHours, setRetentionHours] = useState(DEFAULT_RETENTION_HOURS);

  // Identity: the gym's name (header title) and this user's friendly name (greeting).
  const [gymName, setGymName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const [toastVariant, setToastVariant] = useState<ToastVariant>("success");

  const userId = session?.user.id;
  // Tracks the signed-in user so a late DB response / rollback from a previous
  // session can never write into the next user's list.
  const userIdRef = useRef<string | undefined>(undefined);

  // A background refresh must never clobber an in-flight optimistic write, and
  // it pauses while the broadcast panel is open. These refs are read inside the
  // stable `refreshMembers` callback (which can't see state directly).
  const writesInFlight = useRef(0);
  // Bumped at the START and END of every write. A refetch captures it before
  // fetching and discards its result if it changed — this catches a write that
  // both started AND finished while the fetch was in flight (which would
  // otherwise leave writesInFlight back at 0 and let stale rows win).
  const writeEpoch = useRef(0);
  const refreshing = useRef(false); // single-flight: no overlapping refetches
  const panelOpenRef = useRef(false);
  useEffect(() => {
    panelOpenRef.current = showBroadcast;
  }, [showBroadcast]);

  // Make the control panel the admin's landing page. Only redirect once the role
  // is actually known as admin, and not when they've chosen the staff view.
  useEffect(() => {
    if (role === "admin" && !staffView) {
      router.replace("/admin");
    }
  }, [role, staffView, router]);

  // Load the gym name + this user's friendly name once approved (cosmetic — a
  // failure just falls back to the generic title and a nameless greeting).
  useEffect(() => {
    if (!userId || !isApprovedRole(role)) return;
    let active = true;
    fetchGymName()
      .then((g) => active && setGymName(g))
      .catch(() => {});
    fetchMyDisplayName(userId)
      .then((n) => active && setDisplayName(n))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, role]);
  // Latest member count + role refresher, read inside the stable refreshMembers.
  const membersCountRef = useRef(0);
  membersCountRef.current = members.length;
  const refreshRoleRef = useRef(refreshRole);
  refreshRoleRef.current = refreshRole;

  // Single hide-timer: a newer toast must get its full 3s, so the previous
  // timer is cleared before a new one starts (and on unmount).
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const toast = (msg: string, variant: ToastVariant = "success") => {
    setToastMessage(msg);
    setToastVariant(variant);
    setShowToast(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 3000);
  };

  // Load members when the signed-in user changes (keyed on the user id, not the
  // session object, so token refresh / tab focus doesn't refetch). Also wipes
  // member data and overlay state on sign-out so the next user never sees it.
  // Load the member list. On failure it sets loadError (a mounted Retry card)
  // instead of leaving the empty "No members yet" state, which looks like the
  // roster was wiped. Stable identity so it's reusable from the Retry button.
  const loadMembers = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    setLoadingMembers(true);
    setLoadError(false);
    try {
      const rows = await fetchMembers();
      if (userIdRef.current !== uid) return;
      setMembers(rows);
    } catch {
      if (userIdRef.current !== uid) return;
      setLoadError(true);
    } finally {
      if (userIdRef.current === uid) setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    userIdRef.current = userId;
    setMembers([]);
    setLoadError(false);
    setDeleteTarget(null);
    setShowSettings(false);
    setShowBroadcast(false);
    if (!userId) {
      setLoadingMembers(true);
      return;
    }
    // Don't load member data (or read settings) until the account is approved —
    // a pending/revoked user sees the gate, and these requests would just fail.
    // When the role flips to approved, this effect re-runs and loads for real.
    if (!isApprovedRole(role)) return;
    setRetentionHours(DEFAULT_RETENTION_HOURS);
    loadMembers();
    // Read the retention window for the "leaving soon" tag; keep the default on error.
    let active = true;
    fetchAutoDeleteHours()
      .then((h) => {
        if (active && h > 0) setRetentionHours(h);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, role, loadMembers]);

  // Background refresh so two staff on different devices don't drift apart.
  // Guards: never while a write is in flight (would clobber the optimistic
  // update), never while the broadcast panel is open, and not while the tab is
  // hidden (saves egress on the free tier). Failures are silent — the current
  // list just stays put.
  const refreshMembers = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || writesInFlight.current > 0 || panelOpenRef.current || refreshing.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    const epoch = writeEpoch.current;
    refreshing.current = true;
    try {
      const rows = await fetchMembers();
      // Drop the result if the user switched, a write is in flight, or any write
      // started/finished while we were fetching (epoch changed).
      if (userIdRef.current !== uid || writesInFlight.current > 0 || writeEpoch.current !== epoch) {
        return;
      }
      // An empty result while we had members is ambiguous: access revoked, or
      // the gym genuinely emptied. Re-check the role: if still approved it's a
      // real empty list (accept it); if not, the gate takes over; if the probe
      // errored, keep the current list rather than wiping it on a blip.
      if (rows.length === 0 && membersCountRef.current > 0) {
        const r = await refreshRoleRef.current();
        // Re-check after the probe round-trip: a write may have started/finished
        // (e.g. an add) meanwhile — don't wipe its row.
        if (userIdRef.current !== uid || writesInFlight.current > 0 || writeEpoch.current !== epoch) {
          return;
        }
        if (isApprovedRole(r)) setMembers([]);
        return;
      }
      setMembers(rows);
      setLoadError(false); // a good refresh clears a stale "couldn't load" card
    } catch {
      // Silent: a failed background refresh keeps what's on screen.
    } finally {
      refreshing.current = false;
    }
  }, []);

  // Refresh on return-to-tab and every 90s (both self-guarded above).
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshRole(); // catch access revoked while the tab was away → routes to gate
        refreshMembers();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(refreshMembers, 90_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [userId, refreshMembers, refreshRole]);

  // "Sent" is a column on each member now (single source of truth).
  const sentIds = new Set(members.filter((m) => m.sent).map((m) => m.id));

  const markSent = async (id: string) => {
    const uid = userIdRef.current;
    const previous = members.find((m) => m.id === id);
    if (!previous) return;
    const previousSent = previous.sent;
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, sent: true } : m)));
    writesInFlight.current++;
    writeEpoch.current++;
    try {
      const applied = await setMemberSent(id, true);
      if (userIdRef.current !== uid) return;
      if (!applied) {
        // The write didn't land (member already gone, or access revoked). Never
        // leave someone shown as "Messaged" who wasn't — roll the flag back, and
        // re-check the role so a revoked user is routed to the gate.
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, sent: previousSent } : m)));
        toast(t.saveFailed, "error"); // don't leave staff wondering why the tick reverted
        refreshRole();
      }
    } catch {
      if (userIdRef.current !== uid) return;
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, sent: previousSent } : m)));
      toast(t.saveFailed, "error");
    } finally {
      writesInFlight.current--;
      writeEpoch.current++;
    }
  };

  const resetSent = async () => {
    const uid = userIdRef.current;
    const hadSent = sentIds.size;
    // Non-optimistic: wait for the server, THEN clear. A 0-row result while
    // members were marked sent means the update was RLS-blocked (revoked
    // access) — don't show a false "reset"; re-check the role (→ gate).
    writesInFlight.current++;
    writeEpoch.current++;
    try {
      const cleared = await resetAllSent();
      if (userIdRef.current !== uid) return;
      if (cleared === 0 && hadSent > 0) {
        // Nothing cleared though some were sent: either a colleague already
        // reset (still approved → safe to clear locally) or access was revoked
        // (→ gate). Probe the role to decide.
        const r = await refreshRole();
        if (userIdRef.current !== uid) return;
        if (isApprovedRole(r)) setMembers((prev) => prev.map((m) => ({ ...m, sent: false })));
        return;
      }
      setMembers((prev) => prev.map((m) => ({ ...m, sent: false })));
    } catch {
      if (userIdRef.current !== uid) return;
      toast(t.saveFailed, "error");
    } finally {
      writesInFlight.current--;
      writeEpoch.current++;
    }
  };

  // Resolves true only when the row was really inserted.
  const handleAddMember = async (name: string, phone: string): Promise<boolean> => {
    const uid = userIdRef.current;
    // Form guarantees `phone` is exactly 9 digits starting with 5 (FR-12).
    const fullPhone = toStoredPhone(phone);
    if (members.some((m) => m.phone === fullPhone)) {
      toast(t.numberExists, "error");
      return false;
    }
    writesInFlight.current++;
    writeEpoch.current++;
    try {
      const created = await insertMember(name, fullPhone);
      if (userIdRef.current !== uid) return false;
      setMembers((prev) => [created, ...prev]);
      toast(t.memberAdded);
      return true;
    } catch (err) {
      if (userIdRef.current !== uid) return false;
      const code = getDbErrorCode(err);
      if (code === "23505") toast(t.numberExists, "error");
      else if (code === "23514") toast(t.phoneInvalid, "error");
      else if (code === "42501") {
        // RLS blocked the insert — access was revoked. Route to the gate.
        toast(t.saveFailed, "error");
        refreshRole();
      } else toast(t.saveFailed, "error");
      return false;
    } finally {
      writesInFlight.current--;
      writeEpoch.current++;
    }
  };

  const handleDeleteRequest = (member: Member) => setDeleteTarget(member);
  const handleCancelDelete = () => setDeleteTarget(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const uid = userIdRef.current;
    const target = deleteTarget;
    const originalIndex = members.findIndex((m) => m.id === target.id);
    setDeleteTarget(null);
    setMembers((prev) => prev.filter((m) => m.id !== target.id));
    writesInFlight.current++;
    writeEpoch.current++;
    try {
      const removed = await deleteMemberById(target.id);
      if (userIdRef.current !== uid) return;
      if (removed === 0) {
        // 0 rows: either already gone (benign) or RLS-blocked (revoked). Probe
        // the role — only confirm "deleted" if still approved; else the gate shows.
        const r = await refreshRole();
        if (userIdRef.current !== uid) return;
        if (isApprovedRole(r)) toast(t.memberDeleted);
      } else {
        toast(t.memberDeleted);
      }
    } catch {
      if (userIdRef.current !== uid) return;
      setMembers((prev) => {
        if (prev.some((m) => m.id === target.id)) return prev;
        const next = [...prev];
        next.splice(originalIndex < 0 ? 0 : Math.min(originalIndex, next.length), 0, target);
        return next;
      });
      toast(t.saveFailed, "error");
    } finally {
      writesInFlight.current--;
      writeEpoch.current++;
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    const uid = userIdRef.current;
    const idSet = new Set(ids);
    const removedMembers = members.filter((m) => idSet.has(m.id));
    if (removedMembers.length === 0) return;
    setMembers((prev) => prev.filter((m) => !idSet.has(m.id)));
    writesInFlight.current++;
    writeEpoch.current++;
    let reconcile = false; // a partial delete needs an immediate refetch
    try {
      const removed = await deleteMembersByIds(ids);
      if (userIdRef.current !== uid) return;
      if (removed === 0) {
        // Nothing deleted while rows were expected → already gone, or RLS-blocked
        // (revoked). Probe the role; only confirm if still approved.
        const r = await refreshRole();
        if (userIdRef.current !== uid) return;
        if (isApprovedRole(r)) toast(t.bulkDeletedToast.replace("{n}", String(removedMembers.length)));
      } else {
        // If fewer rows came back than we optimistically removed, some still
        // exist in the DB — reconcile the list now instead of waiting for the
        // background refresh, so nothing shows as deleted that isn't.
        if (removed !== removedMembers.length) reconcile = true;
        toast(t.bulkDeletedToast.replace("{n}", String(removed)));
      }
    } catch {
      if (userIdRef.current !== uid) return;
      // Restore the ones that aren't already back (order is approximate — a
      // refetch will reconcile exact positions).
      setMembers((prev) => {
        const have = new Set(prev.map((m) => m.id));
        const restore = removedMembers.filter((m) => !have.has(m.id));
        return [...restore, ...prev];
      });
      toast(t.saveFailed, "error");
    } finally {
      writesInFlight.current--;
      writeEpoch.current++;
      if (reconcile) refreshMembers();
    }
  };

  const handleWhatsAppClick = (phone: string) => {
    if (waPreference === "web") {
      // Named target reuses one WhatsApp Web tab across sends (matches Broadcast).
      // Null window.opener (can't use "noopener" — it breaks tab reuse).
      const win = window.open(`https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}`, "gymconnect-whatsapp");
      if (win) {
        try {
          win.opener = null;
        } catch {
          /* cross-origin handle may refuse — target is trusted WhatsApp Web */
        }
      }
    } else {
      window.location.href = `whatsapp://send?phone=${encodeURIComponent(phone)}`;
    }
  };

  // ---- gates ----
  // Misconfigured deploy (missing DB keys): a friendly message, never a blank
  // white page or an infinite spinner.
  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-border/50 bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-foreground">{t.configTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.configBody}</p>
        </div>
      </main>
    );
  }
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }
  if (!session) return <LoginScreen />;
  // Role not yet known for this session → hold a spinner, never flash the gate.
  if (!roleResolved && !roleError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }
  // Couldn't verify the role (network/timeout) and we don't already know the
  // user is approved — a blip, NOT a rejection. Offer a retry (not the gate, not
  // a kick-out of an approved session mid-work).
  if (roleError && !isApprovedRole(role)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card p-8 text-center shadow-lg">
          <p className="text-sm text-muted-foreground">{t.loadFailed}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshRole()}
              className="flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110"
            >
              {t.retry}
            </button>
            <button
              onClick={() => signOut()}
              className="flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {t.signOut}
            </button>
          </div>
        </div>
      </main>
    );
  }
  // Signed in but not approved (pending / no profile / revoked) → friendly gate.
  if (!isApprovedRole(role)) return <PendingGate />;

  // Admin who hasn't chosen the staff view → hold a spinner while the effect
  // above redirects to the control panel (their landing page).
  if (role === "admin" && !staffView) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  // Time-of-day greeting (device-local; Arabic has no separate afternoon form,
  // so greetAfternoon already maps to مساء الخير).
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.greetMorning : hour < 18 ? t.greetAfternoon : t.greetEvening;

  return (
    <main className="min-h-screen bg-background p-4 transition-colors duration-300 md:p-8">
      <div className="mx-auto max-w-2xl lg:max-w-6xl">
        <header className="relative flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/logo.png" alt="GymConnect Logo" width={40} height={40} className="shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                {gymName || t.title}
              </h1>
              <p className="truncate text-sm text-muted-foreground" dir="auto">
                {displayName
                  ? `${greeting}${lang === "ar" ? "،" : ","} ${displayName}`
                  : greeting}
                <span className="text-muted-foreground/70">
                  {" · "}
                  {role === "admin" ? t.roleAdmin : t.roleStaffCue}
                </span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => {
                // Pull a fresh list just before broadcasting so you don't
                // message a stale set (runs before the panel opens).
                refreshMembers();
                setShowBroadcast(true);
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0"
              aria-label={t.broadcast}
            >
              <Send className="h-5 w-5" />
              <span className="hidden sm:inline">{t.broadcast}</span>
            </button>
            {role === "admin" && (
              <Link
                href="/admin"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:text-primary"
                aria-label={t.adminTitle}
                title={t.adminTitle}
              >
                <ShieldCheck className="h-6 w-6" />
              </Link>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:text-primary"
              aria-label={t.settings}
            >
              <Settings2 className="h-6 w-6" />
            </button>
            <button
              onClick={() => signOut()}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:text-destructive"
              aria-label={t.signOut}
              title={t.signOut}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 duration-500 animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none lg:mt-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
          {/* Sidebar: add a member, then the live counts. Sticky on desktop so
              it stays reachable while the list scrolls. */}
          <div className="space-y-6 lg:sticky lg:top-8">
            <AddMemberForm onAddMember={handleAddMember} />
            {members.length > 0 && (
              <StatsRow
                total={members.length}
                messaged={members.filter((m) => sentIds.has(m.id)).length}
              />
            )}
          </div>

          <div>
            {loadingMembers ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card p-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t.loadingMembers}
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/50 bg-card p-12 text-center">
                <p className="text-sm text-muted-foreground">{t.loadFailed}</p>
                <button
                  onClick={() => loadMembers()}
                  className="flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110"
                >
                  {t.retry}
                </button>
              </div>
            ) : (
              <MembersList
                members={members}
                sentIds={sentIds}
                retentionHours={retentionHours}
                onDeleteRequest={handleDeleteRequest}
                onWhatsAppClick={handleWhatsAppClick}
                onBulkDelete={handleBulkDelete}
              />
            )}
          </div>
        </div>
      </div>

      <Toast show={showToast} message={toastMessage} variant={toastVariant} />
      <DeleteDialog
        isOpen={deleteTarget !== null}
        memberName={deleteTarget?.name || ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <BroadcastPanel
        isOpen={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        members={members}
        waPreference={waPreference}
        sentIds={sentIds}
        onMarkSent={markSent}
        onResetSent={resetSent}
      />
    </main>
  );
}
