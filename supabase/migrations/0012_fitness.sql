-- 0012_fitness.sql
--
-- Lucas (2026-05-21): "quero criar uma aba para fitness, quando entro
-- na aba fitness, tem 2 sub abas, uma aba para musculação, uma para
-- corrida e outra para demais exercícios."
--
-- Scaffolding:
--   - workout_sessions: 1 row por sessão de treino (strength, running, etc)
--   - exercise_catalog: catálogo estático de exercícios (~25 inicial)
--   - workout_sets: cada set logado (peso × reps por exercise dentro de uma session)
--   - running_sessions: dados específicos de corrida (GPS, pace, distância)
--
-- Phase 1 (este PR): musculação completa, corrida só schema (UI vem depois).

-- ─── workout_sessions ──────────────────────────────────────────────────
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  -- kind: 'strength' (musculação), 'running' (corrida), 'cardio' (outras
  -- cardio: bike, remo, esteira sem GPS), 'other' (alongamento, yoga, mob)
  kind text not null check (kind in ('strength', 'running', 'cardio', 'other')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- session_date pra agregação por dia (independente do timezone do user
  -- na hora de relatórios)
  session_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_patient_date_idx
  on public.workout_sessions(patient_id, session_date desc);

alter table public.workout_sessions enable row level security;
drop policy if exists "wsess read own" on public.workout_sessions;
create policy "wsess read own" on public.workout_sessions
  for select using (auth.uid() = patient_id);
drop policy if exists "wsess write own" on public.workout_sessions;
create policy "wsess write own" on public.workout_sessions
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- ─── exercise_catalog ──────────────────────────────────────────────────
-- Catálogo público (todos os users compartilham). Sem RLS — só leitura
-- pública pra usuários autenticados (admin escreve via migration).
create table if not exists public.exercise_catalog (
  id text primary key,
  name text not null,
  muscle_group text not null, -- 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body'
  equipment text, -- 'barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'kettlebell'
  category text not null, -- 'compound', 'isolation'
  description text,
  video_url text, -- youtube embed url (futuro)
  created_at timestamptz not null default now()
);

alter table public.exercise_catalog enable row level security;
drop policy if exists "ex catalog read all" on public.exercise_catalog;
create policy "ex catalog read all" on public.exercise_catalog
  for select using (true);

-- ─── workout_sets ──────────────────────────────────────────────────────
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id text not null references public.exercise_catalog(id),
  set_order integer not null,
  weight_kg numeric, -- null pra bodyweight
  reps integer not null,
  rpe integer check (rpe between 1 and 10), -- rate of perceived exertion opcional
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists workout_sets_session_idx on public.workout_sets(session_id);
create index if not exists workout_sets_exercise_idx
  on public.workout_sets(exercise_id, created_at desc);

alter table public.workout_sets enable row level security;
drop policy if exists "sets read own" on public.workout_sets;
create policy "sets read own" on public.workout_sets
  for select using (
    auth.uid() = (
      select patient_id from public.workout_sessions where id = workout_sets.session_id
    )
  );
drop policy if exists "sets write own" on public.workout_sets;
create policy "sets write own" on public.workout_sets
  for all using (
    auth.uid() = (
      select patient_id from public.workout_sessions where id = workout_sets.session_id
    )
  ) with check (
    auth.uid() = (
      select patient_id from public.workout_sessions where id = workout_sets.session_id
    )
  );

-- ─── running_sessions ─────────────────────────────────────────────────
-- 1:1 com workout_sessions (kind='running'). Separa pra schema ser claro.
create table if not exists public.running_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.workout_sessions(id) on delete cascade,
  distance_km numeric,
  duration_seconds integer,
  avg_pace_seconds_per_km numeric,
  -- GPS trace: array de [lat, lon, ts_seconds] (ts = segundos desde started_at)
  coordinates jsonb,
  -- Pace por km: array de { km, pace_seconds, elevation_m }
  pace_segments jsonb,
  created_at timestamptz not null default now()
);

alter table public.running_sessions enable row level security;
drop policy if exists "running read own" on public.running_sessions;
create policy "running read own" on public.running_sessions
  for select using (
    auth.uid() = (
      select patient_id from public.workout_sessions where id = running_sessions.session_id
    )
  );
drop policy if exists "running write own" on public.running_sessions;
create policy "running write own" on public.running_sessions
  for all using (
    auth.uid() = (
      select patient_id from public.workout_sessions where id = running_sessions.session_id
    )
  ) with check (
    auth.uid() = (
      select patient_id from public.workout_sessions where id = running_sessions.session_id
    )
  );

