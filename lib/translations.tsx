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
    addButton: "Add Member",
    phoneHint: "Saudi mobile: 9 digits starting with 5",
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
    autoDeleteNotice: "Members are removed automatically after {n} days. Use Download all to keep a copy.",
    autoDeleteNoticeHours: "Members are removed automatically after {n} hours. Use Download all to keep a copy.",
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
    // v2 Admin Console
    adminTitle: "Admin",
    adminSub: "Manage staff & settings",
    adminOnly: "Admins only.",
    backToApp: "Back to app",
    staffView: "Staff view",
    userManagement: "Staff accounts",
    userManagementSub: "Create, reset, or remove staff logins",
    noAccounts: "No staff accounts yet. Add your first team member.",
    addStaffTitle: "Add staff",
    addStaffSub: "Create a login so they can use the staff page",
    addEmail: "Email",
    addEmailPlaceholder: "name@example.com",
    addPassword: "Password",
    generateBtn: "Generate",
    createAccount: "Create account",
    creatingAccount: "Creating…",
    resetPwd: "Reset password",
    deleteAccount: "Delete",
    resetTitle: "Reset this password?",
    resetBody: "A new password is created and the old one stops working.",
    deleteStaffTitle: "Delete this staff account?",
    deleteStaffBody: "Their login is removed and they lose access right away. This can't be undone.",
    staffCreatedToast: "Staff account created",
    staffDeletedToast: "Staff account deleted",
    passwordResetToast: "Password reset",
    credCreatedTitle: "Staff account ready",
    credResetTitle: "New password set",
    credBody: "Share these with your staff member. If they forget it, reset it from here.",
    credEmailLabel: "Email",
    credPasswordLabel: "Password",
    copyBtn: "Copy",
    copiedBtn: "Copied",
    shareWhatsapp: "Send on WhatsApp",
    doneBtn: "Done",
    errEmailExists: "That email already has an account.",
    errInvalidEmail: "Enter a valid email address.",
    errInvalidPassword: "Password must be at least 8 characters.",
    errServerConfig: "Server key isn't set yet. Add it in Netlify, then try again.",
    errForbidden: "Only an admin can do that.",
    saveBtn: "Save",
    greetMorning: "Good morning",
    greetAfternoon: "Good afternoon",
    greetEvening: "Good evening",
    gymNameTitle: "Gym name",
    gymNameDesc: "Shown at the top for your staff.",
    gymNamePlaceholder: "e.g. Iron Fitness",
    addName: "Name (optional)",
    addNamePlaceholder: "e.g. Ahmed",
    editName: "Edit name",
    editNameTitle: "Staff name",
    roleStaffCue: "Staff",
    selectBtn: "Select",
    bulkDeleteTitle: "Delete these members?",
    bulkDeleteBody: "{n} members will be permanently removed. This can't be undone.",
    bulkDeletedToast: "Deleted {n} members",
    oneStaffNote: "One staff account per gym. Delete the current one to add a different person.",
    statTotal: "Members",
    statMessaged: "Messaged",
    statToSend: "To send",
    analyticsTitle: "Overview",
    analyticsNote: "Live snapshot — members auto-delete after the window.",
    kpiStaff: "Staff",
    kpiPending: "Pending",
    kpiPrivate: "{n} private (only you)",
    landingHeadline: "Message every member in one tap.",
    landingSub: "GymConnect keeps your members' numbers in one place and sends your WhatsApp message to all of them — in seconds.",
    landingHowTitle: "How it works",
    landingStep1Title: "Add members",
    landingStep1Body: "Just a name and a number.",
    landingStep2Title: "Broadcast",
    landingStep2Body: "Write once, send to everyone on WhatsApp.",
    landingStep3Title: "Auto-clean",
    landingStep3Body: "Old entries clear themselves after a few days.",
    landingMockMsg: "📣 New class schedule is up this week!",
    landingSendTo: "Send to",
    back: "Back",
    roleAdmin: "Admin",
    roleStaff: "Staff",
    rolePending: "Pending",
    approve: "Approve",
    revoke: "Remove access",
    approved: "Staff approved",
    revoked: "Access removed",
    approveTitle: "Approve this account?",
    approveBody: "They'll be able to sign in and manage members.",
    revokeTitle: "Remove access?",
    revokeBody: "They'll be locked out until you approve them again.",
    adminGuard: "Can't remove the last admin or your own admin role.",
    you: "you",
    autoDeleteTitle: "Auto-delete window",
    autoDeleteDesc: "Each member is deleted this long after being added. Staff can use Download all to keep a copy.",
    autoDeleteCurrent: "Currently: {v}",
    autoDeleteUnknown: "Couldn't load current setting",
    shortenWindowTitle: "Shorten the auto-delete window?",
    shortenWindowBody: "Members added more than {v} ago will be removed within the hour. This can't be undone.",
    shortenConfirm: "Shorten anyway",
    loadAccountsFailed: "Couldn't load the console — nothing was lost. Try again.",
    gymNameLoadFailed: "Couldn't load the current gym name, so saving is turned off.",
    win7: "7 hours",
    win24: "24 hours",
    win48: "2 days",
    win72: "3 days",
    settingSaved: "Setting saved",
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
    notSent: "Not messaged",
    sent: "Messaged",
    resetSent: "Reset (new promotion)",
    resetConfirmTitle: "Reset sent status?",
    resetConfirmBody: "This clears the “Messaged” mark on everyone so you can start a new round. It can't be undone.",
    resetConfirmYes: "Reset",
    sentToast: "Marked as sent",
    selectAllShown: "Select all shown",
    clearSelection: "Clear selection",
    selectedCount: "selected",
    startBroadcast: "Start broadcast",
    selectToStart: "Select members to broadcast",
    broadcastToN: "Start broadcast ({n})",
    sendReminder: "Press Send in WhatsApp, then come back here.",
    popupBlocked: "Your browser blocked WhatsApp. Allow pop-ups for this site, then tap Open & send again.",
    memberProgress: "Member",
    of: "of",
    backToEdit: "Back to edit",
    openAndSend: "Open & send",
    shareToWhatsApp: "Share to WhatsApp",
    orTextOnly: "or open chat with text only",
    cantAttachHere: "can't attach here — open on your phone to send media",
    skip: "Skip",
    broadcastDone: "Broadcast finished",
    broadcastSummary: "Chats opened: {sent} of {total}",
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
    addButton: "إضافة عضو",
    phoneHint: "جوال سعودي: 9 أرقام تبدأ بالرقم 5",
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
    autoDeleteNotice: "تُحذف الأعضاء تلقائياً بعد {n} يوم. استخدم تنزيل الكل للاحتفاظ بنسخة.",
    autoDeleteNoticeHours: "تُحذف الأعضاء تلقائياً بعد {n} ساعات. استخدم تنزيل الكل للاحتفاظ بنسخة.",
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
    // v2 Admin Console
    adminTitle: "لوحة المشرف",
    adminSub: "إدارة الموظفين والإعدادات",
    adminOnly: "للمشرفين فقط.",
    backToApp: "العودة للتطبيق",
    staffView: "واجهة الموظف",
    userManagement: "حسابات الموظفين",
    userManagementSub: "إنشاء أو إعادة تعيين أو إزالة حسابات الموظفين",
    noAccounts: "لا توجد حسابات موظفين بعد. أضف أول عضو في فريقك.",
    addStaffTitle: "إضافة موظف",
    addStaffSub: "أنشئ حساب دخول لاستخدام صفحة الموظف",
    addEmail: "البريد الإلكتروني",
    addEmailPlaceholder: "name@example.com",
    addPassword: "كلمة المرور",
    generateBtn: "توليد",
    createAccount: "إنشاء الحساب",
    creatingAccount: "جارٍ الإنشاء…",
    resetPwd: "إعادة تعيين كلمة المرور",
    deleteAccount: "حذف",
    resetTitle: "إعادة تعيين كلمة المرور؟",
    resetBody: "ستُنشأ كلمة مرور جديدة وتتوقف القديمة عن العمل.",
    deleteStaffTitle: "حذف حساب الموظف؟",
    deleteStaffBody: "سيُحذف حساب الدخول ويفقد الوصول فوراً. لا يمكن التراجع.",
    staffCreatedToast: "تم إنشاء الحساب",
    staffDeletedToast: "تم حذف الحساب",
    passwordResetToast: "تمت إعادة تعيين كلمة المرور",
    credCreatedTitle: "حساب الموظف جاهز",
    credResetTitle: "تم تعيين كلمة مرور جديدة",
    credBody: "شارك هذه المعلومات مع الموظف. إذا نسيها، يمكنك إعادة تعيينها من هنا.",
    credEmailLabel: "البريد الإلكتروني",
    credPasswordLabel: "كلمة المرور",
    copyBtn: "نسخ",
    copiedBtn: "تم النسخ",
    shareWhatsapp: "إرسال عبر واتساب",
    doneBtn: "تم",
    errEmailExists: "يوجد حساب بهذا البريد بالفعل.",
    errInvalidEmail: "أدخل بريداً إلكترونياً صحيحاً.",
    errInvalidPassword: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
    errServerConfig: "لم تتم إضافة مفتاح الخادم بعد. أضفه في Netlify ثم حاول مجدداً.",
    errForbidden: "هذا الإجراء للمشرف فقط.",
    saveBtn: "حفظ",
    greetMorning: "صباح الخير",
    greetAfternoon: "مساء الخير",
    greetEvening: "مساء الخير",
    gymNameTitle: "اسم النادي",
    gymNameDesc: "يظهر في الأعلى لموظفيك.",
    gymNamePlaceholder: "مثال: نادي الحديد",
    addName: "الاسم (اختياري)",
    addNamePlaceholder: "مثال: أحمد",
    editName: "تعديل الاسم",
    editNameTitle: "اسم الموظف",
    roleStaffCue: "موظف",
    selectBtn: "تحديد",
    bulkDeleteTitle: "حذف هؤلاء الأعضاء؟",
    bulkDeleteBody: "سيتم حذف الأعضاء المحددين ({n}) نهائياً. لا يمكن التراجع.",
    bulkDeletedToast: "تم حذف الأعضاء ({n})",
    oneStaffNote: "حساب موظف واحد لكل نادٍ. احذف الحساب الحالي لإضافة شخص آخر.",
    statTotal: "الأعضاء",
    statMessaged: "تمت مراسلتهم",
    statToSend: "للإرسال",
    analyticsTitle: "نظرة عامة",
    analyticsNote: "أرقام محدّثة لحظياً — يُحذف الأعضاء تلقائياً بعد انتهاء المدة.",
    kpiStaff: "الموظفون",
    kpiPending: "بانتظار الموافقة",
    kpiPrivate: "منهم {n} خاصون بك فقط",
    landingHeadline: "راسل كل أعضائك بضغطة واحدة.",
    landingSub: "يحفظ GymConnect أرقام أعضائك في مكان واحد ويرسل رسالتك عبر واتساب للجميع — خلال ثوانٍ.",
    landingHowTitle: "كيف يعمل",
    landingStep1Title: "أضف الأعضاء",
    landingStep1Body: "فقط الاسم والرقم.",
    landingStep2Title: "البث",
    landingStep2Body: "اكتب مرة واحدة، وأرسل للجميع عبر واتساب.",
    landingStep3Title: "تنظيف تلقائي",
    landingStep3Body: "تُحذف البيانات القديمة تلقائياً بعد أيام.",
    landingMockMsg: "📣 جدول الحصص الجديد متاح هذا الأسبوع!",
    landingSendTo: "إرسال إلى",
    back: "رجوع",
    roleAdmin: "مشرف",
    roleStaff: "موظف",
    rolePending: "بانتظار الموافقة",
    approve: "موافقة",
    revoke: "إزالة الوصول",
    approved: "تمت الموافقة على الموظف",
    revoked: "تمت إزالة الوصول",
    approveTitle: "الموافقة على هذا الحساب؟",
    approveBody: "سيتمكن من تسجيل الدخول وإدارة الأعضاء.",
    revokeTitle: "إزالة الوصول؟",
    revokeBody: "سيُمنع من الوصول حتى توافق عليه مجدداً.",
    adminGuard: "لا يمكن إزالة آخر مشرف أو إزالة دورك كمشرف.",
    you: "أنت",
    autoDeleteTitle: "مدة الحذف التلقائي",
    autoDeleteDesc: "يُحذف كل عضو بعد هذه المدة من إضافته. يمكن للموظفين استخدام تنزيل الكل للاحتفاظ بنسخة.",
    autoDeleteCurrent: "الحالي: {v}",
    autoDeleteUnknown: "تعذّر تحميل الإعداد الحالي",
    shortenWindowTitle: "تقصير مدة الحذف التلقائي؟",
    shortenWindowBody: "سيُحذف الأعضاء الذين أُضيفوا قبل أكثر من {v} خلال ساعة. لا يمكن التراجع.",
    shortenConfirm: "تقصير على أي حال",
    loadAccountsFailed: "تعذّر تحميل لوحة التحكم — لم يُفقد شيء. حاول مجدداً.",
    gymNameLoadFailed: "تعذّر تحميل اسم النادي الحالي، لذا تم إيقاف الحفظ.",
    win7: "7 ساعات",
    win24: "24 ساعة",
    win48: "يومان",
    win72: "3 أيام",
    settingSaved: "تم حفظ الإعداد",
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
    messagePlaceholder: "عزيزي {name}، عضويتك على وشك الانتهاء. جدّد هذا الأسبوع واحصل على خصم 15%! 💪",
    nameHint: "{name} يُستبدل باسم كل عضو",
    characters: "حرف",
    attachMedia: "رفع صورة أو فيديو",
    attachHint: "اضغط للاختيار — JPG أو PNG أو MP4",
    removeMedia: "إزالة",
    guidedNote: "على الهاتف، اضغط «مشاركة إلى واتساب» لإرفاق الصورة أو الفيديو مع النص. على الكمبيوتر يُرسل النص فقط — الوسائط تحتاج هاتفاً (أو واجهة الأعمال المدفوعة).",
    recipients: "المستلمون",
    recipientsSub: "التصفية حسب حالة العضوية",
    filterAll: "الكل",
    notSent: "لم تتم مراسلته",
    sent: "تمت مراسلته",
    resetSent: "إعادة الضبط (حملة جديدة)",
    resetConfirmTitle: "إعادة ضبط حالة الإرسال؟",
    resetConfirmBody: "سيؤدي هذا إلى مسح علامة «تمت مراسلته» عن الجميع لبدء جولة جديدة. لا يمكن التراجع عن هذا.",
    resetConfirmYes: "إعادة الضبط",
    sentToast: "تم وضع علامة مُرسل",
    selectAllShown: "تحديد كل المعروض",
    clearSelection: "إلغاء التحديد",
    selectedCount: "محدد",
    startBroadcast: "بدء الإرسال",
    selectToStart: "اختر الأعضاء للإرسال",
    broadcastToN: "بدء الإرسال ({n})",
    sendReminder: "اضغط إرسال داخل واتساب ثم عد إلى هنا.",
    popupBlocked: "منع المتصفح فتح واتساب. اسمح بالنوافذ المنبثقة لهذا الموقع ثم اضغط فتح وإرسال مرة أخرى.",
    memberProgress: "العضو",
    of: "من",
    backToEdit: "رجوع للتعديل",
    openAndSend: "فتح وإرسال",
    shareToWhatsApp: "مشاركة إلى واتساب",
    orTextOnly: "أو افتح المحادثة بالنص فقط",
    cantAttachHere: "لا يمكن الإرفاق هنا — افتح التطبيق على هاتفك لإرسال الوسائط",
    skip: "تخطي",
    broadcastDone: "اكتمل الإرسال",
    broadcastSummary: "تم فتح المحادثات: {sent} من {total}",
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
