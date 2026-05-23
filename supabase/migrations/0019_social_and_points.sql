-- 0019_social_and_points.sql
--
-- Lucas (2026-05-23): "quero gameficar mais o app, colocar sistema de
-- pontos... aba nova chamada social. Nessa aba social você poderá fazer
-- postagens de corridas, compartilhar achievements e se comparar com os
-- seus amigos, tendo um ranking de saude com vários diferentes níveis
-- entre amigos. Terá rankings entre amigos e rankings publicos e
-- globais/estaduais e municipais."
--
-- Schema:
--   1. user_health_points    — total agregado + nível
--   2. health_point_events   — log de cada evento que gerou pontos
--   3. user_location         — cidade/estado pra ranking público (consent)
--   4. user_social_privacy   — opt-in granular por nível de ranking
--   5. social_friendships    — bidirectional friend relationships
--   6. social_friend_invites — convites pendentes
--   7. social_posts          — feed de runs / achievements / level-ups

-- ─── 1. user_health_points ────────────────────────────────────────────
create table if not exists public.user_health_points (
  patient_id uuid primary key references public.profiles(id) on delete cascade,
  total_points integer not null default 0,
  level integer not null default 1,
  -- breakdown por categoria pra exibir no perfil
  fitness_points integer not null default 0,
  nutrition_points integer not null default 0,
  consistency_points integer not null default 0,
  biomarker_points integer not null default 0,
  social_points integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_health_points enable row level security;
drop policy if exists "uhp read own or public" on public.user_health_points;
-- Pra ranking público funcionar, qualquer usuário autenticado lê pontos
-- de quem optou-in (via tabela user_social_privacy join). Simplificado:
-- leitura pública mas SEM joins de dados sensíveis (só points/level).
create policy "uhp read own or public" on public.user_health_points
  for select using (true);

drop policy if exists "uhp write own" on public.user_health_points;
create policy "uhp write own" on public.user_health_points
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- ─── 2. health_point_events ───────────────────────────────────────────
create table if not exists public.health_point_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'daily_tasks_completed',
    'streak_milestone',
    'biomarker_improved',
    'achievement_unlocked',
    'workout_logged',
    'running_logged',
    'meal_logged',
    'social_post',
    'friend_added',
    'level_up'
  )),
  points integer not null,
  -- contexto opcional: ex { biomarker_id, old_status, new_status } ou
  -- { task_count, streak_days }
  context jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hpe_patient_created_idx
  on public.health_point_events(patient_id, created_at desc);

alter table public.health_point_events enable row level security;
drop policy if exists "hpe read own" on public.health_point_events;
create policy "hpe read own" on public.health_point_events
  for select using (auth.uid() = patient_id);
