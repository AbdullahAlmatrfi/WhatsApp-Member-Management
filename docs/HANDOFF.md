# Handoff Guide

Use this when the project changes hands (new owner, new developer, or new gym manager). Fill in the Owner column, then keep this file up to date.

This document lists WHERE secrets live. It must never contain the secrets themselves.

## 1. Inventory of accounts and services

| Service | What it is used for | Identifier | Owner (fill in) | Login email (fill in) | Date handed over (fill in) |
| --- | --- | --- | --- | --- | --- |
| GitHub | Source code | Repository `AbdullahAlmatrfi/WhatsApp-Member-Management` | | | |
| Netlify | Hosting and builds | Site: (fill in site name and URL) | | | |
| Supabase | Database, logins, auto-delete job | Project: (fill in project name and reference ID) | | | |
| WhatsApp Business number | The number staff message members from (used in staff WhatsApp web or desktop; not connected to the app by any API) | (fill in number) | | | |
| Domain / DNS | Custom address for the site, if any | (fill in, or write "none") | | | |
| Password manager | Holds the shared credentials above | (fill in) | | | |

Also record who holds the two GymConnect logins:

| App login | Role | Person (fill in) |
| --- | --- | --- |
| Owner's email | admin | |
| Staff email | staff (one per gym) | |

## 2. Where the secrets live

| Secret | Where it lives | Notes |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify -> Site configuration -> Environment variables (and a password manager). Optional copy in a developer's local `.env.local`. | Server-only. Bypasses all database security. Never put it in git, chat, or a `NEXT_PUBLIC_` variable. |
| `NEXT_PUBLIC_SUPABASE_URL` | Netlify environment variables; `.env.local` for local work | Public by design. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Netlify environment variables; `.env.local` for local work | Public by design. Safe only because Row Level Security is on. |
| Supabase database password | Password manager | Set when the project was created. |
| Admin and staff app passwords | Held by each person (password manager recommended) | The admin can reset the staff password from the console. |
| Account passwords for GitHub, Netlify, Supabase, WhatsApp | Each owner's password manager | Turn on two-factor authentication on all of them. |

Where to re-find the Supabase keys: Supabase dashboard -> Project Settings -> API.

`.env.local` is git-ignored. If you find a real key in git history, treat it as leaked (see chores).

## 3. How to transfer ownership

Do these in order and test the site after each one.

1. GitHub: in the repository, Settings -> Collaborators to add the new owner as an admin, or Settings -> General -> Danger Zone -> Transfer ownership to move the repository. After a transfer, reconnect Netlify to the repository at its new address (Netlify -> Site configuration -> Build and deploy -> Continuous deployment).
2. Netlify: add the new owner as a team member (Team settings -> Members) with the Owner role, or use Netlify's site transfer to move the site to the new owner's team. Confirm the three environment variables are still present afterwards.
3. Supabase: invite the new owner to the organization (Organization settings -> Team) as Owner, or transfer the project to the new owner's organization (Project Settings -> General -> Transfer project). Verify sign-up settings are still OFF and the `gymconnect-cleanup` job still exists (`select jobname, schedule from cron.job;`).
4. App admin login: to change who the admin is, create the new person's login in Supabase (Authentication -> Users), then run the promote query below. Only after the new admin can log in, remove the old admin's access. Note that the admin console deliberately cannot delete or demote an admin, and the database refuses to remove the last admin, so always promote the new admin first.

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'NEW_OWNER_EMAIL');
   ```

   To demote the old admin, use the SQL editor while signed in as a different admin:

   ```sql
   update public.profiles set role = 'staff'
   where id = (select id from auth.users where email = 'OLD_OWNER_EMAIL');
   ```

   Demoting to staff would then break the one-staff rule if a staff login already exists, so in most handovers it is better to delete the old admin's auth user in the Supabase dashboard instead (Authentication -> Users).
5. WhatsApp Business number: transfer by moving the SIM and re-registering WhatsApp Business on the new owner's phone, or by changing the account's linked devices. The app is not connected to WhatsApp by any API, so nothing in GymConnect needs updating.
6. Domain: transfer the registrar account or change its contact email; then update DNS and the domain setting in Netlify if the target changed.
7. Rotate secrets after the handover (see chores): the Supabase service-role key and the database password, and have everyone change passwords.

## 4. Recurring chores

| How often | Chore | How |
| --- | --- | --- |
| Monthly, and after any Supabase setting change | Re-check Supabase sign-up is OFF | Supabase -> Authentication: email sign-up, anonymous sign-ins and manual linking must all be disabled. This is the most dangerous switch in the project. |
| Monthly | Check Netlify and Supabase free-tier limits | Netlify: build minutes, bandwidth and function usage. Supabase: database size, monthly active users, and project status. Note that free Supabase projects can be paused after about a week of inactivity; a paused project makes the app show connection errors. |
| Monthly | Check the auto-delete job is still scheduled | `select jobname, schedule from cron.job where jobname = 'gymconnect-cleanup';` should return one row. |
| Monthly | Confirm only the expected logins exist | `select email, role from public.profiles;` should show the owner as `admin` and one `staff`. Delete anything unexpected. |
| When needed | Rotate the service-role key if it is ever leaked or a developer leaves | Supabase -> Project Settings -> API: regenerate the key (or JWT secret, as the dashboard offers). Paste the new value into Netlify as `SUPABASE_SERVICE_ROLE_KEY`, then redeploy. Check the admin console can still create or reset a login. Because the anon key may change too on a JWT-secret rotation, update the two public variables as well and redeploy with a cleared cache. |
| When needed | Change a password after someone leaves | Admin console -> reset the staff password; reset your own admin password in Supabase. |
| When needed | Reset the staff password after a handover | New passwords are shared in plain text and not force-changed, so reset them whenever a person changes. |

## 5. Before you rely on this document

Fill the blank cells above, store the credentials in a password manager the new owner controls, and run the smoke test in [SETUP-AND-DEPLOY.md](SETUP-AND-DEPLOY.md) once after the transfer.
