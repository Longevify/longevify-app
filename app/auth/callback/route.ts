import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Supabase redirects the user here after email confirmation, magic link click,
 * or password recovery. We swap the OAuth `code` for a session cookie and send
 * the user to the right place based on the flow type.
 *
 *   type=recovery → /update-password (set new password)
 *   type=invite/signup/magiclink/anything else → /home (default)
 *
 * Errors from Supabase (?error=access_denied&error_code=otp_expired etc.) are
 * forwarded to /login with a query param so the form can show a message.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const errorCode = url.searchParams.get("error_code");
  const errorDescription = url.searchParams.get("error_description");
  const next =
    url.searchParams.get("next") ??
    (type === "recovery" ? "/update-password" : "/home");

  // Forward auth errors to /login (e.g. expired link, denied access).
  if (errorCode || errorDescription) {
    url.pathname = "/login";
    url.search = "";
    if (errorCode) url.searchParams.set("error", errorCode);
    if (errorDescription)
      url.searchParams.set("error_description", errorDescription);
    return NextResponse.redirect(url);
  }

  if (code && isSupabaseConfigured()) {
    const supabase = await getServerClient();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }

  url.pathname = next;
  url.search = "";
  return NextResponse.redirect(url);
}