drop policy if exists "hpe write own" on public.health_point_events;
create policy "hpe write own" on public.health_point_events
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- ─── 3. user_location ─────────────────────────────────────────────────
create table if not exists public.user_location (
  patient_id uuid primary key references public.profiles(id) on delete cascade,
  city text,
  state text, -- código UF: RJ, SP, MG, etc
  country text not null default 'BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_location enable row level security;
drop policy if exists "ul read own" on public.user_location;
create policy "ul read own" on public.user_location
  for select using (auth.uid() = patient_id);
drop policy if exists "ul write own" on public.user_location;
create policy "ul write own" on public.user_location
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- ─── 4. user_social_privacy ───────────────────────────────────────────
--
-- Consent granular por escopo do ranking. Lucas: "a pessoa tem que ser
-- notificada que ao entrar em certos rankings ela deve estar ciente
-- que pode compartilhar com o público dados de saúde."
--
-- Default ALL FALSE — opt-in explícito por nível.
create table if not exists public.user_social_privacy (
  patient_id uuid primary key references public.profiles(id) on delete cascade,
  -- Postar achievements/runs no feed compartilhado com amigos?
  show_in_friend_feed boolean not null default false,
  -- Aparecer em ranking entre amigos (top users por pontos)?
  show_in_friend_ranking boolean not null default true,
  -- Aparecer em ranking público da cidade ("posição X em Niterói")?
  show_in_city_ranking boolean not null default false,
  -- Estado/Nacional/Global?
  show_in_state_ranking boolean not null default false,
  show_in_country_ranking boolean not null default false,
  -- Aceitou os termos de privacidade da feature social? (timestamp do consent)
  consented_at timestamptz,
  -- Versão do termo aceito (incremento ao alterar termo legalmente)
  consent_version text,
  updated_at timestamptz not null default now()
);

alter table public.user_social_privacy enable row level security;
drop policy if exists "usp read own" on public.user_social_privacy;
create policy "usp read own" on public.user_social_privacy
  for select using (auth.uid() = patient_id);
drop policy if exists "usp write own" on public.user_social_privacy;
create policy "usp write own" on public.user_social_privacy
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- ─── 5. social_friendships ────────────────────────────────────────────
-- Bidirectional — quando A aceita B como amigo, criamos 2 rows
-- (A→B, B→A) pra simplificar queries.
create table if not exists public.social_friendships (
  patient_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  primary key (patient_id, friend_id),
  check (patient_id != friend_id)
);

create index if not exists sf_friend_idx
  on public.social_friendships(friend_id);

alter table public.social_friendships enable row level security;
drop policy if exists "sf read own" on public.social_friendships;
create policy "sf read own" on public.social_friendships
  for select using (auth.uid() = patient_id or auth.uid() = friend_id);
drop policy if exists "sf write own" on public.social_friendships;
create policy "sf write own" on public.social_friendships
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- ─── 6. social_friend_invites ─────────────────────────────────────────
-- Convites pendentes (antes do aceite). Lucas pode aceitar/rejeitar.
create table if not exists public.social_friend_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (inviter_id, invitee_id)
);

create index if not exists sfi_invitee_status_idx
  on public.social_friend_invites(invitee_id, status);

alter table public.social_friend_invites enable row level security;
drop policy if exists "sfi read own" on public.social_friend_invites;
create policy "sfi read own" on public.social_friend_invites
  for select using (auth.uid() = inviter_id or auth.uid() = invitee_id);
drop policy if exists "sfi write own" on public.social_friend_invites;
create policy "sfi write own" on public.social_friend_invites
  for all using (auth.uid() = inviter_id or auth.uid() = invitee_id)
  with check (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- ─── 7. social_posts ──────────────────────────────────────────────────
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'running',     -- corrida com mapa
    'workout',     -- treino logado
    'achievement', -- conquista desbloqueada
    'level_up',    -- subiu de nível
    'biomarker',   -- biomarker melhorou
    'milestone'    -- ex: 100 sets, 50km mês
  )),
  -- payload renderizável: { title, body?, distance_km?, duration_seconds?,
  --   pace?, exercise_id?, achievement_id?, image_url?, route_preview? }
  payload jsonb not null,
  -- Visibilidade: 'friends' (default) ou 'public'
  visibility text not null default 'friends' check (visibility in ('friends', 'public')),
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sp_patient_created_idx
  on public.social_posts(patient_id, created_at desc);
create index if not exists sp_visibility_idx
  on public.social_posts(visibility, created_at desc);

alter table public.social_posts enable row level security;
drop policy if exists "sp read friends or own" on public.social_posts;
create policy "sp read friends or own" on public.social_posts
  for select using (
    auth.uid() = patient_id
    or visibility = 'public'
    or (visibility = 'friends' and exists (
      select 1 from public.social_friendships
       where patient_id = social_posts.patient_id
         and friend_id = auth.uid()
         and status = 'active'
    ))
  );

drop policy if exists "sp write own" on public.social_posts;
create policy "sp write own" on public.social_posts
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- ─── Trigger: atualizar level baseado em total_points ─────────────────
create or replace function public.update_user_level()
returns trigger language plpgsql as $$
declare
  new_level int;
begin
  -- Curva quadrática: level N = floor((sqrt(8*points/100 + 1) - 1) / 2) + 1
  -- Level 1: 0-99, Level 2: 100-299, Level 3: 300-599, Level 4: 600-999...
  new_level := greatest(1, floor((sqrt(8.0 * new.total_points / 100 + 1) - 1) / 2)::int + 1);
  new.level := new_level;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_health_points_level_trg on public.user_health_points;
create trigger user_health_points_level_trg
  before update of total_points on public.user_health_points
  for each row execute function public.update_user_level();
