"use client";

import { Clock, LogOut, RefreshCw } from "lucide-react";
import { useApp } from "@/lib/translations";
import { useAuth } from "@/lib/auth";

/**
 * Shown to a signed-in user whose role is not yet approved (pending / no
 * profile), and to a user whose access was revoked mid-session. Never a broken
 * empty app — a friendly "waiting for approval" screen with a way out.
 */
export function PendingGate() {
  const { t } = useApp();
  const { signOut, refreshRole } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Clock className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t.pendingTitle}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t.pendingBody}</p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => refreshRole()}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110"
          >
            <RefreshCw className="h-4 w-4" />
            {t.checkAgain}
          </button>
          <button
            onClick={() => signOut()}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t.signOut}
          </button>
        </div>
      </div>
    </main>
  );
}
