-- Migration 0007 — tracking de ciclo menstrual
--
-- Rode no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/clivszxztpfpteuuwefb/sql/new
--
-- Lucas (2026-05-18): "crie uma aba no app para usuários femininos para
-- acompanhar o ciclo menstrual, mapeando tudo. Ideal é ter um dashboard
-- visual de calendário... irá alimentar o modelo, adicionando ainda mais
-- contexto e tornando o diagnóstico ainda mais preciso. Na conta demo,
-- pode deixar isso disponível, mesmo que seja um homem a principio."
--
-- Cria:
--   1. menstrual_profile      — 1 row/user com config do ciclo
--   2. menstrual_entries      — 1 row/dia com sintomas + fluxo
--   3. RLS pra ambas (self_access + admin)
--   4. Trigger auto-touch de updated_at
--
-- Decisões de schema:
--   - menstrual_profile separa onboarding (uma vez) de logging diário
--     (frequente) — query patterns diferentes
--   - tracking_enabled bool permite o toggle "ativar tracking" mesmo em
--     conta demo masculina (Lucas pediu disponível pra refinar UI)
--   - symptoms em JSONB pra flexibilidade — futura expansão de
--     vocabulário não exige migration
--   - flow é enum-like (text+check) pra forçar consistência de UI
--
-- Idempotente. Pode rodar múltiplas vezes.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) menstrual_profile — perfil de ciclo do user (1 row por user)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.menstrual_profile (
  patient_id uuid primary key references public.profiles(id) on delete cascade,

  -- Toggle global: user pode pausar tracking sem perder dados
  tracking_enabled boolean not null default true,

  -- Onboarding básico
  last_period_start date,                          -- DUM — referência pra calcular fase
  avg_cycle_days int not null default 28
    check (avg_cycle_days between 15 and 60),     -- amplitude generosa pra cobrir irregulares
  avg_period_days int not null default 5
    check (avg_period_days between 1 and 15),

  cycle_regularity text not null default 'regular'
    check (cycle_regularity in ('regular', 'irregular', 'variable', 'unknown')),

  contraceptive_kind text                          -- nullable
    check (contraceptive_kind is null or contraceptive_kind in (
      'none', 'pill', 'iud_hormonal', 'iud_copper',
      'implant', 'injection', 'patch', 'ring',
      'condom_only', 'natural', 'sterilization', 'other'
    )),

  reproductive_status text not null default 'regular'
    check (reproductive_status in (
      'regular',                                   -- ciclos regulares ativos
      'trying_to_conceive',                        -- tentando engravidar
      'pregnant',                                  -- gestação atual
      'postpartum',                                -- pós-parto / lactação
      'perimenopause',                             -- pré-menopausa
      'menopause',                                 -- menopausa
      'unknown'
    )),

  -- Onboarding metadata
  onboarded_at timestamptz,                        -- quando completou o wizard
  notes text,                                      -- nota livre opcional

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) menstrual_entries — log diário (1 row por user+data)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.menstrual_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,

  -- Fluxo (nullable: pode logar sintoma sem flow)
  flow text check (flow is null or flow in ('none', 'spotting', 'light', 'medium', 'heavy')),

  -- Sintomas em JSONB — array de strings
  --   ex: ["cramps", "headache", "breast_tenderness", "bloating", "acne",
  --        "back_pain", "nausea", "fatigue"]
  symptoms jsonb not null default '[]'::jsonb,

  -- Escalas 1-5 (1=baixo, 5=alto). Nullable: dia que user só registra
  -- fluxo não precisa de tudo.
  mood int check (mood is null or mood between 1 and 5),
  energy int check (energy is null or energy between 1 and 5),
  libido int check (libido is null or libido between 1 and 5),
  sleep_quality int check (sleep_quality is null or sleep_quality between 1 and 5),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 1 row por user+data — replace via UPSERT no API layer
  constraint menstrual_entries_unique_per_day unique (patient_id, entry_date)
);

create index if not exists menstrual_entries_patient_date_idx
  on public.menstrual_entries (patient_id, entry_date desc);
-- (intencionalmente sem index parcial com now() — Postgres exige
-- IMMUTABLE em predicate. O index acima já é seletivo o bastante.)

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) RLS — menstrual_profile
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.menstrual_profile enable row level security;

drop policy if exists "menstrual_profile_self_select" on public.menstrual_profile;
create policy "menstrual_profile_self_select" on public.menstrual_profile
  for select using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

drop policy if exists "menstrual_profile_self_insert" on public.menstrual_profile;
create policy "menstrual_profile_self_insert" on public.menstrual_profile
  for insert with check (auth.uid() = patient_id);

drop policy if exists "menstrual_profile_self_update" on public.menstrual_profile;
create policy "menstrual_profile_self_update" on public.menstrual_profile
  for update using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) RLS — menstrual_entries
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.menstrual_entries enable row level security;

drop policy if exists "menstrual_entries_self_select" on public.menstrual_entries;
create policy "menstrual_entries_self_select" on public.menstrual_entries
  for select using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

drop policy if exists "menstrual_entries_self_insert" on public.menstrual_entries;
create policy "menstrual_entries_self_insert" on public.menstrual_entries
  for insert with check (auth.uid() = patient_id);

drop policy if exists "menstrual_entries_self_update" on public.menstrual_entries;
create policy "menstrual_entries_self_update" on public.menstrual_entries
  for update using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

drop policy if exists "menstrual_entries_self_delete" on public.menstrual_entries;
create policy "menstrual_entries_self_delete" on public.menstrual_entries
  for delete using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Triggers auto-touch updated_at
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_menstrual_profile_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists menstrual_profile_touch on public.menstrual_profile;
create trigger menstrual_profile_touch
  before update on public.menstrual_profile
  for each row execute function public.touch_menstrual_profile_updated_at();

create or replace function public.touch_menstrual_entries_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists menstrual_entries_touch on public.menstrual_entries;
create trigger menstrual_entries_touch
  before update on public.menstrual_entries
  for each row execute function public.touch_menstrual_entries_updated_at();
