# Architecture

A one-screen overview of how GymConnect fits together.

## The big picture

```
                       +--------------------------------------------+
   Reception staff     |                 NETLIFY                    |
   or admin            |  Next.js 16 app                            |
 +-----------+  HTTPS  |   - pages: / (app), /admin (console)       |
 |  Browser  |-------->|   - server route: POST /api/admin-users    |
 | (EN / AR) |         |       holds SUPABASE_SERVICE_ROLE_KEY      |
 +-----+-----+         +----------------------+---------------------+
       |                                      |
       | 1) Login, members, settings          | 2) Create / delete / reset
       |    directly, with the public         |    staff logins. Verifies the
       |    anon key + the user's session     |    caller's token, checks the
       |    (Row Level Security decides       |    caller is admin, then uses
       |    what each user can see)           |    the service_role key.
       v                                      v
 +--------------------------------------------------------------+
 |                          SUPABASE                            |
 |  Auth (logins)   Postgres + RLS (members, profiles, settings)|
 |  pg_cron: hourly job "gymconnect-cleanup" deletes old members|
 +--------------------------------------------------------------+

 3) WhatsApp handoff (browser only, no server involved):
    Browser --opens--> web.whatsapp.com/send?phone=...&text=...
                       (or whatsapp://send?... for the desktop app)
    Staff then press Send inside WhatsApp. GymConnect never talks to a
    WhatsApp API and cannot know whether a message was delivered.
```

Key points:

- Almost everything runs in the browser, talking straight to Supabase with the public anon key. Security comes from Row Level Security (RLS) in the database, not from hiding the key.
- The one server-side piece is `app/api/admin-users/route.ts`. It exists only because creating logins needs Supabase's admin API and the service_role key, which must never reach a browser.
- The WhatsApp step is a click-to-chat link. The staff member's own WhatsApp (web or desktop) does the sending.

## File and folder map

```
app/
  page.tsx                  Main screen: state, add/delete, broadcast, WhatsApp handoff
  admin/page.tsx            Admin console (staff accounts, gym name, auto-delete window)
  api/admin-users/route.ts  SERVER-ONLY: create / delete / reset_password / set_name for staff
  layout.tsx                Root layout (fonts, providers; Vercel Analytics only when VERCEL is set)
  globals.css               Theme tokens (brand green)
components/
  add-member-form, members-list, member-card, broadcast-panel,
  delete-dialog, settings-panel, stats-row, toast       App UI
  landing-page, login-screen, pending-gate               Signed-out and not-approved screens
  ui/                                                    shadcn/ui primitives
lib/
  supabase/client.ts        The single browser Supabase client (15 s request timeout)
  members-api.ts            Member and settings reads/writes
  admin-users.ts            Browser-side helper that calls /api/admin-users
  auth.tsx                  Session and role handling
  translations.tsx          ALL user text, EN + AR, plus theme/language/WhatsApp-preference context
  phone.ts, name.ts, format.ts, export-csv.ts   Shared rules and helpers
supabase/
  schema.sql, schema-v2.sql, schema-v3.sql   Database (run in this order, v2 and v3 last)
netlify.toml                Build command, Node version, Next.js plugin, secrets-scan allowlist
next.config.mjs             Security headers on every route
.env.local.example          Template for local environment variables
docs/                       This documentation (plus older planning documents)
.claude/agents/             AI specialist role briefs used by the team
```

## Environment variables

| Name | Where it is used | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser client and the admin route | Yes. Inlined at build time. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client | Yes. Inlined at build time. |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin route only | No. Server-only secret. |

A `prebuild` script aborts the build if either public variable is missing.

## Data model in brief

All tables are in the `public` schema.

- `members`: `id`, `name`, `phone`, `sent` (the Messaged mark), `created_at`, `admin_private`.
  - Phone must match `9665` followed by 8 digits (Saudi mobile only), enforced by the database.
  - Name is 1 to 100 characters and not blank.
  - `admin_private` is set by a database trigger from the inserter's role, so a client cannot fake it. Members an admin adds are private to the admin.
  - Phone is unique within each "space" (the staff pool, and the admin-private list) via `unique (admin_private, phone)`.
  - Clients can only insert `name`, `phone`, `sent` and can only update `sent`. `created_at` cannot be edited, so the auto-delete window cannot be dodged.
- `profiles`: one row per login. `id` (matches the Supabase auth user), `role` (`admin`, `staff` or `pending`; new rows default to `pending`), `email`, `display_name`, `created_at`. Clients cannot write to it; roles change only through the server route or the SQL editor. Database triggers stop the last admin from being demoted.
- `settings`: a single row (`id = 1`). `auto_delete_hours` (only 7, 24, 48 or 72; default 72) and `gym_name`.

Auto-delete: a pg_cron job named `gymconnect-cleanup` runs every hour (`0 * * * *`) and deletes members whose `created_at` is older than `auto_delete_hours`.

## Who can see what (Row Level Security summary)

| Who | members | profiles | settings |
| --- | --- | --- | --- |
| Not logged in (anon) | Nothing | Nothing | Nothing |
| `pending` (or no profile) | Nothing | Own row only | Nothing |
| `staff` | The shared staff pool only (rows where `admin_private` is false): read, add, delete, mark Messaged | Own row only | Read |
| `admin` | Everything, including admin-private members | All rows (read); role changes with guards | Read and update |

In addition:

- Table privileges are also restricted (a second lock under RLS): anon has no access; clients cannot truncate; `profiles` cannot be written by clients except the admin role update that RLS gates.
- The admin API route re-checks every call: valid session token (else 401), caller is admin (else 403). It refuses to delete an admin, delete yourself, or reset another admin's password.
- The server route sets new staff to `staff` after creating them. If that step fails, the half-created login is deleted so no stuck `pending` account is left behind.

## Account model

Admin creates staff logins from the admin console. There is no public sign-up and no approval queue. Exactly one staff login exists beside the admin (a UI-enforced rule today). All staff share one member pool. See [DECISIONS.md](DECISIONS.md) for the reasoning.

## Known limitations

- The one-staff cap is enforced only in the admin console UI, not on the server or in the database.
- `fetchMembers` has no pagination, so results are capped at about 1000 rows by PostgREST.
- New staff passwords are handed over in plain text with no forced change on first login.
- `@vercel/analytics` is installed but renders only on Vercel, so it is inert on Netlify.
