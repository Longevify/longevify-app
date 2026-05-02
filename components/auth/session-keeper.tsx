"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * Componente "fantasma" que mantém a sessão Supabase viva no browser.
 *
 * O createBrowserClient auto-refresca tokens em background quando estão
 * próximos de expirar, e escreve os novos cookies — esses cookies são
 * lidos pelo server-side em rotas SSR/RSC. Sem inicializar isso em algum
 * lugar do tree client-side, a sessão depende do refresh acontecer no
 * server (que pode falhar em race com requests paralelos).
 *
 * Também ouve eventos de auth do Supabase (SIGNED_OUT, TOKEN_REFRESHED)
 * pra fazer router.refresh() — re-renderiza componentes server pra
 * pegarem o novo estado de auth sem precisar de refresh manual.
 */
export function SessionKeeper() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;

    // Inicializa imediatamente — getSession lê os cookies e o cliente
    // se "registra" pra auto-refresh.
    void supabase.auth.getSession();

    // Re-render server components quando auth state muda (login, logout,
    // token refresh). Crítico pra páginas que dependem de getCurrentUser
    // verem o estado novo sem F5.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          router.refresh();
        }
      },
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
