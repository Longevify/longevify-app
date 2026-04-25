import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

async function signOutAndRedirect(request: NextRequest) {
  if (isSupabaseConfigured()) {
    const supabase = await getServerClient();
    await supabase?.auth.signOut();
  }
  const store = await cookies();
  store.delete("longevify_demo_session");
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
