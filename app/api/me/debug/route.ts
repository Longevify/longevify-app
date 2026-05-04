import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Endpoint de debug — usado pra diagnosticar problemas de sessão/auth/RLS.
 *
 * MODO DEFAULT (sem token): retorna apenas resposta minimalista
 * `{ authenticated: bool }`. Não expõe userId, email, headers,
 * profile data, nada que possa servir pra info-disclosure.
 *
 * MODO VERBOSE (?token={DEBUG_TOKEN}): retorna o dump completo de
 * cookies, headers, JWT details, profile query — útil pra
 * troubleshoot. Só funciona se a env var `DEBUG_TOKEN` estiver
 * setada no servidor E o ?token= bater.
 *
 * MODO LIVRE (sem env DEBUG_TOKEN setada): se a env não estiver
 * setada, qualquer um pode ver o verbose dump. Use isso só em
 * desenvolvimento. Em produção, sempre setar DEBUG_TOKEN.
 */
export async function GET(req: NextRequest) {
  const debugToken = process.env.DEBUG_TOKEN;
  const provided = req.nextUrl.searchParams.get("token");

  // Se DEBUG_TOKEN está setada e o token não bate, modo restrito.
  // Se DEBUG_TOKEN NÃO está setada (dev), modo verbose default.
  const verbose = !debugToken || provided === debugToken;

  const jwtResult = await getUserIdFromCookie();

  // Resposta minimalista: só "tem sessão? sim/não". Safe pra expor.
  if (!verbose) {
    return NextResponse.json(
      {
        authenticated: !!jwtResult.userId,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // ── A partir daqui, modo verbose (gated em prod via DEBUG_TOKEN) ──

  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  const cookieNames = all.map((c) => c.name);
  const supabaseAuthCookies = cookieNames.filter(
    (n) => n.startsWith("sb-") || n.includes("supabase"),
  );

  const supabaseAuthCookieDetails = all
    .filter((c) => c.name.startsWith("sb-") || c.name.includes("supabase"))
    .map((c) => ({
      name: c.name,
      valueLength: c.value.length,
      valuePrefix: c.value.slice(0, 30),
    }));

  const rawCookieHeader = req.headers.get("cookie") ?? "";
  const rawCookieHeaderLength = rawCookieHeader.length;
  const rawCookieNames = rawCookieHeader
    ? rawCookieHeader.split(";").map((c) => c.trim().split("=")[0])
    : [];

  // SAFE jwt projection — NUNCA inclui o token cru
  const jwtSafe = {
    userId: jwtResult.userId,
    email: jwtResult.email,
    expiresAt: jwtResult.expiresAt,
    hasAccessToken: !!jwtResult.accessToken,
    accessTokenLength: jwtResult.accessToken?.length ?? null,
    accessTokenPrefix: jwtResult.accessToken?.slice(0, 12) ?? null,
  };

  // Roda a mesma query que /perfil/page.tsx faz pra ver se RLS funciona
  let profileQueryResult: Record<string, unknown> = { skipped: "no userId" };
  if (jwtResult.userId) {
    try {
      const supabase = await createSupabaseWithJwt(jwtResult.accessToken);
      const { data, error, status, statusText } = await supabase
        .from("profiles")
        .select("first_name, last_name, height_cm, weight_kg, intake_completed_at")
        .eq("id", jwtResult.userId)
        .maybeSingle();
      profileQueryResult = {
        gotData: !!data,
        data,
        error: error
          ? { message: error.message, code: error.code, details: error.details }
          : null,
        httpStatus: status,
        httpStatusText: statusText,
        usedJwt: !!jwtResult.accessToken,
      };
    } catch (e) {
      profileQueryResult = {
        threw: true,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      cookies: {
        total: all.length,
        names: cookieNames,
        supabase_auth_cookies: supabaseAuthCookies,
        supabase_auth_details: supabaseAuthCookieDetails,
      },
      rawCookieHeader: {
        length: rawCookieHeaderLength,
        present: rawCookieHeaderLength > 0,
        names: rawCookieNames,
      },
      jwt: jwtSafe,
      profileQuery: profileQueryResult,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
