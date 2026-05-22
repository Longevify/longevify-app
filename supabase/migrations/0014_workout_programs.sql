-- 0014_workout_programs.sql
--
-- Lucas (2026-05-21): "teremos a opção de criação de treinos com base
-- em algumas perguntas iniciais"
--
-- AI workout generator — questionário curto (objetivo, freq/semana,
-- equipamento, experiência, restrições) → Claude Sonnet → programa
-- estruturado salvo aqui.
--
-- 1 programa ativo por user (mas histórico mantido).
-- structure é JSONB com array de dias e exercícios pra simplificar MVP.

create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  goal text not null,
  -- 'hipertrofia' | 'forca' | 'perda_gordura' | 'condicionamento' | 'saude_geral'
  frequency_per_week integer not null check (frequency_per_week between 1 and 7),
  equipment_available text[] not null default '{}',
  -- 'iniciante' | 'intermediario' | 'avancado'
  experience_level text not null,
  restrictions text,
  -- structure: {
  --   "days": [
  --     {
  --       "day_index": 1,
  --       "name": "Push A",
  --       "focus": ["chest", "shoulders", "triceps"],
  --       "exercises": [
  --         { "exercise_id": "bench_press", "target_sets": 4, "target_reps": "6-8", "target_rpe": 8, "rest_seconds": 120, "notes": "..." }
  --       ]
  --     }
  --   ],
  --   "warmup_notes": "...",
  --   "progression_strategy": "..."
  -- }
  structure jsonb not null,
  ai_model text not null default 'claude-sonnet-4-6',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_programs_patient_active_idx
  on public.workout_programs(patient_id, active, created_at desc);

-- Garantia: só 1 programa ativo por user (parcial unique)
create unique index if not exists workout_programs_one_active_per_user
  on public.workout_programs(patient_id) where active = true;

alter table public.workout_programs enable row level security;

drop policy if exists "wprog read own" on public.workout_programs;
create policy "wprog read own" on public.workout_programs
  for select using (auth.uid() = patient_id);

drop policy if exists "wprog write own" on public.workout_programs;
create policy "wprog write own" on public.workout_programs
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- Trigger pra updated_at
create or replace function public.handle_workout_program_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workout_programs_updated_at on public.workout_programs;
create trigger workout_programs_updated_at
  before update on public.workout_programs
  for each row execute function public.handle_workout_program_updated_at();
