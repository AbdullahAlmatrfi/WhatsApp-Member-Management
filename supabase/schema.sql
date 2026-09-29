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
  created_at  timestamptz not null default now()
);
create index if not exists members_created_at_idx on public.members (created_at);

-- ---------- PROFILES (role per login account) -----------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'staff' check (role in ('admin','staff')),
  created_at  timestamptz not null default now()
);

-- ---------- SETTINGS (single row of app config) ---------------------
create table if not exists public.settings (
  id                 int primary key default 1,
  auto_delete_hours  int not null default 72,   -- 72h = 3 days (your default)
  constraint settings_singleton check (id = 1)
);
insert into public.settings (id, auto_delete_hours)
  values (1, 72) on conflict (id) do nothing;

-- ---------- auto-create a profile whenever a user is added ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role) values (new.id, 'staff')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ROW LEVEL SECURITY (keeps data private) -----------------
alter table public.members  enable row level security;
alter table public.profiles enable row level security;
alter table public.settings enable row level security;

-- members: any logged-in staff can read + write
drop policy if exists members_auth_all on public.members;
create policy members_auth_all on public.members
  for all to authenticated using (true) with check (true);

-- profiles: a user can read their own profile row
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (auth.uid() = id);

-- settings: everyone logged-in can read; only an admin can change
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings
  for select to authenticated using (true);

drop policy if exists settings_admin_update on public.settings;
create policy settings_admin_update on public.settings
  for update to authenticated
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

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

-- run the cleanup every hour (needs the pg_cron extension enabled)
create extension if not exists pg_cron;
select cron.schedule('gymconnect-cleanup', '0 * * * *', $$ select public.cleanup_old_members(); $$);

-- =====================================================================
--  AFTER you create your admin login (in Authentication → Users),
--  run this ONCE to make yourself the admin (put your email in):
--
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
-- =====================================================================
