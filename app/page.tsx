"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Settings2, Send, LogOut, Loader2 } from "lucide-react";
import { AddMemberForm } from "@/components/add-member-form";
import { MembersList } from "@/components/members-list";
import { Toast } from "@/components/toast";
import { DeleteDialog } from "@/components/delete-dialog";
import { SettingsPanel } from "@/components/settings-panel";
import { BroadcastPanel } from "@/components/broadcast-panel";
import { LoginScreen } from "@/components/login-screen";
import { useApp } from "@/lib/translations";
import { useAuth } from "@/lib/auth";
import {
  fetchMembers,
  insertMember,
  deleteMemberById,
  setMemberSent,
  resetAllSent,
} from "@/lib/members-api";

export interface Member {
  id: string;
  name: string;
  phone: string;
  sent: boolean;
}

export default function Home() {
  const { t, waPreference } = useApp();
  const { session, loading: authLoading, signOut } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const toast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Load members from the database once the user is signed in.
  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoadingMembers(true);
    fetchMembers()
      .then((rows) => {
        if (active) setMembers(rows);
      })
      .catch(() => toast(t.loadFailed))
      .finally(() => {
        if (active) setLoadingMembers(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // "Sent" is a column on each member now (single source of truth).
  const sentIds = new Set(members.filter((m) => m.sent).map((m) => m.id));

  const markSent = async (id: string) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, sent: true } : m)));
    try {
      await setMemberSent(id, true);
    } catch {
      toast(t.saveFailed);
    }
  };

  const resetSent = async () => {
    setMembers((prev) => prev.map((m) => ({ ...m, sent: false })));
    try {
      await resetAllSent();
    } catch {
      toast(t.saveFailed);
    }
  };

  const handleAddMember = async (name: string, phone: string) => {
    const fullPhone = phone.startsWith("966") ? phone : `966${phone}`;
    if (members.some((m) => m.phone === fullPhone)) {
      toast(t.numberExists);
      return;
    }
    try {
      const created = await insertMember(name, fullPhone);
      setMembers((prev) => [created, ...prev]);
      toast(t.memberAdded);
    } catch {
      toast(t.saveFailed);
    }
  };

  const handleDeleteRequest = (member: Member) => setDeleteTarget(member);
  const handleCancelDelete = () => setDeleteTarget(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setMembers((prev) => prev.filter((m) => m.id !== target.id));
    try {
      await deleteMemberById(target.id);
      toast(t.memberDeleted);
    } catch {
      toast(t.saveFailed);
    }
  };

  const handleWhatsAppClick = (phone: string) => {
    if (waPreference === "web") {
      window.open(`https://web.whatsapp.com/send?phone=${phone}`, "_blank");
    } else {
      window.location.href = `whatsapp://send?phone=${phone}`;
    }
  };

  // ---- gates ----
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }
  if (!session) return <LoginScreen />;

  return (
    <main className="min-h-screen bg-background p-4 transition-colors duration-300 md:p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="GymConnect Logo" width={40} height={40} className="shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">{t.title}</h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBroadcast(true)}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0"
              aria-label={t.broadcast}
            >
              <Send className="h-5 w-5" />
              <span className="hidden sm:inline">{t.broadcast}</span>
            </button>
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

        <AddMemberForm onAddMember={handleAddMember} />

        {loadingMembers ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card p-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t.loadingMembers}
          </div>
        ) : (
          <MembersList
            members={members}
            sentIds={sentIds}
            onDeleteRequest={handleDeleteRequest}
            onWhatsAppClick={handleWhatsAppClick}
          />
        )}
      </div>

      <Toast show={showToast} message={toastMessage} />
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
