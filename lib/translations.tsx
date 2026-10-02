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
    namePlaceholder: "Name or a label (e.g. 1)",
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
    close: "Close",
    phoneLabel: "Mobile number",
    searchLabel: "Search members",
    messageOnWhatsApp: "Message {name} on WhatsApp",
    deleteMemberLabel: "Delete {name}",
    // "Added" tag (member card) — assembled as `${added} ${when}`, e.g. "Added today"
    added: "Added",
    addedToday: "today",
    addedYesterday: "yesterday",
    addedTwoDays: "2 days ago",
    addedDaysAgo: "{n} days ago",
    leavingSoon: "leaving soon",
    // CSV export
    downloadAll: "Download all",
    csvName: "Name",
    csvPhone: "Phone",
    csvStatus: "Status",
    csvAdded: "Added",
    memberAdded: "Member added successfully",
    memberDeleted: "Member deleted",
    numberExists: "Number already exists",
    phoneInvalid: "Enter a valid Saudi mobile number: 9 digits starting with 5",
    // Auth
    loginTitle: "Staff Login",
    loginSub: "Sign in to manage your members",
    emailLabel: "Email",
    passwordLabel: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    loginFailed: "Wrong email or password",
    loginConnError: "Couldn't connect. Check your internet and try again.",
    signOut: "Sign out",
    pendingTitle: "Waiting for approval",
    pendingBody: "Your account is set up, but an admin hasn't approved it yet. Please check back soon, or ask your manager to approve you.",
    checkAgain: "Check again",
    loadingApp: "Loading…",
    loadingMembers: "Loading members…",
    loadFailed: "Couldn't load members — nothing was lost. Check your connection and try again.",
    retry: "Try again",
    saveFailed: "Couldn't save — try again",
    // Shown when the app is deployed without its database keys
    configTitle: "Setup needed",
    configBody: "The app isn't connected to its database yet. Add the database keys and reload the page.",
    // Broadcast
    broadcast: "Broadcast",
    broadcastSub: "Message many members at once",
    compose: "Compose message",
    composeSub: "A text message to your members",
    mediaComingSoon: "📷 Sending photos & videos is coming soon. For now, Broadcast sends your text message — fast and reliable.",
    messagePlaceholder: "Dear {name}, your membership is expiring soon. Renew this week and get 15% off! 💪",
    nameHint: "{name} is replaced with each member's first name",
    characters: "characters",
    attachMedia: "Upload photo or video",
    attachHint: "Tap to browse — JPG, PNG, MP4",
    removeMedia: "Remove",
    guidedNote: "On a phone, tap Share to WhatsApp to attach the photo or video with your text. On desktop only text is sent — media needs a phone (or the paid Business API).",
    recipients: "Recipients",
    recipientsSub: "Filter by membership status",
    filterAll: "All",
    notSent: "Not sent",
    sent: "Sent",
    resetSent: "Reset (new promotion)",
    resetConfirmTitle: "Reset sent status?",
    resetConfirmBody: "This clears the “sent” mark on everyone so you can start a new round. It can't be undone.",
    resetConfirmYes: "Reset",
    sentToast: "Marked as sent",
    selectAllShown: "Select all shown",
    clearSelection: "Clear selection",
    selectedCount: "selected",
    startBroadcast: "Start broadcast",
    selectToStart: "Select members to broadcast",
    broadcastTo: "Start broadcast to",
    memberProgress: "Member",
    of: "of",
    openAndSend: "Open & send",
    shareToWhatsApp: "Share to WhatsApp",
    orTextOnly: "or open chat with text only",
    cantAttachHere: "can't attach here — open on your phone to send media",
    skip: "Skip",
    broadcastDone: "Broadcast finished",
    chatsOpened: "chats were opened and sent.",
    done: "Done",
    willAttachManually: "will be sent as a link / attached manually",
    photo: "Photo",
    video: "Video",
  },
  ar: {
    title: "GymConnect",
    subtitle: "إدارة أعضاء واتساب",
    addMember: "إضافة عضو جديد",
    memberNumber: "رقم العضو",
    memberName: "اسم العضو",
    namePlaceholder: "الاسم أو وسم (مثال: 1)",
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
    close: "إغلاق",
    phoneLabel: "رقم الجوال",
    searchLabel: "البحث في الأعضاء",
    messageOnWhatsApp: "مراسلة {name} على واتساب",
    deleteMemberLabel: "حذف {name}",
    // "Added" tag (member card) — assembled as `${added} ${when}`, e.g. "أُضيف اليوم"
    added: "أُضيف",
    addedToday: "اليوم",
    addedYesterday: "أمس",
    addedTwoDays: "قبل يومين",
    addedDaysAgo: "قبل {n} أيام",
    leavingSoon: "يُحذف قريباً",
    // CSV export
    downloadAll: "تنزيل الكل",
    csvName: "الاسم",
    csvPhone: "الجوال",
    csvStatus: "الحالة",
    csvAdded: "تاريخ الإضافة",
    memberAdded: "تمت إضافة العضو بنجاح",
    memberDeleted: "تم حذف العضو",
    numberExists: "الرقم موجود مسبقاً",
    phoneInvalid: "أدخل رقم جوال سعودي صحيح: 9 أرقام يبدأ بالرقم 5",
    // Auth
    loginTitle: "تسجيل دخول الموظفين",
    loginSub: "سجّل الدخول لإدارة الأعضاء",
    emailLabel: "البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    signIn: "تسجيل الدخول",
    signingIn: "جارٍ تسجيل الدخول…",
    loginFailed: "بريد إلكتروني أو كلمة مرور خاطئة",
    loginConnError: "تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.",
    signOut: "تسجيل الخروج",
    pendingTitle: "في انتظار الموافقة",
    pendingBody: "تم إنشاء حسابك، لكن لم يوافق عليه المشرف بعد. يُرجى المراجعة قريباً أو الطلب من مديرك الموافقة على حسابك.",
    checkAgain: "تحقق مرة أخرى",
    loadingApp: "جارٍ التحميل…",
    loadingMembers: "جارٍ تحميل الأعضاء…",
    loadFailed: "تعذّر تحميل الأعضاء — لم يُفقد أي شيء. تحقق من اتصالك وحاول مرة أخرى.",
    retry: "إعادة المحاولة",
    saveFailed: "تعذّر الحفظ — حاول مرة أخرى",
    // Shown when the app is deployed without its database keys
    configTitle: "يلزم الإعداد",
    configBody: "التطبيق غير متصل بقاعدة البيانات بعد. أضف مفاتيح قاعدة البيانات وأعد تحميل الصفحة.",
    // Broadcast
    broadcast: "إرسال جماعي",
    broadcastSub: "أرسل رسالة لعدة أعضاء دفعة واحدة",
    compose: "كتابة الرسالة",
    composeSub: "رسالة نصية لأعضائك",
    mediaComingSoon: "📷 إرسال الصور والفيديو قادم قريباً. حالياً يرسل الإرسال الجماعي رسالتك النصية — سريع وموثوق.",
    messagePlaceholder: "عزيزي {name}، عضويتك على وشك الانتهاء. جدّد هذا الأسبوع واحصل على خصم 15٪! 💪",
    nameHint: "{name} يُستبدل باسم كل عضو",
    characters: "حرف",
    attachMedia: "رفع صورة أو فيديو",
    attachHint: "اضغط للاختيار — JPG أو PNG أو MP4",
    removeMedia: "إزالة",
    guidedNote: "على الهاتف، اضغط «مشاركة إلى واتساب» لإرفاق الصورة أو الفيديو مع النص. على الكمبيوتر يُرسل النص فقط — الوسائط تحتاج هاتفاً (أو واجهة الأعمال المدفوعة).",
    recipients: "المستلمون",
    recipientsSub: "التصفية حسب حالة العضوية",
    filterAll: "الكل",
    notSent: "لم تُرسل",
    sent: "تم الإرسال",
    resetSent: "إعادة الضبط (حملة جديدة)",
    resetConfirmTitle: "إعادة ضبط حالة الإرسال؟",
    resetConfirmBody: "سيؤدي هذا إلى مسح علامة «تم الإرسال» عن الجميع لبدء جولة جديدة. لا يمكن التراجع عن هذا.",
    resetConfirmYes: "إعادة الضبط",
    sentToast: "تم وضع علامة مُرسل",
    selectAllShown: "تحديد كل المعروض",
    clearSelection: "إلغاء التحديد",
    selectedCount: "محدد",
    startBroadcast: "بدء الإرسال",
    selectToStart: "اختر الأعضاء للإرسال",
    broadcastTo: "بدء الإرسال إلى",
    memberProgress: "العضو",
    of: "من",
    openAndSend: "فتح وإرسال",
    shareToWhatsApp: "مشاركة إلى واتساب",
    orTextOnly: "أو افتح المحادثة بالنص فقط",
    cantAttachHere: "لا يمكن الإرفاق هنا — افتح التطبيق على هاتفك لإرسال الوسائط",
    skip: "تخطي",
    broadcastDone: "اكتمل الإرسال",
    chatsOpened: "محادثة تم فتحها وإرسالها.",
    done: "تم",
    willAttachManually: "سيُرسل كرابط / يُرفق يدوياً",
    photo: "صورة",
    video: "فيديو",
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

const LANGUAGES: readonly Language[] = ["en", "ar"];
const THEMES: readonly Theme[] = ["dark", "light"];
const WA_PREFERENCES: readonly WAPreference[] = ["web", "desktop"];

// localStorage can be blocked or hold a tampered value — never let that crash the app.
function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return allowed.find((a) => a === value) ?? fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode / quota) — the preference just won't persist.
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [waPreference, setWaPreferenceState] = useState<WAPreference>("web");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>(null);

  useEffect(() => {
    setLangState(readPref("lang_preference", LANGUAGES, "en"));
    setThemeState(readPref("theme_preference", THEMES, "dark"));
    setWaPreferenceState(readPref("wa_preference", WA_PREFERENCES, "web"));

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
        writePref("lang_preference", newLang);
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
    writePref("theme_preference", newTheme);
  };

  const setWaPreference = (pref: WAPreference) => {
    setWaPreferenceState(pref);
    writePref("wa_preference", pref);
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
          // "none" (not scale(1)/blur(0px)) so the wrapper is not a containing
          // block for position:fixed overlays once the entrance has settled.
          transform: "none",
          filter: "none",
          transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        };
      default:
        return {
          ...baseStyle,
          opacity: 1,
          transform: "none",
          filter: "none",
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
