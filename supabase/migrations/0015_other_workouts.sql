-- 0015_other_workouts.sql
--
-- Lucas (2026-05-21): "outra [aba] para demais exercícios."
--
-- Tracking de atividades além de musculação/corrida — bike, natação,
-- escalada, yoga, pilates, HIIT, mobilidade, caminhada.
--
-- 1:1 com workout_sessions (kind='cardio' | 'other'). Schema separado
-- pra deixar claro o domain — mesmo padrão de running_sessions.

create table if not exists public.other_workouts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.workout_sessions(id) on delete cascade,
  activity_type text not null check (activity_type in (
    'bike', 'swim', 'climb', 'yoga', 'pilates', 'hiit', 'mobility',
    'walking', 'rowing', 'other'
  )),
  duration_minutes integer not null check (duration_minutes > 0),
  intensity text not null check (intensity in ('low', 'moderate', 'high')),
  distance_km numeric, -- opcional, pra bike/swim/walking
  estimated_calories integer,
  created_at timestamptz not null default now()
);

create index if not exists other_workouts_session_idx
  on public.other_workouts(session_id);

alter table public.other_workouts enable row level security;

drop policy if exists "other read own" on public.other_workouts;
create policy "other read own" on public.other_workouts
  for select using (
    auth.uid() = (
      select patient_id from public.workout_sessions where id = other_workouts.session_id
    )
  );

drop policy if exists "other write own" on public.other_workouts;
create policy "other write own" on public.other_workouts
  for all using (
    auth.uid() = (
      select patient_id from public.workout_sessions where id = other_workouts.session_id
    )
  ) with check (
    auth.uid() = (
      select patient_id from public.workout_sessions where id = other_workouts.session_id
    )
  );
