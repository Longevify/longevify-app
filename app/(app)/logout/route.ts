import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Sign-out endpoint.
 *
 * IMPORTANTE: GET é INERTE (só faz redirect pra /login sem deslogar).
 * Isso é CRÍTICO porque Next.js prefetch + `<Link href="/logout">`
 * fazem GET silencioso quando o link aparece no DOM ou no hover.
 * Antes esse GET disparava signOut() e deletava cookies em background
 * — usuário "estava logado" mas o servidor já tinha clearado a sessão
 * sem ele saber.
 *
 * Logout REAL acontece via POST. ProfileMenu usa <form method="post">
 * (nunca <Link href="/logout">) pra evitar prefetch silencioso.
 *
 * Forma simples de invocar: navegar pra /logout via GET DEPOIS de
 * confirmar a intenção (porque o GET agora é inerte, é seguro como
 * "fallback" — não desloga, só redireciona pra /login). Botão de
 * logout deve usar form POST ou fetch POST.
 */
async function signOutAndRedirect(request: NextRequest) {
  if (isSupabaseConfigured()) {
    const supabase = await getServerClient();
    await supabase?.auth.signOut();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const response = NextResponse.redirect(url);
  // Deleta o cookie diretamente na response do redirect — mais confiável do
  // que cookies().delete() que pode não ser flushed quando o Route Handler
  // retorna NextResponse.redirect(). Sem isso, o demo cookie sobrevive e
  // current-user.ts devolve DEMO_USER mesmo depois do logout.
  response.cookies.set("longevify_demo_session", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}

export async function GET(request: NextRequest) {
  // GET é inerte — apenas redireciona pra /login sem clearing nenhuma
  // sessão. Previne que prefetch do Next App Router desloga user.
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
