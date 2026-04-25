import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/signup",
  "/reset-password",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
  return false;
}

/**
 * Next 16 proxy (formerly `middleware.ts`). Enforces auth for all matched
 * routes when Supabase is configured; in demo mode it refreshes nothing
 * and lets every request through so the app keeps working against mock data.
 */
export async function proxy(request: NextRequest) {
  const { response, user, demo } = await updateSession(request);
  if (demo) return response;

  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return response;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on every request except Next internals, static assets, and API routes
  // (API routes validate auth internally via getServerClient()).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
