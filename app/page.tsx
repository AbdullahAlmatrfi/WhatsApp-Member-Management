"use client";

import { useState } from "react";
import Image from "next/image";
import { Settings2, Send } from "lucide-react";
import { AddMemberForm } from "@/components/add-member-form";
import { MembersList } from "@/components/members-list";
import { Toast } from "@/components/toast";
import { DeleteDialog } from "@/components/delete-dialog";
import { SettingsPanel } from "@/components/settings-panel";
import { BroadcastPanel } from "@/components/broadcast-panel";
import { useApp } from "@/lib/translations";

export interface Member {
  id: string;
  name: string;
  phone: string;
  /** ISO date "yyyy-mm-dd" of when the membership expires. Optional. */
  expiry?: string;
}

const initialMembers: Member[] = [
  { id: "1", name: "Mohammed Al-Rashid", phone: "966501234567", expiry: "2026-09-16" },
  { id: "2", name: "Abdullah Al-Saud", phone: "966559876543", expiry: "2026-10-02" },
  { id: "3", name: "Khalid Al-Fahad", phone: "966541112233", expiry: "2026-11-20" },
];

export default function Home() {
  const { t, waPreference } = useApp();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const handleAddMember = (name: string, phone: string, expiry?: string) => {
    const fullPhone = phone.startsWith("966") ? phone : `966${phone}`;
    const exists = members.some((m) => m.phone === fullPhone);

    if (exists) {
      setToastMessage(t.numberExists);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    const newMember: Member = {
      id: Date.now().toString(),
      name,
      phone: fullPhone,
      expiry: expiry || undefined,
    };
    setMembers((prev) => [newMember, ...prev]);
    setToastMessage(t.memberAdded);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDeleteRequest = (member: Member) => {
    setDeleteTarget(member);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
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
          </div>
        </header>

        <AddMemberForm onAddMember={handleAddMember} />
        <MembersList
          members={members}
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
      <BroadcastPanel
        isOpen={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        members={members}
        waPreference={waPreference}
      />
    </main>
  );
}
