import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * Callback dedicado pra fluxo de recovery de senha. O Supabase manda o user
 * pra cá com `?code=...` depois que ele clica no link do email. Trocamos
 * o code por uma sessão temp e redirecionamos pra /update-password.
 *
 * Por que dedicado e não /auth/callback?
 *   - O Supabase às vezes stripa query params extras do redirect_to
 *   - Por isso, distinguir "recovery" via path (não via ?type=recovery)
 *     é mais robusto.
 *   - Diferenciar a rota também deixa explícito que essa só serve pra
 *     password reset (auditoria/security review fica óbvia).
 *
 * IMPORTANTE: o client é criado aqui (em vez de getServerClient) pra que
 * os cookies do exchange sejam injetados direto no NextResponse.redirect
 * — sem isso, o token de sessão se perde no redirect.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const errorCode = url.searchParams.get("error_code");
  const errorDescription = url.searchParams.get("error_description");

  // Erros do Supabase (link expirado, OTP usado, etc.) → vão pro /login
  // com banner explicativo.
  if (errorCode || errorDescription) {
    url.pathname = "/login";
    url.search = "";
    if (errorCode) url.searchParams.set("error", errorCode);
    if (errorDescription)
      url.searchParams.set("error_description", errorDescription);
    return NextResponse.redirect(url);
  }

  // Sucesso → /update-password com a sessão temp setada nos cookies.
  url.pathname = "/update-password";
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);

  if (code && isSupabaseConfigured()) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            redirectResponse.cookies.set({ name, value, ...options });
          }
        },
      },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Falhou o exchange — manda pro login com erro
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("error", "recovery_exchange_failed");
      url.searchParams.set("error_description", error.message);
      return NextResponse.redirect(url);
    }
  }

  return redirectResponse;
}
