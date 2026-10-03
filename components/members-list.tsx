"use client";

import { useEffect, useState } from "react";
import { Search, Users, Download, ListChecks, Trash2, X, AlertTriangle } from "lucide-react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MemberCard } from "./member-card";
import { useApp } from "@/lib/translations";
import { downloadMembersCsv } from "@/lib/export-csv";
import { phoneMatches } from "@/lib/phone";
import type { Member } from "@/app/page";

interface MembersListProps {
  members: Member[];
  sentIds: Set<string>;
  retentionHours: number;
  onDeleteRequest: (member: Member) => void;
  onWhatsAppClick: (phone: string) => void;
  /** Bulk delete the given member ids. Resolves when the delete has been applied. */
  onBulkDelete: (ids: string[]) => Promise<void>;
}

export function MembersList({
  members,
  sentIds,
  retentionHours,
  onDeleteRequest,
  onWhatsAppClick,
  onBulkDelete,
}: MembersListProps) {
  const { t } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk-delete select mode.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reception leaves this open all day, so re-render every minute: the "Added"
  // labels roll over at Riyadh midnight and "leaving soon" lights up on time.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Staff otherwise never learn members auto-delete. Whole days (min 1); for a
  // sub-day window (the 7-hour option) say hours so it isn't shown as "1 day".
  const autoDeleteNotice =
    retentionHours < 24
      ? t.autoDeleteNoticeHours.replace("{n}", String(Math.max(1, Math.round(retentionHours))))
      : t.autoDeleteNotice.replace("{n}", String(Math.max(1, Math.round(retentionHours / 24))));

  const query = searchQuery.trim();
  const nameQuery = query.toLowerCase();
  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(nameQuery) || phoneMatches(member.phone, query)
  );

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // "Select all" acts on the currently SHOWN (filtered) members only, never a
  // hidden global set.
  const allShownSelected = filteredMembers.length > 0 && filteredMembers.every((m) => selected.has(m.id));
  const toggleAllShown = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShownSelected) filteredMembers.forEach((m) => next.delete(m.id));
      else filteredMembers.forEach((m) => next.add(m.id));
      return next;
    });
  };

  // Only ids that are BOTH selected and currently shown — a destructive action
  // must never reach rows hidden by the search filter.
  const selectedIds = filteredMembers.filter((m) => selected.has(m.id)).map((m) => m.id);
  const selectedN = selectedIds.length;

  const runBulkDelete = async () => {
    setConfirmBulk(false);
    setDeleting(true);
    try {
      await onBulkDelete(selectedIds);
      exitSelect();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6 transition-colors duration-300">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Users className="h-5 w-5 text-primary-accent" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t.members}</h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {selectMode ? (
            <button
              onClick={exitSelect}
              aria-label={t.cancel}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">{t.cancel}</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setSelectMode(true)}
                disabled={members.length === 0}
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-primary-accent disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t.selectBtn}
              >
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">{t.selectBtn}</span>
              </button>
              <button
                onClick={() => downloadMembersCsv(members, t)}
                disabled={members.length === 0}
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-primary-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
                aria-label={`${t.downloadAll} (${members.length})`}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t.downloadAll} ({members.length})
                </span>
              </button>
              <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary-accent">
                {members.length}
              </span>
            </>
          )}
        </div>
      </div>
      <p className="mb-6 text-xs text-muted-foreground">{autoDeleteNotice}</p>

      <div className="relative mb-6">
        <Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.searchLabel}
          className="h-12 w-full rounded-xl border border-border bg-input ps-12 pe-4 text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Selection bar */}
      {selectMode && (
        <div className="mb-3 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            <span className="font-semibold text-primary-accent">{selectedN}</span> {t.selectedCount}
          </span>
          <div className="flex items-center gap-3">
            {filteredMembers.length > 0 && (
              <button onClick={toggleAllShown} className="font-medium text-primary-accent hover:underline">
                {allShownSelected ? t.clearSelection : t.selectAllShown}
              </button>
            )}
            <button
              onClick={() => setConfirmBulk(true)}
              disabled={selectedN === 0 || deleting}
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 font-semibold text-destructive-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              {t.delete} ({selectedN})
            </button>
          </div>
        </div>
      )}

      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {members.length === 0 ? t.noMembers : t.noResults}
          </p>
          <p className="mt-2 max-w-xs text-xs text-muted-foreground">{autoDeleteNotice}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              sent={sentIds.has(member.id)}
              retentionHours={retentionHours}
              onDelete={() => onDeleteRequest(member)}
              onWhatsAppClick={() => onWhatsAppClick(member.phone)}
              selectable={selectMode}
              selected={selected.has(member.id)}
              onToggleSelect={() => toggleSelect(member.id)}
            />
          ))}
        </div>
      )}

      {/* Bulk-delete confirm (count shown so a mass delete is never a surprise) */}
      <AlertDialog open={confirmBulk} onOpenChange={(open) => !open && setConfirmBulk(false)}>
        <AlertDialogContent
          aria-modal="true"
          overlayClassName="bg-background/80 backdrop-blur-sm"
          className="gap-0 rounded-2xl border-border bg-card p-6 shadow-2xl sm:max-w-sm"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="mb-2 text-foreground">{t.bulkDeleteTitle}</AlertDialogTitle>
          <AlertDialogDescription className="mb-6">
            {t.bulkDeleteBody.replace("{n}", String(selectedN))}
          </AlertDialogDescription>
          <div className="flex gap-3">
            <AlertDialogPrimitive.Cancel className="flex-1 rounded-xl bg-secondary px-4 py-3 font-medium text-secondary-foreground transition-all duration-200 hover:bg-muted">
              {t.cancel}
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={runBulkDelete}
              className="flex-1 rounded-xl bg-destructive px-4 py-3 font-medium text-destructive-foreground transition-all duration-200 hover:brightness-110"
            >
              {t.delete}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
