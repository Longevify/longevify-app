import { getCurrentUser } from "@/lib/auth/current-user";
import { recordToForm, type ProfileRecord } from "@/lib/profile/server";
import { getServerClient } from "@/lib/supabase/server";
import { PerfilForm } from "./perfil-form";

export default async function PerfilPage() {
  const user = await getCurrentUser();

  // Demo: pré-preenche com PATIENT mock + retorna sem hit no Supabase
  if (user.isDemo) {
    return (
      <PerfilForm
        initial={{
          ...recordToForm(null, user.email ?? "joao.silva@longevify.co"),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email ?? "joao.silva@longevify.co",
          chronologicalAge: user.chronologicalAge ?? 0,
        }}
        isDemo={true}
        longevifyScore={null}
        biologicalAge={null}
        latestExamDate={null}
      />
    );
  }

  // User real — consolidamos todas as queries em UM client + Promise.all.
  // Múltiplas instâncias de getServerClient + getUser concorrentes podem
  // causar race no refresh do access token e deslogar a sessão.
  const supabase = await getServerClient();
  let initial = recordToForm(null, user.email ?? "");
  let longevifyScore: number | null = null;
  let biologicalAge: number | null = null;
  let latestExamDate: string | null = null;

  if (supabase) {
    const [profileRes, scoreRes, examRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "first_name, last_name, phone, cpf, height_cm, weight_kg, blood_type, city, uf, occupation, language, goals, conditions, medications, allergies, birth_date, chronological_age",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("longevify_scores")
        .select("score, biological_age")
        .eq("patient_id", user.id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("exams")
        .select("taken_at")
        .eq("patient_id", user.id)
        .eq("status", "published")
        .order("taken_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    initial = recordToForm(
      profileRes.data as Partial<ProfileRecord> | null,
      user.email ?? "",
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
      isDemo={false}
      longevifyScore={longevifyScore}
      biologicalAge={biologicalAge}
      latestExamDate={latestExamDate}
    />
  );
}
