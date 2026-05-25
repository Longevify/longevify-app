-- ─────────────────────────────────────────────────────────────────────
-- Migration 0023 — Stories Insta-style em social_posts
-- ─────────────────────────────────────────────────────────────────────
--
-- Lucas (2026-05-24): "As posições e o jeito que o social vai funcionar
-- vai ser exatamente igual ao insta, no topo aparecem os stories e na
-- tela principal aparece o feed."
--
-- Estratégia: reusa social_posts (sem table nova) com:
--   - kind = 'story' (adiciona ao check constraint)
--   - payload.imageUrl = data URL ou URL pública
--   - payload.expiresAt = ISO timestamp (now + 24h)
--
-- Stories ativos = kind='story' AND (payload->>'expiresAt')::timestamptz > now()
-- Server filtra ao consultar (filtro em SQL pra usar índice).

-- Drop constraint atual e recria com 'story'
alter table public.social_posts
  drop constraint if exists social_posts_kind_check;

alter table public.social_posts
  add constraint social_posts_kind_check
  check (kind in (
    'running',
    'workout',
    'achievement',
    'level_up',
    'biomarker',
    'milestone',
    'story'
  ));

-- Index pra query rápida de stories ativos (kind=story + expires no payload)
-- Postgres não indexa diretamente JSONB date comparison; cria index funcional
create index if not exists social_posts_story_active_idx
  on public.social_posts ((payload->>'expiresAt'))
  where kind = 'story';
