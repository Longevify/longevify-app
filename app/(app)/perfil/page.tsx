import { getCurrentUser } from "@/lib/auth/current-user";
import { loadProfileForCurrentUser, recordToForm } from "@/lib/profile/server";
import { getServerClient } from "@/lib/supabase/server";
import { PerfilForm } from "./perfil-form";

export default async function PerfilPage() {
  const user = await getCurrentUser();

  // Server-side data fetch — em demo, retorna form vazio (cliente hidrata
  // do localStorage); em modo real, carrega do Supabase.
  let initial = recordToForm(null, user.email ?? "");
  if (!user.isDemo) {
    const loaded = await loadProfileForCurrentUser();
    if (loaded) initial = loaded.form;
  } else {
    // Demo: pré-preenche com dados básicos do PATIENT mock pra UI fazer sentido.
    initial = {
      ...initial,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email ?? "joao.silva@longevify.co",
      chronologicalAge: user.chronologicalAge ?? 0,
    };
  }

  // Stats laterais (Score, Idade biológica, último exame).
  let longevifyScore: number | null = null;
  let biologicalAge: number | null = null;
  let latestExamDate: string | null = null;

  if (!user.isDemo) {
    const supabase = await getServerClient();
    if (supabase) {
      const [scoreRes, examRes] = await Promise.all([
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
      longevifyScore = scoreRes.data?.score ?? null;
      biologicalAge = scoreRes.data?.biological_age
        ? Number(scoreRes.data.biological_age)
        : null;
      latestExamDate = examRes.data?.taken_at ?? null;
    }
  }

  return (
    <PerfilForm
      initial={initial}
      isDemo={user.isDemo}
      longevifyScore={longevifyScore}
      biologicalAge={biologicalAge}
      latestExamDate={latestExamDate}
    />
  );
}
