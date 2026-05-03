import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  recordToForm,
  type ProfileRecord,
  type ProfileFormShape,
} from "@/lib/profile/server";
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
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

  const { userId, email } = await getUserIdFromCookie();
  let initial: ProfileFormShape = recordToForm(null, email ?? "");
  let longevifyScore: number | null = null;
  let biologicalAge: number | null = null;
  let latestExamDate: string | null = null;
  let hasRealUser = false;

  if (userId) {
    hasRealUser = true;
    const cookieStore = await cookies();
    // Cliente Supabase pra query — RLS no DB valida o JWT do cookie.
    // setAll vazio: não queremos que supabase escreva cookies aqui
    // (evita o write que acontece em refresh proativo).
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* no-op — não escrever cookies aqui */
        },
      },
    });

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
