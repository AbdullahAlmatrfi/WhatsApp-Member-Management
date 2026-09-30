# GymConnect v2 — Admin Console · Requirements Spec (SRS)

*Version 2.0-draft · 2026-09-30 · Builds on `docs/SRS.md` (v1). Owner: Product Owner (Abdullah) · Lead: Claude.*

> The Admin Console is an **admin-only area** of GymConnect. This spec is the acceptance baseline for it — every requirement is testable (PASS/FAIL). IDs are in a **v2 namespace** (`FR-A…`, `NFR-A…`) so they never clash with v1. Build order after this: **requirements → design → implementation.**

---

## 1. Introduction

### 1.1 Purpose
Give the gym owner (admin) one place to run the system: manage who can log in, see what's happening (analytics), read staff feedback, pull reports, review an activity log, and control settings.

### 1.2 Scope
A new **Admin** section, reachable only by an account whose `profiles.role = 'admin'`. Staff (`role='staff'`) never see it. It reuses v1's stack (Next.js + Supabase, RLS-first, bilingual EN/AR RTL, green design) and adds a small set of new tables and one secure server function.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Admin | `profiles.role = 'admin'`. The owner. |
| Staff | `profiles.role = 'staff'`. Reception. |
| Pending | `profiles.role = 'pending'`. A created/self-registered account with **no** data access until an admin approves it. |
| Edge Function | A Supabase serverless function that runs **server-side** with the `service_role` key (never in the browser). Used only where admin power needs the secret key. |
| Event log | A row written when something notable happens (member added/deleted, broadcast run, user approved), used for analytics + the activity log. |

### 1.4 Actors
| Actor | In the Admin Console |
|---|---|
| **Admin** | Full access: user management, analytics, feedback, reports, activity log, settings. |
| **Staff** | No access to the console. Can **submit feedback** (the one staff-facing v2 addition) and their actions are logged. |
| **Pending user** | No access to anything until approved. |
| **System** (Edge Function / triggers) | Creates accounts, writes log rows. |

