-- ALYA Companion - Gourou role migration
-- Additive / idempotent migration for the existing profiles + badges system.
-- Run in Supabase SQL Editor.

-- 1) If profiles.role is a PostgreSQL enum, extend it without changing its type.
do $$
declare
  role_type_name text;
  role_type_schema text;
  role_type_kind "char";
begin
  select t.typname, n.nspname, t.typtype
    into role_type_name, role_type_schema, role_type_kind
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  join pg_namespace n on n.oid = t.typnamespace
  where cn.nspname = 'public'
    and c.relname = 'profiles'
    and a.attname = 'role'
    and a.attnum > 0
    and not a.attisdropped;

  if role_type_name is null then
    raise exception 'public.profiles.role not found';
  end if;

  if role_type_kind = 'e' then
    execute format(
      'alter type %I.%I add value if not exists %L',
      role_type_schema,
      role_type_name,
      'Gourou'
    );
  end if;
end $$;

-- 2) Replace old role CHECK constraints so text/varchar schemas also accept Gourou.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role::text in ('user', 'Admin', 'Gourou', 'DEV'));

-- 3) Compatibility helper used by the existing badge RPCs and storage policies.
-- Historical function name is retained, but DEV + Gourou are now both staff managers.
create or replace function public.alya_current_user_is_dev()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('DEV', 'Gourou')
  );
$$;

revoke all on function public.alya_current_user_is_dev() from public;
revoke all on function public.alya_current_user_is_dev() from anon;
grant execute on function public.alya_current_user_is_dev() to authenticated;

-- 4) Recreate role assignment with hierarchy enforced server-side.
-- Drop prior overloads first so PostgREST/Supabase cannot choose an outdated RPC.
do $$
declare
  r record;
begin
  for r in
    select pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_alya_user_role'
  loop
    execute format('drop function if exists public.set_alya_user_role(%s)', r.args);
  end loop;
end $$;

create function public.set_alya_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  target_role text;
  role_type_sql text;
begin
  select role::text into actor_role
  from public.profiles
  where id = auth.uid();

  if actor_role not in ('DEV', 'Gourou') then
    raise exception 'DEV or Gourou role required' using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot change your own ALYA role' using errcode = '42501';
  end if;

  if new_role not in ('user', 'Admin', 'Gourou', 'DEV') then
    raise exception 'Unknown ALYA role';
  end if;

  select role::text into target_role
  from public.profiles
  where id = target_user_id;

  if target_role is null then
    raise exception 'Unknown ALYA profile';
  end if;

  if actor_role = 'Gourou' then
    if target_role in ('DEV', 'Gourou') then
      raise exception 'A Gourou cannot modify a DEV or Gourou account' using errcode = '42501';
    end if;

    if new_role not in ('Admin', 'user') then
      raise exception 'A Gourou can only assign Admin or user' using errcode = '42501';
    end if;
  end if;

  select format('%I.%I', n.nspname, t.typname)
    into role_type_sql
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  join pg_namespace n on n.oid = t.typnamespace
  where cn.nspname = 'public'
    and c.relname = 'profiles'
    and a.attname = 'role'
    and a.attnum > 0
    and not a.attisdropped;

  execute format(
    'update public.profiles set role = $1::%s, updated_at = now() where id = $2',
    role_type_sql
  ) using new_role, target_user_id;
end;
$$;

revoke all on function public.set_alya_user_role(uuid, text) from public;
revoke all on function public.set_alya_user_role(uuid, text) from anon;
grant execute on function public.set_alya_user_role(uuid, text) to authenticated;
