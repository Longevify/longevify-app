import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * Supabase redirects the user here after email confirmation, magic link click,
 * or password recovery. We swap the OAuth `code` for a session cookie and send
 * the user to the right place based on the flow type.
 *
 *   type=recovery → /update-password (set new password)
 *   type=invite/signup/magiclink/anything else → /home (default)
 *
 * Errors from Supabase (?error=access_denied&error_code=otp_expired etc.) are
 * forwarded to /login with a query param so the form can show a message.
 *
 * IMPORTANTE: O client é criado aqui (em vez de usar getServerClient) para que
 * os cookies escritos por exchangeCodeForSession sejam injetados diretamente no
 * NextResponse.redirect — se usarmos getServerClient(), os cookies vão para o
 * cookie store implícito do Next e NÃO são copiados para o redirect response,
 * fazendo a sessão se perder imediatamente após o callback.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const errorCode = url.searchParams.get("error_code");
  const errorDescription = url.searchParams.get("error_description");
  const next =
    url.searchParams.get("next") ??
    (type === "recovery" ? "/update-password" : "/home");

  // Forward auth errors to /login (e.g. expired link, denied access).
  if (errorCode || errorDescription) {
    url.pathname = "/login";
    url.search = "";
    if (errorCode) url.searchParams.set("error", errorCode);
    if (errorDescription)
      url.searchParams.set("error_description", errorDescription);
    return NextResponse.redirect(url);
  }

  url.pathname = next;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);

  if (code && isSupabaseConfigured()) {
    // Criamos o client apontando os cookies diretamente para o redirect response,
    // assim exchangeCodeForSession escreve o token de sessão no response que volta
    // pro browser — garantindo persistência da sessão após o callback.
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

    await supabase.auth.exchangeCodeForSession(code);
  }

  return redirectResponse;
}
