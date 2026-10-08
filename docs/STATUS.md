# Project Status

A single current snapshot of GymConnect. Last updated: 2026-10-08, on branch `staff-view-signoff-fixes`. Update the date and the lists whenever something moves.

## Done

- Members: add, search, delete, bulk delete. Saudi mobile numbers only, in one consistent format (`9665xxxxxxxx`), checked by the database as well as the app.
- WhatsApp broadcast: write one message (with `{name}` filled in per member), then open each member's chat in turn. Members show Not messaged / Messaged. "Messaged" means the chat was opened, not that delivery was confirmed.
- "Added" tag on each member (with a "leaving soon" cue before auto-delete) and a "Download all" CSV export.
- Safe write behavior: deletes and Messaged marks roll back with an error if the network fails, every request times out after 15 seconds, the list refreshes itself, and a load failure shows a retry card (never a false "No members yet").
- English and Arabic (right-to-left), light and dark themes, green-only design (brand `#047857`, WCAG AA contrast).
- Login and roles: admin and staff, plus a "waiting for approval" screen for any account without access. No public sign-up.
- Admin console: create, delete and reset staff logins; set staff display names; set the gym name; choose the auto-delete window (7, 24, 48 or 72 hours, default 72).
- Account model: one staff login per gym (UI-enforced), shared staff member pool, admin-private members, all enforced by Row Level Security.
- Data persists in Supabase; the browser stores preferences only (language, theme, WhatsApp web or desktop).
- Hourly auto-delete job (pg_cron).
- Security headers on every route; a build guard that fails the build if the public Supabase variables are missing; a friendly "Setup needed" screen if the app is ever misconfigured.
- Netlify configuration (`netlify.toml`) and the full runbook in [SETUP-AND-DEPLOY.md](SETUP-AND-DEPLOY.md).

## In progress

- Sign-off of the staff-view fixes on branch `staff-view-signoff-fixes` (QA and security check before merge, as the team rules require).
- Go-live verification: running the post-deploy smoke test in [SETUP-AND-DEPLOY.md](SETUP-AND-DEPLOY.md) on the real site. Owner to confirm whether the first Netlify deploy has already been done and tested.
- Documentation clean-up: replacing stale references (see "Older documents" below).

## Deferred (known, accepted for now)

- Server-side enforcement of the one-staff-per-gym rule. Today it is UI-only. Needed before multi-gym.
- Multi-gym (several gyms, each with isolated staff and members). Owner chose single-gym for now.
- Admin two-factor sign-in (one-time code by SMS or email), to be done after the other versions are finished.
- Pagination of the member list. The list is capped at about 1000 rows by PostgREST; fine at current scale.
- Forced password change for new staff. Passwords are currently shared in plain text (for example over WhatsApp) with no forced change on first login.
- Inert dependency: `@vercel/analytics` renders only on Vercel, so it does nothing on Netlify. It can be removed in a later clean-up.

## Waiting on the owner (compliance items)

These are business and legal tasks that the software cannot do for you. Members' phone numbers are personal data, and the app sends marketing-style messages.

- Consent: decide and document how the gym collects members' agreement to be contacted on WhatsApp.
- Privacy notice: provide members with a notice covering what is stored (name and phone), why, for how long (auto-delete window), and where it is hosted (Supabase region).
- Opt-out: define how a member asks to stop receiving messages and how staff delete them promptly.
- Confirm the above with a qualified adviser under the Saudi Personal Data Protection Law (PDPL) and WhatsApp's business rules.

## Older documents (may be stale)

`PROJECT_PLAN.md` and `docs/SRS*.md` (`docs/SRS.md`, `docs/SRS-v2-admin-console.md`) are older. They may contain stale details, for example Vercel as the host, or an approval queue for new accounts. The same applies to `docs/BUILD-CHECKLIST.md`, `docs/AUDIT.md`, `docs/WAVE-1-REPORT.md` and `docs/SCENARIOS*.md`, which are historical working notes. For current facts, use [README.md](../README.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DECISIONS.md](DECISIONS.md) and [SETUP-AND-DEPLOY.md](SETUP-AND-DEPLOY.md).
