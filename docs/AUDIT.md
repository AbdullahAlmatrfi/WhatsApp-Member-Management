# GymConnect — Audit & Review Log 🔍

Findings from the specialist agents, measured against **`docs/SRS.md` v1.0**.
*Full review: 2026-09-30 — security, QA, frontend, and database agents, independently, then cross-checked.*

## 🚦 Launch gate: **NO-GO** until every **Blocker** below is PASS.

Every row points to the SRS requirement it breaks, so "fixed" = "that requirement now PASSes".

---

## 🔴 Blockers (must be PASS before deploy)

| # | Requirement(s) | Problem | Fix | Status |
|---|---|---|---|---|
| B0 | **NFR-3** (CRITICAL, needs live check) | The whole data wall rests on one Supabase dashboard toggle. If email signup is ON, anyone on the internet self-registers → the `handle_new_user` trigger auto-grants a working `staff` account → full read/**delete** of every member's name + phone. | Verify signup is OFF on every environment (`POST /auth/v1/signup` must return "Signups not allowed"). Then change `handle_new_user()` to create a non-privileged `role='pending'` that no `members` policy grants, requiring explicit admin promotion. | 🔧 Open |
| B1 | **NFR-22 / F1** | Always-on `transform: scale(1) translateX(0)` **and** `filter: blur(0px)` on the app wrapper make it the containing block for every overlay → dialogs, Broadcast, toast mis-position after scroll. | Set **both** `transform` and `filter` to `none` when idle (SRS confirmed transform alone is not enough). | 🔧 Open |
| B2 | **NFR-18 / F2** (FR-26, FR-31, FR-33) | Delete, mark-sent and reset-sent update the screen first and never roll back on DB failure → screen and database disagree. | Snapshot state before each optimistic update; restore it (or refetch) in the `catch`. Restore the *previous* sent value, not a hard-coded false. | 🔧 Open |
| B3 | **FR-16 / F4** (+ NFR-15) | Add form clears the typed name/phone before the save is confirmed; on failure the input is lost. Plus a fake 500 ms delay in the submit path. | Make `handleAddMember` return success; `await` it in the form; clear only on success. Delete the fake delay. | 🔧 Open |
| B4 | **FR-19 / F3 + FR-12 / FR-13** | No DB uniqueness or format rule on phone. Duplicate check is browser-only; invalid/short numbers get stored (`966123456`); a `23505` error is shown as a generic "save failed". | Add `UNIQUE(phone)` + `CHECK (phone ~ '^9665[0-9]{8}$')` + name CHECK (idempotent SQL ready). Validate `^5\d{8}$` in the form, always prepend `966`, remove the `startsWith("966")` branch, map `23505` → `t.numberExists`. | 🔧 Open |
| B5 | **NFR-34** | `next.config.mjs` has `ignoreBuildErrors: true` — a deploy can ship type errors, contradicting the tsc-clean rule. `tsc` is clean today, so flipping it is free. | Set `ignoreBuildErrors: false`. | 🔧 Open |
| B6 | **NFR-23/24/25/26/27/28** | Overlays have no dialog role, no Escape-to-close, no focus trap; toast has no `aria-live` and an older toast's timer hides a newer one; the per-member Delete button is invisible on touch/keyboard; inputs have no labels. | The repo already ships Radix `alert-dialog`, `dialog`, `sheet`. Move Delete → `AlertDialog`, Settings → `Sheet`, Broadcast → `Dialog` (gives role, Escape, focus trap, and portals out of the F1 wrapper for free). Fix the toast timer (ref + clearTimeout) and add `aria-live`. Add labels. | 🔧 Open |
| B7 | **FR-6** (privacy) | `members` state is never cleared on sign-out → the next user can briefly see the previous user's member list (PII across sessions). | Reset `members` + broadcast/settings/delete UI state when the session becomes null. | 🔧 Open |
| B8 | **NFR-8** | `window.open` calls omit `noopener,noreferrer` (reverse-tabnabbing); no security headers (clickjacking). | Pass `"noopener,noreferrer"`; add `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` via `headers()`. | 🔧 Open |

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

## Sign-off (this review)
- **Security:** NO-GO — B0 unverified (Critical) + B8 hardening open.
- **QA:** NO-GO — Must FRs failing (B2, B3, B4).
- **Frontend:** NO-GO — B1, B2, B3, B6 open.
- **Database:** NO-GO — B4 constraints not in schema.

**When B0–B8 show ✅ and the live RLS/signup tests pass, we deploy.**
