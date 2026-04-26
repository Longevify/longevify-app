-- Longevify — Initial schema
-- Tables, RLS policies, and handle_new_user trigger.

-- -------------------------------------------------------------------------
-- profiles — extends auth.users with patient/admin/doctor role
-- -------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  role text not null default 'patient' check (role in ('patient','admin','doctor')),
  chronological_age int,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- biomarker_definitions — canonical catalog (ldl, apob, ...)
-- -------------------------------------------------------------------------
create table if not exists public.biomarker_definitions (
  id text primary key,
  name text not null,
  category_id text not null,
  category_label text not null,
  unit text not null,
  optimal_min numeric,
  optimal_max numeric,
  normal_min numeric,
  normal_max numeric,
  reference_label text,
  description text
);

-- -------------------------------------------------------------------------
-- exams — lab exams uploaded/issued to a patient
-- -------------------------------------------------------------------------
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  taken_at date not null,
  lab text,
  pdf_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
create index if not exists exams_patient_idx on public.exams(patient_id);

-- -------------------------------------------------------------------------
-- biomarker_values — individual measurements linked to exams
-- -------------------------------------------------------------------------
create table if not exists public.biomarker_values (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  biomarker_id text not null references public.biomarker_definitions(id),
  value numeric not null,
  status text not null check (status in ('optimal','normal','out')),
  measured_at timestamptz not null default now()
);
create index if not exists biomarker_values_exam_idx on public.biomarker_values(exam_id);
create index if not exists biomarker_values_marker_idx on public.biomarker_values(biomarker_id);

-- -------------------------------------------------------------------------
-- longevify_scores — computed per-patient score snapshots
-- -------------------------------------------------------------------------
create table if not exists public.longevify_scores (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  computed_at timestamptz not null default now(),
  score int not null,
  biological_age numeric,
  status text check (status in ('on-track','attention','at-risk'))
);
create index if not exists longevify_scores_patient_idx on public.longevify_scores(patient_id, computed_at desc);

-- -------------------------------------------------------------------------
-- wearable_connections
-- -------------------------------------------------------------------------
create table if not exists public.wearable_connections (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  brand text not null,
  connected boolean not null default false,
  last_sync_at timestamptz
);
create index if not exists wearable_connections_patient_idx on public.wearable_connections(patient_id);

-- -------------------------------------------------------------------------
-- daily_health_metrics
-- -------------------------------------------------------------------------
create table if not exists public.daily_health_metrics (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  sleep_minutes int,
  sleep_efficiency numeric,
  steps int,
  active_minutes int,
  zone2_minutes int,
  resting_hr int,
  hrv numeric,
  vo2max numeric,
  calories_burned int,
  strain numeric,
  unique (patient_id, date)
);
create index if not exists daily_health_metrics_patient_idx on public.daily_health_metrics(patient_id, date desc);

-- -------------------------------------------------------------------------
-- goals
-- -------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  metric_key text not null,
  target numeric not null,
  unit text not null,
  cadence text not null check (cadence in ('daily','weekly')),
  label text not null,
  description text
);
create index if not exists goals_patient_idx on public.goals(patient_id);

-- -------------------------------------------------------------------------
-- products — shop catalog (text id to match client mock)
-- -------------------------------------------------------------------------
create table if not exists public.products (
  id text primary key,
  name text not null,
  brand text not null,
  category text not null,
  badge text,
  price_brl numeric not null,
  short_description text,
  long_description text,
  benefits jsonb not null default '[]'::jsonb,
  usage text,
  targets_biomarkers jsonb not null default '[]'::jsonb,
  rating numeric,
  reviews_count int,
  image_url text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- product_recommendations — engine output per patient
-- -------------------------------------------------------------------------
create table if not exists public.product_recommendations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  reason text,
  score numeric,
  computed_at timestamptz not null default now()
);
create index if not exists product_recs_patient_idx on public.product_recommendations(patient_id, computed_at desc);

