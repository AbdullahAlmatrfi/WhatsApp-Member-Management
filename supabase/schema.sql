-- =====================================================================
--  GymConnect v2 — database schema
--  Paste this whole file into Supabase → SQL Editor → New query → Run.
--  It creates the tables, security rules, and the auto-delete job.
-- =====================================================================

-- ---------- MEMBERS -------------------------------------------------
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  sent        boolean not null default false,   -- promotion sent?
  created_at  timestamptz not null default now(),
  -- B4 / FR-13 / FR-14 / FR-19: enforced in the database, not just the browser
  constraint members_phone_key       unique (phone),
  constraint members_phone_format_chk check (phone ~ '^9665[0-9]{8}$'),
  constraint members_name_valid_chk   check (btrim(name) <> '' and char_length(name) between 1 and 100)
);
create index if not exists members_created_at_idx on public.members (created_at);

-- Converge an EXISTING members table (create table if not exists never alters it).
-- !! RUN THESE THREE DETECTION QUERIES FIRST. Each must return zero rows, or the
-- !! ALTERs below will abort. Fix/delete the offending rows, then run this file.
--
--   -- 1) duplicate phones (blocks UNIQUE):
--   select phone, count(*) from public.members group by phone having count(*) > 1;
--
--   -- 2) malformed phones (blocks members_phone_format_chk):
--   select id, name, phone from public.members where phone !~ '^9665[0-9]{8}$';
--
--   -- 3) blank / over-long names (blocks members_name_valid_chk):
--   select id, name, phone from public.members
--   where btrim(name) = '' or char_length(name) not between 1 and 100;
do $do$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'members_phone_key'
                   and conrelid = 'public.members'::regclass) then
    alter table public.members add constraint members_phone_key unique (phone);
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'members_phone_format_chk'
                   and conrelid = 'public.members'::regclass) then
    alter table public.members
      add constraint members_phone_format_chk check (phone ~ '^9665[0-9]{8}$');
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'members_name_valid_chk'
                   and conrelid = 'public.members'::regclass) then
    alter table public.members
      add constraint members_name_valid_chk
      check (btrim(name) <> '' and char_length(name) between 1 and 100);
  end if;
end $do$;

-- ---------- PROFILES (role per login account) -----------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'staff',
  created_at  timestamptz not null default now(),
  constraint profiles_role_allowed check (role in ('admin','staff','pending'))
);

-- Converge an EXISTING profiles table: replace the old inline check
-- (auto-named profiles_role_check, only admin/staff) with one that allows 'pending'.
-- Safe: it only widens the allowed values, so no existing row can violate it.
do $do$
begin
  if exists (select 1 from pg_constraint
             where conname = 'profiles_role_check'
               and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'profiles_role_allowed'
                   and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles
      add constraint profiles_role_allowed check (role in ('admin','staff','pending'));
  end if;
end $do$;

-- ---------- SETTINGS (single row of app config) ---------------------
create table if not exists public.settings (
  id                 int primary key default 1,
  auto_delete_hours  int not null default 72,   -- 72h = 3 days (your default)
  constraint settings_singleton check (id = 1),
  constraint settings_hours_allowed check (auto_delete_hours in (7,24,48,72))
);
insert into public.settings (id, auto_delete_hours)
  values (1, 72) on conflict (id) do nothing;

-- FR-48: auto-delete window locked to 7 / 24 / 48 / 72 hours.
-- Replaces the loose settings_hours_nonneg (>= 0). PO open question Q3: should
-- "off" (0) be allowed? Current decision: NO. If yes, add 0 to the list below.
-- If the existing row holds a disallowed value the ADD below FAILS, so reset it first:
--   update public.settings set auto_delete_hours = 72
--   where id = 1 and auto_delete_hours not in (7,24,48,72);
do $do$
begin
  if exists (select 1 from pg_constraint
             where conname = 'settings_hours_nonneg'
               and conrelid = 'public.settings'::regclass) then
    alter table public.settings drop constraint settings_hours_nonneg;
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'settings_hours_allowed'
                   and conrelid = 'public.settings'::regclass) then
    alter table public.settings
      add constraint settings_hours_allowed check (auto_delete_hours in (7,24,48,72));
  end if;
end $do$;

