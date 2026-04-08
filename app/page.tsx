"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Settings2 } from "lucide-react";
import { AddMemberForm } from "@/components/add-member-form";
import { MembersList } from "@/components/members-list";
import { Toast } from "@/components/toast";
import { DeleteDialog } from "@/components/delete-dialog";
import { SettingsPanel } from "@/components/settings-panel";
import { useMembers } from "@/hooks/use-members";
import { useApp } from "@/lib/translations";
import type { Member } from "@/lib/types";

export default function Home() {
  const { t, waPreference } = useApp();
  const { members, loading, error, addMember, deleteMember } = useMembers();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!error) return;
    setToastMessage(`${t.loadMembersFailed}: ${error}`);
    setShowToast(true);
    const timer = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(timer);
  }, [error, t.loadMembersFailed]);

  const handleAddMember = async (name: string, phone: string) => {
    const result = await addMember(name, phone);

    if (!result.ok) {
      const message = result.duplicate
        ? t.numberExists
        : `${t.addMemberFailed}${result.message ? `: ${result.message}` : ""}`;
      setToastMessage(message);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return false;
    }

    setToastMessage(t.memberAdded);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    return true;
  };

  const handleDeleteRequest = (member: Member) => {
    setDeleteTarget(member);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      const result = await deleteMember(deleteTarget.id);

      if (!result.ok) {
        const message = `${t.deleteMemberFailed}${result.message ? `: ${result.message}` : ""}`;
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }

      setToastMessage(t.memberDeleted);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setDeleteTarget(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleWhatsAppClick = (phone: string) => {
    if (waPreference === "web") {
      window.open(`https://web.whatsapp.com/send?phone=${phone}`, "_blank");
    } else {
      window.location.href = `whatsapp://send?phone=${phone}`;
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 transition-colors duration-300 md:p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="GymConnect Logo"
              width={40}
              height={40}
              className="shrink-0"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                {t.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:text-primary"
            aria-label={t.settings}
          >
            <Settings2 className="h-6 w-6" />
          </button>
        </header>

        <AddMemberForm onAddMember={handleAddMember} />
        <MembersList
          members={members}
          isLoading={loading}
          onDeleteRequest={handleDeleteRequest}
          onWhatsAppClick={handleWhatsAppClick}
        />
      </div>

      <Toast show={showToast} message={toastMessage} />
      <DeleteDialog
        isOpen={deleteTarget !== null}
        memberName={deleteTarget?.name || ""}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </main>
  );
}
