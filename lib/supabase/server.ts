import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";

/**
 * Server-side Supabase client for RSC / server actions / route handlers.
 * Returns `null` in demo mode. Uses Next 16 async `cookies()` API.
 *
 * Por que injeta o JWT manualmente: em alguns code paths o
 * `@supabase/ssr` não envia o `Authorization: Bearer` automaticamente
 * a partir dos cookies — o request sai só com a anon key, RLS bate
 * `auth.uid() IS NULL` e devolve zero linhas (sem erro). Forçar o
 * header garante que toda query carrega a identidade do user.
 *
 * Esse helper continua aceitando setAll real (ao contrário de
 * server-with-jwt.ts), pra preservar o comportamento esperado em
 * server actions onde queremos refresh de cookies.
 */
export async function getServerClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();

  // Pega o access_token do cookie pra injetar como Authorization header.
  // Best-effort: se não tiver cookie, segue o jogo (anon).
  const { accessToken } = await getUserIdFromCookie();

  const globalConfig = accessToken
    ? { headers: { Authorization: `Bearer ${accessToken}` } }
    : undefined;

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // `set` can fail when invoked from a Server Component — the proxy
          // handler refreshes the session separately, so this is safe to
          // ignore in that context.
        }
      },
    },
    ...(globalConfig ? { global: globalConfig } : {}),
  });
}