-- ---------- auto-create a profile whenever a user is added ----------
-- B0 defense-in-depth: a brand-new auth user (e.g. from an accidentally-open
-- signup) gets role 'pending', which no members policy grants access to.
-- An admin promotes a real account with:
--   update public.profiles set role = 'staff' where id = '<uuid>';
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role) values (new.id, 'pending')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill: give any user who already existed a profile too
-- (these pre-existing accounts keep 'staff' so current logins are not locked out;
--  only users created AFTER this file runs start as 'pending')
insert into public.profiles (id, role)
  select id, 'staff' from auth.users on conflict (id) do nothing;

-- lock down the trigger function so only the database can run it
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------- ROW LEVEL SECURITY (keeps data private) -----------------
alter table public.members  enable row level security;
alter table public.profiles enable row level security;
alter table public.settings enable row level security;

-- members: only accounts with an 'admin' or 'staff' profile can read + write.
-- (was using (true): any logged-in user, incl. a 'pending' self-signup, got full
--  access, which would have made the 'pending' role meaningless.)
drop policy if exists members_auth_all on public.members;
create policy members_auth_all on public.members
  for all to authenticated
  using      (exists (select 1 from public.profiles p
                      where p.id = (select auth.uid()) and p.role in ('admin','staff')))
  with check (exists (select 1 from public.profiles p
                      where p.id = (select auth.uid()) and p.role in ('admin','staff')));

-- profiles: a user can read their own profile row
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (auth.uid() = id);

-- settings: only approved (admin/staff) accounts can read; only an admin changes.
-- (was using (true): a 'pending' self-signup could read auto_delete_hours. The
--  app reads this for the "leaving soon" tag, which only approved users see.)
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings
  for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.role in ('admin','staff')));

drop policy if exists settings_admin_update on public.settings;
create policy settings_admin_update on public.settings
  for update to authenticated
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ---------- TABLE PRIVILEGES (defense-in-depth on top of RLS) -------
-- Supabase grants broad default privileges; RLS is the main gate, these revokes
-- are a second lock. All idempotent.

-- logged-out visitors (anon) get nothing at all
revoke all on public.members, public.profiles, public.settings from anon;

-- profiles are managed only by the trigger / an admin in the SQL editor, never the API
revoke insert, update, delete, truncate on public.profiles from authenticated;

-- settings: the single row is seeded here; clients may only read and (admin) update it
revoke insert, delete, truncate on public.settings from authenticated;

-- B9: make created_at (and name/phone) immutable to clients so the retention
-- window cannot be bypassed by back/forward-dating a row. The app only ever
-- updates `sent`, so that is the only column clients may UPDATE.
revoke update on public.members from authenticated;
grant  update (sent) on public.members to authenticated;

-- TRUNCATE ignores RLS entirely; no client should ever be able to wipe members.
revoke truncate on public.members from authenticated;

-- B9 (insert side): a client must not choose `id` or `created_at` on INSERT either,
-- or it could back/forward-date a new row and dodge retention. Scope INSERT to the
-- three columns the app actually sends; `id` and `created_at` fall back to defaults.
revoke insert on public.members from authenticated;
grant  insert (name, phone, sent) on public.members to authenticated;

-- ---------- AUTO-DELETE old members ---------------------------------
create or replace function public.cleanup_old_members()
returns void language plpgsql security definer set search_path = public as $$
declare hrs int;
begin
  select auto_delete_hours into hrs from public.settings where id = 1;
  if hrs is not null and hrs > 0 then
    delete from public.members where created_at < now() - make_interval(hours => hrs);
  end if;
end; $$;

-- lock down the cleanup function so only the database (pg_cron) can run it
revoke execute on function public.cleanup_old_members() from public, anon, authenticated;

-- run the cleanup every hour.
-- NOTE: if the next line errors, first enable pg_cron in the dashboard
-- (Database -> Extensions -> search "pg_cron" -> enable), then re-run from here.
create extension if not exists pg_cron;
-- NFR-38: idempotent. Older pg_cron errors on a duplicate job name, so drop any
-- existing job with this name first, then (re)create it.
do $do$
begin
  if exists (select 1 from cron.job where jobname = 'gymconnect-cleanup') then
    perform cron.unschedule('gymconnect-cleanup');
  end if;
  perform cron.schedule('gymconnect-cleanup', '0 * * * *', 'select public.cleanup_old_members();');
end $do$;

-- =====================================================================
--  AFTER you create your admin login (in Authentication → Users),
--  run this ONCE to make yourself the admin (put your email in):
--
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
-- =====================================================================
