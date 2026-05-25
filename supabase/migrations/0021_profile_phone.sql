-- ─────────────────────────────────────────────────────────────────────
-- Migration 0021 — phone em profiles pra sync de contatos
-- ─────────────────────────────────────────────────────────────────────
--
-- Lucas (2026-05-24): "quero que você ja indique usuários para seguir
-- na aba social com base nos seus contatos do telefone."
--
-- Estratégia: armazenamos phone NORMALIZADO (apenas dígitos, com country
-- code) no profiles. Lookup é exact match — frontend normaliza os
-- contatos do telefone do user antes de enviar pro server.
--
-- Privacidade:
--   - Campo nullable (opt-in)
--   - User precisa adicionar phone manualmente (não capturamos do auth)
--   - RLS já protege profiles via policies existentes
--   - Server NÃO retorna phones de outros users — só usa internamente
--     pra fazer match
--
-- LGPD: phone é dado pessoal. User pode remover a qualquer momento
-- (UPDATE phone = NULL).

alter table public.profiles
  add column if not exists phone text;

-- Unique parcial: só impede duplicados quando phone NOT NULL
create unique index if not exists profiles_phone_unique_idx
  on public.profiles(phone)
  where phone is not null;