### 1.5 Decisions carried in (do not reopen)
- **Onboarding = invite-only.** Admin creates/approves accounts; public signup stays OFF. `pending` is the safety net.
- **Creating a login (email+password) needs the Edge Function** (service key server-side, never in the browser). **Approving** a pending user is just an admin-only `UPDATE` on `profiles` — no service key.
- Free stack ($0), bilingual EN/AR RTL, green design locked (`DESIGN.md`).
- Admin power is enforced at the **data layer** (RLS + the Edge Function's own admin check), never by hiding UI alone.

---

## 2. Functional requirements

### 2.1 Admin access & gating
| ID | Title | Pri | Description | Acceptance criteria |
|---|---|---|---|---|
| FR-A0.1 | Admin-only entry | Must | The Admin section is reachable only by an admin. Staff/pending never see the entry point and cannot reach the routes. | Given a staff/pending session, the admin nav item is absent and navigating directly to an admin route redirects to the normal app. Given an admin session, the admin area renders. |
| FR-A0.2 | Data-layer gating | Must | Every admin-only read/write is enforced by RLS or the Edge Function's admin check, not just hidden UI. | Given a staff JWT calling an admin-only table/function directly (bypassing UI), the request returns nothing / permission error and changes nothing. |
| FR-A0.3 | Bilingual + design | Must | All new screens/strings exist in EN + AR (RTL) via `translations.tsx`, in the locked green design. | Given AR, every admin screen renders RTL with Arabic strings and no hard-coded text. |

### 2.2 A1 — User management
| ID | Title | Pri | Description | Acceptance criteria |
|---|---|---|---|---|
| FR-A1.1 | List accounts | Must | Admin sees all accounts with email, role (admin/staff/pending), and created date. | Given N accounts, the list shows N rows with role badges; pending are visually distinct. |
| FR-A1.2 | Approve pending | Must | Admin promotes a pending account to `staff` (one click, confirm). | Given a pending user, Approve sets `role='staff'`; that user can now read members on next load; a log row is written. |
| FR-A1.3 | Revoke access | Must | Admin demotes a staff account back to `pending` (removes data access) with confirm. | Given a staff user, Revoke sets `role='pending'`; that user reads nothing on next load; logged. |
| FR-A1.4 | Create account | Should | Admin creates a login (email + temp password or invite) via the **Edge Function**. New account starts as `staff` (or `pending`, PO to confirm — see Q-A2). | Given valid inputs, the function (after verifying the caller is admin) creates the auth user + profile; the new row appears in the list; the service key never appears client-side. |
| FR-A1.5 | Prevent self-lockout | Must | Admin cannot revoke/delete their **own** admin role, and the system always keeps ≥1 admin. | Given the only admin, Revoke on self is blocked with a clear message. |
| FR-A1.6 | Errors handled | Must | Duplicate email, weak password, and function failures show localized errors; no partial state. | Given a duplicate email on create, a localized error shows and no orphan auth user or profile remains. |

### 2.3 A2 — Analytics dashboard
| ID | Title | Pri | Description | Acceptance criteria |
|---|---|---|---|---|
| FR-A2.1 | Core counts | Must | Show: total members, Sent vs Not-sent, and today's/this-week's new members. | Given the DB, each figure equals a direct query; refreshes on load. |
| FR-A2.2 | Members over time | Should | A simple chart of members added per day (rolling 30 days). | Given events over 30 days, the chart matches the counts; empty days show 0. |
| FR-A2.3 | Broadcast activity | Should | Count of broadcasts run and chats opened (from the event log). | Given logged broadcast events, totals match the log. |
| FR-A2.4 | Per-staff activity | Could | Actions per staff account (added/deleted/sent), from the event log. | Given events attributed to staff, per-staff totals match. |
| FR-A2.5 | Honest empties | Must | Metrics needing event history show "since <deploy date>" and 0 before that (no backfill claimed). | Given a metric with no data, it reads 0 with the "since" note, not a blank or error. |

*Note: A2.1 is answerable from today's `members` table. A2.2–A2.4 need the new event log (§4).*

### 2.4 A3 — Feedback inbox
| ID | Title | Pri | Description | Acceptance criteria |
|---|---|---|---|---|
| FR-A3.1 | Staff submit feedback | Must | Staff have a "Send feedback" box (message, optional category). | Given a staff user, submitting stores a `feedback` row tied to their id + timestamp; a success toast shows. |
| FR-A3.2 | Admin reads inbox | Must | Admin sees all feedback newest-first, with sender + time, and read/unread state. | Given feedback exists, the admin inbox lists it; opening one marks it read; a badge shows unread count. |
| FR-A3.3 | Resolve/archive | Should | Admin can mark an item resolved/archived to clear the active list. | Given an item, Resolve moves it out of the active inbox; it's still retrievable. |
| FR-A3.4 | Privacy | Must | Staff see only their own submissions (not others'); only admin reads all. | Given a staff JWT, reading feedback returns only their rows; admin returns all. |

### 2.5 A4 — Reports / export
| ID | Title | Pri | Description | Acceptance criteria |
|---|---|---|---|---|
| FR-A4.1 | Export members | Must | Admin exports the current members list as **CSV**. | Given N members, the CSV has N data rows with name, phone, status; opens in Excel/Sheets. |
| FR-A4.2 | Summary report | Should | A one-page summary (counts + key metrics) as **PDF** (print-to-PDF acceptable, PO to confirm — Q-A9). | Given the dashboard data, the report renders the same figures. |
| FR-A4.3 | Admin-only + logged | Must | Only admin can export; each export writes a log row (who/when/what). | Given a staff user, export is unavailable; an admin export appears in the activity log. |
| FR-A4.4 | PII handling | Must | Exports contain member PII, so the UI warns and the action is logged; no export is emailed anywhere automatically. | Given an export, a short "contains personal data" note shows and the file downloads locally only. |

### 2.6 A5 — Activity log
| ID | Title | Pri | Description | Acceptance criteria |
|---|---|---|---|---|
| FR-A5.1 | What's logged | Must | Log: member add/delete, mark-sent/reset, broadcast run, user approve/revoke/create, settings change, export. Each row: who, action, target, timestamp. | Given each action, exactly one log row is written with the right actor + type. |
| FR-A5.2 | Admin view | Must | Admin sees a reverse-chronological, filterable log (by action type and/or actor). | Given logs, the view lists them newest-first; filters narrow correctly. |
| FR-A5.3 | Tamper-resistant | Must | Log rows are insert-only for clients; no client can update or delete a log row. | Given any non-service role, UPDATE/DELETE on the log affects 0 rows. |
| FR-A5.4 | Retention | Should | Logs are retained a fixed window (PO to set, e.g. 90 days) then purged, consistent with PDPL minimisation. | Given a row older than the window, a scheduled job removes it. |

### 2.7 A6 — Settings (auto-delete window)
| ID | Title | Pri | Description | Acceptance criteria |
|---|---|---|---|---|
| FR-A6.1 | Window control | Must | Admin chooses the auto-delete window (7h / 24h / 2d / 3d); persists in `settings`. **This is v1's FR-50** — implemented here. | Given admin changes it to 24h, `settings.auto_delete_hours=24` after reload; staff cannot change it (RLS). |

---

## 3. Non-functional requirements

| ID | Area | Pri | Requirement / acceptance |
|---|---|---|---|
| NFR-A1 | Access control | Must | Admin area gated at BOTH route and data layer. A staff JWT hitting any admin table/function directly gets nothing. |
| NFR-A2 | Edge Function safety | Must | The create-account function runs server-side only; the `service_role` key never ships to the browser or the repo; the function verifies the caller's JWT is an admin before acting. |
| NFR-A3 | Edge Function abuse | Must | The function rate-limits and validates all inputs; a non-admin caller is rejected; errors leak no internals. |
| NFR-A4 | Least privilege | Must | New admin-only tables grant no access to `anon`; staff get only what A3 (own feedback insert) requires; admin-only reads via RLS checking `role='admin'`. |
| NFR-A5 | Audit integrity | Must | Activity-log writes happen via DB trigger or the Edge Function (server-side), not trusted from the client; clients cannot forge actor or timestamp. |
| NFR-A6 | Privacy / PDPL | Must | Feedback, logs, and staff emails are personal data: documented purpose + retention; a staff-facing notice that actions are logged (NFR-A7). Region/cross-border reviewed (Q-A15). |
| NFR-A7 | Monitoring notice | Should | Staff are shown, once, that their actions are recorded (labor/PDPL transparency). |
| NFR-A8 | Performance | Must | Dashboard loads in ≤2s with ~500 members and typical log volume; queries are indexed; no N+1. |
| NFR-A9 | Bilingual/RTL | Must | All admin screens EN+AR parity, logical start/end, in the green design tokens. |
| NFR-A10 | Accessibility | Must | New dialogs/forms meet the same bar as v1 Wave 2 (role, Escape, focus trap, labels, aria-live). |
| NFR-A11 | Reliability | Must | Every admin mutation follows v1's rule: optimistic UI rolls back on failure; state never diverges from the DB. |
| NFR-A12 | Cost | Must | Stays on Supabase + Vercel free tier; the Edge Function + tables fit free limits. |

---

## 4. Data model additions

*All new tables: RLS enabled; `anon` revoked; consistent with v1's style.*

**`public.profiles`** — extend usage (no new columns needed): add an **admin-only UPDATE policy** so an admin can change another user's `role` (approve/revoke). Keep the "no self-promotion for staff" guarantee.

**`public.feedback`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| author_id | uuid | FK → auth.users; default `auth.uid()` |
| category | text | optional, CHECK in a small set (PO to confirm) |
| message | text | NOT NULL, length CHECK (1–2000) |
| status | text | `new` / `read` / `resolved`, default `new` |
| created_at | timestamptz | default now() |
RLS: staff **INSERT** own (`author_id = auth.uid()`) + **SELECT** own; admin **SELECT/UPDATE** all.

**`public.activity_log`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| actor_id | uuid | who did it (server-set) |
| action | text | e.g. `member.add`, `member.delete`, `user.approve`, `export.members` |
| target | text | optional (member id, user email, …) |
| created_at | timestamptz | default now() |
RLS: admin **SELECT** only; **no** client INSERT/UPDATE/DELETE (writes come from triggers / Edge Function, server-side). Retention job purges old rows (FR-A5.4).

**`public.app_events`** (analytics; may be merged with `activity_log` if the PO prefers one table)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| type | text | `member.add`, `member.delete`, `broadcast.run`, `chat.open`, … |
| actor_id | uuid | optional |
| created_at | timestamptz | default now() |
RLS: admin SELECT; writes server-side. Indexed on `(type, created_at)`.

**`public.settings`** — reuse v1 table for FR-A6.

---

## 5. Security & Edge Function threat model (summary)
- **Create-account function:** verify caller JWT → confirm `role='admin'` in `profiles` → call Supabase Admin API with the service key (server env only) → create auth user + `staff`/`pending` profile → return safe result. Reject non-admins (403). Rate-limit. Never echo the service key or internal errors.
- **Approve/revoke:** admin-only RLS `UPDATE` on `profiles`; no service key needed.
- **Log integrity:** actor + timestamp set server-side; clients can't write logs directly.
- **PII:** exports/feedback/logs are personal data → retention + notice; no auto-emailing.
- **Reuse v1 protections:** RLS-first, `anon` locked out, column-scoped writes, no secrets in the browser.

---

## 6. Out of scope (v2) & open questions for the PO
**Out of scope:** paid WhatsApp/media, per-staff granular permissions beyond admin/staff/pending, scheduled/automated exports, in-app email sending, multi-gym/multi-tenant.

**Open questions (please decide):**
- **Q-A1** Create-account: set new accounts as `staff` immediately, or `pending` (admin approves after)? (Recommend `staff` if the admin is the one creating them.)
- **Q-A2** Feedback categories — fixed list (bug / idea / other) or free text only?
- **Q-A9** Summary report: is browser "print-to-PDF" fine, or do you need a real generated PDF file?
- **Q-A11** Is Revoke (→ pending) enough, so we can skip a separate "deactivate/ban"? (Recommend: yes, skip it.)
- **Q-A12** Notify you (WhatsApp/email) when new feedback arrives? (Recommend: no, keep it in-app for v2.)
- **Q-A13/16** Activity log = employee monitoring under PDPL/labor rules → is a staff notice (NFR-A7) enough?
- **Q-A14** Should logging fail-closed (a logging bug blocks the action, safest for audit) or best-effort (never blocks reception)? (Recommend: fail-closed for user/settings actions, best-effort for member add/delete.)
- **Q-A15** Supabase region / cross-border transfer for staff emails, feedback, logs.

---
*Next step after this spec is agreed: **Design** (admin nav + screen wireframes for each feature), then **implementation** wave-by-wave (start with A1 user management + A6 settings, then A3 feedback, then A2 analytics + A5 log, then A4 reports).*
