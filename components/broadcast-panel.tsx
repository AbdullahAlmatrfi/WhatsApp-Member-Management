"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Send,
  Upload,
  Info,
  Check,
  MessageSquare,
  Users,
  Paperclip,
  RotateCcw,
} from "lucide-react";
import { useApp, type WAPreference } from "@/lib/translations";
import { formatExpiry } from "@/lib/membership";
import type { Member } from "@/app/page";

interface BroadcastPanelProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  waPreference: WAPreference;
}

type Filter = "notSent" | "sent";
type Media = { url: string; type: "image" | "video"; name: string };

const SENT_KEY = "promo_sent_ids";

function loadSent(): Set<string> {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistSent(ids: Set<string>) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function prettyPhone(p: string) {
  return `+${p.slice(0, 3)} ${p.slice(3, 5)} ${p.slice(5, 8)} ${p.slice(8)}`;
}

export function BroadcastPanel({ isOpen, onClose, members, waPreference }: BroadcastPanelProps) {
  const { t } = useApp();
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<Media | null>(null);
  const [filter, setFilter] = useState<Filter>("notSent");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [broadcasting, setBroadcasting] = useState(false);
  const [queue, setQueue] = useState<Member[]>([]);
  const [qi, setQi] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load the "already sent" set and reset transient state each time the panel opens.
  useEffect(() => {
    if (isOpen) {
      setSentIds(loadSent());
      setBroadcasting(false);
      setQi(0);
      setSentCount(0);
    }
  }, [isOpen]);

  // Clean up object URLs.
  useEffect(() => {
    return () => {
      if (media?.url) URL.revokeObjectURL(media.url);
    };
  }, [media]);

  if (!isOpen) return null;

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

  const markSent = (id: string) => {
    setSentIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistSent(next);
      return next;
    });
  };

  const resetSent = () => {
    const empty = new Set<string>();
    setSentIds(empty);
    persistSent(empty);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (media?.url) URL.revokeObjectURL(media.url);
    setMedia({
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video") ? "video" : "image",
      name: f.name,
    });
  };

  const removeMedia = () => {
    if (media?.url) URL.revokeObjectURL(media.url);
    setMedia(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const personalMsg = (m: Member) => message.replace(/\{name\}/g, m.name.split(" ")[0]);

  const startBroadcast = () => {
    const q = members.filter((m) => selected.has(m.id));
    if (q.length === 0) return;
    setQueue(q);
    setQi(0);
    setSentCount(0);
    setBroadcasting(true);
  };

  const openChat = (m: Member) => {
    const text = encodeURIComponent(personalMsg(m));
    const url =
      waPreference === "web"
        ? `https://web.whatsapp.com/send?phone=${m.phone}&text=${text}`
        : `whatsapp://send?phone=${m.phone}&text=${text}`;
    window.open(url, "_blank");
    markSent(m.id);
    setSentCount((c) => c + 1);
    setQi((i) => i + 1);
  };

  const skip = () => setQi((i) => i + 1);

  const finishAndClose = () => {
    setBroadcasting(false);
    setSelected(new Set());
    onClose();
  };

  const selectedN = selected.size;
  const current = queue[qi];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border/50 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
          <Send className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">{t.broadcast}</h2>
          <p className="text-xs text-muted-foreground">{t.broadcastSub}</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
          aria-label={t.done}
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
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
              rows={5}
              className="w-full resize-y rounded-xl border border-border bg-input p-3 text-sm text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {message.length} {t.characters} · {t.nameHint}
            </p>

            <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={onPickFile} />
            {!media ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-4 flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-border p-4 text-muted-foreground transition-all duration-200 hover:border-primary hover:text-primary"
              >
                <Upload className="h-5 w-5" />
                <span className="text-sm font-medium">{t.attachMedia}</span>
                <span className="text-xs">{t.attachHint}</span>
              </button>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                {media.type === "video" ? (
                  <video src={media.url} className="max-h-48 w-full object-cover" muted playsInline />
                ) : (
                  <img src={media.url} alt="" className="max-h-48 w-full object-cover" />
                )}
                <div className="flex items-center gap-2 p-2">
                  <span className="flex-1 truncate text-xs text-muted-foreground">{media.name}</span>
                  <button
                    type="button"
                    onClick={removeMedia}
                    className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                  >
                    {t.removeMedia}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t.guidedNote}</span>
            </div>
          </section>

          {/* Recipients */}
          <section className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
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
                  onClick={resetSent}
                  title={t.resetSent}
                  className="ms-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.resetSent}</span>
                </button>
              )}
            </div>

            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                <span className="font-semibold text-primary">{selectedN}</span> {t.selectedCount}
              </span>
              <button onClick={toggleAllShown} className="font-medium text-primary hover:underline">
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
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                        {initials(m.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{m.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {prettyPhone(m.phone)}
                          {m.expiry ? ` · ${formatExpiry(m.expiry)}` : ""}
                        </span>
                      </span>
                      {isSent && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
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
            <Send className="h-5 w-5" />
            {selectedN === 0 ? t.selectToStart : `${t.broadcastTo} ${selectedN}`}
          </button>
        </div>
      </div>

      {/* Broadcast step-through */}
      {broadcasting && current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(qi / queue.length) * 100}%` }}
              />
            </div>
            <p className="mb-4 text-center text-xs text-muted-foreground">
              {t.memberProgress} {qi + 1} {t.of} {queue.length}
            </p>

            <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {initials(current.name)}
              </span>
              <div>
                <p className="font-semibold text-foreground">{current.name}</p>
                <p className="text-xs text-muted-foreground">{prettyPhone(current.phone)}</p>
              </div>
            </div>

            {media && (
              <div className="mb-2 overflow-hidden rounded-xl border border-border">
                {media.type === "video" ? (
                  <video src={media.url} className="max-h-36 w-full object-cover" muted playsInline />
                ) : (
                  <img src={media.url} alt="" className="max-h-36 w-full object-cover" />
                )}
              </div>
            )}

            <div className="mb-4 whitespace-pre-wrap rounded-xl rounded-tl-sm border border-border bg-secondary/40 p-3 text-sm text-foreground">
              {personalMsg(current)}
              {media && (
                <span className="mt-2 block text-[11px] text-muted-foreground">
                  <Paperclip className="me-1 inline h-3 w-3" />
                  {media.type === "video" ? t.video : t.photo} {t.willAttachManually}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={skip}
                className="flex-1 rounded-xl border border-border bg-secondary/50 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                {t.skip}
              </button>
              <button
                onClick={() => openChat(current)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                <Send className="h-4 w-4" />
                {t.openAndSend}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Done */}
      {broadcasting && !current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-foreground">{t.broadcastDone}</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              {sentCount} {t.of} {queue.length} {t.chatsOpened}
            </p>
            <button
              onClick={finishAndClose}
              className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              {t.done}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
