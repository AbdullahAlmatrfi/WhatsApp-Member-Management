"use client";

import { useState } from "react";
import { Loader2, LogIn, ArrowLeft } from "lucide-react";
import { useApp } from "@/lib/translations";
import { useAuth } from "@/lib/auth";

interface LoginScreenProps {
  /** Optional: go back to the landing page. */
  onBack?: () => void;
}

export function LoginScreen({ onBack }: LoginScreenProps) {
  const { t } = useApp();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError("");
    const result = await signIn(email.trim(), password);
    if (!result.ok) {
      // Tell the truth: wrong credentials vs. couldn't connect. Typed email +
      // password are left untouched so nothing has to be re-entered.
      setError(result.reason === "credentials" ? t.loginFailed : t.loginConnError);
      setBusy(false);
    }
    // On success, the auth listener swaps the screen automatically.
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-8 shadow-lg duration-500 animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t.back}
          </button>
        )}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t.loginTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.loginSub}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-input px-4 text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-input px-4 text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t.signingIn}
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                {t.signIn}
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
