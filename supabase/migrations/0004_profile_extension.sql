-- Migration 0004 — campos extras de perfil (Wave 3)
--
-- Rode no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/clivszxztpfpteuuwefb/sql/new
--
-- O que faz:
--   - Adiciona ao `profiles` os 13 campos editáveis em /perfil
--   - Não toca dados existentes; campos novos são nullable
--   - Idempotente (add column if not exists)

alter table public.profiles
  add column if not exists phone text,
  add column if not exists cpf text,
  add column if not exists height_cm numeric(5,1),
  add column if not exists weight_kg numeric(5,1),
  add column if not exists blood_type text,
  add column if not exists city text,
  add column if not exists uf text,
  add column if not exists occupation text,
  add column if not exists language text default 'Português (BR)',
  add column if not exists goals text,
  add column if not exists conditions text,
  add column if not exists medications text,
  add column if not exists allergies text,
  add column if not exists updated_at timestamptz not null default now();

-- Auto-touch updated_at em update
create or replace function public.touch_profiles_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_profiles_updated_at();
