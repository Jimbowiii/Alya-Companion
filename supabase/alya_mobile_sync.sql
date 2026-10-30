-- ALYA Companion - Cross-device synchronization (PC <-> Android)
-- v1.1: Baies + separate PC/Android Surf states.
-- Safe to rerun after the first mobile v1 migration.

create table if not exists public.alya_cross_device_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  berry_names jsonb not null default '{}'::jsonb,
  berry_timers jsonb not null default '{}'::jsonb,
  berry_watering_mode text not null default '8h'
    check (berry_watering_mode in ('8h', '10h')),
  berries_initialized boolean not null default false,
  berries_updated_at timestamptz not null default now(),
  surf_active_patch_id text null,
  surf_requested_patch_id text null,
  surf_pc_active_patch_id text null,
  surf_android_active_patch_id text null,
  surf_pc_updated_at timestamptz null,
  surf_android_updated_at timestamptz null,
  surf_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alya_cross_device_state
  add column if not exists berries_initialized boolean not null default false;
alter table public.alya_cross_device_state
  add column if not exists surf_pc_active_patch_id text null;
alter table public.alya_cross_device_state
  add column if not exists surf_android_active_patch_id text null;
alter table public.alya_cross_device_state
  add column if not exists surf_pc_updated_at timestamptz null;
alter table public.alya_cross_device_state
  add column if not exists surf_android_updated_at timestamptz null;

-- If the old mobile v1 was ever used, preserve the known PC active state.
update public.alya_cross_device_state
set surf_pc_active_patch_id = coalesce(surf_pc_active_patch_id, surf_active_patch_id)
where surf_pc_active_patch_id is null and surf_active_patch_id is not null;

alter table public.alya_cross_device_state enable row level security;

drop policy if exists "alya_sync_select_own" on public.alya_cross_device_state;
create policy "alya_sync_select_own"
on public.alya_cross_device_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "alya_sync_insert_own" on public.alya_cross_device_state;
create policy "alya_sync_insert_own"
on public.alya_cross_device_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "alya_sync_update_own" on public.alya_cross_device_state;
create policy "alya_sync_update_own"
on public.alya_cross_device_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "alya_sync_delete_own" on public.alya_cross_device_state;
create policy "alya_sync_delete_own"
on public.alya_cross_device_state
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.alya_cross_device_state to authenticated;

-- Realtime (safe to rerun).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'alya_cross_device_state'
  ) then
    alter publication supabase_realtime add table public.alya_cross_device_state;
  end if;
end $$;
