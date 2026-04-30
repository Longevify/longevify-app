-- Seed de dados fictícios de sangue para o usuário logado
-- ─────────────────────────────────────────────────────────────────────────────
-- COMO RODAR:
--   1. Faça login no app pelo menos 1x (cria a row em `profiles` automaticamente).
--   2. Abra https://supabase.com/dashboard/project/clivszxztpfpteuuwefb/sql/new
--   3. Cole este arquivo inteiro e clique Run.
--
-- O que ele faz (idempotente — pode rodar várias vezes sem duplicar):
--   - Garante que biomarker_definitions tem os 10 marcadores do dashboard
--   - Cria 3 exames históricos (mar/24, set/24, mar/25, set/25, fev/26)
--   - Popula biomarker_values realistas com tendência de melhora
--   - Cria longevify_scores correspondentes
--
-- Esses dados aparecem em /dados (dashboard de biomarcadores).
-- Pra limpar tudo: rode só o bloco "CLEANUP" ao final.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0) Pega o id do usuário corrente (auth.uid()) e guarda em variável local
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  uid uuid := auth.uid();
  exam_2403 uuid;
  exam_2409 uuid;
  exam_2503 uuid;
  exam_2509 uuid;
  exam_2602 uuid;
begin
  if uid is null then
    raise exception 'auth.uid() retornou null. Você precisa estar logado no Supabase Studio com a sessão do user-alvo. Alternativa: rode no contexto do app autenticado.';
  end if;

  -- Garante que existe profile (handle_new_user trigger normalmente já cuida)
  insert into public.profiles (id, role) values (uid, 'patient')
    on conflict (id) do nothing;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 1) Biomarker definitions (catalog) — só insere se faltar
  -- ───────────────────────────────────────────────────────────────────────────
  insert into public.biomarker_definitions
    (id, name, category_id, category_label, unit, optimal_min, optimal_max, normal_min, normal_max, reference_label, description)
  values
    ('ldl',     'LDL Colesterol',              'cardiac',    'Cardiovascular', 'mg/dL',  0, 70,   70, 100, '< 100',     'Colesterol "ruim". Níveis altos aumentam risco cardiovascular.'),
    ('apob',    'Apolipoproteína B (ApoB)',    'cardiac',    'Cardiovascular', 'mg/dL',  0, 60,   null, null, '< 60',    'Marcador precoce de risco — mede partículas aterogênicas.'),
    ('hdl',     'HDL Colesterol',              'cardiac',    'Cardiovascular', 'mg/dL', 46,100,   null, null, '> 46',    'Colesterol "bom" — protetor cardiovascular.'),
    ('vitd',    'Vitamina D',                  'nutrients',  'Nutrientes',     'ng/dL', 50, 80,   30, 50,  '30 – 80',   'Essencial pra saúde óssea, imune e regulação hormonal.'),
    ('ferritin','Ferritina',                   'nutrients',  'Sangue',         'ng/dL', 50,150,   null, null, '50 – 150', 'Reserva de ferro. Baixa = deficiência.'),
    ('hba1c',   'Hemoglobina Glicada (A1c)',   'metabolic',  'Metabólico',     '%',      0, 5.4,  5.4, 5.7, '< 5.7',     'Média de glicemia 2-3 meses. Indicador-chave metabólico.'),
    ('tsh',     'TSH',                         'thyroid',    'Tireoide',       'µUI/mL', 0.5,2.5, 0.4, 4.5, '0.5 – 2.5', 'Hormônio que regula a tireoide.'),
    ('crp',     'PCR Ultra-sensível',          'immune',     'Inflamação',     'mg/L',   0, 1,    1, 3,    '< 1',       'Marcador de inflamação sistêmica.'),
    ('testo',   'Testosterona Total',          'hormonal',   'Hormonal',       'ng/dL',500,900, 300,1000,  '500 – 900', 'Massa muscular, libido, saúde óssea.'),
    ('alt',     'ALT (TGP)',                   'hepatic',    'Hepática',       'U/L',    0, 33,   null, null, '< 33',    'Enzima hepática — saúde do fígado.')
  on conflict (id) do nothing;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 2) Cria 5 exames históricos (limpa antes pra ser idempotente)
  -- ───────────────────────────────────────────────────────────────────────────
  delete from public.exams where patient_id = uid and lab = 'Demo Lab Longevify';

  insert into public.exams (id, patient_id, taken_at, lab, status)
  values
    (gen_random_uuid(), uid, '2024-03-15', 'Demo Lab Longevify', 'published'),
    (gen_random_uuid(), uid, '2024-09-15', 'Demo Lab Longevify', 'published'),
    (gen_random_uuid(), uid, '2025-03-15', 'Demo Lab Longevify', 'published'),
    (gen_random_uuid(), uid, '2025-09-15', 'Demo Lab Longevify', 'published'),
    (gen_random_uuid(), uid, '2026-02-15', 'Demo Lab Longevify', 'published')
  returning id, taken_at into exam_2403, exam_2409, exam_2503, exam_2509, exam_2602;

  -- O RETURNING acima só pega 1 row no PL/pgSQL; refaço com SELECT explícito
  select id into exam_2403 from public.exams
    where patient_id = uid and taken_at = '2024-03-15' and lab = 'Demo Lab Longevify';
  select id into exam_2409 from public.exams
    where patient_id = uid and taken_at = '2024-09-15' and lab = 'Demo Lab Longevify';
  select id into exam_2503 from public.exams
    where patient_id = uid and taken_at = '2025-03-15' and lab = 'Demo Lab Longevify';
  select id into exam_2509 from public.exams
    where patient_id = uid and taken_at = '2025-09-15' and lab = 'Demo Lab Longevify';
  select id into exam_2602 from public.exams
    where patient_id = uid and taken_at = '2026-02-15' and lab = 'Demo Lab Longevify';

  -- ───────────────────────────────────────────────────────────────────────────
  -- 3) Biomarker values — 10 marcadores × 5 exames = 50 rows
  -- Tendência: melhora gradual ao longo do tempo (storytelling de protocolo).
  -- Status calculado: optimal/normal/out conforme range.
  -- ───────────────────────────────────────────────────────────────────────────
  insert into public.biomarker_values (exam_id, biomarker_id, value, status, measured_at) values
    -- LDL (out → still out, but trending down: 138 → 128 → 118 → 110 → 103)
    (exam_2403, 'ldl', 138, 'out',     '2024-03-15'::timestamptz),
    (exam_2409, 'ldl', 128, 'out',     '2024-09-15'::timestamptz),
    (exam_2503, 'ldl', 118, 'out',     '2025-03-15'::timestamptz),
    (exam_2509, 'ldl', 110, 'out',     '2025-09-15'::timestamptz),
    (exam_2602, 'ldl', 103, 'out',     '2026-02-15'::timestamptz),
    -- ApoB (was elevated, now optimal: 72 → 62 → 52 → 45 → 38)
    (exam_2403, 'apob', 72, 'out',     '2024-03-15'::timestamptz),
    (exam_2409, 'apob', 62, 'normal',  '2024-09-15'::timestamptz),
    (exam_2503, 'apob', 52, 'optimal', '2025-03-15'::timestamptz),
    (exam_2509, 'apob', 45, 'optimal', '2025-09-15'::timestamptz),
    (exam_2602, 'apob', 38, 'optimal', '2026-02-15'::timestamptz),
    -- HDL (climbing: 42 → 46 → 50 → 54 → 58 — was below threshold, now optimal)
    (exam_2403, 'hdl', 42, 'out',      '2024-03-15'::timestamptz),
    (exam_2409, 'hdl', 46, 'optimal',  '2024-09-15'::timestamptz),
    (exam_2503, 'hdl', 50, 'optimal',  '2025-03-15'::timestamptz),
    (exam_2509, 'hdl', 54, 'optimal',  '2025-09-15'::timestamptz),
    (exam_2602, 'hdl', 58, 'optimal',  '2026-02-15'::timestamptz),
    -- Vitamina D (was deficient, now normal: 22 → 28 → 35 → 40 → 42)
    (exam_2403, 'vitd', 22, 'out',     '2024-03-15'::timestamptz),
    (exam_2409, 'vitd', 28, 'out',     '2024-09-15'::timestamptz),
    (exam_2503, 'vitd', 35, 'normal',  '2025-03-15'::timestamptz),
    (exam_2509, 'vitd', 40, 'normal',  '2025-09-15'::timestamptz),
    (exam_2602, 'vitd', 42, 'normal',  '2026-02-15'::timestamptz),
    -- Ferritina (steady optimal: 65 → 75 → 85 → 92 → 88)
    (exam_2403, 'ferritin', 65, 'optimal', '2024-03-15'::timestamptz),
    (exam_2409, 'ferritin', 75, 'optimal', '2024-09-15'::timestamptz),
    (exam_2503, 'ferritin', 85, 'optimal', '2025-03-15'::timestamptz),
    (exam_2509, 'ferritin', 92, 'optimal', '2025-09-15'::timestamptz),
    (exam_2602, 'ferritin', 88, 'optimal', '2026-02-15'::timestamptz),
    -- HbA1c (steady optimal, slight downward: 5.5 → 5.4 → 5.3 → 5.2 → 5.1)
    (exam_2403, 'hba1c', 5.5, 'normal',  '2024-03-15'::timestamptz),
    (exam_2409, 'hba1c', 5.4, 'optimal', '2024-09-15'::timestamptz),
    (exam_2503, 'hba1c', 5.3, 'optimal', '2025-03-15'::timestamptz),
    (exam_2509, 'hba1c', 5.2, 'optimal', '2025-09-15'::timestamptz),
    (exam_2602, 'hba1c', 5.1, 'optimal', '2026-02-15'::timestamptz),
    -- TSH (settling: 2.4 → 2.2 → 2.0 → 1.9 → 1.8)
    (exam_2403, 'tsh', 2.4, 'optimal', '2024-03-15'::timestamptz),
    (exam_2409, 'tsh', 2.2, 'optimal', '2024-09-15'::timestamptz),
    (exam_2503, 'tsh', 2.0, 'optimal', '2025-03-15'::timestamptz),
    (exam_2509, 'tsh', 1.9, 'optimal', '2025-09-15'::timestamptz),
    (exam_2602, 'tsh', 1.8, 'optimal', '2026-02-15'::timestamptz),
    -- PCR (was elevated, now optimal: 2.4 → 1.6 → 1.0 → 0.8 → 0.6)
    (exam_2403, 'crp', 2.4, 'normal',  '2024-03-15'::timestamptz),
    (exam_2409, 'crp', 1.6, 'normal',  '2024-09-15'::timestamptz),
    (exam_2503, 'crp', 1.0, 'optimal', '2025-03-15'::timestamptz),
    (exam_2509, 'crp', 0.8, 'optimal', '2025-09-15'::timestamptz),
    (exam_2602, 'crp', 0.6, 'optimal', '2026-02-15'::timestamptz),
    -- Testosterona (climbing: 420 → 480 → 540 → 590 → 620)
    (exam_2403, 'testo', 420, 'normal',  '2024-03-15'::timestamptz),
    (exam_2409, 'testo', 480, 'normal',  '2024-09-15'::timestamptz),
    (exam_2503, 'testo', 540, 'optimal', '2025-03-15'::timestamptz),
    (exam_2509, 'testo', 590, 'optimal', '2025-09-15'::timestamptz),
    (exam_2602, 'testo', 620, 'optimal', '2026-02-15'::timestamptz),
    -- ALT (steady optimal: 28 → 26 → 24 → 23 → 22)
    (exam_2403, 'alt', 28, 'optimal', '2024-03-15'::timestamptz),
    (exam_2409, 'alt', 26, 'optimal', '2024-09-15'::timestamptz),
    (exam_2503, 'alt', 24, 'optimal', '2025-03-15'::timestamptz),
    (exam_2509, 'alt', 23, 'optimal', '2025-09-15'::timestamptz),
    (exam_2602, 'alt', 22, 'optimal', '2026-02-15'::timestamptz);

  -- ───────────────────────────────────────────────────────────────────────────
  -- 4) Longevify scores — 1 snapshot por exame
  -- ───────────────────────────────────────────────────────────────────────────
  delete from public.longevify_scores where patient_id = uid;

  insert into public.longevify_scores (patient_id, computed_at, score, biological_age, status) values
    (uid, '2024-03-16'::timestamptz, 58, 30.5, 'attention'),
    (uid, '2024-09-16'::timestamptz, 62, 29.8, 'attention'),
    (uid, '2025-03-16'::timestamptz, 66, 28.5, 'on-track'),
    (uid, '2025-09-16'::timestamptz, 68, 27.2, 'on-track'),
    (uid, '2026-02-16'::timestamptz, 70, 25.0, 'on-track');

  raise notice 'Seed completo. User % agora tem 5 exames + 50 biomarker_values + 5 score snapshots.', uid;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — descomenta e roda só este bloco pra remover os dados de demo
-- ─────────────────────────────────────────────────────────────────────────────
-- do $$
-- declare uid uuid := auth.uid();
-- begin
--   delete from public.biomarker_values where exam_id in (
--     select id from public.exams where patient_id = uid and lab = 'Demo Lab Longevify'
--   );
--   delete from public.exams where patient_id = uid and lab = 'Demo Lab Longevify';
--   delete from public.longevify_scores where patient_id = uid;
-- end $$;
