-- ALYA Companion RC11 - Shiny-War / feuille Alphas
-- A executer UNE FOIS dans Supabase > SQL Editor > New query > Run.
-- Idempotent : peut etre relance sans supprimer les donnees existantes.

alter table public.alya_shiny_war_extra
  add column if not exists alpha_rows jsonb not null
  default '[{"id":"alpha-default-1","pokemonId":null,"pokemonName":"","quantity":0}]'::jsonb;

update public.alya_shiny_war_extra
set alpha_rows = '[{"id":"alpha-default-1","pokemonId":null,"pokemonName":"","quantity":0}]'::jsonb
where alpha_rows is null
   or jsonb_typeof(alpha_rows) <> 'array'
   or jsonb_array_length(alpha_rows) = 0;

grant select, insert, update on public.alya_shiny_war_extra to authenticated;
