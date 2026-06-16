-- 0011_clinical_range_corrections.sql
--
-- Lucas (2026-05-21): "acho que as faixas ótimo, normal e fora do
-- normal tem que ser revisadas pelo agente expert de medicina."
--
-- Auditoria clínica feita pelo agent medico-longevify referenciando:
--   - ADA Standards of Care 2024 (Diabetes Care)
--   - EAS Lp(a) Consensus 2022 (Kronenberg, Eur Heart J)
--   - AASLD MASLD Practice Guidance 2023 (Rinella)
--   - Endocrine Society Testosterone 2018
--   - KDIGO CKD 2024
--   - Peter Attia "Outlive" 2023 (longevity targets)
--   - Newsome AASLD 2018 (ALT/AST true-normal)
--
-- Mudanças aplicadas:
--   1. BUGS DE UNIDADE (críticos):
--      - vitd: ng/dL → ng/mL (valor estava certo, unidade errada)
--      - ferritin: ng/dL → ng/mL (= µg/L)
--
--   2. RANGES HEPÁTICOS DESATUALIZADOS (Newsome AASLD 2018):
--      - ALT optimal 0-33 → 0-25 (true normal moderna)
--      - AST optimal 10-30 → 0-30 (limite inferior 10 era arbitrário)
--      - GGT optimal 10-30 → 0-20 (longevity ideal <20)
--
--   3. HBA1C: normal não pode invadir pré-DM (ADA 2024)
--      - normal 5.4-5.7 → 3.5-5.69 (5.7+ é pré-DM, não normal)
--
--   4. CORTISOL MANHÃ: faixa fisiológica era estreita demais
--      - optimal 10-15 → 6-18
--
--   5. UREIA: piso 15 era arbitrário
--      - optimal 15-35 → 10-40
--
--   6. HOMOCISTEÍNA: limite inferior 5 desnecessário (é top-only de fato)
--      - optimal 5-9 → 0-9
--
--   7. HORMÔNIOS SEX-DEPENDENT: remove "optimal" unisex
--      - estradiol, progesterone, fsh, lh, testo_free, testo
--      - Razão: range varia drasticamente por sexo + fase do ciclo + idade;
--        UI mostrando "optimal X-Y" unisex é clinicamente errado.
--      - Próxima PR (sex-specific) repopula com overrides por sexo.

-- ─── Unidades (bugs) ──────────────────────────────────────────────────
update public.biomarker_definitions set unit = 'ng/mL' where id = 'vitd';
update public.biomarker_definitions set unit = 'ng/mL' where id = 'ferritin';

-- ─── Hepático (AASLD/Newsome) ─────────────────────────────────────────
update public.biomarker_definitions set optimal_min = 0, optimal_max = 25 where id = 'alt';
update public.biomarker_definitions set optimal_min = 0, optimal_max = 30 where id = 'ast';
update public.biomarker_definitions set optimal_min = 0, optimal_max = 20 where id = 'ggt';

-- ─── HbA1c (ADA 2024) ────────────────────────────────────────────────
update public.biomarker_definitions set normal_min = 3.5, normal_max = 5.69 where id = 'hba1c';

-- ─── Cortisol manhã (faixa fisiológica) ──────────────────────────────
update public.biomarker_definitions set optimal_min = 6, optimal_max = 18 where id = 'cortisol_morning';

-- ─── Ureia (piso arbitrário) ─────────────────────────────────────────
update public.biomarker_definitions set optimal_min = 10, optimal_max = 40 where id = 'urea';

-- ─── Homocisteína (top-only) ─────────────────────────────────────────
update public.biomarker_definitions set optimal_min = 0, optimal_max = 9 where id = 'homocysteine';

-- ─── Hormônios sex-dependent: remove "optimal" unisex ────────────────
-- (próxima PR aplica overrides por sexo via tabela biomarker_sex_ranges
-- ou similar — Lucas já vem trabalhando em sex-specific ranges no WIP)
update public.biomarker_definitions
set optimal_min = null, optimal_max = null
where id in ('estradiol', 'progesterone', 'fsh', 'lh', 'testo_free', 'testo');
