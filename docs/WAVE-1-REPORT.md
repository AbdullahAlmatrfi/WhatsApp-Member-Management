# GymConnect — Wave 1 Implementation Report

*Date: 2026-09-30 · Prepared by: the Lead + specialist agents · Baseline: `docs/SRS.md` v1.0*

## 1. Purpose
This report documents the first implementation wave after the full multi-agent review. The goal of Wave 1: close every **security and correctness launch-blocker** the review found (`docs/AUDIT.md`, B0–B9) and land the safe performance/cleanup wins — with **zero new bugs** and a clean type-check.

## 2. How the work was run
1. **SRS first** (`docs/SRS.md`) — 55 functional + 41 non-functional requirements, each testable, so every change could be measured PASS/FAIL against a fixed ruler.
2. **Review** — security, QA, frontend, database agents (and the new **Black Hat** red-teamer) audited the code against the SRS, independently, then cross-checked.
3. **Build (Wave 1)** — two engineers in separate lanes: the **database engineer** owned `supabase/schema.sql`; the **frontend engineer** owned the app code. No file collisions.
4. **Re-verify** — **Black Hat** re-attacked the new code and **QA** re-tested every fix against the SRS acceptance criteria, hunting for regressions the fixes might introduce.
5. **Follow-ups** — the two issues re-review found (R1, R2) were fixed and re-checked.

## 3. What changed

### Security / data layer (`supabase/schema.sql`)
| Blocker | Change | Requirement |
|---|---|---|
| B0 (def-in-depth) | New accounts are provisioned as `role='pending'` (not `staff`); `members` access is gated on `role in ('admin','staff')`, so a `pending` account can read/write nothing. | NFR-3 |
| B4 | `UNIQUE(phone)` + `CHECK (phone ~ '^9665[0-9]{8}$')` + name length/blank CHECK. | FR-13, FR-14, FR-19 |
| FR-48 | Auto-delete window constrained to `in (7,24,48,72)`. | FR-48 |
| B9 | `created_at`/`id` made immutable to clients: `INSERT` scoped to `(name,phone,sent)`, `UPDATE` scoped to `(sent)`, `TRUNCATE` revoked, `anon` revoked. Retention can no longer be bypassed or weaponized. | NFR-11, FR-46 |
| — | Hardening revokes on `profiles`/`settings`; idempotent `pg_cron` re-schedule. | NFR-2, NFR-5, NFR-38 |

*All schema changes are idempotent (safe to run twice) and converge both a fresh project and the existing database.*

### App code (frontend)
| Blocker | Change | Requirement |
|---|---|---|
| B1 | App-wrapper idle `transform` **and** `filter` set to `none` — overlays (dialogs, Broadcast, toast) no longer mis-position after scrolling. | NFR-22 |
| B2 | Delete / mark-sent / reset-sent now snapshot state and **roll back** on DB failure (restoring the *previous* value), with a red error toast; a 0-row write now counts as a failure (R2). | NFR-18, FR-26/31/33 |
| B3 | Add is await-confirmed; the form clears **only on success**; the fake 500 ms delay is gone. | FR-16, NFR-15 |
| B4 (client) | Phone validated `^5\d{8}$` with an inline error; always stored as `966`+9 digits; DB errors mapped (`23505`→"number exists"); name capped at 100 chars (R1). | FR-12, FR-13, FR-19 |
| B5 | `ignoreBuildErrors: false` — a type error can no longer ship. | NFR-34 |
| B7 | Member list + open panels are cleared on sign-out — no PII leaks to the next user. | FR-6 |
| B8 | `noopener,noreferrer` on external opens; security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`). | NFR-8 |
| Extras | Load no longer refetches on token refresh (FR-9); broadcast count matches the queue (FR-44); corrupt stored preferences can't white-screen the app (FR-55); error toasts styled distinctly (NFR-19); Arabic-Indic digits accepted; small dead code removed. | — |

## 4. Verification result
- **Black Hat (red team), re-attack:** *"The Wave-1 fixes hold. Every B0–B9 blocker is closed at the code level, and I could not find a fresh security hole introduced by the diff. Still blocking launch: nothing in the code."*
- **QA, re-test:** Wave-1 blockers **7/7 PASS**, no happy-path breakage; the two follow-ups (R1 name error, R2 silent zero-row write) are fixed.
- **Type-check:** `npx tsc --noEmit` exits 0.

## 5. What remains before deploy
1. **Wave 2 — accessibility (B6):** move the Delete/Settings/Broadcast overlays to the Radix components already in the repo (adds dialog roles, Escape-to-close, focus trap, `aria-live` toast, and labels). Its own verifiable wave.
2. **Apply the database:** run `supabase/schema.sql` on the live Supabase project (run its 3 detection queries first to catch any existing bad rows), then promote your own account: `update public.profiles set role='admin' where id='<your-user-id>';` — because the trigger now makes new accounts `pending`, this step is required or you lock yourself out.
3. **Live smoke tests:** anon (no login) can read nothing; overlays sit correctly after scrolling; the deploy sends the 3 headers; offline delete/mark-sent visibly rolls back.

## 6. Product-owner decisions still open (SRS §2.6)
- **Q3** auto-delete counts from *added*, not *sent*; keep, or add send-time? (Windows locked to 7/24/48/72; "off" not allowed by default.)
- **Q5** Saudi mobiles only (`^5…`)? (Currently enforced.)
- **Q7** white text on the green button fails the readability standard — darken the green, dark text on green, or accept?

---
*Launch gate remains **NO-GO** until Wave 2 (B6) is done and the 3 live checks pass. Everything else is complete and re-verified.*
