import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Cria um Supabase server client cravando o access_token JWT como header
 * `Authorization: Bearer ...` global, e DESLIGANDO o auto-refresh de
 * sessão.
 *
 * Por que: o `createServerClient` do `@supabase/ssr`, ao executar
 * queries, periodicamente tenta refrescar o access_token usando o
 * refresh_token. O auth server do Supabase consome o refresh_token
 * antigo (one-time-use). Se a gente não persiste o novo via setAll
 * (pages não podem escrever cookies de modo confiável), o próximo
 * refresh falha e o supabase **CLEAR os cookies de auth** —
 * efetivamente deslogando o user no meio da navegação.
 *
 * SOLUÇÃO: já temos o access_token válido na mão (extraído do
 * cookie via getUserIdFromCookie). Cravamos como Bearer header e
 * dizemos pro client `autoRefreshToken: false` + `persistSession:
 * false`. O client vira um wrapper REST puro de PostgREST com
 * identidade do user — zero gerenciamento de sessão.
 *
 * Refresh continua funcionando do lado do BROWSER via
 * createBrowserClient (que tem locking interno pra evitar race) e
 * via supabase.auth.signInWithPassword no fluxo de login.
 */
export async function createSupabaseWithJwt(accessToken: string | null) {
  const cookieStore = await cookies();
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* no-op — autoRefreshToken=false garante que setAll nunca é
         * chamado em paths normais, mas mantemos no-op por segurança */
      },
    },
    global: {
      headers,
    },
    auth: {
      // CRÍTICO: sem isso, o client tenta refresh proativo nas queries,
      // consome o refresh_token, falha em persistir, e na próxima
      // tentativa CLEAR os cookies (= logout silencioso do user).
      autoRefreshToken: false,
      persistSession: false,
      // detectSessionInUrl: false porque estamos em server-side (não
      // tem URL hash) e a gente não quer que ele tente parsear nada.
      detectSessionInUrl: false,
    },
  });
}
