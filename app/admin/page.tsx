"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Users,
  Settings2,
  Check,
  Trash2,
  KeyRound,
  UserPlus,
  Copy,
  X,
  MessageCircle,
  Building2,
  Pencil,
  Clock,
  LogOut,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/translations";
import { useAuth } from "@/lib/auth";
import { Toast, type ToastVariant } from "@/components/toast";
import { SettingsPanel } from "@/components/settings-panel";
import {
  fetchAllAccounts,
  fetchAutoDeleteHours,
  fetchGymName,
  fetchMemberStats,
  updateGymName,
  setUserRole,
  updateAutoDeleteHours,
  isApprovedRole,
  getDbErrorCode,
  type Account,
  type MemberStats,
} from "@/lib/members-api";
import {
  createStaffAccount,
  deleteStaffAccount,
  resetStaffPassword,
  setStaffName,
  generatePassword,
} from "@/lib/admin-users";

const WINDOWS = [7, 24, 48, 72] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ActionKind = "approve" | "delete" | "reset";
type Credentials = { email: string; password: string; title: string };

export default function AdminPage() {
  const { t, lang } = useApp();
  const { session, loading: authLoading, role, roleResolved, roleError, refreshRole, signOut, user } = useAuth();
  const router = useRouter();

  // Switch to the staff view and remember it for this session, so the main app
  // doesn't immediately redirect the admin back here.
  const goStaffView = () => {
    try {
      sessionStorage.setItem("gc_staff_view", "1");
    } catch {}
    router.push("/");
  };

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState<number | null>(null);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Gym name
  const [gymName, setGymName] = useState("");
  const [savingGym, setSavingGym] = useState(false);

  // Add-staff form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit-name dialog
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Confirm dialog (approve / delete / reset) + the credentials hand-off card.
  const [action, setAction] = useState<{ acc: Account; kind: ActionKind } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cred, setCred] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState(false);

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

  // Map a server error code to a friendly, localized message.
  const errText = (code: string) =>
    code === "email_exists"
      ? t.errEmailExists
      : code === "invalid_email"
        ? t.errInvalidEmail
        : code === "invalid_password"
          ? t.errInvalidPassword
          : code === "server_not_configured"
            ? t.errServerConfig
            : code === "forbidden" || code === "unauthorized"
              ? t.errForbidden
              : t.saveFailed;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, h, g, s] = await Promise.all([
        fetchAllAccounts(),
        fetchAutoDeleteHours().catch(() => null),
        fetchGymName().catch(() => null),
        fetchMemberStats().catch(() => null),
      ]);
      setAccounts(accs);
      if (h) setHours(h);
      setGymName(g ?? "");
      setStats(s);
    } catch {
      toast(t.loadFailed, "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveGymName = async () => {
    setSavingGym(true);
    try {
      const ok = await updateGymName(gymName);
      if (!ok) throw new Error("no row");
      toast(t.settingSaved);
    } catch {
      toast(t.saveFailed, "error");
    } finally {
      setSavingGym(false);
    }
  };

  const saveEditName = async () => {
    if (!editTarget) return;
    setSavingName(true);
    const res = await setStaffName(editTarget.id, editValue);
    setSavingName(false);
    if (!res.ok) {
      toast(errText(res.error), "error");
      return;
    }
    const clean = editValue.replace(/\s+/g, " ").trim().slice(0, 40) || null;
    setAccounts((prev) => prev.map((a) => (a.id === editTarget.id ? { ...a, displayName: clean } : a)));
    setEditTarget(null);
    toast(t.settingSaved);
  };

  useEffect(() => {
    if (role === "admin") load();
  }, [role, load]);

  // ---- create a new staff login ----
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    const pwd = newPassword;
    if (!EMAIL_RE.test(email)) {
      toast(t.errInvalidEmail, "error");
      return;
    }
    if (pwd.length < 8) {
      toast(t.errInvalidPassword, "error");
      return;
    }
    setCreating(true);
    const res = await createStaffAccount(email, pwd, newName);
    setCreating(false);
    if (!res.ok) {
      toast(errText(res.error), "error");
      return;
    }
    setNewEmail("");
    setNewPassword("");
    setNewName("");
    setCred({ email, password: pwd, title: t.credCreatedTitle });
    toast(t.staffCreatedToast);
    load();
  };

  // ---- approve / delete / reset (from the confirm dialog) ----
  const runAction = async () => {
    if (!action) return;
    const { acc, kind } = action;
    setBusy(true);
    try {
      if (kind === "approve") {
        const ok = await setUserRole(acc.id, "staff");
        if (!ok) toast(t.saveFailed, "error");
        else {
          setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, role: "staff" } : a)));
          toast(t.approved);
        }
      } else if (kind === "delete") {
        const res = await deleteStaffAccount(acc.id);
        if (!res.ok) toast(errText(res.error), "error");
        else {
          setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
          toast(t.staffDeletedToast);
        }
      } else {
        const pwd = generatePassword();
        const res = await resetStaffPassword(acc.id, pwd);
        if (!res.ok) toast(errText(res.error), "error");
        else {
          setCred({ email: acc.email || "", password: pwd, title: t.credResetTitle });
          toast(t.passwordResetToast);
        }
      }
    } catch (e) {
      toast(getDbErrorCode(e) === "P0001" ? t.adminGuard : t.saveFailed, "error");
    } finally {
      setBusy(false);
      setAction(null);
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

  // ---- credentials hand-off helpers ----
  const credText = cred ? `${t.credEmailLabel}: ${cred.email}\n${t.credPasswordLabel}: ${cred.password}` : "";
  const copyCred = async () => {
    try {
      await navigator.clipboard.writeText(credText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(t.saveFailed, "error");
    }
  };
  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(credText)}`, "_blank", "noopener,noreferrer");
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

  const dialogTitle =
    action?.kind === "approve" ? t.approveTitle : action?.kind === "delete" ? t.deleteStaffTitle : t.resetTitle;
  const dialogBody =
    action?.kind === "approve" ? t.approveBody : action?.kind === "delete" ? t.deleteStaffBody : t.resetBody;
  const dialogConfirm =
    action?.kind === "approve" ? t.approve : action?.kind === "delete" ? t.deleteAccount : t.resetPwd;

  // Header identity + overview figures.
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.greetMorning : hour < 18 ? t.greetAfternoon : t.greetEvening;
  const myName = accounts.find((a) => a.id === user?.id)?.displayName;
  const staffCount = accounts.filter((a) => a.role === "staff").length;
  const pendingCount = accounts.filter((a) => a.role === "pending").length;
  const msgPct = stats && stats.total > 0 ? Math.floor((stats.messaged / stats.total) * 100) : 0;

  const kpis: { label: string; value: number; accent?: boolean; progress?: number }[] = [
    { label: t.statTotal, value: stats?.total ?? 0 },
    { label: t.statMessaged, value: stats?.messaged ?? 0, accent: true, progress: msgPct },
    { label: t.kpiStaff, value: staffCount },
    { label: t.kpiPending, value: pendingCount, accent: pendingCount > 0 },
  ];

  return (
    <main className="min-h-dvh bg-background p-4 transition-colors duration-300 md:p-8">
      <div className="mx-auto max-w-2xl lg:max-w-6xl">
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/logo.png" alt="" width={40} height={40} className="shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                {gymName || t.title}
              </h1>
              <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground" dir="auto">
                <span className="truncate">{myName ? `${greeting}${lang === "ar" ? "،" : ","} ${myName}` : greeting}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground/80">
                  · <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  {t.roleAdmin}
                </span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={goStaffView}
              className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              <span className="hidden sm:inline">{t.staffView}</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              aria-label={t.settings}
            >
              <Settings2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => signOut()}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              aria-label={t.signOut}
              title={t.signOut}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card p-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t.loadingApp}
          </div>
        ) : (
          <div className="mt-6 space-y-6 duration-500 animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none lg:mt-8">
            {/* Overview — a live KPI snapshot */}
            <section aria-label={t.analyticsTitle} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                {kpis.map((k) => (
                  <div key={k.label}>
                    <div className={`text-2xl font-bold tabular-nums leading-none ${k.accent ? "text-primary" : "text-foreground"}`}>
                      {k.value}
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">{k.label}</div>
                    {k.progress !== undefined && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
                          style={{ width: `${k.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {t.analyticsNote}
                {stats && stats.privateCount > 0 && ` · ${stats.privateCount} ${t.kpiPrivate}`}
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
              {/* Sidebar: add staff, then settings */}
              <div className="space-y-6">
            {/* Add staff */}
            <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-lg sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{t.addStaffTitle}</h2>
                  <p className="text-xs text-muted-foreground">{t.addStaffSub}</p>
                </div>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.addName}</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t.addNamePlaceholder}
                    autoComplete="off"
                    maxLength={40}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.addEmail}</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t.addEmailPlaceholder}
                    autoComplete="off"
                    dir="ltr"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t.addPassword}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="off"
                      dir="ltr"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPassword(generatePassword())}
                      className="shrink-0 rounded-lg border border-border bg-secondary/50 px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {t.generateBtn}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.creatingAccount}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      {t.createAccount}
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Gym name */}
            <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-lg sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{t.gymNameTitle}</h2>
                  <p className="text-xs text-muted-foreground">{t.gymNameDesc}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder={t.gymNamePlaceholder}
                  maxLength={40}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                />
                <button
                  onClick={saveGymName}
                  disabled={savingGym}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
                >
                  {savingGym && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t.saveBtn}
                </button>
              </div>
            </section>

            {/* Auto-delete window */}
            <section className="rounded-2xl border border-border/50 bg-card p-4 shadow-lg sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Clock className="h-4 w-4" />
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
              </div>

              {/* Main: staff accounts */}
              <div>
            {/* Staff accounts list */}
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
                          <p className="truncate text-sm font-semibold text-foreground">
                            {a.displayName || <span dir="ltr">{a.email || a.id.slice(0, 8)}</span>}
                            {isSelf && <span className="ms-2 text-xs text-muted-foreground">({t.you})</span>}
                          </p>
                          {a.displayName && a.email && (
                            <p className="truncate text-xs text-muted-foreground" dir="ltr">
                              {a.email}
                            </p>
                          )}
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadge(a.role)}`}
                          >
                            {roleLabel(a.role)}
                          </span>
                        </div>

                        {/* Edit name is available for every account (incl. self). */}
                        <button
                          onClick={() => {
                            setEditTarget(a);
                            setEditValue(a.displayName ?? "");
                          }}
                          title={t.editName}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* The admin can't delete/reset their own row here. */}
                        {!isSelf && a.role !== "admin" && (
                          <div className="flex shrink-0 items-center gap-1.5">
                            {a.role === "pending" && (
                              <button
                                onClick={() => setAction({ acc: a, kind: "approve" })}
                                title={t.approve}
                                className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
                              >
                                <Check className="h-4 w-4" />
                                <span className="hidden sm:inline">{t.approve}</span>
                              </button>
                            )}
                            {a.role === "staff" && (
                              <button
                                onClick={() => setAction({ acc: a, kind: "reset" })}
                                title={t.resetPwd}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                              >
                                <KeyRound className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setAction({ acc: a, kind: "delete" })}
                              title={t.deleteAccount}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approve / delete / reset confirm */}
      <Dialog open={action !== null} onOpenChange={(o) => !o && !busy && setAction(null)}>
        <DialogContent
          aria-modal="true"
          showCloseButton={false}
          className="gap-0 rounded-2xl border-border bg-card p-6 text-center sm:max-w-sm"
        >
          <DialogTitle className="mb-1 leading-7 text-foreground">{dialogTitle}</DialogTitle>
          <DialogDescription className="mb-5">{dialogBody}</DialogDescription>
          <div className="flex gap-2">
            <button
              onClick={() => setAction(null)}
              disabled={busy}
              autoFocus
              className="flex-1 rounded-xl border border-border bg-secondary/50 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {t.cancel}
            </button>
            <button
              onClick={runAction}
              disabled={busy}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-60 ${
                action?.kind === "delete"
                  ? "bg-destructive text-destructive-foreground hover:brightness-110"
                  : "bg-primary text-primary-foreground hover:brightness-110"
              }`}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {dialogConfirm}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials hand-off card (after create / reset) */}
      <Dialog open={cred !== null} onOpenChange={(o) => !o && setCred(null)}>
        <DialogContent
          aria-modal="true"
          showCloseButton={false}
          className="gap-0 rounded-2xl border-border bg-card p-6 sm:max-w-sm"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <DialogTitle className="leading-7 text-foreground">{cred?.title}</DialogTitle>
            <button
              onClick={() => setCred(null)}
              aria-label={t.doneBtn}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <DialogDescription className="mb-4">{t.credBody}</DialogDescription>

          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <p className="text-[11px] font-medium text-muted-foreground">{t.credEmailLabel}</p>
              <p className="mt-0.5 truncate font-mono text-sm text-foreground" dir="ltr">
                {cred?.email}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <p className="text-[11px] font-medium text-muted-foreground">{t.credPasswordLabel}</p>
              <p className="mt-0.5 truncate font-mono text-sm text-foreground" dir="ltr">
                {cred?.password}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={copyCred}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              {copied ? t.copiedBtn : t.copyBtn}
            </button>
            <button
              onClick={shareWhatsApp}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              <MessageCircle className="h-4 w-4" />
              {t.shareWhatsapp}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit staff name */}
      <Dialog open={editTarget !== null} onOpenChange={(o) => !o && !savingName && setEditTarget(null)}>
        <DialogContent
          aria-modal="true"
          showCloseButton={false}
          className="gap-0 rounded-2xl border-border bg-card p-6 sm:max-w-sm"
        >
          <DialogTitle className="mb-1 leading-7 text-foreground">{t.editNameTitle}</DialogTitle>
          <DialogDescription className="mb-4 truncate" dir="ltr">
            {editTarget?.email}
          </DialogDescription>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={t.addNamePlaceholder}
            maxLength={40}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && !savingName && saveEditName()}
            className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setEditTarget(null)}
              disabled={savingName}
              className="flex-1 rounded-xl border border-border bg-secondary/50 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {t.cancel}
            </button>
            <button
              onClick={saveEditName}
              disabled={savingName}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.saveBtn}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <Toast show={showToast} message={toastMsg} variant={toastVariant} />
    </main>
  );
}
