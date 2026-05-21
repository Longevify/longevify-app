import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import {
  BIOMARKERS as MOCK_BIOMARKERS,
  PATIENT as MOCK_PATIENT,
  type Biomarker,
  type BiomarkerStatus,
  type Patient,
} from "@/lib/mock-data";
import {
  computeBiologicalAge,
  computeLongevifyScore,
  computeOrganBioAges,
  computeOrganScores,
} from "./compute";
import type { BiomarkerInsight } from "@/lib/dados/personalized-insights";

/**
 * Mapeia category_id CLÍNICA do DB (lipidico, hepatico, renal, etc.)
 * pra organ_id que a UI usa (heart, lungs, liver, etc.).
 *
 * Lucas (2026-05-20): "biomarcadores tem que estar linkados aos orgaos
 * e categorias. Ao clicar no orgão, precisa aparecer os biomarcadores
 * vinculados."
 *
 * O DB usa categorias clínicas (lipidico, hemograma, hepático…), mas a
 * UI filtra por órgão (heart, lungs, liver…). Aqui converte uma na
 * outra. IDs do front em `CATEGORIES` no mock-data.ts.
 */
const CLINICAL_TO_ORGAN: Record<string, string> = {
  // Cardiovascular
  lipidico: "heart",
  cardiac: "heart",
  cardiovascular: "heart",
  inflamacao: "heart", // PCR/VHS impactam mais coração
  // Hepático
  hepatico: "liver",
  hepatic: "liver",
  // Renal + eletrólitos (filtrados pelos rins)
  renal: "kidneys",
  eletrolitos: "kidneys",
  // Glicemia + metabolismo → pâncreas
  glicemico: "pancreas",
  metabolic: "pancreas",
  // Tireoide + neuro-hormonal → cérebro (eixo HPT, cognição)
  tireoide: "brain",
  thyroid: "brain",
  hormonios: "brain",
  hormonal: "brain",
  // Nutrientes/vitaminas absorção → intestino
  vitaminas: "intestine",
  nutrients: "intestine",
  minerais: "intestine",
  // Hemograma → coração (eritrócitos servem oxigenação cardio-respiratória)
  hemograma: "heart",
  // Imune/outros → coração (proxy inflamação sistêmica)
  immune: "heart",
  outros: "heart",
};

function clinicalToOrgan(clinicalId: string): string {
  return CLINICAL_TO_ORGAN[clinicalId] ?? "heart";
}

export interface DadosData {
  patient: Patient;
  biomarkers: Biomarker[];
  hasExams: boolean;
  /**
   * Insights Dr. Lon pré-computados pelo parse-route (GPT-4o-mini) e
   * persistidos em exams.insights_data. Quando presente, PostExamStories
   * abre instantâneo sem fetch client-side. Lucas (2026-05-20): "não
   * quero esperar para a analise do Dr. Lon carregar".
   */
  insights?: Record<string, BiomarkerInsight>;
}

/**
 * Carrega os dados do dashboard pro user logado, caindo no mock quando
 * não há exames publicados ainda. Usado pelo `/dados` server component.
 *
 * Estratégia:
 *   - Busca último exame publicado + valores
 *   - Pra histórico (sparklines), busca os últimos N exames e agrega
 *     os valores por biomarcador em ordem temporal
 *   - Junta com `biomarker_definitions` (catalog) pra ranges/labels
 */
