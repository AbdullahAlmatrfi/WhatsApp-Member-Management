# GymConnect: Security and Privacy

> **This is practical guidance, not legal advice.** It describes how the app is built and what the gym owner should do before real members' data goes in. Consent and cross-border transfer rules under the Saudi Personal Data Protection Law (PDPL) must be reviewed by a qualified Saudi lawyer. See [section 6](#6-pdpl-and-whatsapp-what-the-owner-must-do).

**Who this is for:** the gym owner (sections 1, 5, 6) and whoever maintains the app (sections 2 to 4).

**Short version (the "baby version")**
- Only logged-in people can see members. Logged-out visitors see nothing.
- The admin sees everything. Staff see only the shared staff list, not the admin's private members.
- The powerful database key lives only on the server, never in the browser.
- Members are deleted automatically after a set time (default 72 hours).
- The app is technically solid for a small single gym, but it does NOT yet collect consent, show a privacy notice, or handle "stop messaging me". The owner must fix that before using real members' data.

Last checked against: `supabase/schema.sql`, `schema-v2.sql`, `schema-v3.sql`, `app/api/admin-users/route.ts`, `lib/supabase/client.ts`, `next.config.mjs` (branch `staff-view-signoff-fixes`).

---

## 1. What data we hold

| Data | Where | Who can see it |
|---|---|---|
| Member name + mobile number (`members`) | Supabase database | Admin: all. Staff: shared pool only |
| "Messaged" status (`members.sent`) | Supabase database | Same as above |
| Login email, role, display name (`profiles`) | Supabase database | Each user sees their own row. Admin sees all |
| Gym name, auto-delete window (`settings`) | Supabase database | Admin and staff can read. Only admin can change |
| Language / theme preferences | The browser's localStorage | That browser only. No member data is stored there |

Member data is personal data under PDPL: a name plus a phone number identifies a person. Treat it carefully.

---

## 2. Who sees what (roles and Row Level Security)

**The real wall is Supabase Row Level Security (RLS), enforced inside the database.** The app's screens hide things for convenience, but even someone who bypasses the app and talks to the database directly hits the same rules.

There are four kinds of visitor:

| Visitor | Members | Settings | Profiles |
|---|---|---|---|
| Logged out (`anon`) | Nothing. All privileges revoked | Nothing | Nothing |
| `pending` (a login with no approved role) | Nothing. No policy grants it access | Nothing | Own row only |
| `staff` | Read, add, update, delete the **shared staff pool** (rows where `admin_private` is false) | Read only | Own row only |
| `admin` | **Everything**: staff pool plus admin-private members | Read and change | All rows (to list accounts) |

How the rules work, in plain terms:

- **No public signup.** Only an admin creates logins (through the admin console). If an account ever appears some other way, the database gives it the role `pending`, which has no access. It fails closed.
- **Shared staff pool.** Staff members all see the same list. That suits a front desk.
- **Admin-private members.** A member the admin adds is flagged `admin_private`. The database sets this flag itself from the inserter's role (a trigger), so a browser cannot fake it. Staff cannot see, edit or delete those rows. A phone number is unique within the staff pool and within the admin's private list separately, so staff never get a confusing "already exists" error about a row they cannot see.
- **Clients can edit very little.** Browsers may only change the `sent` flag on a member, and may only choose `name`, `phone` and `sent` when adding one. `id` and `created_at` always come from the database, so nobody can back-date a member to dodge auto-delete. Nobody can truncate the members table from the app.
- **Role changes are guarded.** You cannot demote yourself, and the last admin cannot be removed.
- **Profiles are not writable from the browser.** Role and name changes happen only on the server (section 3).

---

## 3. How secrets are handled

| Key | Safe in the browser? | Where it lives |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Netlify env and `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes, by design. It can read nothing without a login and RLS | Netlify env and `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | **NEVER.** It bypasses all RLS (it is the database superuser) | **Netlify server env only** |

The browser client (`lib/supabase/client.ts`) uses only the URL and anon key.

The service-role key is read in exactly one place: `app/api/admin-users/route.ts`. That route:

