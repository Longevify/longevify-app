-- 0018_menstrual_sexual_activity.sql
--
-- Lucas (2026-05-22): "na mini aba que aparece ao clicar em registrar
-- como está se sentindo, tem que aparecer a opção de registrar se teve
-- relação sexual naquele dia ou não."
--
-- Adiciona coluna `sexual_activity` em menstrual_entries.
-- Tri-state:
--   null     → user não respondeu (default)
--   true     → teve relação sexual
--   false    → marcou explicitamente "não"
--
-- Útil pra correlações com libido, fertilidade, fase do ciclo, mood.

alter table public.menstrual_entries
  add column if not exists sexual_activity boolean;
