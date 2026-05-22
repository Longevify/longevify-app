-- 0016_achievements.sql
--
-- Lucas (2026-05-22): "torne essa aba do app perfeita" — Phase 3C
-- adiciona sistema de conquistas (achievements) pra gameificar a
-- jornada de fitness.
--
-- 2 tabelas:
--   - achievement_catalog: catálogo público de conquistas (seed via
--     este migration; só admin escreve)
--   - user_achievements: 1:1 user × conquista quando desbloqueada

create table if not exists public.achievement_catalog (
  id text primary key,
  -- Categoria: 'strength', 'running', 'consistency', 'volume', 'other'
  category text not null,
  title text not null,
  description text not null,
  -- Critério machine-readable (não trigger automático — calculado em
  -- background ao logar). Ex: { kind: 'strength_sets_total', threshold: 100 }
  criterion jsonb not null,
  -- 'common' | 'rare' | 'epic' | 'legendary' — afeta cor/visual
  tier text not null check (tier in ('common', 'rare', 'epic', 'legendary')),
  -- XP ganhado ao desbloquear
  xp integer not null default 10,
  emoji text not null,
  created_at timestamptz not null default now()
);

alter table public.achievement_catalog enable row level security;
drop policy if exists "achievement catalog read all" on public.achievement_catalog;
create policy "achievement catalog read all" on public.achievement_catalog
  for select using (true);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievement_catalog(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  -- Contexto: ex { setId, weightKg, reps } ou { distanceKm, durationSeconds }
  -- pra mostrar "como" desbloqueou.
  context jsonb,
  unique (patient_id, achievement_id)
);

create index if not exists user_achievements_patient_idx
  on public.user_achievements(patient_id, unlocked_at desc);

alter table public.user_achievements enable row level security;
drop policy if exists "user achievements read own" on public.user_achievements;
create policy "user achievements read own" on public.user_achievements
  for select using (auth.uid() = patient_id);
