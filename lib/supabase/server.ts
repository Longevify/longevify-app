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
 *
 * COOKIE OPTIONS: forçamos httpOnly+secure+sameSite=lax. O default
 * do @supabase/ssr 0.10.2 é httpOnly: FALSE, sem secure — Safari
 * trata cookies não-httpOnly como "JS-set client cookies" e ITP
 * pode deletá-los após algumas horas. httpOnly real evita esse
 * tracking-prevention e melhora segurança (XSS não pode ler).
 */
const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 ano (refresh_token TTL)
};

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
          // TEMP DEBUG: log + stack trace pra identificar QUEM tá
          // chamando setAll (especialmente deletes).
          const stack = new Error("setAll-stack").stack;
          // eslint-disable-next-line no-console
          console.log(
            `[supabase-setAll] writing ${cookiesToSet.length} cookies:`,
            cookiesToSet.map((c) => ({
              name: c.name,
              valueLength: c.value.length,
              maxAge: c.options?.maxAge,
              path: c.options?.path,
              httpOnly: c.options?.httpOnly,
              secure: c.options?.secure,
              sameSite: c.options?.sameSite,
            })),
            "STACK:",
            stack?.split("\n").slice(1, 12).join("\n"),
          );
          for (const { name, value, options } of cookiesToSet) {
            // Override defaults com nossos COOKIE_OPTIONS hardcoded.
            // supabase ssr passa options.maxAge baseado no tipo de
            // cookie (auth-token vs delete) — preservamos isso, mas
            // forçamos httpOnly/secure/sameSite/path nossos.
            cookieStore.set(name, value, {
              ...options,
              ...COOKIE_OPTIONS,
              // se supabase manda maxAge=0 (delete), respeita
              maxAge: options?.maxAge === 0 ? 0 : COOKIE_OPTIONS.maxAge,
            });
          }
        } catch (err) {
          // `set` can fail when invoked from a Server Component — the proxy
          // handler refreshes the session separately, so this is safe to
          // ignore in that context.
          // eslint-disable-next-line no-console
          console.error("[supabase-setAll] error:", err);
        }
      },
    },
    cookieOptions: COOKIE_OPTIONS,
  });
}
