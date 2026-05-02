import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Refresh Supabase auth cookies inside the proxy so that RSC renders see a
 * fresh session. Returns the (possibly mutated) response plus the resolved
 * user so the proxy can decide whether to redirect unauthenticated visitors.
 *
 * In demo mode (no env vars) we return the response untouched and a null
 * user — the caller skips auth enforcement entirely.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });

  if (!isSupabaseConfigured()) {
    return { response, user: null as null | { id: string }, demo: true };
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set({ name, value, ...options });
        }
      },
    },
  });

  // Usa getSession() em vez de getUser(): só lê o JWT do cookie, sem
  // rebater na auth API e sem disparar refresh. Crítico pra evitar
  // race com chamadas paralelas de getUser nas páginas (RSC fetches
  // simultâneos rotacionam refresh tokens em paralelo, um deles falha
  // e clear da sessão).
  // Trade-off: tokens não refrescam aqui — o cliente browser fica
  // responsável por isso (createBrowserClient auto-refresca em background).
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { response, user: session?.user ?? null, demo: false };
}
