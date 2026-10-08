"use client";

import Image from "next/image";
import { Check, LogIn, Moon, Sun, Send, UserPlus, Sparkles, Clock } from "lucide-react";
import { useApp } from "@/lib/translations";

interface LandingPageProps {
  /** Switch to the staff login screen. */
  onLogin: () => void;
}

/** A WhatsApp mark, reused from the member card. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function LandingPage({ onLogin }: LandingPageProps) {
  const { t, lang, setLang, theme, setTheme } = useApp();

  const steps = [
    { icon: UserPlus, flip: false, title: t.landingStep1Title, body: t.landingStep1Body },
    { icon: Send, flip: true, title: t.landingStep2Title, body: t.landingStep2Body },
    { icon: Clock, flip: false, title: t.landingStep3Title, body: t.landingStep3Body },
  ];

  return (
    <main className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-6 sm:px-8">
        {/* Top bar */}
        <nav className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image src="/logo.png" alt="" width={32} height={32} className="shrink-0" />
            <span className="truncate text-lg font-bold">{t.title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              aria-label={t.language}
              className="flex h-9 items-center rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span lang={lang === "ar" ? "en" : "ar"}>{lang === "ar" ? "EN" : "ع"}</span>
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={t.appearance}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={onLogin}
              aria-label={t.loginTitle}
              className="ms-1 flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              <LogIn className="h-4 w-4 rtl:-scale-x-100" />
              <span className="hidden sm:inline">{t.loginTitle}</span>
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-2 lg:gap-8 lg:py-16">
          {/* Copy */}
          <div className="duration-700 animate-in fade-in-0 slide-in-from-bottom-3 motion-reduce:animate-none">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <WhatsAppGlyph className="h-3.5 w-3.5 text-primary-accent" />
              {t.subtitle}
            </div>
            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight rtl:tracking-normal sm:text-5xl md:text-6xl">
              {t.landingHeadline}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t.landingSub}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={onLogin}
                className="flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
              >
                <LogIn className="h-5 w-5 rtl:-scale-x-100" />
                {t.loginTitle}
              </button>
            </div>
          </div>

          {/* Animated broadcast mock */}
          <div className="duration-700 animate-in fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none lg:justify-self-end">
            <div className="relative w-full max-w-sm rounded-3xl border border-border/70 bg-card p-5 shadow-2xl">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary-accent">
                  <Send className="h-4 w-4 rtl:-scale-x-100" />
                </span>
                <span className="font-semibold">{t.broadcast}</span>
              </div>

              {/* message bubble */}
              <div className="mb-5 rounded-2xl rounded-ss-md bg-secondary/60 p-3.5 text-sm leading-relaxed">
                {t.landingMockMsg}
              </div>

              {/* send button with a contained pulse (box-shadow, no overflow) */}
              <div className="mb-6">
                <span
                  className="gc-pulse flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground"
                  style={{ animation: "gc-pulse 2.4s ease-out infinite" }}
                >
                  <WhatsAppGlyph className="h-4 w-4" />
                  {t.landingSendTo} 24
                </span>
              </div>

              {/* members receiving, in sequence (fill-mode both → no first-paint flash) */}
              <div className="flex items-center justify-between gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="gc-deliver flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary-accent"
                    style={{ animation: "gc-deliver 3.6s ease-in-out infinite both", animationDelay: `${i * 0.45}s` }}
                  >
                    <Check className="h-5 w-5" />
                  </span>
                ))}
              </div>

              {/* floating "delivered" chip */}
              <div className="absolute -bottom-3 end-5 flex items-center gap-1.5 rounded-full border border-border bg-popover px-3 py-1 text-xs font-medium shadow-lg">
                <Sparkles className="h-3.5 w-3.5 text-primary-accent" />
                24 / 24
              </div>
            </div>
          </div>
        </div>

        {/* How it works — a real 3-step sequence */}
        <div className="border-t border-border/60 py-10">
          <h2 className="mb-6 text-sm font-semibold text-muted-foreground">{t.landingHowTitle}</h2>
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((s, i) => (
              <div key={s.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-accent">
                  <s.icon className={s.flip ? "h-5 w-5 rtl:-scale-x-100" : "h-5 w-5"} />
                </span>
                <div>
                  <h3 className="flex items-baseline gap-2 font-semibold">
                    <span className="text-sm text-primary-accent tabular-nums">{i + 1}</span>
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
          {t.title} — {t.subtitle}
        </footer>
      </div>
    </main>
  );
}
