import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * Lucas (2026-05-26): "[Sessão expirou] ainda tem espaço para melhorar.
 * Não estou conseguindo achar o nome dos meus amigos."
 *
 * Root cause: o JWT do Supabase tem TTL de 1h. Sem middleware de
 * refresh, qualquer server action chamada depois desse tempo falha
 * com "Sessão expirou". Era bug recorrente em Contatos, Search,
 * salvar treino, etc.
 *
 * Fix: middleware Supabase SSR padrão. Em cada request:
 *  1. Lê os cookies atuais
 *  2. Chama `supabase.auth.getUser()` — se access_token expirou mas
 *     refresh_token ainda é válido (TTL longo), refresca silenciosamente
 *  3. Escreve novos cookies na response
 *
 * A camada de auth tinha sido evitar `supabase.auth.getUser()` em
 * render paths (race condition de delete-cookie). Mas middleware NÃO
 * é render path — roda antes do render e completa antes. Não tem race.
 *
 * Os mesmos COOKIE_OPTIONS de getServerClient (httpOnly+secure+sameSite=lax)
 * pra ser consistente com login/recovery flows.
 */

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 ano (refresh_token TTL)
};

export async function middleware(request: NextRequest) {
  // Demo mode (sem Supabase configurado) — passa direto
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Atualiza request.cookies pra que handlers downstream leiam
        // os valores frescos. Recria response pra propagar.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        // Escreve no response com nossas options forçadas
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...options,
            ...COOKIE_OPTIONS,
            // Se supabase manda maxAge=0 (logout), respeita
            maxAge: options?.maxAge === 0 ? 0 : COOKIE_OPTIONS.maxAge,
          });
        }
      },
    },
  });

  // Triggera refresh se access_token expirou (silencioso se token ok).
  // NÃO usar getSession() — não refresca, só lê. getUser() é o que
  // dispara o refresh via /token endpoint do Supabase.
  await supabase.auth.getUser().catch(() => {
    // Ignore — se refresh falhar (refresh_token inválido), a próxima
    // chamada autenticada vai retornar "Sessão expirou" naturalmente
    // via getUserIdFromCookie.
  });

  return response;
}

/**
 * Matcher: roda em quase tudo, exceto:
 *  - Static files (_next, favicon, images)
 *  - Service worker (sw.js, workbox-*)
 *  - Auth callbacks (que TÊM que controlar cookies eles mesmos)
 *
 * Source: pattern padrão do template Supabase + ajustes pra PWA do
 * Longevify (sw.js + manifest).
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - sw.js (service worker), workbox- (workbox chunks), manifest.webmanifest
     * - api/auth/callback (Supabase OAuth callback — controla cookies próprio)
     * - public assets (images, fonts)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sw.js|workbox-|manifest.webmanifest|auth/recovery|auth/callback|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)).*)",
  ],
};
