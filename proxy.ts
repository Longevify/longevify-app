import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/signup",
  "/reset-password",
  // /update-password é o destino do email de recovery — o user chega lá
  // SEM sessão (com `?code=...` pra trocar por sessão temp) e precisa
  // poder ver a página pra digitar a nova senha.
  "/update-password",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
  return false;
}

/**
 * Next 16 proxy (formerly `middleware.ts`). Enforces auth for all matched
 * routes when Supabase is configured; in demo mode it refreshes nothing
 * and lets every request through so the app keeps working against mock data.
 */
export async function proxy(request: NextRequest) {
  const { response, user, demo } = await updateSession(request);

  // Encaminha o pathname pro Server Component conseguir tomar decisões
  // de redirect baseadas em rota (ex: forçar onboarding no primeiro login).
  const { pathname } = request.nextUrl;
  response.headers.set("x-pathname", pathname);

  if (demo) return response;

  if (isPublic(pathname)) return response;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    // Copiar cookies do response original pro redirect — sem isso, o token
    // refreshado por updateSession() é descartado e a sessão parece sempre
    // expirada, causando o loop de "pede pra logar de novo".
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
    return redirectResponse;
  }

  return response;
}

export const config = {
  // Run on every request except Next internals, static assets, and API routes
  // (API routes validate auth internally via getServerClient()).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
