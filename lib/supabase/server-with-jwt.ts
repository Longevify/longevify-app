import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Cria um Supabase REST client (sem ssr / sem cookies handler) com o
 * access_token JWT como header `Authorization: Bearer ...`.
 *
 * REWRITE TOTAL — antes usava createServerClient do @supabase/ssr
 * com cookies handler. Mas mesmo com setAll no-op, o supabase ssr
 * fazia LEITURAS de cookies via getAll() em pontos imprevisíveis
 * (validação de sessão interna, mesmo com persistSession:false),
 * e em Next 16 com múltiplas chamadas paralelas a cookies(), isso
 * podia causar race conditions onde Vercel/Next emitia Set-Cookie
 * clearing pra "limpar" o estado supostamente inconsistente.
 *
 * NOVA ABORDAGEM: usa o `createClient` puro do @supabase/supabase-js
 * (não-ssr), passando o JWT diretamente. ZERO interação com
 * cookies. ZERO chance de race com cookie store. Auth é puramente
 * via Authorization header. RLS valida no Postgres.
 *
 * `auth: { persistSession: false, autoRefreshToken: false }` desliga
 * QUALQUER tentativa de gerenciar sessão automaticamente.
 *
 * `accessToken` vem extraído via getUserIdFromCookie. Se for null,
 * client é criado sem auth header — query vai com anon key e RLS
 * vai bloquear (auth.uid() IS NULL).
 */
export async function createSupabaseWithJwt(accessToken: string | null) {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers,
    },
  });
}
