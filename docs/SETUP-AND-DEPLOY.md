# Setup and Deploy Runbook

This is the go-live runbook for GymConnect: create the Supabase project, set up the database, deploy to Netlify, and verify. Follow the steps in order. Dashboard labels change from time to time; if a menu name differs slightly, look for the closest match.

Time needed: about 30 to 45 minutes.

You will need:

- A Supabase account (free tier is fine) and a Netlify account.
- The GitHub repository `AbdullahAlmatrfi/WhatsApp-Member-Management`.
- The owner's login email, which becomes the admin account.

---

## Part 1. Supabase (database and login)

### 1. Create the project

1. In the Supabase dashboard, choose New project.
2. Pick a name, a strong database password (store it in a password manager), and the region closest to the gym.
3. Wait until the project finishes provisioning.

### 2. Copy the three values you will need later

Go to Project Settings -> API and note:

- Project URL (becomes `NEXT_PUBLIC_SUPABASE_URL`)
- anon public key (becomes `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- service_role key (becomes `SUPABASE_SERVICE_ROLE_KEY`)

The service_role key bypasses all Row Level Security. Treat it like a database root password. Do not paste it into chat, email, or any file that is committed to git.

### 3. Turn off public sign-up (do this now, before anything else)

This is the most important safety switch in the project. Staff logins are created by the admin only.

Go to Authentication and open the sign-in settings (Sign In / Providers). Confirm all of these are OFF:

- Email sign-up ("Allow new users to sign up" / "Enable email signup")
- Anonymous sign-ins
- Manual linking

Keep the email provider usable for logging in, but with new sign-ups disabled.

### 4. Enable the pg_cron extension

pg_cron runs the hourly auto-delete job.

Go to Database -> Extensions, search for `pg_cron`, and enable it.

### 5. Run the detection queries (only if a `members` table already exists)

Open SQL Editor -> New query. These queries protect an existing database from a failed migration. Each one must return 0 rows.

```sql
-- 1) duplicate phones (would block the UNIQUE constraint)
select phone, count(*) from public.members group by phone having count(*) > 1;

-- 2) malformed phones (would block members_phone_format_chk)
select id, name, phone from public.members where phone !~ '^9665[0-9]{8}$';

-- 3) blank or over-long names (would block members_name_valid_chk)
select id, name, phone from public.members
where btrim(name) = '' or char_length(name) not between 1 and 100;
```

- If any query returns rows, fix or delete those rows first, then re-run the query until it returns 0 rows.
- On a brand-new project there is no `members` table yet, so these queries fail with "relation does not exist". That is expected: skip this step on a fresh project.
- If `settings` already exists with a value other than 7, 24, 48 or 72 hours, reset it first (the comment inside `supabase/schema.sql` shows the one-line fix).

### 6. Run the three SQL files, in this exact order

In SQL Editor, paste the full contents of each file, one at a time, and press Run. Wait for "Success" before moving to the next one.

1. `supabase/schema.sql`
2. `supabase/schema-v2.sql`
3. `supabase/schema-v3.sql`

Critical rules:

- `schema-v2.sql` and `schema-v3.sql` must be LAST.
- Never re-run an earlier file alone. If you ever re-run `schema.sql`, re-run `schema-v2.sql` and `schema-v3.sql` straight after it, in order. Re-running an earlier file on its own can revert changes made by the later ones.
- All three files are written to be safe to re-run, as long as the order is respected.

What they create, in brief: the `members`, `profiles` and `settings` tables; Row Level Security rules; the hourly `gymconnect-cleanup` pg_cron job; the admin-private member rule; and the gym name and display name columns. See [ARCHITECTURE.md](ARCHITECTURE.md).

### 7. Create the admin login and promote it

1. Go to Authentication -> Users -> Add user -> Create new user. Enter the owner's email and a strong password, and tick auto-confirm if offered. Do this after step 6, so the profile row is created with the email filled in.
2. In SQL Editor, run this once, replacing `OWNER_EMAIL` with the exact email you just used:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'OWNER_EMAIL');
```

3. Confirm it worked:

```sql
select email, role from public.profiles;
```

The owner's row should show `admin`.

---

## Part 2. Netlify (hosting)

### 8. Connect the repository

1. In Netlify, choose Add new site -> Import an existing project, pick GitHub, and select `AbdullahAlmatrfi/WhatsApp-Member-Management`.
2. Choose the branch to deploy (normally `main`).
3. Leave the build settings as detected. The repo's `netlify.toml` already sets everything needed:

| Setting | Value in `netlify.toml` | Why |
| --- | --- | --- |
| Build command | `npm run build` | Runs the `prebuild` guard, then `next build` |
| `NODE_VERSION` | `20` | Next.js 16 needs a modern Node; Netlify's default can lag |
| Plugin | `@netlify/plugin-nextjs` | The official Next.js runtime (serverless functions and routing) |
| `SECRETS_SCAN_OMIT_KEYS` | `NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_SUPABASE_URL` | These two values are public by design; this stops Netlify's secrets scanner from failing the build on them |

Notes:

