# GymConnect — THE Build Checklist (single source of truth)

*The one ordered plan the PO proxy and the Lead follow. Supersedes scattered notes. Reflects every decision through 2026-09-30. `[ ]` todo · `[~]` in progress · `[x]` done.*

## 🔍 SCENARIOS ARE THE BACKBONE — the loop every single item goes through

No item on this list is "done" by writing code. Every item — #1 through #11 — goes through the **scenario loop**:

1. **Map** — the `scenario-mapper` lists every scenario for that item: the normal path, the weird/illogical paths, the failure & offline paths, the abuse paths. *(This is the thing we never skip.)*
2. **Vet** — the advisors challenge those scenarios: 🔍 what else could go wrong + 🛡️ how it could be attacked/leak.
3. **Build** — the Lead builds to cover **all** those scenarios, not just the happy one.
4. **Test** — the built item is checked against its scenario list. **An item is only ticked `[x]` when it passes its scenarios.**

The living scenario library is **`docs/SCENARIOS.md`** (~250 mapped) + the fixes in **`docs/SCENARIOS-SOLUTIONS.md`**. Every checklist item points back to its scenarios there. New scenarios found mid-build get added there first, then covered.

**Definition of "done" for any item = its scenarios are mapped, vetted, built-for, and passing.**

---

**Rules we follow every time (no exceptions):**
- 🔍 **Scenarios first & last** — map + vet the scenarios before building, test against them before ticking done (the loop above). This is rule #1.
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

