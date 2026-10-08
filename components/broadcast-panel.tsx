"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Info, Check, MessageSquare, Users, RotateCcw, ChevronLeft, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp, type WAPreference } from "@/lib/translations";
import { useReturnFocus } from "@/hooks/use-return-focus";
import type { Member } from "@/app/page";

interface BroadcastPanelProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  waPreference: WAPreference;
  sentIds: Set<string>;
  onMarkSent: (id: string) => void;
  /** May be async: the confirm button shows a busy state until it settles. */
  onResetSent: () => void | Promise<void>;
}

type Filter = "notSent" | "sent";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Arabic compound first names ("عبد الله", "أبو بكر") are two words; keep both.
const NAME_PREFIX = /^(عبد|أبو|ابو|أم|ام|ابن|بن|آل)$/;
const firstName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  const [a, b] = parts;
  return b && NAME_PREFIX.test(a) ? `${a} ${b}` : a ?? "";
};

function prettyPhone(p: string) {
  return `+${p.slice(0, 3)} ${p.slice(3, 5)} ${p.slice(5, 8)} ${p.slice(8)}`;
}

export function BroadcastPanel({
  isOpen,
  onClose,
  members,
  waPreference,
  sentIds,
  onMarkSent,
  onResetSent,
}: BroadcastPanelProps) {
  const { t } = useApp();
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<Filter>("notSent");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [broadcasting, setBroadcasting] = useState(false);
  const [queue, setQueue] = useState<Member[]>([]);
  const [qi, setQi] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  // True when the browser refused to open WhatsApp (pop-up blocked) so the
  // "Open & send" button isn't silently dead.
  const [blocked, setBlocked] = useState(false);
  // In-flight flag for "Reset": the server round-trip can take a moment, so the
  // button is disabled meanwhile (no double-submit, no silent nothing).
  const [resetting, setResetting] = useState(false);
  const runReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await onResetSent();
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };
  // Time-based cooldown so a double-click / Enter-hold on "Open & send" (or Skip)
  // can't rip through several members unseen. Keying off `qi` wouldn't work: qi
  // advances synchronously, so the repeat event already sees the next step.
  const lastAdvanceAt = useRef(0);
  const ADVANCE_COOLDOWN_MS = 500;
  const canAdvance = () => {
    const now = Date.now();
    if (now - lastAdvanceAt.current < ADVANCE_COOLDOWN_MS) return false;
    lastAdvanceAt.current = now;
    return true;
  };
  const returnFocus = useReturnFocus(isOpen);
  const returnFocusStep = useReturnFocus(broadcasting);
  const returnFocusReset = useReturnFocus(confirmReset);
  // The nested dialog's focus trap defeats `autoFocus` on the primary button, so
  // steer opening focus to "Open & send" ourselves (keyboard Enter on Start must
  // not land on Skip and silently skip the first member).
  const sendRef = useRef<HTMLButtonElement>(null);

  // Reset transient state each time the panel opens.
  useEffect(() => {
    if (isOpen) {
      setBroadcasting(false);
      setQi(0);
      setSentCount(0);
      setConfirmReset(false);
      setBlocked(false);
      lastAdvanceAt.current = 0;
    }
  }, [isOpen]);

  const notSentCount = members.filter((m) => !sentIds.has(m.id)).length;
  const sentCountTotal = members.filter((m) => sentIds.has(m.id)).length;

  const shown = members.filter((m) => (filter === "sent" ? sentIds.has(m.id) : !sentIds.has(m.id)));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allShownSelected = shown.length > 0 && shown.every((m) => selected.has(m.id));
  const toggleAllShown = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShownSelected) shown.forEach((m) => next.delete(m.id));
      else shown.forEach((m) => next.add(m.id));
      return next;
    });
  };

  const personalMsg = (m: Member) => message.replace(/\{name\}/g, () => firstName(m.name));

  const startBroadcast = () => {
    const q = members.filter((m) => selected.has(m.id));
    if (q.length === 0) return;
    setBlocked(false);
    setQueue(q);
    setQi(0);
    setSentCount(0);
    lastAdvanceAt.current = 0;
    setBroadcasting(true);
  };

  const openChat = (m: Member) => {
    setBlocked(false);
    if (!canAdvance()) return; // ignore double-click / key auto-repeat
    const text = encodeURIComponent(personalMsg(m));
    if (waPreference === "web") {
      // One reused tab (named target) instead of a new tab per member — a 50-person
      // broadcast must not spawn 50 WhatsApp Web tabs.
      const win = window.open(`https://web.whatsapp.com/send?phone=${encodeURIComponent(m.phone)}&text=${text}`, "gymconnect-whatsapp");
      if (!win) {
        // Popup blocked: don't mark them messaged or advance — tell staff why
        // and let them retry.
        lastAdvanceAt.current = 0;
        setBlocked(true);
        return;
      }
      // Sever window.opener: a named tab can't use "noopener" (that forces a new
      // tab and breaks reuse), so null it by hand to stop reverse-tabnabbing.
      try {
        win.opener = null;
      } catch {
        /* cross-origin handle may refuse — the target is trusted WhatsApp Web */
      }
    } else {
      // Desktop scheme may legitimately return null, so we don't gate on it.
      window.open(`whatsapp://send?phone=${encodeURIComponent(m.phone)}&text=${text}`, "_blank", "noopener,noreferrer");
    }
    onMarkSent(m.id);
    // Drop them from the selection so an aborted-then-restarted run never
    // re-messages someone already contacted.
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(m.id);
      return next;
    });
    setSentCount((c) => c + 1);
    setQi((i) => i + 1);
  };

  const finishAndClose = () => {
    setBroadcasting(false);
    setSelected(new Set());
    onClose();
  };

  // Only ids that still exist (a deleted member can linger in `selected`).
  const selectedN = members.filter((m) => selected.has(m.id)).length;
  const current = queue[qi];

  return (
    // Radix Dialog gives role=dialog, a linked title/description, Escape-to-close,
    // a focus trap and focus-return; we set aria-modal explicitly. It keeps the
    // full-screen look. Component state (message, filter, selection) lives here,
    // outside the dialog content, so it survives close/reopen exactly as before.
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        aria-modal="true"
        showCloseButton={false}
        onCloseAutoFocus={returnFocus}
        className="inset-0 z-50 flex h-full w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 shadow-none sm:max-w-none"
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border/50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary-accent">
            <Send className="h-5 w-5 rtl:-scale-x-100" />
          </div>
          <div className="flex-1">
            <DialogTitle className="leading-7 text-foreground">{t.broadcast}</DialogTitle>
            <DialogDescription className="text-xs">{t.broadcastSub}</DialogDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
            aria-label={t.close}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-3xl gap-4 p-4 md:grid-cols-2">
            {/* Compose */}
            <section className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary-accent">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t.compose}</h3>
                  <p className="text-xs text-muted-foreground">{t.composeSub}</p>
                </div>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.messagePlaceholder}
                aria-label={t.compose}
                rows={5}
                className="w-full resize-y rounded-xl border border-border bg-input p-3 text-sm text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {message.length} {t.characters} · {t.nameHint}
              </p>

              {/* Media is a planned future feature — text only for now. */}
              <div className="mt-4 flex gap-2 rounded-xl bg-primary/10 p-3 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-accent" />
                <span>{t.mediaComingSoon}</span>
              </div>
            </section>

            {/* Recipients */}
            <section className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary-accent">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t.recipients}</h3>
                  <p className="text-xs text-muted-foreground">{t.recipientsSub}</p>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                {([
                  ["notSent", t.notSent, notSentCount],
                  ["sent", t.sent, sentCountTotal],
                ] as [Filter, string, number][]).map(([key, label, count]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    aria-pressed={filter === key}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      filter === key
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-secondary/50 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {label}
                    <span
                      className={`rounded-full px-1.5 text-[10px] ${
                        filter === key ? "bg-primary-foreground/25" : "bg-muted"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
                {sentCountTotal > 0 && (
                  <button
                    onClick={() => setConfirmReset(true)}
                    title={t.resetSent}
                    aria-label={t.resetSent}
                    className="ms-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t.resetSent}</span>
                  </button>
                )}
              </div>

              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-primary-accent">{selectedN}</span> {t.selectedCount}
                </span>
                <button onClick={toggleAllShown} className="font-medium text-primary-accent hover:underline">
                  {allShownSelected ? t.clearSelection : t.selectAllShown}
                </button>
              </div>

              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pe-1">
                {shown.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">{t.noResults}</p>
                ) : (
                  shown.map((m) => {
                    const isSel = selected.has(m.id);
                    const isSent = sentIds.has(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggle(m.id)}
                        aria-pressed={isSel}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 text-start transition-all duration-150 ${
                          isSel ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:border-border"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                            isSel ? "border-primary bg-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {isSel && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary-accent">
                          {initials(m.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{m.name}</span>
                          <span className="block truncate text-xs text-muted-foreground"><bdi dir="ltr">{prettyPhone(m.phone)}</bdi></span>
                        </span>
                        {isSent && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary-accent">
                            <Check className="h-3 w-3" />
                            {t.sent}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 p-4">
          <div className="mx-auto max-w-3xl">
            <button
              onClick={startBroadcast}
              disabled={selectedN === 0 || !message.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Send className="h-5 w-5 rtl:-scale-x-100" />
              {selectedN === 0 ? t.selectToStart : t.broadcastToN.replace("{n}", String(selectedN))}
            </button>
          </div>
        </div>

        {/*
          Step-through + summary: one nested modal Dialog (opens while `broadcasting`).
          Escape closes it. On a step that only stops the run (nobody is marked sent by
          closing); on the summary it behaves like "Done". Backdrop clicks do not
          dismiss it, as before, so a stray tap cannot abort a campaign.
        */}
        <Dialog
          open={broadcasting}
          onOpenChange={(open) => {
            if (open) return;
            if (current) setBroadcasting(false);
            else finishAndClose();
          }}
        >
          <DialogContent
            aria-modal="true"
            showCloseButton={false}
            overlayClassName="z-[60] bg-background/80 backdrop-blur-sm"
            onCloseAutoFocus={returnFocusStep}
            onOpenAutoFocus={(e) => {
              // On a step, focus "Open & send"; on the summary, let Done's autoFocus win.
              if (current) {
                e.preventDefault();
                sendRef.current?.focus();
              }
            }}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            className={`z-[60] max-h-[90dvh] gap-0 overflow-y-auto rounded-2xl border-border bg-card p-6 shadow-2xl ${
              current ? "sm:max-w-md" : "text-center sm:max-w-sm"
            }`}
          >
            {current ? (
              <>
                {/* Go back to the compose/recipients screen — message + remaining
                    selection are kept, so staff can edit the text or uncheck people. */}
                <button
                  onClick={() => setBroadcasting(false)}
                  className="mb-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                  {t.backToEdit}
                </button>
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${(qi / queue.length) * 100}%` }}
                  />
                </div>
                <DialogTitle className="mb-4 text-center text-xs font-normal leading-normal text-muted-foreground">
                  {t.memberProgress} {qi + 1} {t.of} {queue.length}
                </DialogTitle>

                <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary-accent">
                    {initials(current.name)}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{current.name}</p>
                    <p className="text-xs text-muted-foreground"><bdi dir="ltr">{prettyPhone(current.phone)}</bdi></p>
                  </div>
                </div>

                <DialogDescription className="mb-4 whitespace-pre-wrap rounded-xl rounded-ss-sm border border-border bg-secondary/40 p-3 text-foreground">
                  {personalMsg(current)}
                </DialogDescription>

                {blocked && (
                  <p role="alert" className="mb-3 text-sm text-destructive-accent">
                    {t.popupBlocked}
                  </p>
                )}
                <p className="mb-3 text-center text-xs text-muted-foreground">{t.sendReminder}</p>
                <button
                  ref={sendRef}
                  onClick={() => openChat(current)}
                  onKeyDown={(e) => {
                    if (e.repeat) e.preventDefault(); // ignore held-Enter auto-repeat
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                >
                  <Send className="h-4 w-4 rtl:-scale-x-100" />
                  {t.openAndSend}
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary-accent">
                  <Check className="h-7 w-7" />
                </div>
                <DialogTitle className="mb-1 leading-7 text-foreground">{t.broadcastDone}</DialogTitle>
                <DialogDescription className="mb-5">
                  {t.broadcastSummary.replace("{sent}", String(sentCount)).replace("{total}", String(queue.length))}
                </DialogDescription>
                <button
                  onClick={finishAndClose}
                  autoFocus
                  className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:brightness-110"
                >
                  {t.done}
                </button>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm before wiping the "sent" marks — it can't be undone. */}
        <Dialog
          open={confirmReset}
          onOpenChange={(open) => {
            if (!open && !resetting) setConfirmReset(false);
          }}
        >
          <DialogContent
            aria-modal="true"
            showCloseButton={false}
            overlayClassName="z-[60] bg-background/80 backdrop-blur-sm"
            onCloseAutoFocus={returnFocusReset}
            className="z-[60] gap-0 rounded-2xl border-border bg-card p-6 text-center shadow-2xl sm:max-w-sm"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary-accent">
              <RotateCcw className="h-7 w-7" />
            </div>
            <DialogTitle className="mb-1 leading-7 text-foreground">{t.resetConfirmTitle}</DialogTitle>
            <DialogDescription className="mb-5">{t.resetConfirmBody}</DialogDescription>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                autoFocus
                className="flex-1 rounded-xl border border-border bg-secondary/50 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                {t.cancel}
              </button>
              <button
                onClick={runReset}
                disabled={resetting}
                aria-busy={resetting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
              >
                {resetting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.resetConfirmYes}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
