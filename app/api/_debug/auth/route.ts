import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerClient } from "@/lib/supabase/server";

/**
 * Endpoint de debug temporário pra entender por que sessões estão sumindo.
 * Retorna o estado server-side de cookies + sessão Supabase.
 *
 * Não expõe credenciais — só presença/nomes de cookies + boolean da sessão.
 */
export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Lista nomes dos cookies (não valores) + se cada um existe
  const cookieNames = allCookies.map((c) => c.name);
  const supabaseAuthCookies = cookieNames.filter(
    (n) => n.startsWith("sb-") || n.includes("supabase"),
  );

  let sessionInfo: Record<string, unknown> = { hasSupabaseClient: false };

  const supabase = await getServerClient();
  if (supabase) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    sessionInfo = {
      hasSupabaseClient: true,
      session: {
        exists: !!sessionData?.session,
        user_id: sessionData?.session?.user?.id ?? null,
        email: sessionData?.session?.user?.email ?? null,
        expires_at: sessionData?.session?.expires_at ?? null,
        error: sessionError?.message ?? null,
      },
      user: {
        exists: !!userData?.user,
        user_id: userData?.user?.id ?? null,
        email: userData?.user?.email ?? null,
        error: userError?.message ?? null,
      },
    };
  }

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      cookies: {
        total: allCookies.length,
        names: cookieNames,
        supabase_auth_cookies: supabaseAuthCookies,
      },
      auth: sessionInfo,
    },
    {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
      },
    },
  );
}