drop policy if exists "user achievements write own" on public.user_achievements;
create policy "user achievements write own" on public.user_achievements
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- ─── Seed: 30 conquistas iniciais ─────────────────────────────────────
insert into public.achievement_catalog (id, category, title, description, criterion, tier, xp, emoji) values
  -- Strength milestones
  ('first_set', 'strength', 'Primeiro set', 'Logue seu primeiro set de musculação', '{"kind":"strength_sets_total","threshold":1}', 'common', 10, '🎯'),
  ('strength_10_sets', 'strength', '10 sets', 'Complete 10 sets ao todo', '{"kind":"strength_sets_total","threshold":10}', 'common', 20, '💪'),
  ('strength_50_sets', 'strength', '50 sets', 'Complete 50 sets ao todo', '{"kind":"strength_sets_total","threshold":50}', 'rare', 50, '🏋️'),
  ('strength_100_sets', 'strength', '100 sets', 'Centena de sets — você é regular', '{"kind":"strength_sets_total","threshold":100}', 'rare', 100, '🔥'),
  ('strength_500_sets', 'strength', '500 sets', 'Marca de dedicação séria', '{"kind":"strength_sets_total","threshold":500}', 'epic', 300, '⚡'),
  ('strength_1000_sets', 'strength', 'Mil sets!', 'Vai pra dois mil agora 😉', '{"kind":"strength_sets_total","threshold":1000}', 'legendary', 1000, '👑'),

  -- Volume milestones (kg total)
  ('volume_1k', 'volume', 'Primeiro tonelada', '1.000kg acumulados de volume (peso×reps)', '{"kind":"strength_volume_total","threshold":1000}', 'common', 30, '🏷️'),
  ('volume_10k', 'volume', '10 toneladas', 'Carregou 10.000kg de peso total', '{"kind":"strength_volume_total","threshold":10000}', 'rare', 100, '🚛'),
  ('volume_100k', 'volume', '100 toneladas', 'Volume gigante — 100.000kg', '{"kind":"strength_volume_total","threshold":100000}', 'epic', 500, '🏗️'),

  -- Strength PRs (1 rep)
  ('bench_60kg', 'strength', 'Supino 60kg', 'Supino com 60kg em qualquer rep', '{"kind":"exercise_max_weight","exerciseId":"bench_press","threshold":60}', 'common', 30, '🛏️'),
  ('bench_80kg', 'strength', 'Supino 80kg', 'Supino 80kg — quase 1xBW', '{"kind":"exercise_max_weight","exerciseId":"bench_press","threshold":80}', 'rare', 80, '🛏️'),
  ('bench_100kg', 'strength', 'Supino 3 dígitos!', '100kg no supino — clube exclusivo', '{"kind":"exercise_max_weight","exerciseId":"bench_press","threshold":100}', 'epic', 250, '💥'),
  ('squat_100kg', 'strength', 'Agachamento 100kg', '100kg no agachamento livre', '{"kind":"exercise_max_weight","exerciseId":"squat","threshold":100}', 'rare', 100, '🦵'),
  ('squat_140kg', 'strength', 'Agachamento 140kg', 'Massa nas pernas séria', '{"kind":"exercise_max_weight","exerciseId":"squat","threshold":140}', 'epic', 300, '🦵'),
  ('deadlift_100kg', 'strength', 'Levantamento 100kg', 'Terra com 100kg', '{"kind":"exercise_max_weight","exerciseId":"deadlift","threshold":100}', 'rare', 100, '⬆️'),
  ('deadlift_180kg', 'strength', 'Levantamento 180kg', 'Posto de força sério', '{"kind":"exercise_max_weight","exerciseId":"deadlift","threshold":180}', 'epic', 400, '⬆️'),
  ('pullup_10reps', 'strength', '10 pull-ups', '10 reps de pull-up em 1 set', '{"kind":"exercise_max_reps","exerciseId":"pull_up","threshold":10}', 'rare', 80, '🆙'),

  -- Running milestones
  ('first_run', 'running', 'Primeira corrida', 'Complete sua primeira corrida', '{"kind":"running_total","threshold":1}', 'common', 20, '🏃'),
  ('run_5k', 'running', '5K!', 'Corra 5km numa única sessão', '{"kind":"running_max_distance","threshold":5}', 'rare', 100, '5️⃣'),
  ('run_10k', 'running', '10K conquistado', '10km de uma vez', '{"kind":"running_max_distance","threshold":10}', 'epic', 300, '🔟'),
  ('run_21k', 'running', 'Meia maratona', '21.1km — meia maratona', '{"kind":"running_max_distance","threshold":21.1}', 'epic', 600, '🥈'),
  ('run_42k', 'running', 'Maratona', '42.195km — full marathon', '{"kind":"running_max_distance","threshold":42.195}', 'legendary', 2000, '🏆'),
  ('pace_5min', 'running', 'Sub-5 pace', 'Pace médio abaixo de 5:00/km em corrida 1km+', '{"kind":"running_best_pace","threshold":300}', 'rare', 100, '⚡'),
  ('pace_4min', 'running', 'Sub-4 pace', 'Pace 4:00/km ou melhor', '{"kind":"running_best_pace","threshold":240}', 'epic', 400, '⚡'),
  ('total_km_50', 'running', '50km mensal', '50km acumulados em 1 mês', '{"kind":"running_km_month","threshold":50}', 'rare', 100, '📏'),

  -- Consistency
  ('streak_3', 'consistency', 'Trio', '3 dias seguidos treinando', '{"kind":"streak","threshold":3}', 'common', 30, '🔥'),
  ('streak_7', 'consistency', 'Semana cheia', '7 dias seguidos', '{"kind":"streak","threshold":7}', 'rare', 80, '🔥'),
  ('streak_30', 'consistency', 'Mês de chama', '30 dias seguidos', '{"kind":"streak","threshold":30}', 'epic', 400, '🔥'),
  ('streak_100', 'consistency', 'Cem dias!', '100 dias de streak', '{"kind":"streak","threshold":100}', 'legendary', 1500, '🌋'),

  -- Other activities
  ('first_other', 'other', 'Explorador', 'Logue 1ª atividade fora de musculação/corrida', '{"kind":"other_total","threshold":1}', 'common', 10, '🧭'),
  ('cross_train', 'other', 'Multimodal', 'Trene 3 modalidades diferentes em outras (bike/swim/yoga/etc)', '{"kind":"other_distinct_types","threshold":3}', 'rare', 80, '🌈')
on conflict (id) do nothing;