-- -------------------------------------------------------------------------
-- chat_messages — concierge conversation history
-- -------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_patient_idx on public.chat_messages(patient_id, created_at desc);

-- -------------------------------------------------------------------------
-- orders / order_items
-- -------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled')),
  total_brl numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists orders_patient_idx on public.orders(patient_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  quantity int not null check (quantity > 0),
  unit_price_brl numeric not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- -------------------------------------------------------------------------
-- handle_new_user trigger — auto-create profile row on signup
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, chronological_age, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    nullif(new.raw_user_meta_data->>'chronological_age', '')::int,
    'patient'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------------
-- is_admin helper — cached check via profiles
-- -------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  );
$$;

-- -------------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.biomarker_definitions enable row level security;
alter table public.biomarker_values enable row level security;
alter table public.longevify_scores enable row level security;
alter table public.wearable_connections enable row level security;
alter table public.daily_health_metrics enable row level security;
alter table public.goals enable row level security;
alter table public.products enable row level security;
alter table public.product_recommendations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles
  for select using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles admin insert" on public.profiles;
create policy "profiles admin insert" on public.profiles
  for insert with check (id = auth.uid() or public.is_admin(auth.uid()));

-- biomarker_definitions + products: readable by any authenticated; write admin only
drop policy if exists "biomarker_defs read" on public.biomarker_definitions;
create policy "biomarker_defs read" on public.biomarker_definitions
  for select using (auth.role() = 'authenticated');

drop policy if exists "biomarker_defs admin write" on public.biomarker_definitions;
create policy "biomarker_defs admin write" on public.biomarker_definitions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "products read" on public.products;
create policy "products read" on public.products
  for select using (auth.role() = 'authenticated');

drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- patient-owned tables: SELECT where patient_id = auth.uid() (or admin)
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'exams', 'longevify_scores', 'wearable_connections',
      'daily_health_metrics', 'goals', 'product_recommendations',
      'chat_messages', 'orders'
    ])
  loop
    execute format('drop policy if exists "%s select own" on public.%I', t, t);
    execute format('create policy "%s select own" on public.%I for select using (patient_id = auth.uid() or public.is_admin(auth.uid()))', t, t);

    execute format('drop policy if exists "%s insert own" on public.%I', t, t);
    execute format('create policy "%s insert own" on public.%I for insert with check (patient_id = auth.uid() or public.is_admin(auth.uid()))', t, t);

    execute format('drop policy if exists "%s update own" on public.%I', t, t);
    execute format('create policy "%s update own" on public.%I for update using (patient_id = auth.uid() or public.is_admin(auth.uid()))', t, t);

    execute format('drop policy if exists "%s delete own" on public.%I', t, t);
    execute format('create policy "%s delete own" on public.%I for delete using (patient_id = auth.uid() or public.is_admin(auth.uid()))', t, t);
  end loop;
end$$;

-- biomarker_values: access via parent exam.patient_id
drop policy if exists "biomarker_values read" on public.biomarker_values;
create policy "biomarker_values read" on public.biomarker_values
  for select using (
    exists (
      select 1 from public.exams e
      where e.id = biomarker_values.exam_id
        and (e.patient_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

drop policy if exists "biomarker_values write" on public.biomarker_values;
create policy "biomarker_values write" on public.biomarker_values
  for all using (
    exists (
      select 1 from public.exams e
      where e.id = biomarker_values.exam_id
        and (e.patient_id = auth.uid() or public.is_admin(auth.uid()))
    )
  ) with check (
    exists (
      select 1 from public.exams e
      where e.id = biomarker_values.exam_id
        and (e.patient_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

-- order_items: access via parent orders.patient_id
drop policy if exists "order_items read" on public.order_items;
create policy "order_items read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.patient_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

drop policy if exists "order_items write" on public.order_items;
create policy "order_items write" on public.order_items
  for all using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.patient_id = auth.uid() or public.is_admin(auth.uid()))
    )
  ) with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.patient_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );
