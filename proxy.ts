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
 * Next 16 proxy (formerly `middleware.ts`).
 *
 * Estratégia: SEMPRE deixa passar. updateSession() ainda roda pra refrescar
 * tokens da Supabase (mantém sessão viva), mas não bloqueia rotas baseado em
 * auth. As páginas individuais decidem o que mostrar via `getCurrentUser()`
 * — que retorna DEMO_USER quando não há sessão.
 *
 * Por que? O bounce-to-/login causava loops perceptíveis pro user ("logar 2
 * vezes") por causa de races no refresh de tokens em RSC fetches paralelos.
 * RLS protege os dados no DB, então deixar páginas renderizarem sem auth
 * só mostra UI vazia/demo — nada vaza.
 */
export async function proxy(request: NextRequest) {
  const { response } = await updateSession(request);

  // Encaminha o pathname pro Server Component conseguir tomar decisões
  // de redirect baseadas em rota (ex: forçar onboarding no primeiro login).
  const { pathname } = request.nextUrl;
  response.headers.set("x-pathname", pathname);

  return response;
}

export const config = {
  // Run on every request except Next internals, static assets, and API routes
  // (API routes validate auth internally via getServerClient()).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
