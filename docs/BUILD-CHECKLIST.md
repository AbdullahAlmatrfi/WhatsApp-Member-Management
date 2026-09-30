# GymConnect — THE Build Checklist (single source of truth)

*The one ordered plan the PO proxy and the Lead follow. Supersedes scattered notes. Reflects every decision through 2026-09-30. `[ ]` todo · `[~]` in progress · `[x]` done.*

**Rules we follow every time (no exceptions):**
- 🗣️ Mini-me tells Abdullah the short plan → Abdullah says okay → *then* the Lead builds. Never before.
- 🤝 Every command/decision is first vetted by the two advisors: 🔍 scenario-mapper + 🛡️ black-hat.
- ✂️ Right-size: the simplest safe thing that ships (data is names+phones, ~3 days, re-collectable → low stakes).
- 🛑 Nothing destructive or irreversible (deploy, live schema run, auto-delete on, real-data changes) without Abdullah's real "yes".
- 🍼 Every heads-up to Abdullah ends with a baby version.

---

## ✅ Phase 0 — Already done
- [x] v1 features: add / search / delete members, WhatsApp text broadcast, admin-only login, EN/AR + RTL, dark/light.
- [x] All 10 launch blockers fixed **in code** and re-verified (B0–B9) + Wave-2 accessibility.
- [x] Full scenario map (~250) + best-practice solutions, reviewed by a 4-agent panel **and** the war council.
- [x] Team: 20 specialists + black-hat, scenario-mapper, and the launch/ops roles + the PO proxy.
- [x] Backend decision: Supabase **is** the backend — no separate server (only tiny serverless bits later).

---

## 🟢 Phase 1 — Small adds + the (right-sized) safety net
- [ ] **1. "Added" tag on each member** — next to the name: **Today · Yesterday · 2 days · 3 days (🟠 leaving soon)**, from the add-date. Lets reception see what's new vs about to auto-delete. *(🔍 reads the one shared retention setting, not a hardcoded "3", so "leaving soon" never drifts from the real auto-delete window.)*
- [ ] **2. "Download list" button** (Export CSV) — this *is* the whole safety net. One tap → a copy the admin keeps. **No automated backup machine** (data's too short-lived + re-collectable to need it). Guard: neutralize a name that starts with `= + - @` so it can't run as a spreadsheet formula.

## 🟡 Phase 2 — Wave 3: the real bug fixes (with the corrected specs)
- [ ] **3. One phone format** (`lib/phone.ts`) — shared by add / search / paste; kill the hidden `"966"+number` hack; accept `05…` / `+966…` cleanly; expat numbers **if approved**. Idempotent + DB-enforced.
- [ ] **4. The "already gone" rule, split by action** — delete: gone = success; **mark-sent: never blind-succeed** (check first, or it marks someone "Messaged" who wasn't); reset: wait for the server.
- [ ] **5. Live-refresh the list safely** — refresh on return-to-tab + every ~90s + before a broadcast, with a tiny "did anything change?" check; guard so it never undoes an in-flight action; paused during a broadcast.
- [ ] **6. Honest errors + no-lost-work** — offline/paused says the truth (not "wrong password"); a failed load says "nothing was deleted"; typed text is never lost. *(🔍 added: every request times out (~10s) instead of hanging forever; if the login expires mid-work, show "session expired" and keep what was typed.)*
- [ ] **7. Broadcast safety** — "Are you sure?" on Reset; no accidental rapid-fire (Enter-hold / double-click); only message who's actually selected + shown; skip an already-gone member cleanly; say **"Messaged"** not "Sent". *(🔍 also: reuse one WhatsApp Web tab, not a new tab per person; don't let the toast cover the header buttons.)*
- [ ] **8. Pending-user gate** — a not-yet-approved account sees a friendly "waiting for approval" screen (never a broken empty app); a flaky network never looks like "not approved".
- [ ] **8b. Never-blank-screen guard** — if the app is ever misconfigured (missing keys), show a friendly message instead of a blank white page, and fail the build if keys are missing. *(🔍 a missing key currently crashes the whole app on load.)*

## 🔴 Phase 3 — Ship v1 (each step needs Abdullah's "yes")
- [ ] **9. release-verifier live GO / NO-GO** — run the database file on the real project, then prove **on the live system**: a stranger reads/changes nothing; **🛡️ a logged-in staff member can't make themselves admin, can't change settings, can't read other people's profiles**; **🛡️ no secret key leaked into the app bundle or git**; the **3 signup doors are OFF** (⚠️ the single most dangerous switch in the whole project); the auto-delete window is locked to 7h/24h/2d/3d; security headers ship; overlays sit right after scrolling; offline actions roll back.
- [ ] **10. Deploy to Vercel** → v1 is live. 🚀

## 🔵 Phase 4 — v2 Admin Console (only after v1 is live)
- [ ] **11. Build the 6-tab admin console** — user approve/create, analytics (2 simple charts), feedback inbox, reports/export, activity log, settings. (Design mockup + requirements already done.)

---

## ⏳ Pending Abdullah decisions (small — don't block most of Phase 1–2)
- [ ] Allow **expat / non-Saudi numbers**? *(advisors: safe if digits-only + DB-checked — recommend yes)*
- [ ] Say **"Messaged"** instead of "Sent"? *(recommend yes — the app only opens the chat)*
- [ ] **Auto sign-out after 60 min** idle (with a warning, paused during a broadcast)? *(recommend yes)*
- [ ] **Auto-delete counts from when added**, no "off" switch? *(recommend yes)*
