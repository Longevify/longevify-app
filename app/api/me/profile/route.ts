import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Retorna o perfil do user logado pra hidratar o /perfil client-side
 * quando o SSR não conseguir.
 *
 * Estratégia ZERO-AUTH-SUPABASE: lê o user_id direto do cookie de auth
 * (decodifica JWT sem chamar supabase.auth.*). Evita refresh + race
 * condition que estava clearando cookies em produção.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { userId, email } = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "no-session-cookie" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Cria supabase client SEM tocar em auth — só pra fazer query.
  // RLS valida o JWT da request via cookies.
  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // no-op — não queremos que supabase escreva cookies aqui
      },
    },
  });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, phone, cpf, height_cm, weight_kg, blood_type, city, uf, occupation, language, goals, conditions, medications, allergies, birth_date, chronological_age",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, debug: { userId, hasEmail: !!email } },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      profile: {
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        email: email ?? "",
        phone: profile?.phone ?? "",
        chronologicalAge: profile?.chronological_age ?? 0,
        cpf: profile?.cpf ?? "",
        height: profile?.height_cm ? Number(profile.height_cm) : 0,
        weight: profile?.weight_kg ? Number(profile.weight_kg) : 0,
        bloodType: profile?.blood_type ?? "",
        city: profile?.city ?? "",
        uf: profile?.uf ?? "",
        occupation: profile?.occupation ?? "",
        goals: profile?.goals ?? "",
        conditions: profile?.conditions ?? "",
        medications: profile?.medications ?? "",
        allergies: profile?.allergies ?? "",
        language: profile?.language ?? "Português (BR)",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
