-- ALYA Companion — événement global Dashboard v1
-- À exécuter dans Supabase SQL Editor.
-- Lecture : tous les utilisateurs authentifiés.
-- Écriture : DEV et GOUROU uniquement, via RPC sécurisées.

create table if not exists public.alya_dashboard_events (
  id text primary key default 'global' check (id = 'global'),
  title text not null,
  body text not null default '',
  title_color text not null default '#ffffff',
  background_url text null,
  background_path text null,
  ends_at timestamptz not null,
  active boolean not null default true,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alya_dashboard_events enable row level security;

grant select on table public.alya_dashboard_events to authenticated;
revoke insert, update, delete on table public.alya_dashboard_events from authenticated, anon;

drop policy if exists "alya_dashboard_event_read" on public.alya_dashboard_events;
create policy "alya_dashboard_event_read"
on public.alya_dashboard_events
for select
to authenticated
using (true);

create or replace function public.alya_current_user_can_manage_events()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text in ('DEV', 'Gourou')
  );
$$;

revoke all on function public.alya_current_user_can_manage_events() from public;
grant execute on function public.alya_current_user_can_manage_events() to authenticated;

create or replace function public.set_alya_dashboard_event(
  p_title text,
  p_body text default '',
  p_title_color text default '#ffffff',
  p_background_url text default null,
  p_background_path text default null,
  p_ends_at timestamptz default null
)
returns public.alya_dashboard_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.alya_dashboard_events;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := coalesce(p_body, '');
  v_color text := lower(btrim(coalesce(p_title_color, '#ffffff')));
begin
  if not public.alya_current_user_can_manage_events() then
    raise exception 'Accès refusé : rôle DEV ou GOUROU requis.';
  end if;

  if char_length(v_title) < 1 or char_length(v_title) > 80 then
    raise exception 'Le titre doit contenir entre 1 et 80 caractères.';
  end if;

  if char_length(v_body) > 700 then
    raise exception 'Le texte de l''événement est limité à 700 caractères.';
  end if;

  if v_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'Couleur de titre invalide.';
  end if;

  if p_ends_at is null or p_ends_at <= now() then
    raise exception 'La date de fin doit être dans le futur.';
  end if;

  if p_background_url is not null and p_background_url !~ '^https://.+$' then
    raise exception 'URL de fond invalide.';
  end if;

  if p_background_path is not null and p_background_path !~ '^dashboard/[A-Za-z0-9._/-]+$' then
    raise exception 'Chemin de fond invalide.';
  end if;

  insert into public.alya_dashboard_events (
    id, title, body, title_color, background_url, background_path,
    ends_at, active, updated_by, created_at, updated_at
  )
  values (
    'global', v_title, v_body, v_color, p_background_url, p_background_path,
    p_ends_at, true, auth.uid(), now(), now()
  )
  on conflict (id) do update set
    title = excluded.title,
    body = excluded.body,
    title_color = excluded.title_color,
    background_url = excluded.background_url,
    background_path = excluded.background_path,
    ends_at = excluded.ends_at,
    active = true,
    updated_by = auth.uid(),
    updated_at = now()
  returning * into v_event;

  return v_event;
end;
$$;

revoke all on function public.set_alya_dashboard_event(text, text, text, text, text, timestamptz) from public;
grant execute on function public.set_alya_dashboard_event(text, text, text, text, text, timestamptz) to authenticated;

create or replace function public.clear_alya_dashboard_event()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.alya_current_user_can_manage_events() then
    raise exception 'Accès refusé : rôle DEV ou GOUROU requis.';
  end if;

  update public.alya_dashboard_events
  set active = false,
      updated_by = auth.uid(),
      updated_at = now()
  where id = 'global';
end;
$$;

revoke all on function public.clear_alya_dashboard_event() from public;
grant execute on function public.clear_alya_dashboard_event() to authenticated;

-- Images de fond des événements.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'alya-events',
  'alya-events',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "alya_event_images_read" on storage.objects;
create policy "alya_event_images_read"
on storage.objects
for select
to public
using (bucket_id = 'alya-events');

drop policy if exists "alya_event_images_insert" on storage.objects;
create policy "alya_event_images_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'alya-events'
  and public.alya_current_user_can_manage_events()
);

drop policy if exists "alya_event_images_update" on storage.objects;
create policy "alya_event_images_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'alya-events'
  and public.alya_current_user_can_manage_events()
)
with check (
  bucket_id = 'alya-events'
  and public.alya_current_user_can_manage_events()
);

drop policy if exists "alya_event_images_delete" on storage.objects;
create policy "alya_event_images_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'alya-events'
  and public.alya_current_user_can_manage_events()
);

-- Realtime pour mise à jour quasi immédiate chez les utilisateurs connectés.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'alya_dashboard_events'
     ) then
    alter publication supabase_realtime add table public.alya_dashboard_events;
  end if;
end $$;
