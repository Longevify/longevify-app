-- ─────────────────────────────────────────────────────────────────────
-- Migration 0020 — Friend streaks compartilhados (Snapchat/Duolingo-style)
-- ─────────────────────────────────────────────────────────────────────
--
-- Lucas (2026-05-24): "crie um sistema de foguinho, no qual se você e
-- seu amigo todo dia fazem exercícios, e se vocês tiverem se comprometido
-- a fazer esse game, o foguinho cresce, igual ao snapshat e igual ao
-- duolingo, etc."
--
-- Estratégia: COMPUTE ON READ. Não criamos tabela nova de streaks pra
-- evitar drift entre source of truth (task_completions) e cache. Em vez
-- disso, calculamos no servidor a cada load lendo task_completions de
-- ambos os usuários + interseção de datas.
--
-- Pra isso funcionar, a RLS de task_completions precisa permitir o user
-- ler completions DOS AMIGOS dele (atualmente só permite ler as próprias).
-- Esta migration adiciona policy SELECT extra.

drop policy if exists "tc read friends" on public.task_completions;
create policy "tc read friends" on public.task_completions
  for select using (
    exists (
      select 1 from public.social_friendships sf
      where sf.patient_id = auth.uid()
        and sf.friend_id = task_completions.patient_id
        and sf.status = 'active'
    )
  );

-- Policy adicional não substitui a original ("tc read own" ou similar) —
-- policies SELECT são OR'd. Resultado: user lê suas próprias + de amigos.
