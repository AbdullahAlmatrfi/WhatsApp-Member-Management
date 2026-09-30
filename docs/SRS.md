# GymConnect — Software Requirements Specification (SRS)

Version 1.0 · 2026-09-30 · Baseline: `main` as read on this date · Owner: Product Owner (Abdullah) · Author: Business Analyst agent

> This is the **acceptance baseline** for GymConnect. QA, security and code-review agents mark each requirement **PASS or FAIL** against it. It is derived from the code, `PROJECT_PLAN.md`, `docs/AUDIT.md`, `DESIGN.md` and `CLAUDE.md`.

---

## 1. Introduction

### 1.1 Purpose
This document is the acceptance baseline for GymConnect. Every review measures the code against these numbered requirements — no finding without a requirement ID.

### 1.2 Scope
GymConnect is a web app for gym reception staff. It:
- Stores members (name and phone) in a database.
- Lets staff search and delete members.
- Sends WhatsApp text messages to selected members by opening a pre-filled WhatsApp chat for each one (staff presses Send in WhatsApp).
- Tracks Not sent / Sent status per member.
- Automatically deletes members after a configurable window (default 3 days).

Access is admin-provisioned login only. The UI is bilingual (English / Arabic RTL).

### 1.3 Definitions

| Term | Meaning |
|---|---|
| Admin | Login account whose `profiles.role = 'admin'`. |
| Staff | Any authenticated account (`role = 'staff'` or `'admin'`). |
| Member | A gym customer record: name plus phone. Recipient only, never a user of the system. |
| Sent | `members.sent = true`. Staff opened the WhatsApp chat for that member through Broadcast. It does **not** mean WhatsApp delivered the message (see Q2). |
| Handoff | Opening WhatsApp (Web or Desktop) with a pre-filled recipient and text. |
| RLS | PostgreSQL Row Level Security. |
| PDPL | Saudi Personal Data Protection Law. |
| Full phone | `966` followed by a 9-digit mobile number starting with 5, e.g. `966551234567`. |
| Toast | The transient notification in `components/toast.tsx`. |

### 1.4 Actors

| Actor | Description |
|---|---|
| Staff / reception | Signs in, manages members, runs broadcasts. Same data access for all authenticated users. |
| Admin | Staff plus permission to change `settings` (RLS). Accounts are created in the Supabase dashboard only. |
| Gym member | Recipient of WhatsApp messages. Has no access to the app. |
| System (pg_cron) | Runs the hourly auto-delete job. |

### 1.5 Conventions
- Requirement IDs (FR-n, NFR-n) are **stable**. Never renumber them; append new ones.
- **[GAP]** = the code was read on 2026-09-30 and appears not to meet the requirement. Expect FAIL until fixed.
- **[PLANNED]** = the feature is not built yet.
- Priorities: **Must** blocks launch, **Should** is needed for quality, **Could** is optional.
- Every acceptance criterion is Given/When/Then and produces a binary PASS or FAIL.

---

## 2. Overall description

### 2.1 Product perspective
A single-page Next.js 16 / React 19 client app (`app/page.tsx`). It talks directly from the browser to Supabase (Postgres + Auth) using the public anon key via `lib/members-api.ts` and `lib/auth.tsx`. Security rests on RLS in `supabase/schema.sql`. No custom backend, no server-side rendering of data. Hosting on Vercel.

### 2.2 User classes
- **Reception staff:** daily use. Adds members, broadcasts, deletes.
- **Admin (the Product Owner):** all of the above, plus account creation (Supabase dashboard) and changing settings.

### 2.3 Operating environment
- **Client:** modern desktop and mobile browsers (see NFR-39). WhatsApp Web or Desktop must be available on the reception machine.
- **Hosting:** Vercel. `@vercel/analytics` loads in production only (`app/layout.tsx`).
- **Backend:** Supabase project with Auth (email/password, signup disabled), Postgres, and `pg_cron`.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` only. `.env*.local` is git-ignored.

### 2.4 Assumptions and dependencies
- A1. WhatsApp click-to-chat / deep-link behavior is controlled by WhatsApp and may change. The app cannot verify delivery.
- A2. Supabase free tier is sufficient. Free projects pause after ~1 week of inactivity, which would make login and the list fail (see Q9).
- A3. "Signup disabled" is a Supabase dashboard setting, not code. Re-verify on every environment (NFR-3).
- A4. Preferences (language, theme, WhatsApp mode) are per-browser in localStorage, not per-account.
- A5. No realtime sync. Each staff member sees the list as of their last load.
- A6. Members are Saudi mobile numbers (`+966 5XXXXXXXX`) (see Q5).
- A7. Expected scale is up to ~500 concurrent members (3-day retention).

### 2.5 Constraints
- C1. Design locked to green: `--primary #10b981`, `--destructive` for danger only. Tokens only, no new colors (`DESIGN.md`).
- C2. Bilingual EN/AR with logical `start/end` properties. Every user string lives in `lib/translations.tsx`.
- C3. TypeScript strict, `tsc` clean. Match existing patterns.
- C4. Free stack (Supabase + Vercel), $0.
- C5. Nothing ships with an open Critical or High issue (`PROJECT_PLAN.md` §2). Launch is currently **NO-GO** pending F1–F4.

### 2.6 Open questions & conflicts for the Product Owner
These need a decision. Where a decision is pending, the FR states current/default behavior.

