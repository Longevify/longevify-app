import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Endpoint usado pelo client pra "se auto-curar" quando o SSR renderiza
 * em modo demo mas o user TEM sessão válida (race no proxy/middleware).
 *
 * Retorna o perfil completo do user logado em camelCase, pronto pra
 * preencher o form do /perfil. 401 se não autenticado de verdade.
 */
export async function GET() {
  const supabase = await getServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Tenta getSession primeiro (não dispara refresh, sem race)
  let userId: string | null = null;
  let userEmail: string | null = null;

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    userId = sessionData.session.user.id;
    userEmail = sessionData.session.user.email ?? null;
  } else {
    // Fallback pro getUser que pode refrescar
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      userId = userData.user.id;
      userEmail = userData.user.email ?? null;
    }
  }

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "not-authenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, phone, cpf, height_cm, weight_kg, blood_type, city, uf, occupation, language, goals, conditions, medications, allergies, birth_date, chronological_age",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      profile: {
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        email: userEmail ?? "",
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
