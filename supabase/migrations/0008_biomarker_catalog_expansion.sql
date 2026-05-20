-- Migration 0008 — expansão do catálogo biomarker_definitions
--
-- Rode no SQL Editor do Supabase (JÁ APLICADA em prod via Management API
-- em 2026-05-20):
-- https://supabase.com/dashboard/project/clivszxztpfpteuuwefb/sql/new
--
-- Lucas (2026-05-20): após habilitar AI parse (PR #208/#209), descobrimos
-- que o catálogo tinha só 10 biomarcadores. Exame BR padrão tem 30-80.
-- Adicionamos 71 fundamentais pra que o parser não omita 90% do laudo.
--
-- Categorias: hemograma (14), glicemia (3), lipídico (6), hepático (8),
-- renal (5), eletrólitos+minerais (10), cardiovascular (2), tireoide (5),
-- hormônios (10), vitaminas (6), minerais (5), outros (1).
--
-- Total no catálogo após migration: 81 biomarcadores.
--
-- Referências de range:
--   Faixas ótimas (longevity-style): Peter Attia, ZRT Labs, Cleveland Clinic
--   Faixas normais (population reference): Fleury, DASA, Sabin
--
-- ON CONFLICT (id) DO NOTHING — preserva ranges customizados se já
-- existirem (idempotente, pode rodar múltiplas vezes).

INSERT INTO public.biomarker_definitions (id, name, category_id, category_label, unit, optimal_min, optimal_max, normal_min, normal_max, reference_label, description) VALUES

-- ─── HEMOGRAMA ──────────────────────────────────────────────────────────
('hemoglobin', 'Hemoglobina', 'hemograma', 'Hemograma', 'g/dL', 13.5, 16.5, 12.0, 17.5, '12.0-17.5 (♀ 12.0-15.5 / ♂ 13.5-17.5)', 'Proteína que carrega oxigênio no sangue. Baixa = anemia.'),
('hematocrit', 'Hematócrito', 'hemograma', 'Hemograma', '%', 40, 50, 36, 52, '36-52%', 'Percentual do sangue composto por hemácias.'),
('mcv', 'VCM (Volume Corpuscular Médio)', 'hemograma', 'Hemograma', 'fL', 85, 95, 80, 100, '80-100 fL', 'Tamanho médio das hemácias. Alto = anemia macrocítica (B12/folato). Baixo = ferropriva.'),
('mch', 'HCM (Hemoglobina Corpuscular Média)', 'hemograma', 'Hemograma', 'pg', 27, 32, 27, 34, '27-34 pg', 'Quantidade média de hemoglobina por hemácia.'),
('mchc', 'CHCM (Concentração HCM)', 'hemograma', 'Hemograma', 'g/dL', 32, 36, 32, 36, '32-36 g/dL', 'Concentração de hemoglobina nas hemácias.'),
('rdw', 'RDW (Amplitude Distribuição)', 'hemograma', 'Hemograma', '%', 11, 13, 11.5, 14.5, '11.5-14.5%', 'Variação no tamanho das hemácias. Alto = mistura de tamanhos.'),
('wbc', 'Leucócitos (total)', 'hemograma', 'Hemograma', '/mm³', 4000, 10000, 4000, 11000, '4.000-11.000/mm³', 'Glóbulos brancos. Alto = infecção. Baixo = imunossupressão.'),
('neutrophils', 'Neutrófilos', 'hemograma', 'Hemograma', '/mm³', 1800, 7000, 1500, 8000, '1.500-8.000/mm³', 'Combate bactérias. Alto em infecção bacteriana aguda.'),
('lymphocytes', 'Linfócitos', 'hemograma', 'Hemograma', '/mm³', 1500, 4000, 900, 5000, '900-5.000/mm³', 'Imunidade adaptativa. Alto em infecção viral.'),
('monocytes', 'Monócitos', 'hemograma', 'Hemograma', '/mm³', 200, 800, 100, 1000, '100-1.000/mm³', 'Limpeza/inflamação crônica.'),
('eosinophils', 'Eosinófilos', 'hemograma', 'Hemograma', '/mm³', 0, 500, 0, 700, '0-700/mm³', 'Alergias e parasitas. Alto = atopia/verminose.'),
('basophils', 'Basófilos', 'hemograma', 'Hemograma', '/mm³', 0, 100, 0, 200, '0-200/mm³', 'Reações alérgicas.'),
('platelets', 'Plaquetas', 'hemograma', 'Hemograma', '/mm³', 200000, 350000, 150000, 450000, '150.000-450.000/mm³', 'Coagulação. Baixo = risco de sangramento.'),
('vhs', 'VHS (Eritrossedimentação)', 'inflamacao', 'Inflamação', 'mm/h', 0, 10, 0, 20, '0-20 mm/h', 'Inflamação inespecífica. Alto sugere processo inflamatório/infeccioso.'),

-- ─── GLICÊMICO ──────────────────────────────────────────────────────────
('glucose', 'Glicose em jejum', 'glicemico', 'Glicemia', 'mg/dL', 70, 90, 70, 99, '70-99 mg/dL', 'Açúcar no sangue em jejum. >100 = pré-diabetes; >126 = diabetes.'),
('insulin_fasting', 'Insulina em jejum', 'glicemico', 'Glicemia', 'µUI/mL', 2, 6, 2, 25, '2-25 µUI/mL', 'Hormônio que regula glicose. >10 sugere resistência à insulina.'),
('homa_ir', 'HOMA-IR', 'glicemico', 'Glicemia', '', 0.5, 1.9, 0.5, 2.5, '<2.5', 'Índice de resistência à insulina (glicose × insulina / 405).'),

-- ─── LIPÍDICO ───────────────────────────────────────────────────────────
('total_cholesterol', 'Colesterol Total', 'lipidico', 'Perfil lipídico', 'mg/dL', 0, 180, 0, 200, '<200 mg/dL', 'Soma de LDL+HDL+VLDL. Sozinho diz pouco — olhar frações.'),
('triglycerides', 'Triglicérides', 'lipidico', 'Perfil lipídico', 'mg/dL', 0, 100, 0, 150, '<150 mg/dL', 'Gordura no sangue. Alto = excesso de carboidrato refinado / álcool.'),
('vldl', 'VLDL', 'lipidico', 'Perfil lipídico', 'mg/dL', 0, 20, 0, 30, '<30 mg/dL', 'Lipoproteína de muito baixa densidade. Calculada = TG/5.'),
('non_hdl_cholesterol', 'Colesterol não-HDL', 'lipidico', 'Perfil lipídico', 'mg/dL', 0, 100, 0, 130, '<130 mg/dL', 'Total − HDL. Inclui todas lipoproteínas aterogênicas.'),
('lpa', 'Lipoproteína (a)', 'lipidico', 'Perfil lipídico', 'mg/dL', 0, 30, 0, 50, '<50 mg/dL', 'Genética. Alta sobe risco cardiovascular independente do LDL.'),
('apoa1', 'Apolipoproteína A1', 'lipidico', 'Perfil lipídico', 'mg/dL', 130, 200, 110, 220, '110-220 mg/dL', 'Proteína do HDL. Alto é protetor.'),

-- ─── HEPÁTICO ──────────────────────────────────────────────────────────
('ast', 'AST (TGO)', 'hepatico', 'Função hepática', 'U/L', 10, 30, 0, 40, '<40 U/L', 'Enzima hepática (também muscular). Alta = lesão hepato/muscular.'),
('ggt', 'GGT (Gama-GT)', 'hepatico', 'Função hepática', 'U/L', 10, 30, 0, 60, '<60 U/L', 'Marcador hepatobiliar sensível. Alto = álcool ou esteatose.'),
('alkaline_phosphatase', 'Fosfatase alcalina', 'hepatico', 'Função hepática', 'U/L', 40, 100, 35, 130, '35-130 U/L', 'Enzima hepatobiliar e óssea.'),
('bilirubin_total', 'Bilirrubina total', 'hepatico', 'Função hepática', 'mg/dL', 0.2, 1.0, 0.1, 1.2, '0.1-1.2 mg/dL', 'Produto de degradação da hemoglobina.'),
('bilirubin_direct', 'Bilirrubina direta', 'hepatico', 'Função hepática', 'mg/dL', 0, 0.3, 0, 0.5, '<0.5 mg/dL', 'Bilirrubina conjugada. Alta indica problema na excreção.'),
('bilirubin_indirect', 'Bilirrubina indireta', 'hepatico', 'Função hepática', 'mg/dL', 0, 0.8, 0, 1.0, '<1.0 mg/dL', 'Pré-hepática. Alta = hemólise ou Gilbert.'),
('albumin', 'Albumina', 'hepatico', 'Função hepática', 'g/dL', 4.0, 5.0, 3.5, 5.5, '3.5-5.5 g/dL', 'Principal proteína do plasma. Baixa = desnutrição ou doença hepática.'),
('total_protein', 'Proteínas totais', 'hepatico', 'Função hepática', 'g/dL', 6.5, 8.0, 6.0, 8.3, '6.0-8.3 g/dL', 'Albumina + globulinas.'),

-- ─── RENAL ─────────────────────────────────────────────────────────────
('urea', 'Ureia', 'renal', 'Função renal', 'mg/dL', 15, 35, 10, 50, '10-50 mg/dL', 'Produto do metabolismo proteico. Alta sugere disfunção renal.'),
('creatinine', 'Creatinina', 'renal', 'Função renal', 'mg/dL', 0.6, 1.1, 0.5, 1.3, '0.5-1.3 mg/dL (♀ 0.5-1.0 / ♂ 0.7-1.3)', 'Filtração glomerular. Padrão de função renal.'),
('uric_acid', 'Ácido úrico', 'renal', 'Função renal', 'mg/dL', 3.0, 6.0, 2.5, 7.0, '2.5-7.0 mg/dL', 'Produto do metabolismo das purinas. Alto = risco de gota.'),
('egfr', 'eGFR (TFG estimada)', 'renal', 'Função renal', 'mL/min/1.73m²', 90, 120, 60, 120, '>60', 'Taxa de filtração glomerular estimada.'),
('cystatin_c', 'Cistatina C', 'renal', 'Função renal', 'mg/L', 0.5, 0.9, 0.5, 1.1, '0.5-1.1 mg/L', 'Marcador renal mais sensível que creatinina.'),

-- ─── ELETRÓLITOS ───────────────────────────────────────────────────────
('sodium', 'Sódio', 'eletrolitos', 'Eletrólitos', 'mEq/L', 138, 142, 135, 145, '135-145 mEq/L', 'Principal cátion extracelular.'),
('potassium', 'Potássio', 'eletrolitos', 'Eletrólitos', 'mEq/L', 3.8, 4.5, 3.5, 5.0, '3.5-5.0 mEq/L', 'Principal cátion intracelular. Anormal = risco cardíaco.'),
('chloride', 'Cloro', 'eletrolitos', 'Eletrólitos', 'mEq/L', 98, 106, 96, 108, '96-108 mEq/L', 'Principal ânion extracelular.'),
('calcium', 'Cálcio total', 'eletrolitos', 'Eletrólitos', 'mg/dL', 9.0, 10.0, 8.5, 10.5, '8.5-10.5 mg/dL', 'Cálcio sérico (99% está no osso).'),
('calcium_ionized', 'Cálcio iônico', 'eletrolitos', 'Eletrólitos', 'mg/dL', 4.6, 5.3, 4.5, 5.6, '4.5-5.6 mg/dL', 'Fração biologicamente ativa do cálcio.'),
('phosphorus', 'Fósforo', 'eletrolitos', 'Eletrólitos', 'mg/dL', 3.0, 4.5, 2.5, 4.5, '2.5-4.5 mg/dL', 'Mineral fundamental pra osso e ATP.'),
('magnesium', 'Magnésio', 'minerais', 'Minerais', 'mg/dL', 2.0, 2.4, 1.6, 2.6, '1.6-2.6 mg/dL', 'Cofator de 300+ enzimas. Baixo é comum e silencioso.'),

-- ─── CARDIOVASCULAR ───────────────────────────────────────────────────
('homocysteine', 'Homocisteína', 'cardiovascular', 'Cardiovascular', 'µmol/L', 5, 9, 5, 15, '5-15 µmol/L', 'Aminoácido. Alta = risco cardiovascular e cognitivo.'),
('nt_probnp', 'NT-proBNP', 'cardiovascular', 'Cardiovascular', 'pg/mL', 0, 125, 0, 300, '<125 pg/mL', 'Marcador de insuficiência cardíaca.'),

-- ─── ENDÓCRINO (tireoide) ─────────────────────────────────────────────
('t3_free', 'T3 livre', 'tireoide', 'Tireoide', 'pg/mL', 2.8, 4.0, 2.0, 4.4, '2.0-4.4 pg/mL', 'Hormônio tireoidiano ativo.'),
('t4_free', 'T4 livre', 'tireoide', 'Tireoide', 'ng/dL', 1.0, 1.5, 0.8, 1.8, '0.8-1.8 ng/dL', 'Pré-hormônio tireoidiano principal.'),
('t3_reverse', 'T3 reverso', 'tireoide', 'Tireoide', 'ng/dL', 9, 24, 9, 27, '9-27 ng/dL', 'Forma inativa do T3. Alto em estresse crônico.'),
('anti_tpo', 'Anti-TPO', 'tireoide', 'Tireoide', 'UI/mL', 0, 9, 0, 35, '<35 UI/mL', 'Anticorpo anti-tireoide. Alto = Hashimoto.'),
('anti_tg', 'Anti-Tireoglobulina', 'tireoide', 'Tireoide', 'UI/mL', 0, 20, 0, 115, '<115 UI/mL', 'Outro anticorpo anti-tireoide.'),

-- ─── HORMÔNIOS SEXUAIS ────────────────────────────────────────────────
('testo_free', 'Testosterona livre', 'hormonios', 'Hormônios', 'pg/mL', 8.7, 25.1, 5.0, 25.1, '5.0-25.1 pg/mL (♂)', 'Fração biologicamente ativa da testosterona.'),
('shbg', 'SHBG', 'hormonios', 'Hormônios', 'nmol/L', 20, 50, 10, 80, '10-80 nmol/L', 'Globulina ligadora de hormônios sexuais.'),
('estradiol', 'Estradiol (E2)', 'hormonios', 'Hormônios', 'pg/mL', 10, 40, 10, 350, '♂: 10-40 / ♀: variável por fase', 'Principal estrogênio.'),
('progesterone', 'Progesterona', 'hormonios', 'Hormônios', 'ng/mL', 0.1, 0.8, 0.1, 25, 'Variável por fase do ciclo', 'Hormônio dominante na fase lútea.'),
('dheas', 'DHEA-S', 'hormonios', 'Hormônios', 'µg/dL', 200, 350, 100, 600, '100-600 µg/dL (varia por idade)', 'Andrógeno adrenal. Cai com idade.'),
('cortisol_morning', 'Cortisol manhã', 'hormonios', 'Hormônios', 'µg/dL', 10, 15, 5, 25, '5-25 µg/dL (matinal)', 'Hormônio do estresse. Cronicamente alto é nocivo.'),
('prolactin', 'Prolactina', 'hormonios', 'Hormônios', 'ng/mL', 2, 15, 2, 18, '2-18 ng/mL', 'Hormônio hipofisário. Alto pode indicar prolactinoma.'),
('lh', 'LH', 'hormonios', 'Hormônios', 'mUI/mL', 1.7, 8.6, 1.0, 10.0, '1.0-10.0 mUI/mL (♂)', 'Estimula testículo/ovário.'),
('fsh', 'FSH', 'hormonios', 'Hormônios', 'mUI/mL', 1.5, 12.4, 1.0, 15.0, '1.0-15.0 mUI/mL (♂)', 'Estimula gametogênese.'),

-- ─── VITAMINAS ────────────────────────────────────────────────────────
('vitb12', 'Vitamina B12', 'vitaminas', 'Vitaminas', 'pg/mL', 500, 900, 200, 900, '>500 pg/mL ideal', 'Essencial pra nervos e metilação. Baixa é comum.'),
('folate', 'Ácido fólico (B9)', 'vitaminas', 'Vitaminas', 'ng/mL', 5, 20, 3, 20, '3-20 ng/mL', 'Vitamina B9. DNA e neurotransmissores.'),
('vitb6', 'Vitamina B6 (Piridoxal)', 'vitaminas', 'Vitaminas', 'µg/L', 5, 50, 3, 60, '3-60 µg/L', 'Cofator de 100+ enzimas.'),
('vita', 'Vitamina A (retinol)', 'vitaminas', 'Vitaminas', 'µg/dL', 40, 70, 30, 100, '30-100 µg/dL', 'Visão, imunidade, pele.'),
('vite', 'Vitamina E (alfa-tocoferol)', 'vitaminas', 'Vitaminas', 'mg/L', 8, 15, 5, 20, '5-20 mg/L', 'Antioxidante lipossolúvel.'),
('vitk', 'Vitamina K', 'vitaminas', 'Vitaminas', 'ng/mL', 0.2, 3.2, 0.1, 5.0, '0.1-5.0 ng/mL', 'Coagulação e saúde óssea.'),

-- ─── MINERAIS ─────────────────────────────────────────────────────────
('iron_serum', 'Ferro sérico', 'minerais', 'Minerais', 'µg/dL', 60, 170, 30, 180, '30-180 µg/dL', 'Ferro circulante.'),
('transferrin', 'Transferrina', 'minerais', 'Minerais', 'mg/dL', 200, 360, 200, 360, '200-360 mg/dL', 'Proteína que transporta ferro.'),
('transferrin_sat', 'Saturação de transferrina', 'minerais', 'Minerais', '%', 25, 35, 20, 50, '20-50%', 'Quanto do transporte está cheio de ferro.'),
('zinc', 'Zinco', 'minerais', 'Minerais', 'µg/dL', 80, 120, 70, 150, '70-150 µg/dL', 'Imunidade, testo, cicatrização.'),
('selenium', 'Selênio', 'minerais', 'Minerais', 'µg/L', 110, 140, 70, 150, '70-150 µg/L', 'Antioxidante, função tireoidiana.'),

-- ─── OUTROS ───────────────────────────────────────────────────────────
('omega3_index', 'Índice Ômega-3', 'outros', 'Outros', '%', 8, 12, 4, 12, '>8% ideal', 'EPA+DHA em hemácias. Cardiovascular e neurológico.')

ON CONFLICT (id) DO NOTHING;
