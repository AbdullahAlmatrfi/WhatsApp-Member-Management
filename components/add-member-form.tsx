"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useApp } from "@/lib/translations";
import { sanitizePhoneInput, isValidSaudiMobile } from "@/lib/phone";
import { cleanName, isValidName } from "@/lib/name";

interface AddMemberFormProps {
  /** Resolves true only when the member was actually saved. */
  onAddMember: (name: string, phone: string) => Promise<boolean>;
}

export function AddMemberForm({ onAddMember }: AddMemberFormProps) {
  const { t } = useApp();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  // Set on blur / failed submit so the error doesn't nag on the first keystroke.
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneValid = isValidSaudiMobile(phone);
  // Show the inline error once the field was left, or immediately when the first
  // digit can't start a Saudi mobile (anything but 5). The submit button stays
  // disabled while invalid, so this is the only place staff learn why.
  const phoneError = phone.length > 0 && !phoneValid && (phoneTouched || phone[0] !== "5");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // A tiny label like "1" is fine; only a blank / invisible name is rejected.
    const finalName = cleanName(name);
    if (isAdding || !phone || !finalName) return;
    if (!phoneValid) {
      setPhoneTouched(true);
      return;
    }

    setIsAdding(true);
    try {
      const saved = await onAddMember(finalName, phone);
      // Keep what the user typed unless the save was confirmed.
      if (saved) {
        setPhone("");
        setName("");
        setPhoneTouched(false);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6 transition-colors duration-300">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
          <Plus className="h-5 w-5 text-primary-accent" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t.addMember}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Stacked (one field per row): the form now lives in a narrow sidebar on
            desktop, so a 2-column split would cut off the phone number. */}
        <div className="grid gap-4">
          {/* Name first, then phone — the order reception fills them in. A short
              label (even "1") is accepted. */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            aria-label={t.memberName}
            maxLength={100}
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-border bg-input px-4 text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {/* dir=ltr keeps "+966" on the left and the number in reading order in both EN and AR */}
          <div className="relative" dir="ltr">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4">
              <span className="text-muted-foreground">+966</span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(sanitizePhoneInput(e.target.value));
                setPhoneTouched(false); // re-validate on the next blur
              }}
              onBlur={() => setPhoneTouched(true)}
              placeholder={t.phonePlaceholder}
              aria-label={t.phoneLabel}
              aria-invalid={phoneError}
              aria-describedby={phoneError ? "phone-error" : "phone-hint"}
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-border bg-input ps-16 pe-4 text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 aria-invalid:border-destructive"
            />
          </div>
        </div>

        {phoneError ? (
          <p id="phone-error" role="alert" className="text-sm text-destructive">
            {t.phoneInvalid}
          </p>
        ) : (
          <p id="phone-hint" className="text-xs text-muted-foreground">
            {t.phoneHint}
          </p>
        )}

        <button
          type="submit"
          disabled={isAdding || !phoneValid || !isValidName(name)}
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