| # | Question / conflict |
|---|---|
| Q1 | Brief says "wa.me handoff", but code uses `web.whatsapp.com/send` and `whatsapp://send`. FR-42 specifies the code's behavior. Confirm, or switch to `wa.me/<phone>?text=`. |
| Q2 | "Sent" is set when the chat is opened, not when delivered. Current copy says "chats were opened and sent", which overclaims. Confirm wording. |
| Q3 | Auto-delete counts from `created_at`, not from send time. A member can be purged mid-campaign. Intended? Is "off" (0) allowed? Plan lists only 7h/24h/2d/3d, but the DB accepts any value ≥ 0 and treats 0 as off. |
| Q4 | "Reset sent" is global for all staff. Confirm. |
| Q5 | Audit rule "9 digits starting with 5" excludes foreign numbers. Confirm market is Saudi mobiles only. |
| Q6 | `profiles.role` exists, but RLS on `members` gives every authenticated user full CRUD. Intended, especially once bulk delete exists? |
| Q7 | Conflict: `DESIGN.md` mandates white text on `#10b981` (~2.5:1), which fails WCAG AA (NFR-29). Darken the green, use dark text on green, or accept the exception? |
| Q8 | PDPL: legal review needed on lawful basis/consent for marketing messages, and Supabase region / cross-border transfer (NFR-12). |
| Q9 | Operating plan for Supabase free-tier pausing (a keep-alive or restore procedure)? |
| Q10 | Is reception on desktop or phone? On phones the `whatsapp://` scheme and `window.open` behavior differ. |
| Q11 | No edit-member feature. A typo means delete and re-add. Confirm out of scope (§7). |

---

## 3. Functional requirements

### 3.1 Authentication and session

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| FR-1 | Login gate | Must | Nothing except a spinner or the login screen renders until a valid session exists. No member data is requested before a session exists. | No session → login screen shows, zero requests hit `/rest/v1/members`. Pending session → only a spinner, no form/list flash. | `app/page.tsx`, `lib/auth.tsx` |
| FR-2 | Sign in | Must | Email + password via Supabase. Submit disabled while a field is empty or a request is in flight. | Empty field → Sign in disabled. Valid creds → busy state, main screen replaces login, no reload. In-flight → a second submit can't fire. | `components/login-screen.tsx`, `lib/auth.tsx` |
| FR-3 | Sign-in failure | Must | Any auth failure shows one localized generic message that doesn't reveal whether the email exists. User stays on login. | Unknown email and wrong password give identical `t.loginFailed`, in the active language; button re-enables. | `components/login-screen.tsx` |
| FR-4 | Session persistence | Must | A signed-in user who reloads stays signed in until sign-out or token expiry. | Reload → main screen, no login form. Expired/invalid session → login screen. | `lib/auth.tsx` |
| FR-5 | Sign out | Must | A header Sign-out control ends the session. | Click → login screen; reload still shows login; old token request to members returns no data/401. | `app/page.tsx`, `lib/auth.tsx` |
| FR-6 | [GAP] Clear client data on sign out | Should | In-memory members/UI state discarded on sign-out, so the next user never sees the previous list. | User A signs out, B signs in without reload → no row from A renders before B's fetch resolves. | `app/page.tsx` (`members` never reset) |

### 3.2 Member list loading

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| FR-7 | Load members | Must | After sign-in, all members load newest first, with a localized loading indicator. | Newer above older; pending → "Loading members…"; success → count badge equals DB row count. | `app/page.tsx`, `lib/members-api.ts` |
| FR-8 | [GAP] Load-failure state | Should | On fetch failure show an error + Retry; do not show the empty state. | Fetch fails → localized error + Retry, `t.noMembers` absent. Retry then success → list renders. | `app/page.tsx` (toast only) |
| FR-9 | [GAP] No refetch on token refresh | Should | Token refresh / tab focus must not re-trigger the fetch or spinner. | `TOKEN_REFRESHED` → no new members GET, no spinner. New sign-in (uid changes) → list does refetch. | `app/page.tsx` (effect depends on `session` object) |

