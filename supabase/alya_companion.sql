-- Alya Companion — V1 + V2
-- Exécuter ce fichier dans Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Utilisateur Alya' check (char_length(username) between 1 and 32),
  avatar_url text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shiny_war_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.shiny_war_documents enable row level security;

-- Profiles : chaque utilisateur ne voit et ne modifie que son profil.
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Shiny-War : un document privé par compte Alya.
drop policy if exists "shiny_war_select_self" on public.shiny_war_documents;
create policy "shiny_war_select_self"
on public.shiny_war_documents for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "shiny_war_insert_self" on public.shiny_war_documents;
create policy "shiny_war_insert_self"
on public.shiny_war_documents for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "shiny_war_update_self" on public.shiny_war_documents;
create policy "shiny_war_update_self"
on public.shiny_war_documents for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "shiny_war_delete_self" on public.shiny_war_documents;
create policy "shiny_war_delete_self"
on public.shiny_war_documents for delete
to authenticated
using (auth.uid() = user_id);

-- Création automatique du profil au premier compte.
create or replace function public.handle_new_alya_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, 'Utilisateur Alya'), '@', 1)
    ), 32),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_alya on auth.users;
create trigger on_auth_user_created_alya
after insert on auth.users
for each row execute procedure public.handle_new_alya_user();

-- Avatar public, mais écriture limitée au dossier UUID de l'utilisateur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "alya_avatar_insert_own" on storage.objects;
create policy "alya_avatar_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "alya_avatar_update_own" on storage.objects;
create policy "alya_avatar_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "alya_avatar_delete_own" on storage.objects;
create policy "alya_avatar_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
