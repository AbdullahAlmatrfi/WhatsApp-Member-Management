-- ============================================================================
-- GymConnect v3 — admin-private members + identity (gym name, staff names)
-- Run this in the Supabase SQL Editor AFTER schema.sql and schema-v2.sql.
-- Idempotent + safe to re-run. ALWAYS run this LAST (it redefines members RLS
-- and the phone constraint; re-running schema.sql afterwards would revert them).
-- ============================================================================

-- ---------- is_staff(): SECURITY DEFINER so a members policy can check the
-- caller's role without recursing into profiles' RLS (mirrors is_admin) --------
create or replace function public.is_staff()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'staff'
  );
$$;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- ---------- members.admin_private: a member an ADMIN adds is private to the
-- admin; staff never see it. Staff-added members stay shared across staff. -----
alter table public.members add column if not exists admin_private boolean not null default false;
create index if not exists members_admin_private_idx on public.members (admin_private);

-- The DATABASE sets the flag from the inserter's role, so a client can't spoof
-- it (admin_private is not in the client INSERT grant either).
create or replace function public.set_member_admin_private()
returns trigger language plpgsql set search_path = public as $$
begin
  new.admin_private := public.is_admin();
  return new;
end; $$;
drop trigger if exists members_set_admin_private on public.members;
create trigger members_set_admin_private
  before insert on public.members
  for each row execute function public.set_member_admin_private();

-- Phone uniqueness is per "space": unique within the staff pool AND within the
-- admin's private list separately. This stops a staff member from hitting a
-- "number already exists" error on an admin-private row they can't even see.
do $do$
begin
  if exists (select 1 from pg_constraint
             where conname = 'members_phone_key' and conrelid = 'public.members'::regclass) then
    alter table public.members drop constraint members_phone_key;
  end if;
  if not exists (select 1 from pg_constraint
             where conname = 'members_phone_scope_key' and conrelid = 'public.members'::regclass) then
    alter table public.members add constraint members_phone_scope_key unique (admin_private, phone);
  end if;
end $do$;

-- ---------- members RLS: admin sees ALL; staff see only the staff pool --------
drop policy if exists members_auth_all     on public.members;
drop policy if exists members_admin_all    on public.members;
drop policy if exists members_staff_select on public.members;
drop policy if exists members_staff_insert on public.members;
drop policy if exists members_staff_update on public.members;
drop policy if exists members_staff_delete on public.members;

-- Admin: full access to every row (their own private + the staff pool).
create policy members_admin_all on public.members
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Staff: only non-private rows (the shared staff pool).
create policy members_staff_select on public.members
  for select to authenticated
  using (public.is_staff() and not admin_private);

create policy members_staff_insert on public.members
  for insert to authenticated
  with check (public.is_staff() and not admin_private);

create policy members_staff_update on public.members
  for update to authenticated
  using (public.is_staff() and not admin_private)
  with check (public.is_staff() and not admin_private);

create policy members_staff_delete on public.members
  for delete to authenticated
  using (public.is_staff() and not admin_private);

-- ---------- identity: gym name (settings) + staff display name (profiles) -----
-- gym_name: readable by approved accounts (existing settings_read), updatable by
-- an admin (existing settings_admin_update + the already-granted UPDATE privilege).
alter table public.settings add column if not exists gym_name text;

-- display_name: a friendly name the admin sets when creating a staff login.
-- Staff read their own via profiles_self_read; the admin reads all via
-- profiles_admin_read (v2). Writes stay server-side only (the admin-users route),
-- since client writes to profiles are revoked.
alter table public.profiles add column if not exists display_name text;
