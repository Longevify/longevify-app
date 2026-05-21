-- 0010_task_completions.sql
--
-- Lucas (2026-05-20): "tem que ser bem gameficado, o cara tem que
-- gostar de usar o app para ver que ta melhorando."
--
-- Tabela pra tracking real de "tasks completadas por dia" do
-- protocolo. Antes o streak na home era derivado do longevify_score
-- (Math.floor(score/4)) — placeholder fake, sempre mostrava ~15-20d
-- pra demo e dava número aleatório pra user real.
--
-- Agora cada toggle no /protocolo grava uma row aqui, e o
-- getStreakDays() conta dias CONSECUTIVOS com pelo menos 1
-- task completada.
--
-- Idempotência via UNIQUE (patient_id, task_id, completed_date):
-- toggle múltiplas vezes no mesmo dia não cria duplicatas. Untoggle
-- DELETA a row do dia (não cria "uncompleted" record).

create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  task_id text not null,
  completed_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (patient_id, task_id, completed_date)
);

-- Index pra acelerar query de streak (range scan por patient + ordenação por data)
create index if not exists task_completions_patient_date_idx
  on public.task_completions(patient_id, completed_date desc);

-- RLS: só o dono lê/escreve
alter table public.task_completions enable row level security;

drop policy if exists "task_completions read own" on public.task_completions;
create policy "task_completions read own" on public.task_completions
  for select
  using (auth.uid() = patient_id);

drop policy if exists "task_completions insert own" on public.task_completions;
create policy "task_completions insert own" on public.task_completions
  for insert
  with check (auth.uid() = patient_id);

drop policy if exists "task_completions delete own" on public.task_completions;
create policy "task_completions delete own" on public.task_completions
  for delete
  using (auth.uid() = patient_id);

comment on table public.task_completions is
  'Log de tasks de protocolo marcadas como feitas por dia. Usado pra streak counter na home (gameficação).';
