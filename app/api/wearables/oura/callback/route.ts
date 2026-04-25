import { NextResponse, type NextRequest } from "next/server";
import { exchangeOuraCode, ouraConfig } from "@/lib/wearables/oura";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { configured, redirectUri } = ouraConfig();
  if (!configured) {
    return NextResponse.json(
      { ok: false, error: "oura_not_configured" },
      { status: 503 },
    );
  }

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("oura_oauth_state")?.value;

  if (!code || !state) {
    return NextResponse.redirect(`${url.origin}/wearables?oura_error=missing_code`);
  }
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${url.origin}/wearables?oura_error=state_mismatch`);
  }

  const finalRedirect =
    redirectUri || `${url.origin}/api/wearables/oura/callback`;

  try {
    const token = await exchangeOuraCode(code, finalRedirect);
    // Em modo demo (sem Supabase), devolvemos o token via fragment para o
    // browser persistir em localStorage. Em produção, salvaremos via Supabase.
    const successUrl = new URL(`${url.origin}/wearables`);
    successUrl.searchParams.set("oura_connected", "1");
    const redirect = NextResponse.redirect(
      `${successUrl.toString()}#access_token=${encodeURIComponent(token.access_token)}&refresh_token=${encodeURIComponent(token.refresh_token ?? "")}&expires_in=${token.expires_in ?? 0}`,
    );
    redirect.cookies.delete("oura_oauth_state");
    return redirect;
  } catch (err) {
    const message = err instanceof Error ? err.message : "exchange_failed";
    return NextResponse.redirect(
      `${url.origin}/wearables?oura_error=${encodeURIComponent(message)}`,
    );
  }
}
