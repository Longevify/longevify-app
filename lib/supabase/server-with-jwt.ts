import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Cria um Supabase server client cravando o access_token JWT como header
 * `Authorization: Bearer ...` global.
 *
 * Por que: o `createServerClient` do `@supabase/ssr` lê cookies e expõe
 * `auth.getSession()`, mas quando você só faz query (`.from().select()`)
 * sem chamar `auth.*` antes, ele NÃO injeta automaticamente o JWT no
 * header da request. Resultado: PostgREST recebe só a anon key, o RLS
 * vê `auth.uid() IS NULL`, e a query devolve zero linhas (sem erro,
 * porque RLS é silencioso).
 *
 * Esse helper força o cabeçalho — assim toda query carrega o JWT do
 * user e o RLS bate `auth.uid() = id` corretamente. setAll é no-op
 * porque não queremos escrever cookies aqui (evita race com outros
 * caminhos de auth).
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
        /* no-op — não escrevemos cookies aqui */
      },
    },
    global: {
      headers,
    },
  });
}
