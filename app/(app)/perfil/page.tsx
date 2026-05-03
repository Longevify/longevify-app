import { recordToForm, type ProfileRecord } from "@/lib/profile/server";
import { getServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PATIENT } from "@/lib/mock-data";
import { PerfilForm } from "./perfil-form";

// Sem cache de página: força re-render server-side a cada request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PerfilPage() {
  // Estratégia: sempre tenta buscar dados do Supabase com qualquer cookie
  // disponível. Não usa getCurrentUser pra evitar inconsistências do
  // React.cache entre layout e page (vimos casos onde layout vê o user
  // logado mas a page não — bug conhecido em alguns casos do Next + RSC).
  //
  // Caminho A: Supabase NÃO configurado → modo demo legítimo, mostra mock.
  // Caminho B: Supabase configurado mas sem sessão → form vazio + self-heal.
  // Caminho C: Supabase configurado COM sessão → busca direto, renderiza real.

  if (!isSupabaseConfigured()) {
    // Demo de verdade — sem backend, mostra dados de demonstração.
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

  // Supabase configurado: tenta buscar diretamente (sem passar por
  // getCurrentUser). Lê cookies fresh; se não tiver sessão, query falha
  // silenciosamente e form fica vazio — self-heal client-side preenche.
  const supabase = await getServerClient();
  let initial = recordToForm(null, "");
  let longevifyScore: number | null = null;
  let biologicalAge: number | null = null;
  let latestExamDate: string | null = null;
  let hasRealUser = false;

  if (supabase) {
    // CRÍTICO: usar getSession, NÃO getUser. getUser bate na auth API
    // pra validar o JWT e PODE disparar refresh — em race com outros
    // refreshes (proxy, API endpoints, prefetches) o supabase-ssr clear
    // os cookies de sessão silenciosamente. Resultado: cada hit em
    // /perfil deslogava o user.
    // getSession só lê o access_token do cookie. RLS no DB valida a
    // assinatura do JWT — sem comprometer segurança.
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    const userEmail = sessionData?.session?.user?.email ?? "";

    if (userId) {
      hasRealUser = true;
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
        userEmail,
      );
      longevifyScore = scoreRes.data?.score ?? null;
      biologicalAge = scoreRes.data?.biological_age
        ? Number(scoreRes.data.biological_age)
        : null;
      latestExamDate = examRes.data?.taken_at ?? null;
    }
  }

  // hasRealUser=false → form fica com initial vazio (apenas email vazio).
  // O self-heal client-side faz fetch /api/me/profile e preenche se houver
  // sessão lá. Nunca cai no PATIENT mock pra users reais.
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
