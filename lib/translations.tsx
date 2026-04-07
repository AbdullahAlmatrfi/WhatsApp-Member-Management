"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "en" | "ar";
export type Theme = "dark" | "light";
export type WAPreference = "web" | "desktop";

const translations = {
  en: {
    title: "GymConnect",
    subtitle: "WhatsApp Member Management",
    addMember: "Add New Member",
    memberNumber: "Member Number",
    memberName: "Member Name",
    namePlaceholder: "Enter full name",
    phonePlaceholder: "5XXXXXXXX",
    addButton: "+ Add Member",
    adding: "Adding...",
    members: "Members",
    search: "Search by name or number...",
    settings: "Settings",
    appearance: "Appearance",
    language: "Language",
    whatsapp: "WhatsApp",
    dark: "Dark",
    light: "Light",
    web: "WhatsApp Web",
    desktop: "WhatsApp Desktop",
    opensInBrowser: "Opens in your browser",
    opensApp: "Opens the desktop app",
    noMembers: "No members yet. Add your first member above.",
    noResults: "No members found matching your search.",
    deleteConfirm: "Delete Member?",
    undone: "This action cannot be undone.",
    cancel: "Cancel",
    delete: "Delete",
    memberAdded: "Member added successfully",
    memberDeleted: "Member deleted",
    numberExists: "Number already exists",
  },
  ar: {
    title: "GymConnect",
    subtitle: "إدارة أعضاء واتساب",
    addMember: "إضافة عضو جديد",
    memberNumber: "رقم العضو",
    memberName: "اسم العضو",
    namePlaceholder: "أدخل الاسم الكامل",
    phonePlaceholder: "5XXXXXXXX",
    addButton: "+ إضافة عضو",
    adding: "جارٍ الإضافة...",
    members: "الأعضاء",
    search: "ابحث بالاسم أو الرقم...",
    settings: "الإعدادات",
    appearance: "المظهر",
    language: "اللغة",
    whatsapp: "واتساب",
    dark: "داكن",
    light: "فاتح",
    web: "واتساب ويب",
    desktop: "تطبيق واتساب",
    opensInBrowser: "يفتح في المتصفح",
    opensApp: "يفتح تطبيق سطح المكتب",
    noMembers: "لا يوجد أعضاء بعد. أضف أول عضو أعلاه.",
    noResults: "لا يوجد أعضاء مطابقين للبحث.",
    deleteConfirm: "حذف العضو؟",
    undone: "لا يمكن التراجع عن هذا الإجراء.",
    cancel: "إلغاء",
    delete: "حذف",
    memberAdded: "تمت إضافة العضو بنجاح",
    memberDeleted: "تم حذف العضو",
    numberExists: "الرقم موجود مسبقاً",
  },
};

type TransitionPhase = "idle" | "phase1" | "phase2" | "phase3";
type TransitionDirection = "toAr" | "toEn" | null;

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  waPreference: WAPreference;
  setWaPreference: (pref: WAPreference) => void;
  t: typeof translations.en;
  isTransitioning: boolean;
  transitionPhase: TransitionPhase;
  transitionDirection: TransitionDirection;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [waPreference, setWaPreferenceState] = useState<WAPreference>("web");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem("lang_preference") as Language | null;
    const savedTheme = localStorage.getItem("theme_preference") as Theme | null;
    const savedWa = localStorage.getItem("wa_preference") as WAPreference | null;

    if (savedLang) setLangState(savedLang);
    if (savedTheme) setThemeState(savedTheme);
    if (savedWa) setWaPreferenceState(savedWa);

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme, isLoaded]);

  const setLang = (newLang: Language) => {
    if (newLang === lang || isTransitioning) return;
    
    const direction: TransitionDirection = newLang === "ar" ? "toAr" : "toEn";
    setIsTransitioning(true);
    setTransitionDirection(direction);
    
    // Phase 1: Soft Fade + Depth Compression (120ms)
    setTransitionPhase("phase1");
    
    setTimeout(() => {
      // Phase 2: Directional Slide Warp (90ms)
      setTransitionPhase("phase2");
      
      setTimeout(() => {
        // Switch language and direction at the end of phase 2
        setLangState(newLang);
        localStorage.setItem("lang_preference", newLang);
        document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = newLang;
        
        // Phase 3: Cinematic Rebuild + Pop-In (200ms)
        requestAnimationFrame(() => {
          setTransitionPhase("phase3");
          
          setTimeout(() => {
            // Reset to idle
            setTransitionPhase("idle");
            setTransitionDirection(null);
            setIsTransitioning(false);
          }, 200);
        });
      }, 90);
    }, 120);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme_preference", newTheme);
  };

  const setWaPreference = (pref: WAPreference) => {
    setWaPreferenceState(pref);
    localStorage.setItem("wa_preference", pref);
  };

  const t = translations[lang];

  if (!isLoaded) {
    return null;
  }

  // Build transform and styles based on transition phase
  const getTransitionStyles = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      transformOrigin: "center center",
      willChange: transitionPhase !== "idle" ? "transform, opacity, filter" : "auto",
    };
    
    switch (transitionPhase) {
      case "phase1":
        // Soft Fade + Depth Compression
        return {
          ...baseStyle,
          opacity: 0.25,
          transform: "scale(0.965)",
          filter: "blur(1.5px)",
          transition: "all 120ms ease-out",
        };
      case "phase2":
        // Directional Slide Warp
        return {
          ...baseStyle,
          opacity: 0.1,
          transform: `scale(0.965) translateX(${transitionDirection === "toAr" ? "-14px" : "14px"})`,
          filter: "blur(1.5px)",
          transition: "all 90ms ease-in",
        };
      case "phase3":
        // Cinematic Rebuild + Pop-In
        return {
          ...baseStyle,
          opacity: 1,
          transform: "scale(1) translateX(0)",
          filter: "blur(0px)",
          transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        };
      default:
        return {
          ...baseStyle,
          opacity: 1,
          transform: "scale(1) translateX(0)",
          filter: "blur(0px)",
          transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        };
    }
  };

  return (
    <AppContext.Provider value={{ lang, setLang, theme, setTheme, waPreference, setWaPreference, t, isTransitioning, transitionPhase, transitionDirection }}>
      <div style={getTransitionStyles()}>
        {children}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