### 3.3 Add member

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| FR-10 | Required fields | Must | Add requires non-blank name and phone; both trimmed before saving. | Empty/whitespace → Add disabled. `"  Ali  "` → stored `"Ali"`. | `components/add-member-form.tsx` |
| FR-11 | Phone input constraints | Must | Phone field shows fixed `+966`, accepts digits only, max 9 chars. | `"5a5-1 2"` → `"5512"`. Paste 12 digits → 9. `+966` renders at inline-start in EN and AR. | `components/add-member-form.tsx` |
| FR-12 | [GAP] Phone validity | Must | Only a phone exactly 9 digits starting with 5 can submit; else localized inline error, no DB call. | `"512345"` (short) → rejected, no insert. `"123456789"` → rejected. `"512345678"` → accepted. | `components/add-member-form.tsx` |
| FR-13 | [GAP] Phone normalization | Must | Every stored phone matches `^9665[0-9]{8}$`; app always prepends `966` to the 9-digit input. | Input `"966123456"` is not stored as-is (rejected by FR-12). Any saved row matches the regex. | `app/page.tsx` (skips prefix when input starts with `966`) |
| FR-14 | [GAP] Name validity | Should | Name is 1–100 chars after trim, ≥1 non-space char (limit is a proposed default; PO confirms). | 101-char name → rejected. Inserting `name='  '` fails a CHECK. | `supabase/schema.sql` (`not null` only) |
| FR-15 | Save-first add | Must | A member appears only after the DB confirms the insert; prepended, count +1, success toast. | Success → row at top, count +1, `t.memberAdded`. Delayed insert → not in list until resolved. | `app/page.tsx`, `lib/members-api.ts` |
| FR-16 | [GAP] F4 Keep input on failure | Must | Fields clear only after a confirmed successful save. On any failure the typed values remain. | Failed insert / duplicate → inputs preserved + error toast. Success → both fields cleared. | `components/add-member-form.tsx`, `app/page.tsx` (`onAddMember` not awaited) |
| FR-17 | Double-submit guard | Must | While saving, submit is disabled and busy; Enter can't trigger a second insert. | Rapid double click / Enter → exactly one INSERT. | `components/add-member-form.tsx` |
| FR-18 | Client duplicate check | Should | If the full phone is already in the loaded list, show `t.numberExists`, send no insert. | Existing `966551234567`, submit `551234567` → toast, no INSERT. | `app/page.tsx` |
| FR-19 | [GAP] F3 DB-enforced uniqueness | Must | The DB rejects duplicate phones; app maps unique-violation (`23505`) to `t.numberExists`, not the generic error. | Two concurrent same-phone submits → one row, other user sees `t.numberExists`. Direct SQL dup insert → unique violation. UI matches DB. | `supabase/schema.sql` (no UNIQUE), `lib/members-api.ts`, `app/page.tsx` |

### 3.4 Search

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| FR-20 | Live search | Must | List filters client-side as the user types; matches name (case-insensitive) or phone (substring). | "ali"/"AL" → only "Ali". Phone `5512` → that member. Empty query → all. No network request. | `components/members-list.tsx` |
| FR-21 | Empty states and count | Must | 0 members → `t.noMembers`. Members but no match → `t.noResults`. Count badge = total, not filtered. | 0 → `t.noMembers`. 3 members, no-match query → `t.noResults`, badge still 3. | `components/members-list.tsx` |
| FR-22 | [GAP] Search normalization | Could | Query ignores spaces, `+`, and a leading `0`/`966`, so pasted numbers match. | Stored `966551234567`, query `0551234567` or `+966 55 123 4567` → member listed. | `components/members-list.tsx` |

### 3.5 Delete

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| FR-23 | Delete requires confirmation | Must | Clicking Delete opens a confirm dialog naming the member; nothing deleted yet. | Click Delete for "Ali" → dialog with `t.deleteConfirm` + "Ali", no DELETE sent. | `components/delete-dialog.tsx`, `app/page.tsx` |
| FR-24 | Cancel delete | Must | Cancel or backdrop click closes the dialog, changes nothing. | Cancel/backdrop → dialog closes, member remains, no DELETE. | `components/delete-dialog.tsx` |
| FR-25 | Confirm delete | Must | Confirming permanently removes the member from DB and list, shows `t.memberDeleted`. | Confirm → DELETE sent, row gone, count −1, toast. Reload → member absent. | `app/page.tsx`, `lib/members-api.ts` |
| FR-26 | [GAP] F2 Delete rollback | Must | If the DB delete fails, the member is restored and an error shows. State must not diverge from DB. | DELETE fails → member reappears in original position, count restored, save-failed error, no success toast. Reload → list equals DB. | `app/page.tsx` (never restores) |
| FR-27 | [PLANNED] Bulk delete | Should | Staff select multiple members and delete after one confirmation showing the count. | 3 selected → dialog shows "3"; Confirm → all 3 removed from DB and list; failure → FR-26 rollback. | PROJECT_PLAN §4 #8 |
| FR-28 | [PLANNED] Delete all Sent | Should | One action deletes every `sent = true` member after a confirmation stating the exact count. | N sent → confirm → exactly those N deleted, not-sent remain. N=0 → disabled/hidden. Failure → FR-26 rollback. | PROJECT_PLAN §4 #8 |

### 3.6 Sent status

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| FR-29 | Status display | Must | Each card shows `t.notSent`/`t.sent` from `members.sent`; new members start Not sent. | New member → "Not sent", DB `sent=false`. DB `sent=true` → "Sent" after reload. | `components/member-card.tsx`, `lib/members-api.ts` |
| FR-30 | Mark sent on chat open | Must | "Open & send" persists `sent=true` for that member only; Skip does not change status. | Open & send M1 → M1 `sent=true`. Skip M2 → M2 unchanged. | `components/broadcast-panel.tsx`, `app/page.tsx` |
| FR-31 | [GAP] F2 Mark-sent rollback | Must | If persisting `sent=true` fails, badge reverts to Not sent + error. | UPDATE fails → badge back to "Not sent" + error toast. Reload → matches DB. | `app/page.tsx` |
| FR-32 | Reset sent | Must | Reset (visible only when ≥1 Sent) sets `sent=false` for all and persists it. | 0 sent → control absent. ≥1 sent → Reset → all "Not sent", DB has zero `sent=true`. | `components/broadcast-panel.tsx`, `lib/members-api.ts` |
| FR-33 | [GAP] F2 Reset rollback | Must | If reset fails, every previously-Sent member is restored to Sent + error. | Reset UPDATE fails → previously-Sent show "Sent" again + error toast. | `app/page.tsx` |
| FR-34 | Per-member WhatsApp open | Must | Card's WhatsApp button opens a chat with that member (no pre-filled text) using FR-52 preference; does not change Sent. | Web → new tab `web.whatsapp.com/send?phone=<full>`. Desktop → `whatsapp://send?phone=<full>`. `sent` unchanged. | `app/page.tsx`, `components/member-card.tsx` |

