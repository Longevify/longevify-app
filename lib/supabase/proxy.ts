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
  // PROXY ZERO-AUTH: não chama nenhuma operação supabase. Cada chamada
  // server-side a getSession/getUser pode disparar refresh de token,
  // que em race com outras chamadas paralelas (page render, API routes)
  // CLEAR cookies de sessão silenciosamente. Bug observado em produção
  // múltiplas vezes.
  //
  // Solução: proxy só passa request adiante. Cookies de auth ficam
  // intactos. Pages e APIs chamam getSession on-demand UMA vez cada.
  // Refresh de tokens fica delegado pro createBrowserClient client-side
  // (que tem locking interno e não compete com server-side).
  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });
  void isSupabaseConfigured; // silence unused warning
  return { response, user: null as null | { id: string }, demo: false };
}
