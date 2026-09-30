# GymConnect — Audit & Review Log 🔍

Findings from the specialist agents, measured against **`docs/SRS.md` v1.0**.
*Full review: 2026-09-30 — security, QA, frontend, and database agents, independently, then cross-checked.*

## 🚦 Launch gate: **NO-GO** — but almost there. **All 10 blockers (B0–B9) now fixed & re-verified in code** (Wave 1 + Wave 2). Remaining before deploy: **run `schema.sql` on the live DB + the live smoke/a11y tests.**

Every row points to the SRS requirement it breaks, so "fixed" = "that requirement now PASSes".
*Wave 1 applied & re-reviewed 2026-09-30 by the frontend + database engineers, then re-attacked by Black Hat and QA (both: all Wave-1 blockers CLOSED, no regressions blocking). `tsc` clean.*

---

## 🔴 Blockers (must be PASS before deploy)

| # | Requirement(s) | Problem | Fix | Status |
|---|---|---|---|---|
| B0 | **NFR-3** (CRITICAL) | The whole data wall rests on Supabase dashboard toggles. **Black Hat found 3 doors, not 1:** (a) email signup, (b) **Anonymous sign-ins**, (c) OAuth/magic-link. Each leads through `handle_new_user` → auto-granted `staff` account → full read/**delete** of every member. | ✅ **PO verified 2026-09-30 (screenshot): "Allow new users to sign up", "Allow manual linking", "Allow anonymous sign-ins" all OFF.** Front door locked. Defense-in-depth remaining (folded into B9): make `handle_new_user()` grant `role='pending'` so even a future signup slip yields a useless account. | ✅ Verified (toggles); DEF-in-depth in B9 |
| B1 | **NFR-22 / F1** | Always-on `transform: scale(1) translateX(0)` **and** `filter: blur(0px)` on the app wrapper make it the containing block for every overlay → dialogs, Broadcast, toast mis-position after scroll. | Set **both** `transform` and `filter` to `none` when idle (SRS confirmed transform alone is not enough). | ✅ Fixed (code); live scroll-check pending |
| B2 | **NFR-18 / F2** (FR-26, FR-31, FR-33) | Delete, mark-sent and reset-sent update the screen first and never roll back on DB failure → screen and database disagree. | Snapshot state before each optimistic update; restore it (or refetch) in the `catch`. Restore the *previous* sent value, not a hard-coded false. **Also (R2): delete/mark-sent `.select()` so a 0-row write counts as failure and rolls back.** | ✅ Fixed (code) |
| B3 | **FR-16 / F4** (+ NFR-15) | Add form clears the typed name/phone before the save is confirmed; on failure the input is lost. Plus a fake 500 ms delay in the submit path. | Make `handleAddMember` return success; `await` it in the form; clear only on success. Delete the fake delay. | ✅ Fixed (code) |
| B4 | **FR-19 / F3 + FR-12 / FR-13** | No DB uniqueness or format rule on phone. Duplicate check is browser-only; invalid/short numbers get stored (`966123456`); a `23505` error is shown as a generic "save failed". | Add `UNIQUE(phone)` + `CHECK (phone ~ '^9665[0-9]{8}$')` + name CHECK (idempotent SQL ready). Validate `^5\d{8}$` in the form, always prepend `966`, remove the `startsWith("966")` branch, map `23505` → `t.numberExists`. **+ name `maxLength={100}` (R1).** | ✅ Fixed (code); DB constraints need the schema run |
| B5 | **NFR-34** | `next.config.mjs` has `ignoreBuildErrors: true` — a deploy can ship type errors, contradicting the tsc-clean rule. `tsc` is clean today, so flipping it is free. | Set `ignoreBuildErrors: false`. | ✅ Fixed (code) |
| B6 | **NFR-23/24/25/26/27/28** | Overlays have no dialog role, no Escape-to-close, no focus trap; toast has no `aria-live` and an older toast's timer hides a newer one; the per-member Delete button is invisible on touch/keyboard; inputs have no labels. | The repo already ships Radix `alert-dialog`, `dialog`, `sheet`. Move Delete → `AlertDialog`, Settings → `Sheet`, Broadcast → `Dialog` (role, Escape, focus trap). Fix toast timer + `aria-live`. Add labels. **Done Wave 2 + `aria-modal` (D1) and step-focus (D2) fixes.** QA: 8/8 a11y checks pass, no regressions (100 jsdom scenarios). | ✅ Fixed (code); live a11y pass pending |
| B7 | **FR-6** (privacy) | `members` state is never cleared on sign-out → the next user can briefly see the previous user's member list (PII across sessions). | Reset `members` + broadcast/settings/delete UI state when the session becomes null. | ✅ Fixed (code) |
| B8 | **NFR-8** | `window.open` calls omit `noopener,noreferrer` (reverse-tabnabbing); no security headers (clickjacking). | Pass `"noopener,noreferrer"`; add `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` via `headers()`. | ✅ Fixed (code); live header-check pending |
| B9 | **NFR-11, FR-46** (Black Hat H1) | `created_at` is client-writable (blanket `using(true) with check(true)`, no column limit). Any write-capable account can (a) set a member's `created_at` to the future → **immortal record, defeats PDPL erasure**, or (b) backdate every row → the next hourly cron **stealth-purges the whole table** looking like the app's own job. | Scope `UPDATE members` to the `sent` column only + scope `INSERT` to `(name,phone,sent)` so `id`/`created_at` can't be client-set; `revoke truncate`; `pending` role + role-gated `members_auth_all`. | ✅ Fixed in schema; needs the schema run |

---

## 🟠 Should-fix (strongly recommended in the same wave)

| Requirement(s) | Problem | Fix |
|---|---|---|
| FR-9 | Token refresh / tab return re-fires the fetch (spinner flash, search box resets, can clobber an optimistic sent flag). | Key the load effect on `session?.user.id`, not the whole session object. |
| FR-8 | Failed load shows the empty "No members yet" state, no error/retry. | Add an error state + Retry. |
| FR-55 / B7 | Invalid stored preference (`lang="fr"`) crashes the render; `localStorage` access is unguarded. | Validate stored values, wrap reads/writes in try/catch. |
| FR-44 | Broadcast "selected" count includes deleted members; label and queue disagree. | Count only ids still present in `members`. |
| NFR-19 | Errors use the green success (check) toast style. | Add a destructive toast variant. |
| NFR-21 | `fetchMembers` is unbounded (Supabase caps at ~1000 rows). | Paginate with `.range()` once it can exceed 1000. |
| NFR-31/32/33 | Hard-coded English aria-labels; toast/panel use physical left/right; phones not bidi-isolated in Arabic. | Move labels to translations; use logical `start/end`; wrap phones in `<bdi dir="ltr">`. |
| NFR-35 | `lint` script exists but `eslint` isn't installed. | Add `eslint` + `eslint-config-next` + flat config. |
| NFR-36 | Hard-coded `rgba(16,185,129,…)` in `settings-panel.tsx` (5 spots). | Use design tokens. |
| Input bugs (B3/B4/B5/B8 in review) | Arabic-Indic digits stripped; paste truncated before sanitize; `$` in a name breaks `{name}`; search untrimmed. | Map Arabic digits; sanitize then slice(0,9); use a function replacer; trim the query. |

---

## 🟡 Needs YOUR decision (Product Owner) — SRS §2.6

- **Q3** auto-delete counts from *added*, not *sent* → member can vanish mid-campaign. Keep, or add send-time? Is "off" allowed? (Default recommendation: windows locked to 7/24/48/72, no "off".)
- **Q5** Saudi mobiles only (`^5…`)? Confirms the phone rule in B4.
- **Q6/Q11** every staff account has full CRUD (incl. bulk delete). Restrict later, or fine? (Optional DB hardening ready: limit `UPDATE members` to the `sent` column.)
- **Q7** white text on `#10b981` fails the readability standard (~2.5:1). Darken the green, dark text on green, or accept?

---

## 🟢 Confirmed safe / working (verified against the SRS)
- No anonymous access; RLS enabled on all 3 tables; no self-promotion path (profiles/settings writes locked). ✅ (needs the standard live RLS test to fully confirm)
- SECURITY DEFINER functions pin `search_path` and revoke EXECUTE. ✅
- Only the public anon key ships; no secrets in the repo or git history. ✅
- Output is JSX-escaped; message text is `encodeURIComponent`'d — no XSS found. ✅
- Add-member is save-first; `{name}` personalization, Web/Desktop handoff, EN/AR key parity, human-in-the-loop sending all PASS. ✅
- `tsc --noEmit` exits 0 today. ✅

---

## Sign-off

**Wave 1 (2026-09-30) — after fixes, re-review:**
- **Black Hat (red team):** all B0–B9 **CLOSED in code**; "nothing blocking launch in the code." Only the live checks remain.
- **QA:** Wave-1 blockers **7/7 PASS**, no happy-path breakage; R1/R2 (the two follow-ups) now fixed.
- **Frontend + Database engineers:** applied; `tsc` clean.

**Still before deploy:**
1. **B6 accessibility** (Wave 2) — dialogs/focus/Escape/aria.
2. **Run `supabase/schema.sql`** on the live project (run its 3 detection queries first), then promote your admin account to `role='admin'` (the trigger now makes new accounts `pending`).
3. **Live smoke tests:** anon can read nothing; overlays sit right after scrolling; deploy sends the 3 headers; offline delete/mark-sent rolls back.

**When B6 is done and the 3 live checks pass, we deploy.**