### 3.7 Text broadcast

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| FR-35 | Open/close panel | Must | Header Broadcast opens a full-screen panel; X closes. Selection + text persist while page stays loaded. | Broadcast → panel shows. X → closes, main screen intact. Reopen without reload → message text still there. | `app/page.tsx`, `components/broadcast-panel.tsx` |
| FR-36 | Compose (text only) | Must | Multi-line field, live char count, `{name}` hint, "media coming soon" notice, no upload/attach control. | "Hi" → counter 2. No file input/attach button. Media-coming-soon text shows. | `components/broadcast-panel.tsx` |
| FR-37 | Recipient filter | Must | Two toggles, Not sent (default) and Sent, list matching members with counts. | 4 members, 1 sent → toggles read Not sent 3 / Sent 1; default lists 3; Sent toggle lists 1. | `components/broadcast-panel.tsx` |
| FR-38 | Recipient selection | Must | Toggle members individually; "Select all shown" / "Clear selection" act on the shown list; selected count shown. | 3 shown → Select all → 3 checked, count 3; then Clear → shown deselected. | `components/broadcast-panel.tsx` |
| FR-39 | Start gating | Must | Start disabled when nothing selected or message empty/whitespace. | 0 selected → disabled, `t.selectToStart`. ≥1 + `"   "` → disabled. 2 + text → enabled, "Start broadcast to 2". | `components/broadcast-panel.tsx` |
| FR-40 | `{name}` personalization | Must | Every literal `{name}` (case-sensitive) → recipient's first name (text before first space); rest unchanged; no `{name}` → verbatim. | "Dear {name}, hi {name}" + "Sara Ali" → "Dear Sara, hi Sara". "سارة محمد" → "سارة". "{Name}" not replaced. | `components/broadcast-panel.tsx` |
| FR-41 | Guided step-through | Must | After Start, walk selected members one at a time: "Member i of N", progress bar, recipient, personalized preview. Skip advances without opening; Open & send opens chat, marks sent (FR-30), advances. | 3 selected → step 1 "Member 1 of 3". Skip → next, no window. Open & send → exactly one window, step advances. Queue holds all selected even if filter toggled. | `components/broadcast-panel.tsx` |
| FR-42 | WhatsApp handoff URL | Must | Web → new tab `web.whatsapp.com/send?phone=<full>&text=<encodeURIComponent>`. Desktop → `whatsapp://send?...`. Phone has no `+`/space/dash. Chat opens only; staff presses Send (see Q1). | `966551234567` + "Hi Sara & co?" → URL has `phone=966551234567&text=Hi%20Sara%20%26%20co%3F`. Desktop → `whatsapp://send`. No message sent without a WhatsApp send action. | `components/broadcast-panel.tsx` |
| FR-43 | Completion summary | Must | After the last member, summary "X of N" chats opened (X = Open & send clicks). Done closes panel, clears selection. | 3 selected, 2 opened, 1 skipped → "2 of 3". Done → panel closes, selection 0 on reopen (see Q2). | `components/broadcast-panel.tsx` |
| FR-44 | [GAP] Selection integrity | Should | Selected count counts only members that still exist; deleted/auto-deleted dropped from selection. | 3 selected, 1 deleted → count reads 2, queue 2 entries; Start label count = queue length. | `components/broadcast-panel.tsx` (`selected.size` includes stale ids) |
| FR-45 | Human-in-the-loop sending | Must | The app never opens a chat or sends without an explicit staff click for that recipient. No timer, loop or batch auto-open. | Windows opened = Open & send clicks. Idle step → no window without interaction. | `components/broadcast-panel.tsx`; PROJECT_PLAN §7 |

### 3.8 Auto-delete

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| FR-46 | Hourly cleanup job | Must | pg_cron `gymconnect-cleanup` runs minute 0 hourly; deletes members `created_at < now() - auto_delete_hours`; no-op if null or ≤0 (Q3). | `auto_delete_hours=72`, member 73h vs 71h → only first deleted. `cron.job` has `gymconnect-cleanup` `0 * * * *`. Value 0 → nothing deleted. | `supabase/schema.sql` |
| FR-47 | Default window | Must | `settings` has exactly one row (`id=1`) with `auto_delete_hours=72` default. | Fresh schema → returns 72. Insert `id=2` → fails singleton CHECK. | `supabase/schema.sql` |
| FR-48 | [GAP] Allowed windows only | Should | DB accepts only 7, 24, 48, 72 hours (Q3 decides whether "off" is allowed). | `UPDATE ... =5` → rejected by CHECK. Each of 7/24/48/72 accepted. | `supabase/schema.sql` (only `>= 0`) |
| FR-49 | Job not callable by clients | Must | `cleanup_old_members()` and `handle_new_user()` not executable via API by anon/authenticated. | Authenticated `rpc('cleanup_old_members')` → permission error, no rows deleted. | `supabase/schema.sql` |
| FR-50 | [GAP] Settings UI for window | Should | Admin views/chooses the window (7h/24h/2d/3d) in Settings; non-admins read-only or hidden; persists in `settings`. | Admin → 4 options, current selected; change to 24h persists. Non-admin → change fails / disabled. | PROJECT_PLAN §6; `components/settings-panel.tsx` |