export async function loadDadosForUser(opts: {
  userId: string;
  isDemo: boolean;
}): Promise<DadosData> {
  if (opts.isDemo) {
    return { patient: MOCK_PATIENT, biomarkers: MOCK_BIOMARKERS, hasExams: true };
  }

  if (!isSupabaseConfigured()) {
    return { patient: MOCK_PATIENT, biomarkers: [], hasExams: false };
  }

  // Read path — usa JWT helper (sem auto-refresh) pra não disparar
  // race que clear cookies durante navegação.
  const { accessToken } = await getUserIdFromCookie();
  const supabase = await createSupabaseWithJwt(accessToken);

  const [examsRes, defsRes, scoreRes, profileRes] = await Promise.all([
    supabase
      .from("exams")
      .select("id, taken_at, insights_data")
      .eq("patient_id", opts.userId)
      .eq("status", "published")
      .order("taken_at", { ascending: false })
      .limit(12),
    supabase.from("biomarker_definitions").select("*"),
    supabase
      .from("longevify_scores")
      .select("score, biological_age, status, computed_at")
      .eq("patient_id", opts.userId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, last_name, chronological_age")
      .eq("id", opts.userId)
      .maybeSingle(),
  ]);

  const exams = examsRes.data ?? [];
  const defs = defsRes.data ?? [];

  if (exams.length === 0 || defs.length === 0) {
    return { patient: MOCK_PATIENT, biomarkers: [], hasExams: false };
  }

  const examIds = exams.map((e) => e.id as string);
  const examDateById = new Map(
    exams.map((e) => [e.id as string, e.taken_at as string]),
  );

  const valuesRes = await supabase
    .from("biomarker_values")
    .select("exam_id, biomarker_id, value, status")
    .in("exam_id", examIds);

  const values = valuesRes.data ?? [];
  const latestExamId = exams[0].id as string;

  // Agrupa valores por biomarcador (ordenado por data crescente pra sparkline).
  const byMarker = new Map<
    string,
    Array<{ examId: string; value: number; status: BiomarkerStatus; date: string }>
  >();
  for (const v of values) {
    const date = examDateById.get(v.exam_id as string);
    if (!date) continue;
    const arr = byMarker.get(v.biomarker_id as string) ?? [];
    arr.push({
      examId: v.exam_id as string,
      value: Number(v.value),
      status: v.status as BiomarkerStatus,
      date,
    });
    byMarker.set(v.biomarker_id as string, arr);
  }
  for (const arr of byMarker.values()) {
    arr.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  // Constrói os Biomarkers com base no catalog + valores reais; fallback no
  // mock só pra preencher description quando a definition não tiver.
  const mockById = new Map(MOCK_BIOMARKERS.map((b) => [b.id, b]));
  const biomarkers: Biomarker[] = defs.map((row) => {
    const id = row.id as string;
    const series = byMarker.get(id) ?? [];
    const latest = series.find((s) => s.examId === latestExamId) ?? series[series.length - 1];
    const mock = mockById.get(id);

    const optimalRange: [number, number] | undefined =
      row.optimal_min != null && row.optimal_max != null
        ? [Number(row.optimal_min), Number(row.optimal_max)]
        : mock?.optimalRange;
    const normalRange: [number, number] | undefined =
      row.normal_min != null && row.normal_max != null
        ? [Number(row.normal_min), Number(row.normal_max)]
        : mock?.normalRange;

    return {
      id,
      name: row.name as string,
      category: row.category_label as string,
      // categoryId vira o ID DO ÓRGÃO no app (heart/lungs/liver/etc.) —
      // bate com a sidebar de /dados e o mannequin 3D. O `category_id`
      // bruto do DB (que é clínico: lipidico, hepatico…) fica preservado
      // em `category` (label). Lucas 2026-05-20: "biomarcadores tem que
      // estar linkados aos orgaos".
      categoryId: clinicalToOrgan(row.category_id as string),
      unit: row.unit as string,
      value: latest?.value ?? 0,
      status: latest?.status ?? "normal",
      optimalRange,
      normalRange,
      referenceLabel: (row.reference_label as string) ?? mock?.referenceLabel ?? "",
      history: series.map((s) => ({
        date: new Date(s.date + "T00:00:00").toISOString(),
        value: s.value,
      })),
      description: (row.description as string) ?? mock?.description,
    } satisfies Biomarker;
  });

  // Filtra biomarcadores que não tem nenhum valor (catalog sem dados).
  const withData = biomarkers.filter((b) => b.history.length > 0);

  const patientFirstName =
    (profileRes.data?.first_name as string | undefined) || MOCK_PATIENT.firstName;
  const patientLastName =
    (profileRes.data?.last_name as string | undefined) || MOCK_PATIENT.lastName;
  const chronologicalAge =
    (profileRes.data?.chronological_age as number | undefined) ??
    MOCK_PATIENT.chronologicalAge;

  const score = scoreRes.data;
  // Sex: tenta puxar do profile (coluna opcional). Sem coluna, fallback "male".
  const patientSex: Patient["sex"] =
    (profileRes.data as { sex?: string } | null)?.sex === "female"
      ? "female"
      : "male";

  // ─── Computa Score/idade/órgãos a partir dos biomarcadores REAIS ─────
  //
  // Lucas (2026-05-20): "o app todo tem que ser configurado com base nesses
  // meus dados, as cores no boneco, minha idade biológica e tudo mais, os
  // dados reais tem que substituir os dados demo."
  //
  // Prioridade: snapshot em longevify_scores (se existe) > computado on-the-fly
  // > mock (fallback final). Compute funciona pra todo paciente com qualquer
  // número de biomarcadores reais.
  const computedScore = computeLongevifyScore(withData);
  const computedBioAge = computeBiologicalAge(withData, chronologicalAge);
  const organScores = computeOrganScores(withData);
  const organBioAges = computeOrganBioAges(withData, chronologicalAge);

  // Histórico: 1 ponto por exame existente, com score/age computado por
  // exame. Pra MVP, refazemos compute por exame (cheap — N ≤ 12).
  const scoreHistory = buildScoreHistory(withData, exams);
  const biologicalAgeHistory = buildBioAgeHistory(
    withData,
    exams,
    chronologicalAge,
  );

  const patient: Patient = {
    firstName: patientFirstName,
    lastName: patientLastName,
    sex: patientSex,
    chronologicalAge,
    biologicalAge: score?.biological_age
      ? Number(score.biological_age)
      : computedBioAge,
    longevifyScore: score?.score ?? computedScore.score,
    scoreStatus:
      (score?.status as Patient["scoreStatus"]) ?? computedScore.status,
    latestExamDate: exams[0].taken_at as string,
    pendingResultsDays: MOCK_PATIENT.pendingResultsDays,
    scoreHistory,
    biologicalAgeHistory,
    organBioAges,
    organScores,
  };

  // Insights Dr. Lon pré-computados (parse-route → exams.insights_data).
  // Estrutura: { insights: {...}, generated_at, provider, biomarker_ids }
  // Defensivo: se coluna não existe (migration não aplicada) ou jsonb
  // malformado, retorna undefined e o client cai pro fetch de fallback.
  const latestExamInsights = exams[0]?.insights_data as
    | { insights?: Record<string, BiomarkerInsight> }
    | null
    | undefined;
  const insights = latestExamInsights?.insights;

  return { patient, biomarkers: withData, hasExams: true, insights };
}

/**
 * Histórico de Longevify Score — 1 ponto por exame existente. Re-aplica
 * computeLongevifyScore filtrando os biomarcadores que pertencem ao
 * exame específico. Útil pro sparkline da ScoreCard.
 */
function buildScoreHistory(
  biomarkers: Biomarker[],
  exams: Array<{ id: unknown; taken_at: unknown }>,
): Patient["scoreHistory"] {
  if (exams.length === 0) return [];

  // Reordena ascendente pra sparkline ler esquerda → direita = passado → hoje
  const sorted = [...exams].sort((a, b) =>
    (a.taken_at as string) < (b.taken_at as string) ? -1 : 1,
  );

  return sorted.map((e) => {
    // Filtra biomarkers cujo valor mais recente é DESSE exame
    const examId = e.id as string;
    const subset = biomarkers
      .map((b) => {
        const v = b.history.find(
          (h) => h.date.slice(0, 10) === (e.taken_at as string),
        );
        if (!v) return null;
        return {
          ...b,
          value: v.value,
          // Status nesse ponto histórico — usa o do biomarker corrente
          // como proxy (MVP — refinement futuro: recompute por valor)
          status: b.status,
        };
      })
      .filter((b): b is Biomarker => b !== null);
    const { score } = computeLongevifyScore(subset);
    return { date: e.taken_at as string, score };
  });
}

/**
 * Histórico de idade biológica — análogo ao scoreHistory.
 */
function buildBioAgeHistory(
  biomarkers: Biomarker[],
  exams: Array<{ id: unknown; taken_at: unknown }>,
  chronologicalAge: number,
): Patient["biologicalAgeHistory"] {
  if (exams.length === 0) return [];

  const sorted = [...exams].sort((a, b) =>
    (a.taken_at as string) < (b.taken_at as string) ? -1 : 1,
  );

  return sorted.map((e) => {
    const subset = biomarkers
      .map((b) => {
        const v = b.history.find(
          (h) => h.date.slice(0, 10) === (e.taken_at as string),
        );
        if (!v) return null;
        return { ...b, value: v.value, status: b.status };
      })
      .filter((b): b is Biomarker => b !== null);
    const age = computeBiologicalAge(subset, chronologicalAge);
    return { date: e.taken_at as string, age };
  });
}

export function biomarkersStatsFrom(biomarkers: Biomarker[]) {
  const total = biomarkers.length;
  const optimal = biomarkers.filter((b) => b.status === "optimal").length;
  const normal = biomarkers.filter((b) => b.status === "normal").length;
  const out = biomarkers.filter((b) => b.status === "out").length;
  return { total, optimal, normal, out };
}
