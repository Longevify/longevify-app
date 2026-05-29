"use client";

import { useEffect } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * Lucas (2026-05-26): screenshot do search com "Sessão expirou" depois
 * de digitar nome do amigo. Bug recorrente (Contatos, save de treino,
 * search) com causa raiz comum: JWT do Supabase tem TTL de 1h, e o
 * projeto não tinha refresh automático rodando.
 *
 * Por que? O proxy server-side foi deliberadamente neutralizado (ver
 * lib/supabase/proxy.ts) por causa de race condition de delete-cookie
 * em refresh paralelo entre RSC fetches. A solução era delegar o
 * refresh pro browser client (que tem locking interno + auto-refresh
 * timer). MAS o browser client nunca era criado no layout — só era
 * instanciado quando algum componente específico chamava
 * `getBrowserClient()`. Resultado: o timer de refresh nunca rodava.
 *
 * Fix: este componente é montado no layout root, chama getSession()
 * uma vez no mount (cria o client + inicia o timer interno de
 * refresh) e refresca também em visibilitychange (caso tab tenha
 * ficado em background e timer foi throttled).
 *
 * Browser supabase client com auto-refresh = cookies httpOnly são
 * atualizados automaticamente ~30s antes do token expirar. Server
 * actions subsequentes leem cookie fresco e não falham mais.
 */
export function AuthRefresher() {
  useEffect(() => {
    const client = getBrowserClient();
    if (!client) return; // demo mode

    // Lucas (2026-05-26 v2): "quando eu vou postar algo aparece não
    // autenticado". Bug residual após v1 — getSession() retorna a
    // sessão atual mas NÃO refresca eagerly se o token ainda tem
    // alguns segundos de vida. Se user navega pro app com cookie de
    // 59m59s, getSession passa, mas server actions disparadas 30s
    // depois pegam JWT expirado.
    //
    // Fix v2: tenta refreshSession() na inicialização. Se o token
    // ainda tá fresco, no-op silencioso. Se tá perto de expirar ou
    // expirado, força refresh via /token endpoint do Supabase ANTES
    // do user disparar qualquer action. Cookies httpOnly atualizados
    // = próximas server actions veem token novo.
    //
    // Tanto refreshSession quanto getSession iniciam o timer interno
    // de auto-refresh — getSession era só pra "ligar" o client.
    void client.auth.refreshSession().catch(() => {
      // Sem refresh_token válido (user nunca logou ou logout). Não
      // bloqueia — ações vão retornar "Não autenticado" naturalmente.
    });

    // Backup: quando user volta pra tab (após lunch, dormir, etc.),
    // browser throttla timers em background. Forçamos refresh
    // explícito no visibilitychange pra cookie ficar fresco antes
    // que o user dispare um server action.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void client.auth.refreshSession().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    // Também em focus (cobre desktop browsers que não disparam
    // visibilitychange de modo confiável)
    window.addEventListener("focus", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, []);

  return null;
}
