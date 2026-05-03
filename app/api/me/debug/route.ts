import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Endpoint público de debug — mostra o que o servidor vê dos cookies de
 * auth. Não expõe valores de tokens, só nomes + booleans + user_id.
 */
export async function GET() {
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

  // Roda a mesma query que /perfil/page.tsx faz pra ver se retorna data.
  // AGORA com JWT explícito no header Authorization — sem isso o RLS
  // bloqueia silenciosamente.
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
      jwt: jwtResult,
      profileQuery: profileQueryResult,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