### 3.9 Preferences and localization

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| FR-51 | Settings open/close | Must | Header settings icon opens a side panel; X or overlay click closes. | Icon → visible. X/overlay → hidden. | `app/page.tsx`, `components/settings-panel.tsx` |
| FR-52 | WhatsApp preference | Must | Choose Web (default) or Desktop; persists in `localStorage.wa_preference`; drives FR-34/FR-42. | Fresh → Web. Desktop + reload → still Desktop. Handoff uses selected mode. | `lib/translations.tsx`, `components/settings-panel.tsx` |
| FR-53 | Theme | Must | Dark (default) or Light; persists `localStorage.theme_preference`; class on `<html>`. | Light → `<html>` class `light` not `dark`; reload persists. | `lib/translations.tsx` |
| FR-54 | Language & direction | Must | English (default) or Arabic; persists `localStorage.lang_preference`; whole UI switches without reload; `<html lang/dir>` update (`dir="rtl"` for AR). | Arabic → `dir==="rtl"`, `lang==="ar"`, all labels Arabic. English → `ltr`. Reload persists. | `lib/translations.tsx` |
| FR-55 | [GAP] Tolerate invalid stored prefs | Should | Unknown/tampered value in any preference key falls back to default; app renders normally. | `lang_preference="fr"` → renders English, no exception. `theme_preference="x"` → Dark. | `lib/translations.tsx` (values cast, not validated) |

---

## 4. Non-functional requirements

### 4.1 Security

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| NFR-1 | RLS enabled | Must | RLS on `members`, `profiles`, `settings`. | `relrowsecurity=true` for all three. | `supabase/schema.sql` |
| NFR-2 | Auth required for all data | Must | Anon key + no user JWT can read/write nothing in any table. | No session → select/insert/update/delete on each table via REST → zero rows or error, no row changes. | `supabase/schema.sql` |
| NFR-3 | No public signup | Must | Signup disabled in Supabase Auth; app exposes no sign-up/magic-link/reset UI. | POST `/auth/v1/signup` → rejected. No registration control. Verify on every environment. | AUDIT; `components/login-screen.tsx` |
| NFR-4 | Only public secrets ship | Must | Bundle/repo contain only the URL + anon key. No `service_role` key or DB password anywhere. | Search bundle, git history, repo for `service_role` + DB password → nothing. `.env*.local` git-ignored. Example holds placeholders. | `lib/supabase/client.ts`, `.gitignore` |
| NFR-5 | Privilege boundaries | Must | Staff can't modify `settings`, can't read others' profiles, can't insert/update/delete any profile (no self-promotion). | Staff JWT → `UPDATE settings` 0 rows; `select * from profiles` only own row; `UPDATE profiles SET role='admin'` 0 rows/errors. | `supabase/schema.sql` |
| NFR-6 | SECURITY DEFINER hygiene | Must | Every SECURITY DEFINER function pins `search_path` and has EXECUTE revoked from public/anon/authenticated. | `proconfig` has `search_path=public`; anon/authenticated lack EXECUTE. | `supabase/schema.sql` |
| NFR-7 | Output encoding | Must | Member names + message text rendered as text, never HTML; URL text percent-encoded. | `<img src=x onerror=alert(1)>` displays literally, no script. No `dangerouslySetInnerHTML` in `app/`/`components/` (excl. `ui/`). | `components/member-card.tsx`, `components/broadcast-panel.tsx` |
| NFR-8 | [GAP] Hardening | Should | `window.open(...,"_blank")` uses `noopener,noreferrer`. Deployed app sends `X-Content-Type-Options: nosniff`, a `Referrer-Policy`, and clickjacking protection. | Prod headers present; handoff `window.opener` null. | `components/broadcast-panel.tsx`, `next.config.mjs` (none) |

### 4.2 Privacy and compliance

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| NFR-9 | Data minimisation | Must | Only name + phone stored about a member; operational fields `sent`, `created_at`, `id`. | `members` columns are exactly `id, name, phone, sent, created_at`. New PII column needs an approved SRS change. | `supabase/schema.sql` |
| NFR-10 | No PII leakage | Must | Name/phone never written to localStorage, console, app URLs, or analytics. | localStorage holds only the 3 prefs + Supabase auth key. Console shows no name/phone. Analytics requests contain none. | `lib/translations.tsx`, `app/layout.tsx` |
| NFR-11 | Erasure | Must | Deleting a member (manual/auto) is a permanent hard delete, no archive/soft-delete. | Deleted member → 0 rows by phone; no other table holds name/phone. | `lib/members-api.ts`, `supabase/schema.sql` |
| NFR-12 | [GAP] PDPL documentation | Should | `docs/` has a compliance note: purpose of processing, retention rule, Supabase region + cross-border, and the gym's consent process for WhatsApp marketing. PO confirms with counsel (Q8). | Note exists, each of the 4 items non-empty + PO sign-off; states current default retention (72h). | PROJECT_PLAN §7 |
| NFR-13 | WhatsApp policy adherence | Must | Only official click-to-chat handoff; no unofficial client/automation library; human-paced (FR-45). | `package.json`/lockfile has no `whatsapp-web.js`/`baileys`/similar. Broadcast passes FR-45. | PROJECT_PLAN §7 |