- The repo uses pnpm (`pnpm-lock.yaml`, `packageManager` in `package.json`). Netlify installs dependencies with pnpm automatically when it sees the lockfile. `npm run build` only runs the build script and works either way.
- Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to `SECRETS_SCAN_OMIT_KEYS`. You want the scanner to catch it if it ever leaks into the build output.

### 9. Set the three environment variables

Go to Site configuration -> Environment variables and add:

| Name | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 2 | Public. Inlined into the app at build time. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key from step 2 | Public. Inlined at build time. Safe because Row Level Security is the real protection. |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from step 2 | SERVER-ONLY SECRET. Never give it a `NEXT_PUBLIC_` prefix. Mark it as a secret in Netlify. |

Important behavior:

- The two `NEXT_PUBLIC_` values are baked in when the site is built. If you change them later, you must trigger a new deploy (Deploys -> Trigger deploy -> Clear cache and deploy site) for the change to take effect.
- A prebuild guard stops the build with a clear message if either public variable is missing.
- If `SUPABASE_SERVICE_ROLE_KEY` is missing, the site still builds and loads, but the admin API route (`/api/admin-users`) returns HTTP 500 `server_not_configured`, and the admin console cannot create, delete or reset staff logins.

### 10. Deploy

Trigger the first deploy (or push to the deployed branch). Wait for the deploy log to show "Site is live". Open the site URL.

---

## Part 3. Post-deploy smoke test

Run every check. Replace `https://YOUR-SITE.netlify.app` with the real address.

### 11. Admin login works

Open the site, sign in with the owner's email and password. You should reach the app (and the admin console from the admin controls). If you see a "Setup needed" screen, the public env vars are missing or the site was not rebuilt after you set them.

### 12. The admin API refuses anonymous callers

```bash
curl -i -X POST https://YOUR-SITE.netlify.app/api/admin-users \
  -H "Content-Type: application/json" \
  -d '{"action":"create"}'
```

Expected: `HTTP/2 401` with `{"error":"unauthorized"}`.

- A 500 with `server_not_configured` means `SUPABASE_SERVICE_ROLE_KEY` is missing in Netlify. Fix step 9, then redeploy.
- Anything that succeeds (2xx) is a serious problem. Stop and investigate.

### 13. Security headers are present

```bash
curl -sI https://YOUR-SITE.netlify.app/ | grep -iE "x-frame-options|x-content-type-options|referrer-policy|strict-transport-security|permissions-policy"
```

Expected five headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

### 14. Create one staff login

In the admin console, add a staff login (email, a strong password of 8 to 72 characters, and a display name). Then confirm:

- The "Add staff" option is now hidden or disabled (the one-staff-per-gym rule).
- In a private/incognito window, the staff login can sign in.

After creation the console shows the new login's email and password with Copy and WhatsApp-share options so the admin can pass them on. Treat the password as sensitive; see "Known limitations" at the end.

### 15. Add a member

Signed in as staff, add a test member with a Saudi number (for example `0550000000` style input is accepted and stored as `9665xxxxxxxx`). It should appear in the list. Then sign in as the admin and confirm the staff-added member is visible. Add one member as the admin and confirm the staff login does NOT see it (admin-private members).

### 16. Offline rollback check

1. Open the app, then open the browser developer tools -> Network tab and set throttling to Offline.
2. Mark a member as Messaged. Expected: the change is undone and an error message appears (it does not stay marked).
3. Try to delete a member. Expected: the member reappears and an error message appears.
4. Set the network back to Online.

Requests give up after 15 seconds, so wait for the message rather than assuming it hung.

### 17. Clean up

Delete the test members. Keep the real staff login.

### 18. Confirm the auto-delete job exists

In SQL Editor:

```sql
select jobname, schedule from cron.job where jobname = 'gymconnect-cleanup';
```

Expected: one row, schedule `0 * * * *` (hourly). The retention window (7, 24, 48 or 72 hours; default 72) is changed by the admin in the console and counted from each member's `created_at`.

---

## Rollback

- Bad deploy: in Netlify, open Deploys, pick the last good deploy, and choose Publish deploy. This is instant and does not touch the database.
- Bad environment variable: fix it in Site configuration -> Environment variables, then redeploy with Clear cache and deploy site.
- Database: there are no "down" migrations. The SQL files only add or converge. Before any risky database change, use the app's "Download all" button (CSV export) to keep a copy of the members.
- Stop auto-deletion in an emergency: `select cron.unschedule('gymconnect-cleanup');`. Re-run `supabase/schema.sql`, then `schema-v2.sql`, then `schema-v3.sql` to schedule it again.
- Leaked service-role key: see the rotation chore in [HANDOFF.md](HANDOFF.md).

## Known limitations to be aware of at go-live

- The one-staff-per-gym cap is enforced in the admin console UI only, not on the server.
- The member list loads through PostgREST, which caps one response at about 1000 rows. Fine at the current scale; pagination is needed if a gym grows beyond that.
- New staff passwords are shared by the admin (for example over WhatsApp) in plain text, and staff are not forced to change them on first login.
- `@vercel/analytics` is a dependency but renders only when the `VERCEL` environment variable is set, so it does nothing on Netlify.

## Local development against the same project

See the Quick start in the [README](../README.md). Use a separate Supabase project for experiments if you can, so test data never mixes with real members.
