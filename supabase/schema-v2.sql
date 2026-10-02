-- ============================================================================
-- GymConnect v2 — Admin Console, Wave A (User Management + Settings)
-- Run this in the Supabase SQL Editor AFTER schema.sql. Idempotent + safe to
-- re-run. Adds: admin role-management (approve/revoke) with guards, and the
-- email column so the admin can see who's who. (Analytics / feedback / activity
-- log tables come in later waves.)
--
-- ⚠ ORDERING: this must always be the LAST script you run. Re-running schema.sql
-- afterwards silently undoes v2 — schema.sql revokes the column UPDATE grant and
-- reverts handle_new_user to the no-email version. If you ever re-run schema.sql,
-- re-run THIS file right after it.
-- ============================================================================

-- ---------- is_admin(): SECURITY DEFINER so a policy ON profiles can check the
-- caller's role WITHOUT recursing into profiles' own RLS ----------------------
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- profiles.email so the admin list can show WHO each account is -----
alter table public.profiles add column if not exists email text;

-- Keep email in sync from auth.users on signup (extend the existing trigger fn).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, email)
    values (new.id, 'pending', new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;

-- Backfill emails for accounts that already exist.
update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id and (p.email is null or p.email = '');

-- ---------- Admin can READ every profile (to list accounts) ------------------
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles
  for select to authenticated
  using (public.is_admin());

-- ---------- Admin can UPDATE a profile's role (approve / revoke) --------------
-- Column-scoped: only `role` is grantable, gated by the admin RLS policy.
grant update (role) on public.profiles to authenticated;

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin() and role in ('admin','staff','pending'));

-- ---------- Guards: never lock out the last admin; no self-demotion ----------
create or replace function public.guard_admin_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and new.role <> 'admin' then
    -- Serialize the last-admin count so two admins demoting each other at the
    -- same time can't both read count=2, both pass, and leave zero admins.
    -- Each plpgsql statement takes a fresh snapshot, so the second txn to grab
    -- this lock then counts correctly.
    perform pg_advisory_xact_lock(hashtext('profiles_admin_guard'));
    if old.id = (select auth.uid()) then
      raise exception 'You cannot change your own admin role' using errcode = 'P0001';
    end if;
    if (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'Cannot remove the last admin' using errcode = 'P0001';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update of role on public.profiles
  for each row execute function public.guard_admin_role();

-- Settings read/update policies + the auto_delete_hours CHECK already exist from
-- schema.sql (settings_admin_update is admin-only), so the Settings tab works
-- with no new SQL here.
