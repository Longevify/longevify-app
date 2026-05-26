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

    // Initial getSession() inicia o timer interno de auto-refresh do
    // @supabase/ssr. Sem essa chamada, o timer não roda mesmo após
    // createBrowserClient.
    void client.auth.getSession();

    // Backup: quando user volta pra tab (após lunch, dormir, etc.),
    // browser throttla timers em background. Forçamos refresh
    // explícito no visibilitychange pra cookie ficar fresco antes
    // que o user dispare um server action.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void client.auth.getSession();
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
