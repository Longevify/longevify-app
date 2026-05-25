-- ─────────────────────────────────────────────────────────────────────
-- Migration 0022 — DMs (chats 1-on-1 e grupos)
-- ─────────────────────────────────────────────────────────────────────
--
-- Lucas (2026-05-24): "crie a opção de conversar com as pessoas e
-- tente imitar também o feature de criar grupos que nem no gym rats."
--
-- Schema genérico: social_chats suporta tanto 1-on-1 quanto group chats
-- via member rows. Grupos têm name/avatar; DMs têm name=null (resolve
-- pelo other member no client).
--
-- Tables:
--   social_chats          — sala (DM ou grupo)
--   social_chat_members   — quem está na sala
--   social_chat_messages  — mensagens
--
-- RLS estratégia:
--   - SELECT chats: só se eu sou member
--   - INSERT chats: qualquer user logado (mas ele DEVE adicionar a si
--     próprio como member numa transação separada — ver action)
--   - SELECT/INSERT members: só pra chats onde sou member, exceto na
--     criação (RPC ou client adiciona o próprio member)
--   - SELECT messages: só de chats onde sou member
--   - INSERT messages: só se sou member do chat

-- ─── social_chats ────────────────────────────────────────────────────
create table if not exists public.social_chats (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dm', 'group')),
  name text,
  avatar_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz default now()
);

create index if not exists social_chats_last_msg_idx
  on public.social_chats(last_message_at desc);

alter table public.social_chats enable row level security;

drop policy if exists "chats read member" on public.social_chats;
create policy "chats read member" on public.social_chats
  for select using (
    exists (
      select 1 from public.social_chat_members
      where chat_id = social_chats.id and patient_id = auth.uid()
    )
  );

drop policy if exists "chats insert authenticated" on public.social_chats;
create policy "chats insert authenticated" on public.social_chats
  for insert with check (auth.uid() = created_by);

drop policy if exists "chats update creator" on public.social_chats;
create policy "chats update creator" on public.social_chats
  for update using (auth.uid() = created_by);

-- ─── social_chat_members ─────────────────────────────────────────────
create table if not exists public.social_chat_members (
  chat_id uuid not null references public.social_chats(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz default now(),
  primary key (chat_id, patient_id)
);

create index if not exists social_chat_members_patient_idx
  on public.social_chat_members(patient_id);

alter table public.social_chat_members enable row level security;

drop policy if exists "members read same chat" on public.social_chat_members;
create policy "members read same chat" on public.social_chat_members
  for select using (
    -- Posso ler members de qualquer chat onde EU sou member
    exists (
      select 1 from public.social_chat_members m
      where m.chat_id = social_chat_members.chat_id and m.patient_id = auth.uid()
    )
    or auth.uid() = patient_id
  );

drop policy if exists "members insert self or chat owner" on public.social_chat_members;
create policy "members insert self or chat owner" on public.social_chat_members
  for insert with check (
    -- User pode se adicionar OU se for owner/admin do chat
    auth.uid() = patient_id
    or exists (
      select 1 from public.social_chat_members m
      where m.chat_id = social_chat_members.chat_id
        and m.patient_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

drop policy if exists "members update own last_read" on public.social_chat_members;
create policy "members update own last_read" on public.social_chat_members
  for update using (auth.uid() = patient_id);

drop policy if exists "members delete self" on public.social_chat_members;
create policy "members delete self" on public.social_chat_members
  for delete using (
    auth.uid() = patient_id
    or exists (
      select 1 from public.social_chat_members m
      where m.chat_id = social_chat_members.chat_id
        and m.patient_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- ─── social_chat_messages ────────────────────────────────────────────
create table if not exists public.social_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.social_chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) > 0 and char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists social_chat_messages_chat_created_idx
  on public.social_chat_messages(chat_id, created_at desc);

alter table public.social_chat_messages enable row level security;

drop policy if exists "messages read member" on public.social_chat_messages;
create policy "messages read member" on public.social_chat_messages
  for select using (
    exists (
      select 1 from public.social_chat_members
      where chat_id = social_chat_messages.chat_id and patient_id = auth.uid()
    )
  );

drop policy if exists "messages insert member" on public.social_chat_messages;
create policy "messages insert member" on public.social_chat_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.social_chat_members
      where chat_id = social_chat_messages.chat_id and patient_id = auth.uid()
    )
  );

-- ─── Trigger: bump last_message_at no parent chat ────────────────────
create or replace function public.bump_chat_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.social_chats
  set last_message_at = new.created_at
  where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists trg_bump_chat_last_message on public.social_chat_messages;
create trigger trg_bump_chat_last_message
  after insert on public.social_chat_messages
  for each row execute function public.bump_chat_last_message();
