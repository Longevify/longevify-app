import { NextResponse, type NextRequest } from "next/server";
import { buildWhoopAuthorizeUrl, whoopConfig } from "@/lib/wearables/whoop";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { configured, redirectUri } = whoopConfig();
  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        error: "whoop_not_configured",
        message:
          "Em breve - estamos finalizando a integração com o Whoop. Configure WHOOP_CLIENT_ID e WHOOP_CLIENT_SECRET para habilitar.",
      },
      { status: 503 },
    );
  }

  const origin = req.nextUrl.origin;
  const finalRedirect =
    redirectUri || `${origin}/api/wearables/whoop/callback`;

  const state = crypto.randomUUID();
  const url = buildWhoopAuthorizeUrl(state, finalRedirect);

  const response = NextResponse.redirect(url);
  response.cookies.set("whoop_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