### 4.3 Performance

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| NFR-14 | List scale | Must | 500 members: main list + Broadcast list render/respond without jank. Ref: desktop Chrome, 4× CPU throttle. | First render after data ≤1s. Search keystroke input-to-paint ≤200ms. Recipient toggle paint ≤200ms. No long tasks >100ms on scroll. | `components/members-list.tsx`, `components/broadcast-panel.tsx` |
| NFR-15 | [GAP] No artificial delay | Must | Add-member feedback not delayed by artificial waits. | Stubbed instant insert → toast ≤150ms. No `setTimeout` fake wait in the submit path. | `components/add-member-form.tsx` (500 ms) |
| NFR-16 | Handoff speed | Must | "Open & send" calls `window.open` synchronously in the click handler, before awaited work; DB update doesn't gate it. | `window.open` invoked in the same event turn. Slow/failing DB → chat still opens. Handler ≤100ms excl. network. | `components/broadcast-panel.tsx` |
| NFR-17 | Initial load | Should | After sign-in, list uses a single query; visible list with 500 rows ≤2s on 4G. | 500 rows on throttled 4G → visible ≤2s; exactly one members GET (no N+1). | `lib/members-api.ts` |

### 4.4 Reliability

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| NFR-18 | [GAP] F2 State never diverges from DB | Must | For every mutation (add, delete, mark sent, reset, bulk delete when built), a failed DB write reverts/refetches UI to equal the DB and tells the user. | Forced failure per op → UI equals DB without reload + error. Makes FR-26/31/33 PASS. | `app/page.tsx` |
| NFR-19 | [GAP] Errors look like errors | Should | Failure messages visually/semantically distinct from success; use `--destructive`, not the success check style. | Failed save → destructive style, not green check. Success → green. | `components/toast.tsx` (one style for all) |
| NFR-20 | [GAP] Graceful offline | Should | Offline: no user action produces an uncaught exception/unhandled rejection; each failure surfaces a localized message. | Offline, each action (sign in, load, add, delete, mark sent, reset, sign out) → no uncaught errors/rejections. | `lib/auth.tsx` (no `catch`) |
| NFR-21 | [GAP] No silent truncation | Should | List must not silently drop rows above the API row limit (Supabase default ~1000/request). | 1200 members → all load (paginated) or explicit "showing first N" notice. | `lib/members-api.ts` (unbounded single query) |

### 4.5 Usability and accessibility

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| NFR-22 | [GAP] F1 Overlays anchor to viewport | Must | Full-screen overlays positioned relative to the viewport at any scroll offset; app wrapper has no transform/filter when idle. | Scrolled 500px → dialog/Broadcast/toast fully within viewport. Idle wrapper `transform` and `filter` are `none`. | `lib/translations.tsx` (idle style `scale(1) translateX(0)`) |
| NFR-23 | [GAP] Dialog semantics | Must | Delete dialog (`role="alertdialog"`), Broadcast panel, step-through, settings expose `role`, `aria-modal="true"`, `aria-labelledby`. | Each overlay open → those attributes present + named dialog in a11y tree. | `components/*` |
| NFR-24 | [GAP] Escape to close | Must | Escape closes the topmost open overlay; delete = Cancel (nothing deleted); step-through closes without marking sent. | Each overlay open + Escape → closes, no data changes. | AUDIT |
| NFR-25 | [GAP] Focus management | Must | On open, focus moves inside; Tab/Shift+Tab trapped; on close, focus returns to opener; closed panel not keyboard-reachable. | Open dialog + Tab ×20 → focus never leaves. Close → activeElement is opener. Closed settings → buttons not tabbable. | `components/settings-panel.tsx` |
| NFR-26 | [GAP] Toast live region + timing | Must | Toast container present, announces (`role="status"` `aria-live="polite"`; failures `role="alert"`); newer toast stays its full 3s. | Toast announced by screen reader. Two toasts 1s apart → second visible ≥3s. | `components/toast.tsx`, `app/page.tsx` |
| NFR-27 | [GAP] Keyboard + touch operability | Must | Every function keyboard-reachable with visible focus; per-member Delete visible/operable on touch + keyboard focus, not only mouse hover. | Keyboard only → all actions work. Touch (no hover) → can start a delete. Tab focus on card → Delete visible. | `components/member-card.tsx` (`opacity-0` unless hover) |
| NFR-28 | [GAP] Accessible names | Must | Every input/control has an accessible name in the active language; placeholders don't count. | Add inputs, search, textarea have `<label>`/`aria-label` from translations. Icon buttons localized (Arabic in AR). | `components/*` |
| NFR-29 | [GAP] Contrast | Should | Text + essential UI meet WCAG 2.2 AA (4.5:1 text, 3:1 large/UI) in both themes; DESIGN.md conflict resolved by PO (Q7). | Contrast checker → primary-button text passes AA both themes. Today white on `#10b981` ~2.5:1 → FAIL. | `app/globals.css`, `DESIGN.md` |

