-- Migration 0005 — upload de exames antigos (Wave 3)
--
-- Rode no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/clivszxztpfpteuuwefb/sql/new
--
-- Cria:
--   1. Bucket 'lab-uploads' no Supabase Storage (privado)
--   2. Storage policies — paciente lê/escreve só os próprios arquivos
--   3. Tabela `lab_uploads` (metadados + texto extraído)
--   4. RLS pra lab_uploads
--
-- Idempotente. Pode rodar múltiplas vezes.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Storage bucket — privado, só dono acessa
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lab-uploads',
  'lab-uploads',
  false,
  20971520, -- 20 MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/heic',
    'image/heif',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Storage policies — paciente acessa apenas pasta com seu próprio uid
-- Convenção do path: {patient_id}/{uuid}.{ext}
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "lab_uploads_select_own" on storage.objects;
create policy "lab_uploads_select_own" on storage.objects
  for select using (
    bucket_id = 'lab-uploads'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin(auth.uid())
    )
  );

drop policy if exists "lab_uploads_insert_own" on storage.objects;
create policy "lab_uploads_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'lab-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "lab_uploads_update_own" on storage.objects;
create policy "lab_uploads_update_own" on storage.objects
  for update using (
    bucket_id = 'lab-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "lab_uploads_delete_own" on storage.objects;
create policy "lab_uploads_delete_own" on storage.objects
  for delete using (
    bucket_id = 'lab-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Tabela lab_uploads — metadados de cada arquivo enviado
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.lab_uploads (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,                       -- caminho dentro do bucket: {uid}/{uuid}.pdf
  file_name text not null,                          -- nome original do arquivo
  mime_type text not null,
  size_bytes bigint not null,

  -- Metadados que o user pode preencher OU que extraímos do PDF
  taken_at date,                                    -- data do exame (extraída ou informada)
  lab_name text,                                    -- nome do laboratório
  exam_kind text,                                   -- 'sangue', 'urina', 'imagem', 'outro'
  notes text,                                       -- nota livre do user

  -- Extração: opcional, pode ser preenchido por job assíncrono
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'parsed', 'failed', 'archived')),
  extracted_text text,                              -- texto bruto (OCR/PDF parse)
  parsed_data jsonb,                                -- JSON estruturado (biomarcadores extraídos)
  exam_id uuid references public.exams(id) on delete set null,  -- vínculo se virar exam oficial

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lab_uploads_patient_idx
  on public.lab_uploads (patient_id, created_at desc);
create index if not exists lab_uploads_status_idx
  on public.lab_uploads (status) where status in ('uploaded', 'processing');

alter table public.lab_uploads enable row level security;

drop policy if exists "lab_uploads_self_select" on public.lab_uploads;
create policy "lab_uploads_self_select" on public.lab_uploads
  for select using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

drop policy if exists "lab_uploads_self_insert" on public.lab_uploads;
create policy "lab_uploads_self_insert" on public.lab_uploads
  for insert with check (auth.uid() = patient_id);

drop policy if exists "lab_uploads_self_update" on public.lab_uploads;
create policy "lab_uploads_self_update" on public.lab_uploads
  for update using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

drop policy if exists "lab_uploads_self_delete" on public.lab_uploads;
create policy "lab_uploads_self_delete" on public.lab_uploads
  for delete using (
    auth.uid() = patient_id or public.is_admin(auth.uid())
  );

-- Trigger pra atualizar updated_at automaticamente
create or replace function public.touch_lab_uploads_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists lab_uploads_touch on public.lab_uploads;
create trigger lab_uploads_touch
  before update on public.lab_uploads
  for each row execute function public.touch_lab_uploads_updated_at();
