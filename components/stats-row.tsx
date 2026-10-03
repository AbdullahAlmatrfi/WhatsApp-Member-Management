"use client";

import { useApp } from "@/lib/translations";

interface StatsRowProps {
  total: number;
  messaged: number;
}

/** A compact three-figure strip: how many members, how many messaged, how many
 * still to send — plus a slim progress bar. All derived from data already on
 * screen, so it respects the admin-private visibility rule (counts match the
 * list the user can see). Numbers use Western digits + tabular figures so they
 * don't jitter as they change. */
export function StatsRow({ total, messaged }: StatsRowProps) {
  const { t } = useApp();
  const toSend = Math.max(0, total - messaged);
  const pct = total > 0 ? Math.round((messaged / total) * 100) : 0;

  const figures = [
    { label: t.statTotal, value: total, accent: false },
    { label: t.statMessaged, value: messaged, accent: true },
    { label: t.statToSend, value: toSend, accent: false },
  ];

  return (
    <section
      aria-label={t.statTotal}
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
    >
      <div className="flex items-stretch">
        {figures.map((f, i) => (
          <div
            key={f.label}
            className={`flex-1 ${i > 0 ? "border-s border-border/60 ps-4" : ""} ${i < figures.length - 1 ? "pe-4" : ""}`}
          >
            <div
              className={`text-2xl font-bold tabular-nums leading-none ${
                f.accent ? "text-primary" : "text-foreground"
              }`}
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              {f.value}
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">{f.label}</div>
          </div>
        ))}
      </div>

      {/* Broadcast progress — fills from the start edge, so it mirrors in RTL. */}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
