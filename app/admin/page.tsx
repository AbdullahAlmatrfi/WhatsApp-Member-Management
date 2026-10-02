"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, Users, Settings2, Check, UserMinus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/translations";
import { useAuth } from "@/lib/auth";
import { Toast, type ToastVariant } from "@/components/toast";
import {
  fetchAllAccounts,
  fetchAutoDeleteHours,
  setUserRole,
  updateAutoDeleteHours,
  isApprovedRole,
  getDbErrorCode,
  type Account,
} from "@/lib/members-api";

const WINDOWS = [7, 24, 48, 72] as const;

export default function AdminPage() {
  const { t } = useApp();
  const { session, loading: authLoading, role, roleResolved, roleError, refreshRole, signOut, user } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ acc: Account; next: "staff" | "pending" } | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState<ToastVariant>("success");
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = (msg: string, v: ToastVariant = "success") => {
    setToastMsg(msg);
    setToastVariant(v);
    setShowToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 3000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, h] = await Promise.all([fetchAllAccounts(), fetchAutoDeleteHours().catch(() => null)]);
      setAccounts(accs);
      if (h) setHours(h);
    } catch {
      toast(t.loadFailed, "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (role === "admin") load();
  }, [role, load]);

  const applyRole = async () => {
    if (!confirm) return;
    const { acc, next } = confirm;
    setConfirm(null);
    try {
      const ok = await setUserRole(acc.id, next);
      if (!ok) {
        toast(t.saveFailed, "error");
        return;
      }
      setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, role: next } : a)));
      toast(next === "staff" ? t.approved : t.revoked);
    } catch (e) {
      // DB guards (last admin / self-demotion) raise with errcode P0001 —
      // match on the code, not the message wording.
      toast(getDbErrorCode(e) === "P0001" ? t.adminGuard : t.saveFailed, "error");
    }
  };

  const changeWindow = async (h: number) => {
    const prev = hours;
    setHours(h); // optimistic
    try {
      const ok = await updateAutoDeleteHours(h);
      if (!ok) throw new Error("no row");
      toast(t.settingSaved);
    } catch {
      setHours(prev);
      toast(t.saveFailed, "error");
    }
  };

  // ---- gates ----
  // Still resolving the role (and no error yet) → hold a spinner. The `!roleError`
  // guard is what stops a role-probe network blip from spinning forever.
  if (authLoading || (session && !roleResolved && !roleError)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }
  // Role probe failed (network/timeout) and we don't already know they're an
  // admin → a blip, not a rejection. Offer retry / sign-out, same as the main app.
  if (roleError && role !== "admin") {
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
  // Not an admin → bounce to the normal app (route-level guard; RLS is the real wall).
  if (!session || !isApprovedRole(role) || role !== "admin") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">{t.adminOnly}</p>
        <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {t.backToApp}
        </Link>
      </main>
    );
  }

  const windowLabel = (h: number) =>
    h === 7 ? t.win7 : h === 24 ? t.win24 : h === 48 ? t.win48 : t.win72;
  const roleBadge = (r: string) =>
    r === "admin"
      ? "bg-primary/15 text-primary"
      : r === "staff"
        ? "bg-muted text-foreground"
        : "bg-muted text-muted-foreground";
  const roleLabel = (r: string) => (r === "admin" ? t.roleAdmin : r === "staff" ? t.roleStaff : t.rolePending);

  return (
    <main className="min-h-screen bg-background p-4 transition-colors duration-300 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-foreground md:text-2xl">{t.adminTitle}</h1>
              <p className="truncate text-sm text-muted-foreground">{t.adminSub}</p>
            </div>
          </div>
          <Link
            href="/"
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t.backToApp}</span>
          </Link>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card p-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t.loadingApp}
          </div>
        ) : (
          <>
            {/* Settings — auto-delete window */}
            <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-lg sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Settings2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{t.autoDeleteTitle}</h2>
                  <p className="text-xs text-muted-foreground">{t.autoDeleteDesc}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {WINDOWS.map((h) => (
                  <button
                    key={h}
                    onClick={() => changeWindow(h)}
                    aria-pressed={hours === h}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      hours === h
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-secondary/50 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {windowLabel(h)}
                  </button>
                ))}
              </div>
            </section>

            {/* User management */}
            <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-lg sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{t.userManagement}</h2>
                  <p className="text-xs text-muted-foreground">{t.userManagementSub}</p>
                </div>
              </div>

              {accounts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t.noAccounts}</p>
              ) : (
                <div className="space-y-2">
                  {accounts.map((a) => {
                    const isSelf = a.id === user?.id;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/40 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground" dir="ltr">
                            {a.email || a.id.slice(0, 8)}
                            {isSelf && <span className="ms-2 text-xs text-muted-foreground">({t.you})</span>}
                          </p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadge(a.role)}`}
                          >
                            {roleLabel(a.role)}
                          </span>
                        </div>
                        {a.role === "pending" && (
                          <button
                            onClick={() => setConfirm({ acc: a, next: "staff" })}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
                          >
                            <Check className="h-4 w-4" />
                            {t.approve}
                          </button>
                        )}
                        {a.role === "staff" && (
                          <button
                            onClick={() => setConfirm({ acc: a, next: "pending" })}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                          >
                            <UserMinus className="h-4 w-4" />
                            {t.revoke}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Approve / revoke confirm */}
      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent
          aria-modal="true"
          showCloseButton={false}
          className="gap-0 rounded-2xl border-border bg-card p-6 text-center sm:max-w-sm"
        >
          <DialogTitle className="mb-1 leading-7 text-foreground">
            {confirm?.next === "staff" ? t.approveTitle : t.revokeTitle}
          </DialogTitle>
          <DialogDescription className="mb-5">
            {confirm?.next === "staff" ? t.approveBody : t.revokeBody}
          </DialogDescription>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirm(null)}
              autoFocus
              className="flex-1 rounded-xl border border-border bg-secondary/50 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              {t.cancel}
            </button>
            <button
              onClick={applyRole}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              {confirm?.next === "staff" ? t.approve : t.revoke}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Toast show={showToast} message={toastMsg} variant={toastVariant} />
    </main>
  );
}