### 4.6 Localization

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| NFR-30 | EN/AR parity | Must | `translations.en` and `translations.ar` have identical key sets, no empty values; type system or a test enforces it. | Key diff empty. Missing AR key → `tsc`/test fails (today type derives from `en` only → enforcement missing). | `lib/translations.tsx` |
| NFR-31 | [GAP] No hard-coded user strings | Must | All user text, `aria-label`, `title` from `translations.tsx`; exceptions are language self-names + `+966`. | Search `app/`/`components/` (excl `ui/`) → only exceptions. Today "Message … on WhatsApp", "Delete …", "Close settings" fail. | `components/*` |
| NFR-32 | [GAP] Logical properties for RTL | Must | Layout uses `start/end`, not physical left/right; in Arabic toast + side panels anchor inline-end, layout mirrors. | Search for `left-`,`right-`,`ml-`,`mr-`,`pl-`,`pr-`,`text-left/right`,`border-l/r`,`rounded-tl` → no matches. AR → toast at top inline-end. | `components/toast.tsx`, `settings-panel.tsx`, `broadcast-panel.tsx` |
| NFR-33 | [GAP] Bidi-safe numbers | Should | Phones + emails render LTR in Arabic so digits don't reorder. | AR + `966551234567` → reads "+966 55 123 4567" in that visual order. Login email field LTR (already true). | `components/member-card.tsx`, `broadcast-panel.tsx` |

### 4.7 Maintainability

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| NFR-34 | [GAP] Type-clean + build enforces it | Must | `tsc --noEmit` exits 0 under strict; production build must not ignore type errors. | `npx tsc --noEmit` → exit 0. `next.config.mjs` `typescript.ignoreBuildErrors` not `true` (today it IS true). | `tsconfig.json`, `next.config.mjs` |
| NFR-35 | [GAP] Lint runs | Should | `npm run lint` runs and exits 0. | `npm run lint` → exit 0. Today `eslint` not in `package.json`. | `package.json` |
| NFR-36 | [GAP] Design tokens only | Must | Colors from CSS tokens; no hex/rgb literals in `app/`/`components/` (excl `ui/`) outside `globals.css`; `--destructive` only for delete/errors. | Search `#[0-9a-f]{3,8}` and `rgba?(` → no matches outside `globals.css`. Today `settings-panel.tsx` hard-codes `rgba(16,185,129,…)`. | `DESIGN.md`, `components/settings-panel.tsx` |
| NFR-37 | Single data-access layer | Should | All member reads/writes go through `lib/members-api.ts`; components don't import the Supabase client. | Search `supabase` imports in `components/` → none. | `lib/members-api.ts` |
| NFR-38 | Idempotent schema | Should | `supabase/schema.sql` runs twice with no error; single source of the DB definition (incl. F3 UNIQUE once added). | Run twice on a scratch project → both succeed, schema unchanged. | `supabase/schema.sql` |

### 4.8 Compatibility

| ID | Title | Pri | Description | Acceptance criteria | Source |
|---|---|---|---|---|---|
| NFR-39 | Supported browsers | Must | All functions work on latest 2 versions of Chrome, Edge, Safari (macOS + iOS), Firefox, and Chrome for Android. | FR smoke suite on each → all Must FRs PASS. | — |
| NFR-40 | Responsive layout | Must | Usable 360–1920px wide, no horizontal scroll, every action reachable, LTR + RTL. | Widths 360/768/1440 → `scrollWidth <= clientWidth`, all controls visible + clickable. | `app/page.tsx` |
| NFR-41 | Production build | Must | `next build` succeeds with the two env vars; app loads in prod with no console errors; Analytics loads only in prod. | Prod build exit 0, clean console on load. Dev build → no Vercel Analytics request. | `app/layout.tsx` |

---

## 5. Data requirements

### 5.1 Tables (from `supabase/schema.sql`)

**`public.members`**

| Column | Type | Constraints / default | Notes |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | |
| `name` | text | NOT NULL | [GAP] no blank/length check (FR-14). |
| `phone` | text | NOT NULL | [GAP] no UNIQUE (FR-19/F3), no format CHECK (FR-13). Target: `UNIQUE (phone)` + `CHECK (phone ~ '^9665[0-9]{8}$')`. |
| `sent` | boolean | NOT NULL, default `false` | Chat-opened flag (Q2). |
| `created_at` | timestamptz | NOT NULL, default `now()` | Drives auto-delete. |

Index: `members_created_at_idx (created_at)`. A UNIQUE constraint on `phone` adds its own index.

**`public.profiles`**

| Column | Type | Constraints / default |
|---|---|---|
| `id` | uuid | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `role` | text | NOT NULL, default `'staff'`, CHECK in (`admin`,`staff`) |
| `created_at` | timestamptz | NOT NULL, default `now()` |

Trigger `on_auth_user_created` creates a `staff` profile for each new auth user. Admin promotion is a manual SQL update.

**`public.settings`** (singleton)

| Column | Type | Constraints / default |
|---|---|---|
| `id` | int | PK, default 1, CHECK `id = 1` |
| `auto_delete_hours` | int | NOT NULL, default 72, CHECK `>= 0` (target: in 7,24,48,72 per FR-48) |

### 5.2 Row Level Security

| Table | Policy | Command / role | Rule |
|---|---|---|---|
| members | `members_auth_all` | ALL / authenticated | `using (true) with check (true)`. Any signed-in user has full CRUD (Q6). |
| profiles | `profiles_self_read` | SELECT / authenticated | `auth.uid() = id`. No INSERT/UPDATE/DELETE policy → denied. |
| settings | `settings_read` | SELECT / authenticated | `true` |
| settings | `settings_admin_update` | UPDATE / authenticated | Caller must have `profiles.role = 'admin'`, in `using` + `with check`. No INSERT/DELETE policy. |

