-- Alya Companion - Player badges v2 (image badges)
-- Additive / idempotent migration. Run in Supabase SQL Editor.

create table if not exists public.alya_badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null default '✦',
  color text not null default '#9b7bdf',
  image_url text null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint alya_badges_name_length check (char_length(trim(name)) between 1 and 24),
  constraint alya_badges_icon_length check (char_length(icon) between 1 and 8),
  constraint alya_badges_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

alter table public.alya_badges add column if not exists image_url text null;

create table if not exists public.profile_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.alya_badges(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  display_order integer not null default 0,
  primary key (user_id, badge_id)
);

create index if not exists profile_badges_user_id_idx on public.profile_badges(user_id);
create index if not exists profile_badges_badge_id_idx on public.profile_badges(badge_id);

alter table public.profile_badges add column if not exists display_order integer not null default 0;

-- Seed a deterministic order for existing assignments only when no manual order
-- has been saved yet for that user.
with users_to_seed as (
  select user_id
  from public.profile_badges
  group by user_id
  having count(*) > 1 and max(display_order) = 0
), ranked as (
  select pb.user_id,
         pb.badge_id,
         row_number() over (partition by pb.user_id order by pb.assigned_at, pb.badge_id) - 1 as next_order
  from public.profile_badges pb
  join users_to_seed seed on seed.user_id = pb.user_id
)
update public.profile_badges pb
set display_order = ranked.next_order
from ranked
where pb.user_id = ranked.user_id
  and pb.badge_id = ranked.badge_id;


alter table public.alya_badges enable row level security;
alter table public.profile_badges enable row level security;

drop policy if exists "alya_badges_read_authenticated" on public.alya_badges;
create policy "alya_badges_read_authenticated"
on public.alya_badges
for select
to authenticated
using (true);

drop policy if exists "profile_badges_read_authenticated" on public.profile_badges;
create policy "profile_badges_read_authenticated"
on public.profile_badges
for select
to authenticated
using (true);

revoke insert, update, delete on public.alya_badges from anon, authenticated;
revoke insert, update, delete on public.profile_badges from anon, authenticated;
grant select on public.alya_badges to authenticated;
grant select on public.profile_badges to authenticated;

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
      and role::text = 'DEV'
  );
$$;

revoke all on function public.alya_current_user_is_dev() from public;
revoke all on function public.alya_current_user_is_dev() from anon;
grant execute on function public.alya_current_user_is_dev() to authenticated;

create or replace function public.create_alya_badge(
  p_name text,
  p_icon text default '✦',
  p_color text default '#9b7bdf',
  p_image_url text default null
)
returns public.alya_badges
language plpgsql
security definer
set search_path = public
as $$
declare
  created_badge public.alya_badges;
  clean_name text := trim(coalesce(p_name, ''));
  clean_icon text := trim(coalesce(p_icon, ''));
  clean_color text := trim(coalesce(p_color, ''));
  clean_image_url text := nullif(trim(coalesce(p_image_url, '')), '');
begin
  if not public.alya_current_user_is_dev() then
    raise exception 'DEV role required' using errcode = '42501';
  end if;

  if char_length(clean_name) < 1 or char_length(clean_name) > 24 then
    raise exception 'Badge name must contain between 1 and 24 characters';
  end if;

  if clean_icon = '' then clean_icon := '✦'; end if;
  if char_length(clean_icon) > 8 then
    raise exception 'Badge icon is too long';
  end if;

  if clean_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Badge color must be a hexadecimal color';
  end if;

  if clean_image_url is not null and clean_image_url !~* '^https?://' then
    raise exception 'Badge image URL must be an absolute HTTP(S) URL';
  end if;

  insert into public.alya_badges(name, icon, color, image_url, created_by)
  values (clean_name, clean_icon, lower(clean_color), clean_image_url, auth.uid())
  returning * into created_badge;

  return created_badge;
end;
$$;

