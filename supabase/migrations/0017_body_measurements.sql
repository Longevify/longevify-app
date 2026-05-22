-- 0017_body_measurements.sql
--
-- Lucas (2026-05-22): "torne essa aba do app perfeita" — Phase 3I
-- adiciona tracking de medidas corporais (composição) pra
-- complementar o tracking de treinos.
--
-- 1 row por medição (não acumulativo). User pode pesar/medir
-- semanalmente, mensalmente, etc.

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  measured_at date not null default current_date,
  -- Composição
  weight_kg numeric,
  body_fat_pct numeric,
  muscle_mass_kg numeric,
  -- Medidas (cm)
  waist_cm numeric,
  chest_cm numeric,
  hip_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  calf_cm numeric,
  -- Bioimpedância (opcional, dos smart scales)
  visceral_fat numeric,
  bone_mass_kg numeric,
  water_pct numeric,
  -- Notes do user
  notes text,
  created_at timestamptz not null default now(),
  -- 1 medição por dia (ON CONFLICT update via upsert)
  unique (patient_id, measured_at)
);

create index if not exists body_measurements_patient_date_idx
  on public.body_measurements(patient_id, measured_at desc);

alter table public.body_measurements enable row level security;

drop policy if exists "body_measurements read own" on public.body_measurements;
create policy "body_measurements read own" on public.body_measurements
  for select using (auth.uid() = patient_id);

drop policy if exists "body_measurements write own" on public.body_measurements;
create policy "body_measurements write own" on public.body_measurements
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);