## 🟢 Phase 1 — Small adds + the (right-sized) safety net  ✅ built, war-council reviewed, on branch `feat/added-tag-and-export` — awaiting Abdullah's "merge"
- [~] **1. "Added" tag on each member** — next to the name: **Added today · yesterday · 2 days ago · 3 days ago (🔴 leaving soon)**, from the add-date. Lets reception see what's new vs about to auto-delete. *(🔍 reads the one shared retention setting, not a hardcoded "3", so "leaving soon" never drifts from the real auto-delete window.)* → built in `lib/format.ts` + `member-card.tsx`; timezone = gym-local Riyadh; re-ticks every minute so it rolls over at midnight; Arabic dual "قبل يومين" fixed.
- [~] **2. "Download list" button** (Export CSV) — this *is* the whole safety net. One tap → a copy the admin keeps. **No automated backup machine** (data's too short-lived + re-collectable to need it). Guard: neutralize a name that starts with `= + - @` so it can't run as a spreadsheet formula. → built in `lib/export-csv.ts` + `members-list.tsx`; formula-injection neutralized, RFC-4180 quoted, UTF-8 BOM (Arabic in Excel), phone kept as text, deferred URL revoke.

*Phase-1 review flags for Abdullah (small, none block merge):*
- 🎨 "leaving soon" uses the on-brand red/destructive tint (DESIGN.md is green-only; red is the only allowed accent, used for delete/errors) — **not** amber. OK, or want it neutral grey?
- 📄 CSV phone shows a leading `'` in Excel (the trick that stops Excel mangling a 12-digit number). Keep it safe-but-slightly-ugly, or switch to the `="…"` form?
- 🔎 "Download list" exports **everyone**, even while a search filter is active (it's a full-list backup). Keep as full backup, or export only what's shown?

## 🟡 Phase 2 — Wave 3: the real bug fixes (with the corrected specs)
- [~] **3. One phone format** (`lib/phone.ts`) — shared by add / search / paste; kill the hidden `"966"+number` hack; accept `05…` / `+966…` cleanly; expat numbers **if approved**. Idempotent + DB-enforced. → built + 22 scenario cases passing: one `lib/phone.ts` used by the form, storage, and search; paste of `+966…` / `00966…` / `0551…` / Arabic-Persian-fullwidth digits all snap to the right number; search finds a member by any of those formats. **Decided:** ✅ Saudi numbers only — no expat/non-Saudi numbers (Abdullah, 2026-10-01). **Still deferred:** Arabic-letter name normalization in search (SEARCH-10).
- [~] **4. The "already gone" rule, split by action** — delete: gone = success; **mark-sent: never blind-succeed** (check first, or it marks someone "Messaged" who wasn't); reset: wait for the server. → built core on branch `fix/write-path-honesty`, backend-engineer-reviewed GO: delete is now idempotent (no ghost row), mark-sent verifies the row really changed before trusting it (rolls the green tick back if not), and every request has a 15s timeout so nothing hangs forever. **Deferred to #8** (needs the role-probe/gate): routing an RLS *denial* (access revoked mid-session) to the pending gate, and making reset non-optimistic.
- [~] **5. Live-refresh the list safely** — refresh on return-to-tab + every ~90s + before a broadcast, with a tiny "did anything change?" check; guard so it never undoes an in-flight action; paused during a broadcast. → built + backend-reviewed (blocking race fixed): refreshes on tab-focus, every 90s, and right before a broadcast; paused while the panel is open or the tab is hidden; a `writeEpoch` + in-flight counter + single-flight guard mean a background refresh can never clobber or resurrect a row mid-write. **Deferred (finops):** the "did anything change?" fingerprint probe (needs an `updated_at`/hash to catch sent-status changes cheaply) — full refetch for now (tiny at gym scale).
- [~] **6. Honest errors + no-lost-work** — offline/paused says the truth (not "wrong password"); a failed load says "nothing was deleted"; typed text is never lost. *(🔍 added: every request times out (~10s) instead of hanging forever; if the login expires mid-work, show "session expired" and keep what was typed.)* → built + 9 classifier cases passing: login now distinguishes wrong-password from can't-connect (offline / paused / server error / timeout) and shows the honest message; load-failed now reassures "nothing was lost"; typed email/password are never cleared on a failed sign-in; the ~10s→15s request timeout already shipped in #4. **Folded into #8:** the explicit "session expired mid-work" banner + preserving typed text across a forced sign-out (needs the session/gate work).
- [~] **7. Broadcast safety** — "Are you sure?" on Reset; no accidental rapid-fire (Enter-hold / double-click); only message who's actually selected + shown; skip an already-gone member cleanly; say **"Messaged"** not "Sent". *(🔍 also: reuse one WhatsApp Web tab, not a new tab per person; don't let the toast cover the header buttons.)* → built + frontend-reviewed (two review fixes applied): confirm dialog before Reset (Cancel focused, can't be Enter-held into confirming); a 500ms cooldown stops double-click / Enter-hold from blasting past members (the first lock was a no-op — fixed); one reused WhatsApp Web tab instead of N; popup-blocked no longer false-marks "sent". **Still open:** "Messaged" wording (your pending decision — left as "Sent"); toast-over-header (minor, separate); one-tab means an un-sent draft is replaced when you advance (accepted trade-off of one-tab).
- [ ] **8. Pending-user gate** — a not-yet-approved account sees a friendly "waiting for approval" screen (never a broken empty app); a flaky network never looks like "not approved". *(🔁 also absorbs the deferred bits of #4: a shared role-probe that routes an access-revoked-mid-session user to this gate for delete / mark-sent / reset, and makes reset non-optimistic. 🔁 and from #6: a "session expired" banner that keeps typed text across a forced sign-out.)*
- [~] **8b. Never-blank-screen guard** — if the app is ever misconfigured (missing keys), show a friendly message instead of a blank white page, and fail the build if keys are missing. *(🔍 a missing key currently crashes the whole app on load.)* → built + verified: confirmed the old code threw "supabaseUrl is required" at import (the crash); now `isSupabaseConfigured` drives a friendly bilingual "Setup needed" screen and the client uses a safe placeholder so import never throws. **Build-fail-on-missing-keys moved to deploy step #9** (it's a Vercel/CI env check).

## 🔴 Phase 3 — Ship v1 (each step needs Abdullah's "yes")
- [ ] **9. release-verifier live GO / NO-GO** — run the database file on the real project; **fail the build/deploy if the Supabase env keys are missing** (the build-fail half of #8b); then prove **on the live system**: a stranger reads/changes nothing; **🛡️ a logged-in staff member can't make themselves admin, can't change settings, can't read other people's profiles**; **🛡️ no secret key leaked into the app bundle or git**; the **3 signup doors are OFF** (⚠️ the single most dangerous switch in the whole project); the auto-delete window is locked to 7h/24h/2d/3d; security headers ship; overlays sit right after scrolling; offline actions roll back.
- [ ] **10. Deploy to Vercel** → v1 is live. 🚀

## 🔵 Phase 4 — v2 Admin Console (only after v1 is live)
- [ ] **11. Build the 6-tab admin console** — user approve/create, analytics (2 simple charts), feedback inbox, reports/export, activity log, settings. (Design mockup + requirements already done.)

---

## 🔬 Phase 2 review findings (crew: frontend + backend + black-hat + QA + scenario-mapper, 2026-10-01)

**Consensus:** the 7 fixes are solid at the core (DB hardening, phone parsing, CSV safety, mark-sent verification, the live-refresh race — all confirmed by multiple reviewers). But the crew found a cluster of real gaps. QA says **don't ship until R1–R3 are fixed.**

**Fix wave (agreed blockers — do before #8 / ship):**
- [ ] **R1 — noopener regression (security).** The one-tab WhatsApp reuse dropped `noopener`, handing web.whatsapp.com a live `window.opener` back into the app (reopens blocker B8). Fix: keep the named tab but `const win = window.open(url, "gymconnect-whatsapp"); if (win) win.opener = null;` in broadcast-panel + page. *(black-hat #2, scenario #1, QA D8)*
- [ ] **R2 — failed load shows "No members yet."** A load error only toasts for 3s, then renders the empty state → looks like the roster was wiped; staff re-add everyone. Fix: a mounted error card + Retry, never the `noMembers` state on error. *(frontend #1, QA D3, scenario X-02)*
- [ ] **R3 — broadcast abort re-messages people.** `selected` isn't pruned on send/abort, so Esc-then-Start re-messages the already-contacted. Fix: drop the id from `selected` on each successful send. *(frontend #4, QA D1, scenario BCAST-27)*
- [ ] **R4 — Enter-hold still advances.** The 500ms cooldown blocks double-click but holding Enter opens one chat every 500ms. Fix: ignore `onKeyDown` when `e.repeat`. *(QA D2)*
- [ ] **R5 — sign-out fails silently offline.** On a flaky network sign-out hangs then leaves the session alive on a shared PC. Fix: `signOut()` → on error, `signOut({ scope: "local" })`; show busy/feedback. *(frontend #3, backend #1, QA D6)*

**Fold into #8 (confirmed on-plan, not new):** pending-approval gate; role-probe routing an RLS *denial* (delete / mark-sent / reset) to the gate; **non-optimistic reset**; session-expired banner; the "never replace a non-empty list with an empty/errored result" guard; tighten `settings_read` so `pending` can't read it.

**Smaller follow-ups (medium/low, after the wave):** initial load bypasses the write-epoch guard (an add during first load can vanish — disable the form while loading); `classifyAuthError` too broad (429→"connection", email_not_confirmed→"wrong password" — match on `code` first); `phoneMatches` matches the "966" country code so "9"/"966" matches everyone (gate it); `fetchMembers` has no row cap (>1000 silently truncates); phone **typed** digit-by-digit with a prefix sticks (paste is fine); hoist `Intl.DateTimeFormat` out of per-render; `dir="ltr"` on phone numbers for RTL.

**Ops (can't fix in code — Abdullah/dashboard):** 🛡️ re-confirm Supabase **signup is OFF** — it's the one precondition that turns "pending user has no data access" into "a stranger gets a valid logged-in foothold." *(black-hat: single highest-priority item.)*

**Housekeeping:** add the new **TAG-** and **CSV-** scenario families to `docs/SCENARIOS.md` (the "Added" tag + CSV export shipped with no scenario family of their own).

---

## 🗺️ Phase 5 — The Scenario → Solution → Covered-by index (all in one place)

*This is the "where are the 250 scenarios" answer, wired to the plan. The full map lives in `docs/SCENARIOS.md` (~250, 8 families) and every flagged one has a best-practice solution in `docs/SCENARIOS-SOLUTIONS.md` (panel + war-council reviewed). This table is the index: each scenario family → its solution home → the checklist item that actually ships the fix. A family is only fully "done" when its checklist item is `[x]`.*

| # | Scenario family (in SCENARIOS.md) | Best solution (in SCENARIOS-SOLUTIONS.md) | Shipped by checklist item |
|---|---|---|---|
| 1 | `LOGIN-` — login & session | Part B → Login & session; Part A rulings | #6 honest errors, #8 pending-gate, #8b never-blank; #9 live RLS check |
| 2 | `ADD-` — add member | Part B → Add member; Part E3 | #3 one phone format |
| 3 | `SEARCH-` — search | Part B → Search | #3 (shared phone parse) + #5 live-refresh |
| 4 | `DEL-` — delete | Part B → Delete; Part A split-0-row ruling | #4 "already gone" rule (delete side) |
| 5 | `BCAST-` — sent status & broadcast | Part B → Broadcast & sent status | #4 (mark-sent side), #7 broadcast safety |
| 6 | `SET-` — settings & preferences | Part B → Settings/auto-delete/cross-cutting | #9 settings locked (7h/24h/2d/3d) |
| 7 | `AUTO-` — auto-delete | Part B → auto-delete; Part E1 backup/recovery | #2 Export CSV (safety net) + #9/#10 go-live |
| 8 | `X-` — cross-cutting (offline, timeouts, overlays, PII) | Part A, Part C wording, Part E2 cost, Part E3 | #6 timeouts/no-lost-work, #8b guard, #9 headers |
| — | "Added" tag + Export (new in Phase 1) | reviewed live this build (black-hat + frontend + scenario-mapper) | #1, #2 ✅ |

**Reading it:** nothing here is unsolved. The solutions were found once (panel + war council) and are folded into the phase items above instead of a separate build-phase — so we build the fix *and* its scenarios together. New scenarios found mid-build get added to `SCENARIOS.md` first, then covered.

---

## ⏳ Pending Abdullah decisions (small — don't block most of Phase 1–2)
- [x] ~~Allow expat / non-Saudi numbers?~~ → **NO, Saudi-only** (decided 2026-10-01).
- [ ] Say **"Messaged"** instead of "Sent"? *(recommend yes — the app only opens the chat)*
- [ ] **Auto sign-out after 60 min** idle (with a warning, paused during a broadcast)? *(recommend yes)*
- [ ] **Auto-delete counts from when added**, no "off" switch? *(recommend yes)*