1. Runs on the server only (`runtime = "nodejs"`, never cached).
2. Requires a valid login token (otherwise 401).
3. Checks that the caller's profile role is `admin` (otherwise 403) **before** doing anything.
4. Only then creates, deletes or resets a staff login, or sets a display name.
5. Refuses to delete an admin, refuses to let an admin delete themselves, and refuses to reset another admin's password.
6. If creating an account half-fails, it rolls back so no stuck login is left behind.
7. Returns short error codes and never echoes the key or internal details.

**Rules for maintainers**
- Never prefix the service-role key with `NEXT_PUBLIC_`. That would publish it.
- Never commit `.env.local` or paste the key into chat, tickets or screenshots.
- If the key is ever exposed, rotate it in Supabase immediately and update Netlify.
- Security headers are set in `next.config.mjs`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a strict `Referrer-Policy`, HSTS, and a locked-down `Permissions-Policy`.

---

## 4. Known gaps (honest list)

These are real, they are not hidden, and none is a hole for a single small gym used carefully. Fix them before you scale or add more gyms.

| # | Gap | Why it matters | Fix before scaling |
|---|---|---|---|
| 1 | **One-staff cap is UI-only.** The admin console hides "Add staff" once a staff login exists, but the server route and database do not enforce it. | An admin session (or a direct call by the admin) can still create more staff logins. Low risk today because only the admin can call the route. | Count existing staff in `app/api/admin-users` before `create` and reject with a clear error. Needed before multi-gym. |
| 2 | **New-staff passwords are shared in plaintext over WhatsApp, with no forced change on first login.** | A password sitting in a chat history is a shared secret. Anyone with access to that chat or phone can log in. | Force a password change on first login, or send a one-time invite/reset link instead of a password. Until then: delete the chat message after sharing and reset the password if the phone is lost or the person leaves. |
| 3 | **No Content-Security-Policy (CSP) header yet.** | CSP is an extra shield against injected scripts. Other headers are in place, but this one is missing. | Add a CSP in `next.config.mjs`, test in report-only mode first. |
| 4 | **No app-level rate limiting on the admin route.** | The route is protected by login and admin checks, but a stolen admin session could hammer it. Supabase applies its own limits to login attempts. | Add rate limiting (for example per user or IP) to `app/api/admin-users`. |
| 5 | **About 1000 members per fetch.** Supabase returns at most ~1000 rows per request and the app fetches in one query. | A list larger than 1000 would be silently cut short, so some members would be missing from search and broadcast. This is a reliability gap, not a leak. | Paginate with `.range()` or at least show a warning when the count exceeds the rows loaded. Auto-delete keeps the list small for now. |

Other things to know:

- **"Download all" creates copies outside the database.** A downloaded file is not covered by auto-delete or RLS. Tell staff to store it only where necessary, keep it off shared devices, and delete it when done.
- **The admin can see staff emails and reset staff passwords.** That is intended, but it means the admin account is the crown jewel. Use a strong, unique password. Admin 2FA is planned but not built.
- **No audit log.** The app does not record who viewed or exported members.

---

## 5. Data retention (auto-delete)

Purpose: data minimization. A member's name and number are not kept longer than needed.

- **How it works:** a database job (`pg_cron`, job name `gymconnect-cleanup`) runs **every hour** and deletes every member older than the window. This applies to staff-pool and admin-private members alike.
- **The window** is set by the admin in the admin console (Settings, auto-delete window). Allowed values: **7, 24, 48 or 72 hours**. The default is **72 hours (3 days)**. The database rejects any other value.
- **Cannot be dodged from the app:** `created_at` is set by the database and clients cannot change it (section 2).
- **Screens show it:** the member list tells staff when members will be removed (in days or hours).
- **What it does not cover:** files staff downloaded with "Download all", WhatsApp chats and message history on the gym's phone and Meta's side, and Supabase's own backups (check the backup retention of your Supabase plan).
- **Mind the gap with membership:** because members vanish after the window, GymConnect is a short-term messaging list, not a permanent membership record. If you need to keep a member longer, record that in your own membership system with its own consent and retention rules.

For the printed notice, convert the window for members: 72 hours = 3 days, 48 hours = 2 days, 24 hours = 1 day. Do not print a number that does not match the admin console setting.

