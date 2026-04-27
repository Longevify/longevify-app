-- Migration 0002 — adiciona data de nascimento + tracking do intake
--
-- Rode no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/clivszxztpfpteuuwefb/sql/new

-- ----------------------------------------------------------------------
-- profiles: birth_date + intake_completed_at
-- ----------------------------------------------------------------------
alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists intake_completed_at timestamptz;

-- Atualiza o trigger handle_new_user pra capturar birth_date também
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    birth_date,
    chronological_age,
    role
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    case
      when new.raw_user_meta_data->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$'
      then (new.raw_user_meta_data->>'birth_date')::date
      else null
    end,
    nullif(new.raw_user_meta_data->>'chronological_age', '')::int,
    'patient'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------
-- intake_responses: armazenamento das respostas do questionário inicial
-- ----------------------------------------------------------------------
create table if not exists public.intake_responses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  variant text not null check (variant in ('quick', 'comprehensive')),
  responses jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intake_responses_patient_idx
  on public.intake_responses (patient_id);

alter table public.intake_responses enable row level security;

-- Cada paciente lê + escreve apenas o próprio intake.
-- Admins (role='admin' no profile) leem todos.
drop policy if exists "intake_self_select" on public.intake_responses;
create policy "intake_self_select"
  on public.intake_responses
  for select
  using (
    auth.uid() = patient_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "intake_self_insert" on public.intake_responses;
create policy "intake_self_insert"
  on public.intake_responses
  for insert
  with check (auth.uid() = patient_id);

drop policy if exists "intake_self_update" on public.intake_responses;
create policy "intake_self_update"
  on public.intake_responses
  for update
  using (auth.uid() = patient_id);

-- Auto-touch updated_at em update
create or replace function public.touch_intake_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists intake_responses_touch on public.intake_responses;
create trigger intake_responses_touch
  before update on public.intake_responses
  for each row execute function public.touch_intake_updated_at();
