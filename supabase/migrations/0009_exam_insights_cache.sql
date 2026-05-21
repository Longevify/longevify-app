-- 0009_exam_insights_cache.sql
--
-- Lucas (2026-05-20): "quando abro o onboarding do app, não quero
-- esperar para a analise do Dr. Lon carregar, quero que isso ja
-- esteja pronto quando passar pelo onboarding, ou seja, quero que
-- você ja tenha feito essa análise previamente e armazenado o que
-- estará 'printado' no onboarding."
--
-- Adiciona coluna `insights_data jsonb` em `exams` pra persistir
-- a análise GPT-4o-mini (gerada após o parse Opus extrair os
-- biomarcadores) — assim o PostExamStories abre instantâneo, sem
-- spinner de "carregando análise".
--
-- Estrutura esperada no JSONB:
-- {
--   "insights": {
--     "<biomarker_id>": {
--       "mainMessage": "...",
--       "whyHappened": "...",
--       "whatToDo": ["...", "..."],
--       "timeline": "..."
--     }
--   },
--   "generated_at": "2026-05-20T12:34:56Z",
--   "provider": "gpt-4o-mini" | "static"
-- }

alter table public.exams
  add column if not exists insights_data jsonb;

-- Sem index porque busca é sempre via patient_id + ordenação por
-- taken_at — já coberto pelo exams_patient_idx existente.

comment on column public.exams.insights_data is
  'Cache de análise personalizada (Dr. Lon) gerada pelo GPT-4o-mini após o parse Opus. Pré-computado pra acelerar onboarding pós-exame.';