-- ─── Seed: ~28 exercícios comuns ──────────────────────────────────────
insert into public.exercise_catalog (id, name, muscle_group, equipment, category, description) values
  -- chest
  ('bench_press', 'Supino reto', 'chest', 'barbell', 'compound', 'Pegada um pouco mais aberta que ombros, escápulas retraídas, desce até peito tocar a barra.'),
  ('incline_db_press', 'Supino inclinado halteres', 'chest', 'dumbbell', 'compound', 'Banco 30-45°. Halteres descem até alinhar com peito.'),
  ('push_up', 'Flexão', 'chest', 'bodyweight', 'compound', 'Core firme, corpo reto, desce até ~5cm do chão.'),
  ('cable_fly', 'Crucifixo cabo', 'chest', 'cable', 'isolation', 'Cotovelos levemente flexionados, descreve arco fechando à frente do peito.'),
  -- back
  ('deadlift', 'Levantamento terra', 'back', 'barbell', 'compound', 'Costas neutras, quadril e joelhos estendem juntos. Barra colada nas pernas.'),
  ('pull_up', 'Barra fixa', 'back', 'bodyweight', 'compound', 'Pegada pronada na largura dos ombros. Sobe até queixo passar a barra.'),
  ('barbell_row', 'Remada curvada', 'back', 'barbell', 'compound', 'Tronco ~45°, barra puxada até abdômen, cotovelos próximos ao corpo.'),
  ('lat_pulldown', 'Puxada alta', 'back', 'cable', 'compound', 'Pegada um pouco mais aberta que ombros. Puxa até a barra encostar no peito.'),
  ('seated_row', 'Remada sentada', 'back', 'cable', 'compound', 'Costas neutras, puxa cabo até o abdômen apertando escápulas.'),
  -- legs
  ('squat', 'Agachamento livre', 'legs', 'barbell', 'compound', 'Pés na largura dos ombros, joelhos seguem a linha dos pés, desce até paralelo ou abaixo.'),
  ('front_squat', 'Agachamento frontal', 'legs', 'barbell', 'compound', 'Barra apoiada nos deltoides anteriores. Quadril vai pra trás, tronco vertical.'),
  ('leg_press', 'Leg press', 'legs', 'machine', 'compound', 'Pés altos = ênfase posterior. Não estende totalmente o joelho.'),
  ('romanian_deadlift', 'Stiff (RDL)', 'legs', 'barbell', 'compound', 'Joelhos suavemente flexionados, quadril vai pra trás, barra desliza pelas pernas.'),
  ('walking_lunge', 'Afundo caminhando', 'legs', 'dumbbell', 'compound', 'Passo largo, joelho de trás quase toca o chão, joelho da frente alinhado com o tornozelo.'),
  ('leg_curl', 'Mesa flexora', 'legs', 'machine', 'isolation', 'Foco em isquiotibiais. Controla a fase excêntrica.'),
  -- shoulders
  ('overhead_press', 'Desenvolvimento militar', 'shoulders', 'barbell', 'compound', 'Em pé, core firme. Barra sobe da clavícula até full extension.'),
  ('lateral_raise', 'Elevação lateral', 'shoulders', 'dumbbell', 'isolation', 'Halteres sobem até altura dos ombros, cotovelos levemente flexionados.'),
  ('rear_delt_fly', 'Crucifixo invertido', 'shoulders', 'dumbbell', 'isolation', 'Tronco quase paralelo ao chão, abre os halteres pra trás.'),
  -- arms
  ('barbell_curl', 'Rosca direta', 'arms', 'barbell', 'isolation', 'Cotovelos colados, controla a descida.'),
  ('hammer_curl', 'Rosca martelo', 'arms', 'dumbbell', 'isolation', 'Punhos neutros, ativa braquial e braquiorradial.'),
  ('tricep_pushdown', 'Tríceps na corda', 'arms', 'cable', 'isolation', 'Cotovelos colados, abre só na parte de baixo do movimento.'),
  ('dips', 'Mergulho (paralelas)', 'arms', 'bodyweight', 'compound', 'Tronco mais vertical = mais tríceps; mais inclinado = mais peitoral.'),
  -- core
  ('plank', 'Prancha', 'core', 'bodyweight', 'isolation', 'Corpo reto, glúteos contraídos. Manter por tempo.'),
  ('hanging_leg_raise', 'Elevação de pernas na barra', 'core', 'bodyweight', 'isolation', 'Pernas sobem até ângulo 90° com tronco. Controla a descida.'),
  ('cable_crunch', 'Abdominal cabo', 'core', 'cable', 'isolation', 'Ajoelhado, traz cotovelos em direção aos joelhos. Foco em contrair, não puxar.'),
  -- full body / functional
  ('clean_and_press', 'Clean + push press', 'full_body', 'barbell', 'compound', 'Movimento explosivo: levantamento terra → puxada alta → push press.'),
  ('kettlebell_swing', 'Kettlebell swing', 'full_body', 'kettlebell', 'compound', 'Hip hinge explosivo. Posterior de coxa + glúteo + core.'),
  ('burpee', 'Burpee', 'full_body', 'bodyweight', 'compound', 'Flexão → salto vertical. Condicionamento.')
on conflict (id) do update set
  name = excluded.name,
  muscle_group = excluded.muscle_group,
  equipment = excluded.equipment,
  category = excluded.category,
  description = excluded.description;
