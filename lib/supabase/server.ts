import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Server-side Supabase client for RSC / server actions / route handlers.
 * Returns `null` in demo mode. Uses Next 16 async `cookies()` API.
 *
 * IMPORTANTE — não chame outro helper que faça `await cookies()` antes
 * de criar esse client. Em Next 16, ler cookies múltiplas vezes em
 * uma server action quebra silenciosamente o canal de escrita do
 * `setAll` (setado pelo supabase ssr no signInWithPassword), e o
 * Set-Cookie nunca chega ao browser. Esse helper FICA leve de
 * propósito. Pra queries que precisam de JWT explícito (RLS read
 * paths que não passam por supabase.auth.*), usa
 * `createSupabaseWithJwt()` em `lib/supabase/server-with-jwt.ts`.
 */
export async function getServerClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();

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
  });
}
