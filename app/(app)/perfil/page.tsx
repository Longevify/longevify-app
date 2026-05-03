import {
  recordToForm,
  type ProfileRecord,
  type ProfileFormShape,
} from "@/lib/profile/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { PATIENT } from "@/lib/mock-data";
import { PerfilForm } from "./perfil-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Estratégia ZERO-AUTH-SUPABASE: extrai o user_id direto do cookie JWT
 * sem chamar supabase.auth.* — não dispara refresh, não tem race com
 * outras chamadas paralelas. Eliminava o bug onde a sessão sumia ao
 * abrir /perfil.
 */
export default async function PerfilPage() {
  if (!isSupabaseConfigured()) {
    // Modo demo legítimo (dev sem env vars) — mock UI
    return (
      <PerfilForm
        initial={{
          ...recordToForm(null, "joao.silva@longevify.co"),
          firstName: PATIENT.firstName,
          lastName: PATIENT.lastName,
          email: "joao.silva@longevify.co",
          chronologicalAge: PATIENT.chronologicalAge,
        }}
        isDemo={true}
        longevifyScore={PATIENT.longevifyScore}
        biologicalAge={PATIENT.biologicalAge}
        latestExamDate={PATIENT.latestExamDate}
      />
    );
  }

  const { userId, email, accessToken } = await getUserIdFromCookie();
  let initial: ProfileFormShape = recordToForm(null, email ?? "");
  let longevifyScore: number | null = null;
  let biologicalAge: number | null = null;
  let latestExamDate: string | null = null;
  let hasRealUser = false;

  if (userId) {
    hasRealUser = true;
    // Supabase client com JWT explícito — sem isso o `.from().select()`
    // sai sem Authorization header, RLS bloqueia silenciosamente, e a
    // query devolve null mesmo com profile existindo no DB.
    const supabase = await createSupabaseWithJwt(accessToken);

    const [profileRes, scoreRes, examRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "first_name, last_name, phone, cpf, height_cm, weight_kg, blood_type, city, uf, occupation, language, goals, conditions, medications, allergies, birth_date, chronological_age",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("longevify_scores")
        .select("score, biological_age")
        .eq("patient_id", userId)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("exams")
        .select("taken_at")
        .eq("patient_id", userId)
        .eq("status", "published")
        .order("taken_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    initial = recordToForm(
      profileRes.data as Partial<ProfileRecord> | null,
      email ?? "",
    );
    longevifyScore = scoreRes.data?.score ?? null;
    biologicalAge = scoreRes.data?.biological_age
      ? Number(scoreRes.data.biological_age)
      : null;
    latestExamDate = examRes.data?.taken_at ?? null;
  }

  return (
    <PerfilForm
      initial={initial}
      isDemo={!hasRealUser}
      longevifyScore={longevifyScore}
      biologicalAge={biologicalAge}
      latestExamDate={latestExamDate}
    />
  );
}
