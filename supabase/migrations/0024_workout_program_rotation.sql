-- 0024_workout_program_rotation.sql
--
-- Lucas (2026-05-26): "por padrão preciso que você varie o treino de 3
-- em 3 meses. Ou seja, olha para o treino criado e faça variações,
-- haja vista que ficar treinando os mesmos exercícios sempre não é o
-- caminho ótimo caso o cara queira hipertrofia".
--
-- Pra rastrear histórico de rotações automáticas:
--   - parent_program_id: link pro programa anterior que originou esta
--     rotação (NULL pro programa original gerado do questionário)
--   - rotation_count: quantas rotações já aconteceram a partir do
--     programa raiz. Útil pra prompt do LLM evitar repetir exercícios
--     já usados em rotações anteriores.

alter table public.workout_programs
  add column if not exists parent_program_id uuid
    references public.workout_programs(id) on delete set null;

alter table public.workout_programs
  add column if not exists rotation_count integer not null default 0;

create index if not exists workout_programs_parent_idx
  on public.workout_programs(parent_program_id);
