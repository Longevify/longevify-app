import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Supabase redirects the user here after email confirmation or magic link
 * click. We swap the OAuth `code` for a session cookie and send the user on.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/home";

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
