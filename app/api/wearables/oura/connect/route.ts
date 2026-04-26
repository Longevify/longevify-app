import { NextResponse, type NextRequest } from "next/server";
import { buildOuraAuthorizeUrl, ouraConfig } from "@/lib/wearables/oura";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { configured, redirectUri } = ouraConfig();
  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        error: "oura_not_configured",
        message:
          "Em breve - estamos finalizando a integração com a Oura. Configure OURA_CLIENT_ID e OURA_CLIENT_SECRET para habilitar.",
      },
      { status: 503 },
    );
  }

  const origin = req.nextUrl.origin;
  const finalRedirect =
    redirectUri || `${origin}/api/wearables/oura/callback`;

  const state = crypto.randomUUID();
  const url = buildOuraAuthorizeUrl(state, finalRedirect);

  const response = NextResponse.redirect(url);
  response.cookies.set("oura_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