create or replace function public.delete_alya_badge(p_badge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.alya_current_user_is_dev() then
    raise exception 'DEV role required' using errcode = '42501';
  end if;

  delete from public.alya_badges where id = p_badge_id;
end;
$$;

create or replace function public.set_alya_user_badge(
  p_user_id uuid,
  p_badge_id uuid,
  p_assigned boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.alya_current_user_is_dev() then
    raise exception 'DEV role required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Unknown Alya profile';
  end if;

  if not exists (select 1 from public.alya_badges where id = p_badge_id) then
    raise exception 'Unknown Alya badge';
  end if;

  if p_assigned then
    insert into public.profile_badges(user_id, badge_id, assigned_by, display_order)
    values (
      p_user_id,
      p_badge_id,
      auth.uid(),
      coalesce((select max(display_order) + 1 from public.profile_badges where user_id = p_user_id), 0)
    )
    on conflict (user_id, badge_id) do nothing;
  else
    delete from public.profile_badges
    where user_id = p_user_id and badge_id = p_badge_id;
  end if;
end;
$$;

drop function if exists public.create_alya_badge(text, text, text);
create or replace function public.set_alya_user_badge_order(
  p_user_id uuid,
  p_badge_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_count integer;
  supplied_count integer;
  unique_count integer;
begin
  if not public.alya_current_user_is_dev() then
    raise exception 'DEV role required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Unknown Alya profile';
  end if;

  select count(*) into assigned_count
  from public.profile_badges
  where user_id = p_user_id;

  supplied_count := cardinality(coalesce(p_badge_ids, '{}'::uuid[]));

  select count(distinct requested.badge_id) into unique_count
  from unnest(coalesce(p_badge_ids, '{}'::uuid[])) as requested(badge_id);

  if supplied_count <> assigned_count or unique_count <> assigned_count then
    raise exception 'Badge order must contain every assigned badge exactly once';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_badge_ids, '{}'::uuid[])) as requested(badge_id)
    where not exists (
      select 1
      from public.profile_badges pb
      where pb.user_id = p_user_id
        and pb.badge_id = requested.badge_id
    )
  ) then
    raise exception 'Badge order contains a badge not assigned to this profile';
  end if;

  update public.profile_badges pb
  set display_order = (ordered.position - 1)::integer
  from unnest(coalesce(p_badge_ids, '{}'::uuid[])) with ordinality as ordered(badge_id, position)
  where pb.user_id = p_user_id
    and pb.badge_id = ordered.badge_id;
end;
$$;

revoke all on function public.create_alya_badge(text, text, text, text) from public, anon;
revoke all on function public.delete_alya_badge(uuid) from public, anon;
revoke all on function public.set_alya_user_badge(uuid, uuid, boolean) from public, anon;
revoke all on function public.set_alya_user_badge_order(uuid, uuid[]) from public, anon;

grant execute on function public.create_alya_badge(text, text, text, text) to authenticated;
grant execute on function public.delete_alya_badge(uuid) to authenticated;
grant execute on function public.set_alya_user_badge(uuid, uuid, boolean) to authenticated;
grant execute on function public.set_alya_user_badge_order(uuid, uuid[]) to authenticated;

-- Storage bucket for image badges
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'alya-badges',
  'alya-badges',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "alya_badges_storage_public_read" on storage.objects;
create policy "alya_badges_storage_public_read"
on storage.objects
for select
to public
using (bucket_id = 'alya-badges');

drop policy if exists "alya_badges_storage_dev_insert" on storage.objects;
create policy "alya_badges_storage_dev_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'alya-badges'
  and public.alya_current_user_is_dev()
);

drop policy if exists "alya_badges_storage_dev_update" on storage.objects;
create policy "alya_badges_storage_dev_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'alya-badges'
  and public.alya_current_user_is_dev()
)
with check (
  bucket_id = 'alya-badges'
  and public.alya_current_user_is_dev()
);

drop policy if exists "alya_badges_storage_dev_delete" on storage.objects;
create policy "alya_badges_storage_dev_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'alya-badges'
  and public.alya_current_user_is_dev()
);
