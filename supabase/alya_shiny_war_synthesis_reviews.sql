-- ALYA Companion RC11 - Synthèse Shiny-War + réponses Prépa Alya
-- Supabase > SQL Editor > New query > coller TOUT ce fichier > Run.
-- Idempotent : peut être relancé.

create table if not exists public.alya_shiny_war_reviews (
  target_user_id uuid primary key references auth.users(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  message text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.alya_shiny_war_reviews enable row level security;

drop policy if exists "shiny_review_select" on public.alya_shiny_war_reviews;
create policy "shiny_review_select"
on public.alya_shiny_war_reviews
for select
to authenticated
using (
  target_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(p.role::text) in ('dev','gourou','admin')
  )
);

drop policy if exists "shiny_review_staff_insert" on public.alya_shiny_war_reviews;
create policy "shiny_review_staff_insert"
on public.alya_shiny_war_reviews
for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(p.role::text) in ('dev','gourou','admin')
  )
);

drop policy if exists "shiny_review_staff_update" on public.alya_shiny_war_reviews;
create policy "shiny_review_staff_update"
on public.alya_shiny_war_reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(p.role::text) in ('dev','gourou','admin')
  )
)
with check (
  author_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(p.role::text) in ('dev','gourou','admin')
  )
);

grant select, insert, update on public.alya_shiny_war_reviews to authenticated;
