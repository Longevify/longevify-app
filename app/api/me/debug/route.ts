import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserIdFromCookie } from "@/lib/auth/jwt";

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
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
