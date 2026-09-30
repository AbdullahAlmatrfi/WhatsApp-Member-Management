# GymConnect — Audit & Review Log 🔍

Findings from the specialist agents (security, QA, full code review). Status updated as we fix.
*Last review: 2026-09-30, before first launch.*

## 🚦 Launch gate: **NO-GO** until the 4 must-fix items are closed.

---

## 🔴 Must-fix before launch (4)

| ID | Where | Problem | Status |
|----|-------|---------|--------|
| F1 | `lib/translations.tsx` (AppProvider wrapper) | An always-on CSS `transform` on the app wrapper makes every full-screen overlay (Broadcast, dialogs, toast) mis-position after scrolling. Set the idle transform to `none`. | 🔧 Open |
| F2 | `app/page.tsx` (delete / markSent / resetSent) | Screen updates instantly but if the DB write fails it never undoes → screen and database disagree (deleted member reappears; failed "sent" silently reverts). Revert or refetch on error. | 🔧 Open |
| F3 | DB + `app/page.tsx` | Duplicate phone only checked in the browser; two staff could add the same number. Add a UNIQUE phone rule in the database + handle it. | 🔧 Open |
| F4 | `components/add-member-form.tsx` | Form clears the typed name/phone before the save is confirmed; on failure the user loses their input. Clear only on success. | 🔧 Open |

---

## 🟠 Should-fix soon (post-launch OK)
- **Phone validation** — accepts short/invalid numbers; enforce 9 digits starting with 5.
- **Load-failure state** — if the database can't be reached, the list looks empty instead of showing an error + retry.
- **Auth refetch** — the member list reloads (spinner flash) on token refresh / tab switch.
- **Accessibility** — dialogs need `role="dialog"`, Escape-to-close, focus trap; toast needs `aria-live`.
- **RTL** — toast uses `right`/`left` instead of logical `start`/`end`.

## 🟢 Confirmed safe / working
- Login gate blocks any data flash before the session is known. ✅
- Logged-out users read **nothing** (Row Level Security verified). ✅
- Public signup is **disabled** in Supabase (the "critical" from the schema-only view is already handled). ✅
- No secrets leaked (only the public key ships). ✅
- Add-member is save-first (no divergence). ✅

---

## Sign-off
- Security: conditional GO once signup stays off (done) — ✅
- QA: NO-GO until F2 fixed.
- Code review: NO-GO until F1–F4 fixed.

**When F1–F4 show ✅, we deploy.**
