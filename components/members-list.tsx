"use client";

import { useState } from "react";
import { Search, Users } from "lucide-react";
import { MemberCard } from "./member-card";
import { useApp } from "@/lib/translations";
import type { Member } from "@/app/page";

interface MembersListProps {
  members: Member[];
  sentIds: Set<string>;
  onDeleteRequest: (member: Member) => void;
  onWhatsAppClick: (phone: string) => void;
}

export function MembersList({ members, sentIds, onDeleteRequest, onWhatsAppClick }: MembersListProps) {
  const { t } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  const query = searchQuery.trim().toLowerCase();
  const filteredMembers = members.filter(
    (member) => member.name.toLowerCase().includes(query) || member.phone.includes(query)
  );

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-6 shadow-lg backdrop-blur-xl transition-colors duration-300">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t.members}</h2>
        </div>
        <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
          {members.length}
        </span>
      </div>

      <div className="relative mb-6">
        <Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.search}
          className="h-12 w-full rounded-xl border border-border bg-input ps-12 pe-4 text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {members.length === 0 ? t.noMembers : t.noResults}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              sent={sentIds.has(member.id)}
              onDelete={() => onDeleteRequest(member)}
              onWhatsAppClick={() => onWhatsAppClick(member.phone)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
