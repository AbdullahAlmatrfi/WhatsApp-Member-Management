"use client";

import { useState, useEffect } from "react";
import { X, Globe, Monitor, Moon, Sun, Check } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useApp } from "@/lib/translations";
import { useReturnFocus } from "@/hooks/use-return-focus";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { t, waPreference, setWaPreference, theme, setTheme, lang, setLang, isTransitioning } = useApp();
  const [globeRotation, setGlobeRotation] = useState(0);
  const [globeScale, setGlobeScale] = useState(1);
  const [labelTransition, setLabelTransition] = useState<"idle" | "out" | "in">("idle");
  const [displayedLang, setDisplayedLang] = useState(lang);

  // Sync displayed language after transition
  useEffect(() => {
    if (!isTransitioning && labelTransition === "out") {
      setDisplayedLang(lang);
      setLabelTransition("in");
      setTimeout(() => setLabelTransition("idle"), 150);
    }
  }, [isTransitioning, labelTransition, lang]);

  const handleLangChange = (newLang: "en" | "ar") => {
    if (newLang !== lang && !isTransitioning) {
      // Globe animation: 0° → 220° → 360° with scale bump
      setGlobeRotation((prev) => prev + 220);
      setGlobeScale(1.15);
      setTimeout(() => {
        setGlobeRotation((prev) => prev + 140);
        setGlobeScale(1);
      }, 250);
      
      // Label fade out
      setLabelTransition("out");
      
      // Trigger language change
      setLang(newLang);
    }
  };

  // The panel anchors to the inline-end edge: right in LTR, left in RTL (Arabic).
  // (Sheet's `side` is the primitive's own API; no physical classes are used here.)
  const panelSide = lang === "ar" ? "left" : "right";
  const returnFocus = useReturnFocus(isOpen);

  return (
    // Radix Sheet: role=dialog + aria-modal, labelled by the title, Escape and
    // overlay-click close, focus trapped inside, and the closed panel is
    // unmounted so it is not in the tab order.
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side={panelSide}
        aria-modal="true"
        showCloseButton={false}
        overlayClassName="bg-background/60 backdrop-blur-[2px]"
        onCloseAutoFocus={returnFocus}
        // No description text exists for this panel; the title names it.
        aria-describedby={undefined}
        className="w-full max-w-[320px] gap-0 border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl data-[state=closed]:duration-[280ms] data-[state=open]:duration-[280ms] sm:max-w-[320px]"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 p-6">
            <SheetTitle className="text-xl">{t.settings}</SheetTitle>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground hover:-translate-y-[1px]"
              aria-label={t.close}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* WhatsApp Section */}
            <section>
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground rtl:normal-case rtl:tracking-normal">
                {t.whatsapp}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <OptionCard
                  icon={<Globe className="h-5 w-5" />}
                  label={t.web}
                  description={t.opensInBrowser}
                  isActive={waPreference === "web"}
                  onClick={() => setWaPreference("web")}
                />
                <OptionCard
                  icon={<Monitor className="h-5 w-5" />}
                  label={t.desktop}
                  description={t.opensApp}
                  isActive={waPreference === "desktop"}
                  onClick={() => setWaPreference("desktop")}
                />
              </div>
            </section>

            {/* Appearance Section */}
            <section>
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground rtl:normal-case rtl:tracking-normal">
                {t.appearance}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <OptionCard
                  icon={<Moon className="h-5 w-5" />}
                  label={t.dark}
                  isActive={theme === "dark"}
                  onClick={() => setTheme("dark")}
                />
                <OptionCard
                  icon={<Sun className="h-5 w-5" />}
                  label={t.light}
                  isActive={theme === "light"}
                  onClick={() => setTheme("light")}
                />
              </div>
            </section>

            {/* Language Section */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Globe 
                  className="h-4 w-4 text-primary-accent transition-all duration-500 ease-out"
                  style={{ 
                    transform: `rotate(${globeRotation}deg) scale(${globeScale})`,
                    filter: globeScale > 1 ? "drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 50%, transparent))" : "none"
                  }}
                />
                <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground rtl:normal-case rtl:tracking-normal">
                  {t.language}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LanguageCard
                  code="EN"
                  label="English"
                  isActive={displayedLang === "en"}
                  onClick={() => handleLangChange("en")}
                  disabled={isTransitioning}
                  labelState={labelTransition}
                />
                <LanguageCard
                  code="ع"
                  label="العربية"
                  isActive={displayedLang === "ar"}
                  onClick={() => handleLangChange("ar")}
                  disabled={isTransitioning}
                  labelState={labelTransition}
                />
              </div>
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface OptionCardProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function OptionCard({ icon, label, description, isActive, onClick, disabled }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isActive}
      className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200 ${
        isActive
          ? "border-primary bg-primary/10 shadow-[0_0_16px_color-mix(in_srgb,var(--primary)_20%,transparent)]"
          : "border-border hover:border-primary/50 hover:scale-[1.02] hover:-translate-y-[1px]"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      {isActive && (
        <div className="absolute top-2 end-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-[0_0_8px_color-mix(in_srgb,var(--primary)_40%,transparent)]">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
        isActive ? "bg-primary/20 text-primary-accent" : "bg-muted text-muted-foreground"
      }`}>
        {icon}
      </div>
      <span className={`text-sm font-medium transition-colors duration-200 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </button>
  );
}

interface LanguageCardProps {
  code: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
  labelState: "idle" | "out" | "in";
}

function LanguageCard({ code, label, isActive, onClick, disabled, labelState }: LanguageCardProps) {
  // Micro-animation for label text
  const getLabelStyle = (): React.CSSProperties => {
    if (!isActive) return {};
    
    switch (labelState) {
      case "out":
        return {
          opacity: 0,
          transform: "translateY(-4px)",
          transition: "all 100ms ease-out",
        };
      case "in":
        return {
          opacity: 1,
          transform: "translateY(0)",
          transition: "all 150ms ease-out",
        };
      default:
        return {
          opacity: 1,
          transform: "translateY(0)",
        };
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isActive}
      className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200 ${
        isActive
          ? "border-primary bg-primary/10 shadow-[0_0_16px_color-mix(in_srgb,var(--primary)_20%,transparent)]"
          : "border-border hover:border-primary/50 hover:scale-[1.02] hover:-translate-y-[1px]"
      } ${disabled ? "pointer-events-none" : ""}`}
    >
      {isActive && (
        <div 
          className="absolute top-2 end-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-[0_0_8px_color-mix(in_srgb,var(--primary)_40%,transparent)]"
          style={{
            transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
        isActive ? "bg-primary/20 text-primary-accent" : "bg-muted text-muted-foreground"
      }`}>
        <span className="text-lg font-medium">{code}</span>
      </div>
      <span 
        className={`text-sm font-medium transition-colors duration-200 ${isActive ? "text-foreground" : "text-muted-foreground"}`}
        style={getLabelStyle()}
      >
        {label}
      </span>
    </button>
  );
}
