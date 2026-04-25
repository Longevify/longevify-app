import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Refresh Supabase auth cookies inside the proxy so that RSC renders see a
 * fresh session. Returns the (possibly mutated) response plus the resolved
 * user so the proxy can decide whether to redirect unauthenticated visitors.
 *
 * In demo mode (no env vars) we return the response untouched and a null
 * user — the caller skips auth enforcement entirely.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });

  if (!isSupabaseConfigured()) {
    return { response, user: null as null | { id: string }, demo: true };
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set({ name, value, ...options });
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user, demo: false };
}
