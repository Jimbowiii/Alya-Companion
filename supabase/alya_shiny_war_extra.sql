create table if not exists public.alya_shiny_war_extra (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gtl_rows jsonb not null default '[]'::jsonb,
  item_quantities jsonb not null default '[0,0,0,0,0,0,0,0]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.alya_shiny_war_extra enable row level security;

drop policy if exists "alya_shiny_extra_select_own" on public.alya_shiny_war_extra;
create policy "alya_shiny_extra_select_own"
on public.alya_shiny_war_extra for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "alya_shiny_extra_insert_own" on public.alya_shiny_war_extra;
create policy "alya_shiny_extra_insert_own"
on public.alya_shiny_war_extra for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "alya_shiny_extra_update_own" on public.alya_shiny_war_extra;
create policy "alya_shiny_extra_update_own"
on public.alya_shiny_war_extra for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.alya_shiny_war_extra to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'alya_shiny_war_extra'
  ) then
    alter publication supabase_realtime add table public.alya_shiny_war_extra;
  end if;
end $$;
