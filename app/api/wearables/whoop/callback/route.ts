import { NextResponse, type NextRequest } from "next/server";
import { exchangeWhoopCode, whoopConfig } from "@/lib/wearables/whoop";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { configured, redirectUri } = whoopConfig();
  if (!configured) {
    return NextResponse.json(
      { ok: false, error: "whoop_not_configured" },
      { status: 503 },
    );
  }

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("whoop_oauth_state")?.value;

  if (!code || !state) {
    return NextResponse.redirect(`${url.origin}/wearables?whoop_error=missing_code`);
  }
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${url.origin}/wearables?whoop_error=state_mismatch`);
  }

  const finalRedirect =
    redirectUri || `${url.origin}/api/wearables/whoop/callback`;

  try {
    const token = await exchangeWhoopCode(code, finalRedirect);
    const successUrl = new URL(`${url.origin}/wearables`);
    successUrl.searchParams.set("whoop_connected", "1");
    const redirect = NextResponse.redirect(
      `${successUrl.toString()}#access_token=${encodeURIComponent(token.access_token)}&refresh_token=${encodeURIComponent(token.refresh_token ?? "")}&expires_in=${token.expires_in ?? 0}`,
    );
    redirect.cookies.delete("whoop_oauth_state");
    return redirect;
  } catch (err) {
    const message = err instanceof Error ? err.message : "exchange_failed";
    return NextResponse.redirect(
      `${url.origin}/wearables?whoop_error=${encodeURIComponent(message)}`,
    );
  }
}