---

## 6. PDPL and WhatsApp: what the owner must do

> **Needs a Saudi lawyer's review.** The points below are practical guidance based on how the app works. They are not legal advice. Have a Saudi lawyer confirm what your gym specifically needs, especially for **consent** and **transfer of data outside the Kingdom**.

### Where things stand today

GymConnect currently has **no consent capture, no privacy notice at sign-up, and no opt-out mechanism**. Staff type in a name and number and can send a WhatsApp message. Until the steps below are done, **do not put real members' data into the app.**

### What the owner must do before real data goes in

**(a) Get and record consent to message members.**
- "Added by reception" is **not** consent. A member must agree to receive the gym's WhatsApp messages.
- Ways to capture it: a tick box or signature on the printed sign-up form, or a WhatsApp opt-in reply ("Reply YES to receive updates from [Gym name]").
- Keep a record of it (the signed form, or a screenshot of the opt-in reply) for as long as you message that person. Right now the app has nowhere to store it, so keep it in your own paper or file system.
- Only add people to GymConnect who have consented.

**(b) Show a privacy notice where you collect the data.**
- Put it on the sign-up form and at the desk. A ready-to-print bilingual notice is in [`PRIVACY-NOTICE.md`](./PRIVACY-NOTICE.md). Fill in the placeholders: gym name, retention period, contact.

**(c) Give members an opt-out, and honor it.**
- Add a line to every broadcast such as "Reply STOP to unsubscribe" (and the Arabic equivalent).
- When someone says STOP (or asks to be deleted), **delete them from GymConnect or never message them again.** Do it the same day.
- Do not re-add them later without fresh consent.
- The app has no unsubscribe list. Because members auto-delete, a deleted member could be re-added by mistake, so keep a short private "do not message" list on paper or in a note and check it before adding people.

**(d) Check cross-border transfer rules.**
- Member data is processed **outside Saudi Arabia**: the database on **Supabase**, hosting on **Netlify**, and message delivery by **WhatsApp (Meta)**. PDPL has specific conditions for transferring personal data abroad.
- Ask your lawyer whether your setup is allowed, what you must tell members, and whether you need to choose a particular Supabase region. Pick the region deliberately and write it down.

**(e) Use WhatsApp the safe way.**
- Message from the **gym's own WhatsApp Business number**, not a personal number.
- **Pace your sends.** Do not blast hundreds at once. Spread messages out.
- **Identify the gym in every message** ("From [Gym name]: ..."), so members know who is writing.
- Keep the broadcast **manual**. GymConnect opens a WhatsApp click-to-chat for each person and a human taps send. That is lower risk of the number being banned than automated sending.
- **Never add unofficial WhatsApp automation libraries or bots.** They break WhatsApp's terms and can get the gym's number banned permanently. If you ever need automation, use the official WhatsApp Business Platform, with approved templates, and revisit consent and legal review first.

### Owner checklist before go-live

- [ ] Sign-up form has a consent tick box or signature, and you keep the signed forms or opt-in replies
- [ ] Privacy notice printed and placed on the form and at the desk (filled in)
- [ ] Every broadcast names the gym and includes "Reply STOP"
- [ ] A named person handles STOP and deletion requests the same day
- [ ] Using the gym's WhatsApp Business number; sends are paced
- [ ] Saudi lawyer has reviewed consent wording and cross-border transfer
- [ ] Admin password is strong and unique; the one-staff rule is respected
- [ ] Staff know not to keep downloaded member files
- [ ] Auto-delete window is set and matches what the notice says

---

## 7. Why we decided things this way

- **RLS over app checks:** screens can be bypassed; database rules cannot. Everything sensitive is enforced there.
- **Admin-created logins only:** a gym front desk does not need public signup, and removing it removes a whole class of abuse.
- **Service-role key on the server only:** creating logins needs it, so it lives in one server route that verifies the admin first.
- **Manual WhatsApp handoff:** slower, but it protects the gym's number and keeps a human in the loop on every message.
- **Auto-delete by default:** the least data kept for the shortest time.

See also: `CLAUDE.md` (account and visibility model), `docs/AUDIT.md`, `docs/SRS.md`.
