# Decision Log

Why GymConnect is built the way it is. Plain bullets, one entry per decision: what we decided, why, and what would change it.

Dating note: entries are recorded on 2026-10-08 from the project brief and the earlier review notes. Where an original decision date was not captured, the entry says "decided earlier". Add new decisions at the top with their real date.

---

## 2026-10-08 (recorded) - Staff logins are created by the admin; no public sign-up; no approval queue

- Status: decided earlier; current.
- Decision: only the admin creates logins, from the admin console, through the server route `app/api/admin-users`. Public sign-up is switched off in Supabase. There is no "request access, then approve" queue.
- Why: a gym front desk has one or two known people. A sign-up form or approval queue adds attack surface and admin work for no benefit. Turning sign-up off removes the biggest risk (strangers creating accounts).
- Consequences:
  - Supabase sign-up settings (email sign-up, anonymous sign-ins, manual linking) must stay OFF. Re-check them periodically (see [HANDOFF.md](HANDOFF.md)).
  - As a backstop, any account created outside the route starts as `pending`, which has no access to any data.
  - The `pending` role and the waiting screen still exist in the code as a safety net, but they are not part of the normal flow.
  - Older documents that describe an approval queue are out of date.

## 2026-10-08 (recorded) - One staff account per gym (single-gym for now)

- Status: decided earlier; CURRENT CHOICE, expected to change if the product goes multi-gym.
- Decision: the owner's rule is one staff login per gym. With one gym, that means exactly one staff login beside the admin. The admin console hides or disables "Add staff" once a staff account exists. To change the person, delete the staff login and create a new one.
- Why: keeps accountability simple and limits who holds a login to the member list.
- Limitation: this is enforced in the UI only. The server route and the database do not stop a second staff login (for example through a direct API call by an admin). It needs server-side enforcement before multi-gym.
- Future: multi-gym (each gym with its own staff and members, fully isolated) was considered and deferred. When it is built, the cap must move into the server, and staff and members must be scoped per gym. Not built.

## 2026-10-08 (recorded) - Shared staff pool, plus admin-private members

- Status: decided earlier; current.
- Decision: all staff see the same members (one shared pool). Members that an admin adds are private to the admin: staff never see them. The admin sees everything.
- Why: at a front desk, colleagues need to see each other's members to avoid double-messaging. The admin sometimes needs a private list.
- How: the `members.admin_private` column, set by a database trigger from the inserter's role (a client cannot spoof it), plus RLS policies in `supabase/schema-v3.sql`. Phone uniqueness is per space, so staff never hit a "number already exists" error caused by a row they cannot see.
- Consequence: the SQL files must be run in order, with v3 last, because re-running `schema.sql` would otherwise reintroduce the broad policy.

## 2026-10-08 (recorded) - Netlify for hosting, Supabase for the backend

- Status: decided earlier; current.
- Decision: deploy on Netlify (with `@netlify/plugin-nextjs`). Use Supabase (Postgres, Auth, RLS, pg_cron) as the backend. There is no separate application server, apart from one small server route for admin account management.
- Why: both have free tiers that fit a small gym, and Supabase RLS lets the browser talk to the database safely, so we avoid running and securing our own API.
- Consequences:
  - Older documents mention Vercel (`PROJECT_PLAN.md`, `docs/SRS.md`, `docs/BUILD-CHECKLIST.md`, some scenario notes). These are to be corrected; the target is Netlify.
  - `@vercel/analytics` stays in `package.json` but renders only when the `VERCEL` variable is set, so it does nothing on Netlify.
  - `NEXT_PUBLIC_*` values are inlined at build time, so changing them needs a rebuild. The service-role key is a Netlify server-side secret and is read only by the admin route.

## 2026-10-08 (recorded) - Green-only design; brand green is #047857

- Status: decided; current.
- Decision: the only accent color is brand green, `--primary` = `#047857`. Red (`--destructive`) is for delete and errors only. No other colors. Green used as text or icon color uses `text-primary-accent` (`#047857` in light mode, `#34d399` in dark mode).
- Why: the original green `#10b981` gave white text only a 2.54:1 contrast ratio, which fails WCAG AA. `#047857` gives 5.49:1, which passes. Muted text and the destructive red were darkened for the same reason.
- Rule: follow [DESIGN.md](../DESIGN.md) for every new screen. Use tokens, not hex values.

## 2026-10-08 (recorded) - "Messaged" means the WhatsApp chat was opened, not that it was delivered

- Status: decided; current.
- Decision: the status label is "Messaged" (not "Sent"). A member is marked Messaged when staff open their WhatsApp chat from GymConnect. It does not mean the message was sent, delivered or read.
- Why: GymConnect uses WhatsApp click-to-chat links. It never talks to a WhatsApp API, so it cannot see what staff do inside WhatsApp. Calling it "Sent" would overpromise.
- Consequences: staff-facing text and help should say "Messaged". The database column is still named `sent` for historical reasons.

## 2026-10-08 (recorded) - Auto-delete default is 72 hours, with fixed choices

- Status: decided; current.
- Decision: members are deleted automatically after a set time counted from `created_at`. The admin can choose 7, 24, 48 or 72 hours. The default is 72 hours (3 days). "Off" is not allowed.
- Why: the data is only names and phone numbers, collected for short-term follow-up and easy to re-collect. A short retention period limits privacy exposure. Fixed choices stop accidental or hostile values.
- How: a pg_cron job (`gymconnect-cleanup`) runs hourly. A database CHECK constraint enforces the allowed values. Clients cannot edit `created_at`, so the window cannot be dodged.
- Safety net: the app has a "Download all" CSV export so the admin or staff can keep a copy before members expire.

---

## Known limitations that follow from these decisions

- One-staff cap is UI-only (see above).
- The member list is not paginated and is capped at about 1000 rows by PostgREST. Fine at this scale.
- New staff passwords are passed on in plain text (for example by WhatsApp), with no forced change on first login.
