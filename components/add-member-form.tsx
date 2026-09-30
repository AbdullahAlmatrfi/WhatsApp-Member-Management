"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useApp } from "@/lib/translations";

interface AddMemberFormProps {
  /** Resolves true only when the member was actually saved. */
  onAddMember: (name: string, phone: string) => Promise<boolean>;
}

// Saudi mobile, national format: 9 digits starting with 5 (the app prepends 966).
const PHONE_PATTERN = /^5\d{8}$/;

// Arabic-Indic (U+0660–0669) and Persian (U+06F0–06F9) digits -> ASCII, then keep digits only.
function sanitizePhone(value: string): string {
  return value
    .replace(/[٠-٩۰-۹]/g, (d) => {
      const code = d.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    })
    .replace(/\D/g, "")
    .slice(0, 9);
}

export function AddMemberForm({ onAddMember }: AddMemberFormProps) {
  const { t } = useApp();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (isAdding || !phone || !trimmedName) return;
    if (!PHONE_PATTERN.test(phone)) {
      setPhoneError(true);
      return;
    }

    setIsAdding(true);
    try {
      const saved = await onAddMember(trimmedName, phone);
      // Keep what the user typed unless the save was confirmed.
      if (saved) {
        setPhone("");
        setName("");
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-6 shadow-lg backdrop-blur-xl transition-colors duration-300">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
          <Plus className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t.addMember}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4">
              <span className="text-muted-foreground">+966</span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(sanitizePhone(e.target.value));
                setPhoneError(false);
              }}
              placeholder={t.phonePlaceholder}
              aria-invalid={phoneError}
              aria-describedby={phoneError ? "phone-error" : undefined}
              className="h-12 w-full rounded-xl border border-border bg-input ps-16 pe-4 text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 aria-invalid:border-destructive"
            />
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            maxLength={100}
            className="h-12 w-full rounded-xl border border-border bg-input px-4 text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {phoneError && (
          <p id="phone-error" role="alert" className="text-sm text-destructive">
            {t.phoneInvalid}
          </p>
        )}

        <button
          type="submit"
          disabled={isAdding || !phone.trim() || !name.trim()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isAdding ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {t.adding}
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              {t.addButton}
            </>
          )}
        </button>
      </form>
    </section>
  );
}
