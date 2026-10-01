"use client";

import { Trash2, Clock } from "lucide-react";
import type { Member } from "@/app/page";
import { useApp } from "@/lib/translations";
import { addedTag } from "@/lib/format";

interface MemberCardProps {
  member: Member;
  sent: boolean;
  retentionHours: number;
  onDelete: () => void;
  onWhatsAppClick: () => void;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function MemberCard({ member, sent, retentionHours, onDelete, onWhatsAppClick }: MemberCardProps) {
  const { t } = useApp();
  const tag = addedTag(member.createdAt, retentionHours, t);
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedPhone = `+${member.phone.slice(0, 3)} ${member.phone.slice(3, 5)} ${member.phone.slice(5, 8)} ${member.phone.slice(8)}`;

  return (
    <div className="group relative flex items-center gap-4 rounded-2xl border border-border/50 bg-secondary/50 p-4 transition-all duration-200 hover:border-primary/30 hover:bg-secondary hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{member.name}</p>
        <p className="text-sm text-muted-foreground">{formattedPhone}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
              sent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {sent ? t.sent : t.notSent}
          </span>
          {tag && (
            <span className="inline-block whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {tag.text}
            </span>
          )}
          {tag?.leavingSoon && (
            // Neutral chip + clock icon, not red: "leaving soon" is a countdown,
            // not an error, and DESIGN.md keeps the destructive color for
            // delete/errors only. The icon carries the urgency instead.
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {t.leavingSoon}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onWhatsAppClick}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all duration-200 hover:brightness-110 hover:scale-105 active:scale-95"
          aria-label={t.messageOnWhatsApp.replace("{name}", () => member.name)}
        >
          <WhatsAppIcon className="h-5 w-5" />
        </button>

        <button
          onClick={onDelete}
          // Always visible on touch (no-hover) devices; on hover-capable pointers it
          // is revealed on card hover OR when anything in the card has keyboard focus.
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive opacity-100 transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground hover:scale-105 active:scale-95 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-0"
          aria-label={t.deleteMemberLabel.replace("{name}", () => member.name)}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
