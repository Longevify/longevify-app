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

export interface DadosData {
  patient: Patient;
  biomarkers: Biomarker[];
  hasExams: boolean;
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
      .select("id, taken_at")
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
      categoryId: row.category_id as string,
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
  const patient: Patient = {
    firstName: patientFirstName,
    lastName: patientLastName,
    chronologicalAge,
    biologicalAge: score?.biological_age ? Number(score.biological_age) : chronologicalAge,
    longevifyScore: score?.score ?? MOCK_PATIENT.longevifyScore,
    scoreStatus:
      (score?.status as Patient["scoreStatus"]) ?? MOCK_PATIENT.scoreStatus,
    latestExamDate: exams[0].taken_at as string,
    pendingResultsDays: MOCK_PATIENT.pendingResultsDays,
    scoreHistory: MOCK_PATIENT.scoreHistory, // TODO: derivar de longevify_scores quando virar uso real
  };

  return { patient, biomarkers: withData, hasExams: true };
}

export function biomarkersStatsFrom(biomarkers: Biomarker[]) {
  const total = biomarkers.length;
  const optimal = biomarkers.filter((b) => b.status === "optimal").length;
  const normal = biomarkers.filter((b) => b.status === "normal").length;
  const out = biomarkers.filter((b) => b.status === "out").length;
  return { total, optimal, normal, out };
}
