-- ALYA Companion RC11 - Shiny-War / feuille Breeder
-- Supabase > SQL Editor > New query > coller tout ce fichier > Run.
-- Idempotent : il peut etre relance sans effacer les donnees existantes.

alter table public.alya_shiny_war_extra
  add column if not exists breeder_rows jsonb not null
  default '[{"id":"breeder-default-1","kind":"alpha","eggGroup":"Monster","quantity":0}]'::jsonb;

update public.alya_shiny_war_extra
set breeder_rows = '[{"id":"breeder-default-1","kind":"alpha","eggGroup":"Monster","quantity":0}]'::jsonb
where breeder_rows is null
   or jsonb_typeof(breeder_rows) <> 'array'
   or jsonb_array_length(breeder_rows) = 0;

grant select, insert, update on public.alya_shiny_war_extra to authenticated;
