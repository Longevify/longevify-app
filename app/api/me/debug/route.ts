import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Endpoint de debug — mostra o que o servidor vê dos cookies de auth +
 * roda a mesma query que /perfil/page.tsx faz. Útil pra diagnosticar
 * problemas de sessão/RLS.
 *
 * HARDENING:
 * - NUNCA retorna o `accessToken` cru — só `accessTokenLength` e
 *   `accessTokenPrefix` (primeiros 12 chars). Se alguém leakar o JSON,
 *   o token continua privado.
 * - Gate opcional via env `DEBUG_TOKEN`: se setado, requer
 *   `?token=...` matching. Se não setado, endpoint roda livre
 *   (assumindo que só é útil pra dev/staging).
 *
 * TODO: remover esse endpoint quando o bug de auth ficar estável e
 * a gente não precisar mais investigar produção.
 */
export async function GET(req: NextRequest) {
  // Gate opcional — se DEBUG_TOKEN tá setado, exige match
  const debugToken = process.env.DEBUG_TOKEN;
  if (debugToken) {
    const provided = req.nextUrl.searchParams.get("token");
    if (provided !== debugToken) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

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

  const jwtResult = await getUserIdFromCookie();

  // SAFE jwt projection — NUNCA inclui o token cru
  const jwtSafe = {
    userId: jwtResult.userId,
    email: jwtResult.email,
    expiresAt: jwtResult.expiresAt,
    hasAccessToken: !!jwtResult.accessToken,
    accessTokenLength: jwtResult.accessToken?.length ?? null,
    accessTokenPrefix: jwtResult.accessToken?.slice(0, 12) ?? null,
  };

  // Roda a mesma query que /perfil/page.tsx faz pra ver se retorna data.
  // Com JWT explícito no header Authorization — sem isso o RLS bloqueia
  // silenciosamente.
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
      jwt: jwtSafe,
      profileQuery: profileQueryResult,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
