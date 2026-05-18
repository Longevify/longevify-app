-- Migration 0006 — meal_entries (refeições registradas pelo user na aba Dieta)
--
-- Rode no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/clivszxztpfpteuuwefb/sql/new
--
-- Cria:
--   1. Tabela `meal_entries` — uma row por refeição registrada
--   2. RLS — paciente acessa só os próprios; admin tudo
--   3. Trigger auto-touch de updated_at
--
-- Decisões de schema (Lucas 2026-05-18: "não precisa salvar as fotos
-- tiradas"):
--   - Items + total_nutrients ficam em JSONB ao invés de tabela normalizada.
--     Volume baixo, leitura sempre conjunta com a meal, RLS mais simples,
--     custo de query desprezível pra cobrança nutricional.
--   - SEM storage bucket — só dados estruturados, fotos descartadas após
--     reconhecimento. Privacidade + custo de storage zero.
--   - photo_url nullable preservado pro caso futuro (Premium) de querer
--     salvar foto.
--
-- Idempotente. Pode rodar múltiplas vezes.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela meal_entries
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,

  -- Quando o user consumiu (não é o created_at — pode registrar uma refeição
  -- de horas atrás retroativamente).
  taken_at timestamptz not null default now(),

  meal_type text not null check (
    meal_type in ('breakfast', 'lunch', 'dinner', 'snack')
  ),
  input_method text not null check (
    input_method in ('photo', 'text', 'barcode', 'manual')
  ),

  -- JSONB com array de FoodItem (lib/dieta/types.ts).
  -- Schema esperado:
  --   [{id, name, quantity, unit, nutrients: {...}, source, confidence?, barcode?}]
  items jsonb not null,

  -- JSONB com Nutrients agregado (lib/dieta/types.ts) — pre-calculado no
  -- save pra UI ler direto sem precisar re-somar a cada render.
  total_nutrients jsonb not null,

  notes text,
  photo_url text,                                  -- nullable, reservado pra futuro

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index principal: busca por user + janela temporal (hoje, semana, mês)
create index if not exists meal_entries_patient_taken_idx
  on public.meal_entries (patient_id, taken_at desc);

-- Index secundário: agregações por meal_type (ex: média de proteína por café)
create index if not exists meal_entries_patient_meal_type_idx
  on public.meal_entries (patient_id, meal_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.meal_entries enable row level security;

drop policy if exists "meal_entries_self_select" on public.meal_entries;
create policy "meal_entries_self_select" on public.meal_entries
  for select using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

drop policy if exists "meal_entries_self_insert" on public.meal_entries;
create policy "meal_entries_self_insert" on public.meal_entries
  for insert with check (auth.uid() = patient_id);

drop policy if exists "meal_entries_self_update" on public.meal_entries;
create policy "meal_entries_self_update" on public.meal_entries
  for update using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

drop policy if exists "meal_entries_self_delete" on public.meal_entries;
create policy "meal_entries_self_delete" on public.meal_entries
  for delete using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger auto-touch updated_at
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_meal_entries_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists meal_entries_touch on public.meal_entries;
create trigger meal_entries_touch
  before update on public.meal_entries
  for each row execute function public.touch_meal_entries_updated_at();
