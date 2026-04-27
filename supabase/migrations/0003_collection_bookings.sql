-- Migration 0003 — collection_bookings (agendamentos de coleta de sangue)
-- Rode no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/clivszxztpfpteuuwefb/sql/new

create table if not exists public.collection_bookings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_at timestamptz not null,
  location text not null check (location in ('home', 'lab')),
  -- Campos estruturados de endereço (apenas quando location='home')
  address_state text,           -- UF, ex: 'SP'
  address_city text,            -- cidade
  address_street text,          -- rua + número
  address_complement text,      -- complemento 1 (apto, sala, etc)
  address_reference text,       -- complemento 2 / ponto de referência
  address_zip text,             -- CEP (opcional)
  -- Status do agendamento
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Constraint: se home, endereço obrigatório
  constraint home_requires_address check (
    location <> 'home'
    or (address_state is not null and address_city is not null and address_street is not null)
  )
);

create index if not exists collection_bookings_patient_idx
  on public.collection_bookings (patient_id, scheduled_at desc);

alter table public.collection_bookings enable row level security;

-- Paciente vê + cria seus próprios. Admin vê tudo.
drop policy if exists "bookings_self_select" on public.collection_bookings;
create policy "bookings_self_select" on public.collection_bookings
  for select using (
    auth.uid() = patient_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "bookings_self_insert" on public.collection_bookings;
create policy "bookings_self_insert" on public.collection_bookings
  for insert with check (auth.uid() = patient_id);

drop policy if exists "bookings_self_update" on public.collection_bookings;
create policy "bookings_self_update" on public.collection_bookings
  for update using (auth.uid() = patient_id);

-- Auto-touch updated_at
create or replace function public.touch_collection_bookings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists collection_bookings_touch on public.collection_bookings;
create trigger collection_bookings_touch
  before update on public.collection_bookings
  for each row execute function public.touch_collection_bookings_updated_at();