Anon has no policies → no access (NFR-2).

### 5.3 Functions and jobs
- `handle_new_user()`: SECURITY DEFINER trigger, EXECUTE revoked from public/anon/authenticated.
- `cleanup_old_members()`: SECURITY DEFINER, EXECUTE revoked, reads `settings.auto_delete_hours`, deletes older members, no-op for null or ≤0.
- pg_cron `gymconnect-cleanup`: `0 * * * *`. Effective deletion latency ≤ window + 1 hour.

### 5.4 Client data

| Item | Shape / location |
|---|---|
| `Member` | `{ id: string; name: string; phone: string; sent: boolean }` (`app/page.tsx`). `created_at` never sent to client. |
| localStorage keys | `lang_preference` (`en`/`ar`), `theme_preference` (`dark`/`light`), `wa_preference` (`web`/`desktop`), + Supabase auth token. |
| Phone format | Stored `966` + 9 digits (12). Displayed `+966 55 123 4567`. |

---

## 6. Traceability: known defects → requirements

### 6.1 Audit must-fix (launch blockers)

| Bug | Problem | Requirement(s) that must PASS | Fix is done when |
|---|---|---|---|
| F1 | Always-on CSS `transform` on the AppProvider wrapper mis-positions overlays after scrolling | **NFR-22** (primary); also NFR-26, NFR-32 | At 500px scroll, dialogs/Broadcast/toast sit inside the viewport, and the idle wrapper `transform`+`filter` are `none`. |
| F2 | Optimistic updates (delete, markSent, resetSent) never roll back on DB failure | **NFR-18** (primary), **FR-26**, **FR-31**, **FR-33** (+ FR-27/28 when built) | Forced-failure tests on each op show the UI reverting to DB state with an error. |
| F3 | Duplicate phone checked only in the browser | **FR-19** (primary); also FR-18, §5.1 UNIQUE, NFR-38 | UNIQUE constraint live; two concurrent adds leave one row; loser sees `t.numberExists`. |
| F4 | Add form clears input before the save is confirmed | **FR-16** | A failed save (offline/duplicate) leaves the typed name + phone in place. |

### 6.2 Audit "should-fix" items

| Audit item | Requirement(s) |
|---|---|
| Phone validation | FR-12, FR-13 |
| Load-failure state | FR-8 |
| Auth refetch | FR-9 |
| Accessibility (dialog role, Escape, focus trap, toast aria-live) | NFR-23, NFR-24, NFR-25, NFR-26 |
| RTL: toast uses right/left | NFR-32 |

### 6.3 Additional gaps found in this analysis (not in AUDIT.md)

| Gap | Requirement |
|---|---|
| `members` state persists across sign-out | FR-6 |
| `startsWith("966")` skips the prefix → 9-digit input stored wrong | FR-13 |
| No name length/blank validation in the DB | FR-14 |
| Broadcast selected count includes deleted members | FR-44 |
| No auto-delete window control; DB accepts any value ≥ 0 | FR-48, FR-50 |
| Invalid localStorage language value crashes the render | FR-55 |
| Fake 500ms delay on add | NFR-15 |
| Errors shown in success (green check) style | NFR-19 |
| Auth calls lack error handling | NFR-20 |
| Unbounded fetch (1000-row API cap) | NFR-21 |
| Settings panel stays in tab order when closed | NFR-25 |
| Delete control invisible on touch + keyboard focus | NFR-27 |
| Inputs have placeholders but no labels; hard-coded English aria-labels | NFR-28, NFR-31 |
| White on `#10b981` ~2.5:1 | NFR-29 (conflict Q7) |
| Phones not bidi-isolated in Arabic | NFR-33 |
| `ignoreBuildErrors: true` contradicts the tsc-clean rule | NFR-34 |
| `eslint` not in `package.json` | NFR-35 |
| Hard-coded `rgba(16,185,129,…)` colors | NFR-36 |
| `window.open` without `noopener`; no security headers | NFR-8 |

---

## 7. Out of scope (this version)

Explicitly excluded by `PROJECT_PLAN.md` §1 and §6:
- Sending photos/videos (Broadcast is text only; "coming soon" notice stays). Media needs the paid WhatsApp Business API. Unused media strings in `translations.tsx` are placeholders only.
- Payments and billing.
- Native mobile app (web app must work in mobile browsers per NFR-39/40).
- Public signup or self-service registration.

Not in the plan, so treated as out of scope unless the PO adds them:
- Editing a member (Q11). Fix a typo by delete + re-add.
- In-app user management or password reset (admins use the Supabase dashboard).
- Automated/scheduled sending, WhatsApp Business API, delivery/read receipts, message templates or history.
- Import/export (CSV), multi-gym / multi-tenant, an audit log, realtime multi-user sync, role-based UI beyond the settings admin check.
- Member self-service, incl. opt-out handling. Handle opt-outs manually by deleting the member.

**Scope-creep watch** (optional / PO-decision, not launch blockers): FR-14 (100-char limit), FR-22, FR-50 (settings UI), NFR-8 (headers), NFR-12 (compliance note), NFR-29 (contrast).
