import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * Supabase redirects the user here after email confirmation, magic link click,
 * or password recovery.
 *
 * Aceita DOIS formatos de email do Supabase:
 *  - Formato legado/PKCE: `?code=...` → exchangeCodeForSession
 *  - Formato moderno (OTP): `?token_hash=...&type=email|signup|recovery|...`
 *    → verifyOtp(type, token_hash)
 *
 * Após sucesso:
 *   - type=recovery → /update-password (forma nova senha)
 *   - signup/email confirmation → /login?confirmed=1 (mostra banner
 *     "email validado, faça login" — evita auto-login silencioso que
 *     pode falhar e deixar user em estado zumbi)
 *   - magiclink → /home (auto login esperado)
 *
 * Errors do Supabase (?error=access_denied&error_code=otp_expired etc)
 * vão pra /login com query param pra form mostrar mensagem.
 *
 * IMPORTANTE: client criado aqui (em vez de getServerClient) pra que
 * cookies escritos pelo exchange/verifyOtp sejam injetados no
 * NextResponse.redirect — caso contrário cookies vão pro cookie store
 * implícito do Next e NÃO são copiados pra o redirect response.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const errorCode = url.searchParams.get("error_code");
  const errorDescription = url.searchParams.get("error_description");

  // Forward auth errors to /login (link expirado, denied access, etc)
  if (errorCode || errorDescription) {
    url.pathname = "/login";
    url.search = "";
    if (errorCode) url.searchParams.set("error", errorCode);
    if (errorDescription)
      url.searchParams.set("error_description", errorDescription);
    return NextResponse.redirect(url);
  }

  // Decide pra onde redirecionar baseado no tipo do link.
  // Signup/email confirmation: vai pra /login com flag confirmed=1
  // (banner "email validado") — auto-login é arriscado se a sessão não
  // persistir corretamente (vimos isso no bug do prefetch /logout).
  // Recovery: /update-password (precisa setar nova senha).
  // Magiclink: /home (auto-login esperado).
  const isEmailConfirmation =
    type === "signup" || type === "email" || type === "email_change";
  const isRecovery = type === "recovery";
  const next =
    url.searchParams.get("next") ??
    (isRecovery
      ? "/update-password"
      : isEmailConfirmation
        ? "/login?confirmed=1"
        : "/home");

  url.pathname = next.split("?")[0];
  url.search = "";
  // Re-aplica query params do `next` se tiver
  const nextQuery = next.includes("?") ? next.split("?")[1] : "";
  if (nextQuery) {
    for (const [k, v] of new URLSearchParams(nextQuery).entries()) {
      url.searchParams.set(k, v);
    }
  }
  const redirectResponse = NextResponse.redirect(url);

  if (!isSupabaseConfigured()) return redirectResponse;
  if (!code && !tokenHash) return redirectResponse;

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

  if (code) {
    // Formato legado/PKCE
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    // Formato moderno: verifyOtp pra confirmação de email/recovery
    // type pode ser: signup | email | email_change | recovery | invite | magiclink
    const otpType = type as
      | "signup"
      | "email"
      | "email_change"
      | "recovery"
      | "invite"
      | "magiclink";
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
  }

  return redirectResponse;
}
