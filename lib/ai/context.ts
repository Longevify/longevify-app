import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { PATIENT, BIOMARKERS, type Biomarker, type Patient } from "@/lib/mock-data";
import { loadDadosForUser } from "@/lib/dados/server";

const DEMO_COOKIE = "longevify_demo_session";

export interface ConciergeExtras {
  /** Nome de tratamento que o user escolheu no intake ("Como você prefere
   *  ser chamado?"). Override do firstName quando presente. */
  preferredName: string | null;

  /** Texto livre com snapshot do perfil (cidade/UF, condições, medicações,
   *  alergias, metas) — passa pro system prompt. */
  profileSummary: string | null;

  /** Snapshot do intake clínico mais recente. */
  intakeSummary: string | null;

  /** Sumário dos uploads de exames antigos (datas + tipo). */
  labUploadsSummary: string | null;

  /** Snapshot dos wearables (últimos 7 dias agregados). */
  wearablesSummary: string | null;

  /** Contexto de ciclo menstrual (fase atual + sintomas recentes). null
   *  pra users que não onboarded ou trackam desativado. Importante:
   *  humor/energia/sono/libido OSCILAM pelo ciclo, então essa info muda
   *  como o Concierge deve interpretar dados subjetivos recentes. */
  menstrualSummary: string | null;
}

const EMPTY: ConciergeExtras = {
  preferredName: null,
  profileSummary: null,
  intakeSummary: null,
  labUploadsSummary: null,
  wearablesSummary: null,
  menstrualSummary: null,
};

/**
 * Busca contexto rico do user logado pra injetar no system prompt do
 * Concierge.
 *
 * Modos:
 *   - **Demo legítimo** (cookie demo OR sem Supabase): `isDemo=true`, dados
 *     do João mock pra ilustrar o app. `hasExamData=true`.
 *   - **User real autenticado COM exames**: `isDemo=false`, dados reais do
 *     profile + biomarcadores reais. `hasExamData=true`.
 *   - **User real autenticado SEM exames** (acabou de criar conta):
 *     `isDemo=false`, biomarkers=[], patient com nome real mas score/idade
 *     biológica como null. `hasExamData=false`. CRÍTICO: nunca vazar mock
 *     do João pra esse user — o LLM precisa saber que não tem dados
 *     reais e responder sem inventar números.
 *   - **JWT expirado mid-session** (sem cookie demo, com Supabase): cai no
 *     fallback demo MAS com isDemo=true pro prompt renderizar como demo
 *     (não usa "patient.firstName" como se fosse o user real).
 *
 * Faz tudo em paralelo. Best-effort: se algum lookup falhar, deixa null.
 */
export async function loadConciergeContext(): Promise<{
  patient: Patient;
  biomarkers: Biomarker[];
  extras: ConciergeExtras;
  isDemo: boolean;
  hasExamData: boolean;
}> {
  // Cookie demo opt-in tem prioridade — user pediu modo demo explicitamente
  const store = await cookies();
  const isDemoCookie = store.get(DEMO_COOKIE)?.value === "1";
  if (isDemoCookie) {
    return {
      patient: PATIENT,
      biomarkers: BIOMARKERS,
      extras: EMPTY,
      isDemo: true,
      hasExamData: true,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      patient: PATIENT,
      biomarkers: BIOMARKERS,
      extras: EMPTY,
      isDemo: true,
      hasExamData: true,
    };
  }

  // ZERO-AUTH-SUPABASE: extrai user_id + access_token direto do JWT do cookie
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) {
    // Sem JWT (deslogado ou token expirado) E sem cookie demo: o middleware
    // deveria ter redirecionado pra /login. Se chegou aqui, alguma rota
    // furou. NÃO vaza dados do João como se fossem do user — render como
    // demo legítimo (isDemo=true) pro prompt avisar.
    return {
      patient: PATIENT,
      biomarkers: BIOMARKERS,
      extras: EMPTY,
      isDemo: true,
      hasExamData: true,
    };
  }

  // Cliente com JWT explícito — sem isso queries vão sem Authorization
  // header e RLS bloqueia tudo silenciosamente (gotData=false).
  const supabase = await createSupabaseWithJwt(accessToken);

  const [profileRes, intakeRes, labsRes, dailyRes, dadosResolved, menstrualRes, menstrualEntriesRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "first_name, last_name, chronological_age, height_cm, weight_kg, blood_type, city, uf, occupation, goals, conditions, medications, allergies",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("intake_responses")
        .select("variant, responses, updated_at")
        .eq("patient_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("lab_uploads")
        .select("file_name, taken_at, lab_name, exam_kind, status, parsed_data")
        .eq("patient_id", userId)
        .order("taken_at", { ascending: false, nullsFirst: false })
        .limit(20),
      supabase
        .from("daily_health_metrics")
        .select(
          "date, sleep_minutes, sleep_efficiency, steps, active_minutes, resting_hr, hrv, vo2max, strain",
        )
        .eq("patient_id", userId)
        .order("date", { ascending: false })
        .limit(7),
      loadDadosForUser({ userId, isDemo: false }),
      supabase
        .from("menstrual_profile")
        .select(
          "tracking_enabled, last_period_start, avg_cycle_days, avg_period_days, cycle_regularity, contraceptive_kind, reproductive_status, onboarded_at",
        )
        .eq("patient_id", userId)
        .maybeSingle(),
      supabase
        .from("menstrual_entries")
        .select("entry_date, flow, symptoms, mood, energy, libido, sleep_quality")
        .eq("patient_id", userId)
        .order("entry_date", { ascending: false })
        .limit(14),
    ]);

  const profileSummary = formatProfile(profileRes.data);
  const intakeSummary = formatIntake(intakeRes.data);
  const labUploadsSummary = formatLabUploads(labsRes.data ?? []);
  const wearablesSummary = formatWearables(dailyRes.data ?? []);
  const menstrualSummary = formatMenstrualContext(
    menstrualRes.data ?? null,
    menstrualEntriesRes.data ?? [],
  );
  const preferredName = extractPreferredName(intakeRes.data);

  // Sobrescreve nome/idade do PATIENT mock pelos dados REAIS do profile
  // do user. Quando user real não tem exames seedados, dadosResolved.patient
  // cai no MOCK_PATIENT (= "João Silva") — então a sobrescrita é crítica
  // pra evitar saudação com nome errado.
  const profile = profileRes.data as
    | {
        first_name?: string | null;
        last_name?: string | null;
        chronological_age?: number | null;
      }
    | null;
  const realFirstName = profile?.first_name?.trim() || null;
  const realLastName = profile?.last_name?.trim() || null;
  const realAge =
    typeof profile?.chronological_age === "number"
      ? profile.chronological_age
      : null;

  const patient: Patient = {
    ...dadosResolved.patient,
    firstName: realFirstName ?? dadosResolved.patient.firstName,
    lastName: realLastName ?? dadosResolved.patient.lastName,
    chronologicalAge: realAge ?? dadosResolved.patient.chronologicalAge,
  };

  // CRÍTICO: nunca fallback pra BIOMARKERS mock pra user real. Se ele não
  // tem exames seedados, biomarcadores ficam vazios — o system prompt vai
  // detectar e dizer "ainda sem dados" em vez de inventar valores do João.
  // hasExamData distingue user-real-com-dados de user-real-sem-dados.
  const hasExamData = dadosResolved.biomarkers.length > 0;

  return {
    patient,
    biomarkers: dadosResolved.biomarkers,
    extras: {
      preferredName,
      profileSummary,
      intakeSummary,
      labUploadsSummary,
      wearablesSummary,
      menstrualSummary,
    },
    isDemo: false,
    hasExamData,
  };
}

// ─── Formatters (privados) ────────────────────────────────────────────────────

function extractPreferredName(rec: Record<string, unknown> | null): string | null {
  if (!rec) return null;
  const responses = rec.responses as
    | { data?: { identity?: { preferredName?: string } } }
    | null
    | undefined;
  const name = responses?.data?.identity?.preferredName?.trim();
  return name && name.length > 0 ? name : null;
}

function formatProfile(p: Record<string, unknown> | null): string | null {
  if (!p) return null;
  const lines: string[] = [];
  if (p.height_cm) lines.push(`- Altura: ${p.height_cm} cm`);
  if (p.weight_kg) lines.push(`- Peso: ${p.weight_kg} kg`);
  if (p.blood_type) lines.push(`- Tipo sanguíneo: ${p.blood_type}`);
  if (p.city || p.uf)
    lines.push(`- Localização: ${[p.city, p.uf].filter(Boolean).join(" / ")}`);
  if (p.occupation) lines.push(`- Profissão: ${p.occupation}`);
  if (p.goals) lines.push(`- Metas: ${p.goals}`);
  if (p.conditions) lines.push(`- Condições conhecidas: ${p.conditions}`);
  if (p.medications) lines.push(`- Medicações em uso: ${p.medications}`);
  if (p.allergies) lines.push(`- Alergias: ${p.allergies}`);
  return lines.length > 0 ? lines.join("\n") : null;
}

function formatIntake(rec: Record<string, unknown> | null): string | null {
  if (!rec) return null;
  const responses = rec.responses as
    | { data?: Record<string, unknown> }
    | null
    | undefined;
  if (!responses?.data) return null;
  const data = responses.data;
  const lines: string[] = [];

  // Identity
  const id = data.identity as Record<string, unknown> | undefined;
  if (id?.biologicalSex) lines.push(`- Sexo biológico: ${id.biologicalSex}`);
  if (id?.ethnicity) lines.push(`- Etnia: ${id.ethnicity}`);

  // Lifestyle
  const ls = data.lifestyle as Record<string, unknown> | undefined;
  if (ls) {
    const parts: string[] = [];
    if (ls.exerciseDaysPerWeek)
      parts.push(`exercício ${ls.exerciseDaysPerWeek}x/sem`);
    if (Array.isArray(ls.exerciseTypes) && ls.exerciseTypes.length)
      parts.push(`tipos: ${(ls.exerciseTypes as string[]).join("/")}`);
    if (ls.sleepHours) parts.push(`sono ${ls.sleepHours}h`);
    if (ls.sleepQuality) parts.push(`qualidade do sono ${ls.sleepQuality}/10`);
    if (ls.perceivedStress) parts.push(`estresse ${ls.perceivedStress}/10`);
    if (ls.smokingStatus && ls.smokingStatus !== "never")
      parts.push(`fumo: ${ls.smokingStatus}`);
    if (ls.alcoholFrequency) parts.push(`álcool: ${ls.alcoholFrequency}`);
    if (ls.diet) parts.push(`dieta: ${ls.diet}`);
    if (parts.length) lines.push(`- Estilo de vida: ${parts.join("; ")}`);
  }

  // Mental
  const m = data.mental as Record<string, unknown> | undefined;
  if (m) {
    const parts: string[] = [];
    if (m.moodScore) parts.push(`humor ${m.moodScore}/10`);
    if (m.fatigueFrequency) parts.push(`fadiga ${m.fatigueFrequency}`);
    if (m.diagnosedDepressionAnxiety)
      parts.push(`diagnóstico depressão/ansiedade`);
    if (m.inTherapy) parts.push(`em terapia`);
    if (parts.length) lines.push(`- Saúde mental: ${parts.join("; ")}`);
  }

  // Family history
  const fam = data.family as Record<string, unknown> | undefined;
  if (fam && Array.isArray(fam.earlyEvents) && fam.earlyEvents.length) {
    lines.push(
      `- História familiar (eventos precoces): ${(fam.earlyEvents as string[]).join(", ")}`,
    );
  }

  // Goals
  const g = data.goals as Record<string, unknown> | undefined;
  if (g?.primaryGoal) lines.push(`- Objetivo primário: ${g.primaryGoal}`);
  if (g?.freeNote) lines.push(`- Nota do paciente: ${g.freeNote}`);

  return lines.length > 0 ? lines.join("\n") : null;
}

function formatLabUploads(rows: Array<Record<string, unknown>>): string | null {
  if (rows.length === 0) return null;
  const lines: string[] = [];
  for (const r of rows) {
    const date = r.taken_at ? String(r.taken_at) : "(sem data)";
    const lab = r.lab_name ? ` [${r.lab_name}]` : "";
    const kind = r.exam_kind ? ` ${r.exam_kind}` : "";
    const fn = String(r.file_name);
    lines.push(`- ${date}${kind}${lab}: ${fn}`);
  }
  return lines.join("\n");
}

function formatMenstrualContext(
  profile: Record<string, unknown> | null,
  entries: Array<Record<string, unknown>>,
): string | null {
  if (!profile) return null;
  if (!profile.tracking_enabled) return null;
  if (!profile.last_period_start || !profile.onboarded_at) return null;

  // Calcular fase atual reusando lógica de cycle.ts (sem importar pra
  // evitar circular dep — duplicamos cálculo simples).
  const lastStart = String(profile.last_period_start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [ly, lm, ld] = lastStart.split("-").map(Number);
  let cycleStart = new Date(ly, lm - 1, ld, 0, 0, 0, 0);
  const avgCycle = Number(profile.avg_cycle_days) || 28;
  const avgPeriod = Number(profile.avg_period_days) || 5;
  const dayMs = 24 * 60 * 60 * 1000;
  let cycleDay = Math.round((today.getTime() - cycleStart.getTime()) / dayMs) + 1;
  while (cycleDay > avgCycle) {
    cycleStart = new Date(cycleStart.getTime() + avgCycle * dayMs);
    cycleDay = Math.round((today.getTime() - cycleStart.getTime()) / dayMs) + 1;
  }
  const ovulationDay = avgCycle - 14;
  let phase: string;
  if (cycleDay <= avgPeriod) phase = "menstrual";
  else if (cycleDay < ovulationDay - 1) phase = "folicular";
  else if (cycleDay <= ovulationDay + 1) phase = "ovulação";
  else phase = "lútea";

  const daysToNext = Math.max(0, avgCycle - cycleDay);
  const lines: string[] = [];
  lines.push(
    `- Fase do ciclo: ${phase} (dia ${cycleDay} de ${avgCycle}, próximo período em ~${daysToNext}d)`,
  );

  if (profile.reproductive_status && profile.reproductive_status !== "regular") {
    lines.push(`- Status reprodutivo: ${profile.reproductive_status}`);
  }
  if (profile.contraceptive_kind && profile.contraceptive_kind !== "none") {
    lines.push(`- Contraceptivo: ${profile.contraceptive_kind}`);
  }

  // Sintomas mais frequentes nas últimas 2 semanas
  const symCount = new Map<string, number>();
  for (const e of entries) {
    const sym = Array.isArray(e.symptoms) ? (e.symptoms as string[]) : [];
    for (const s of sym) symCount.set(s, (symCount.get(s) ?? 0) + 1);
  }
  const top = Array.from(symCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (top.length > 0) {
    lines.push(
      `- Sintomas recentes (14d): ${top.map(([k, c]) => `${k} ×${c}`).join(", ")}`,
    );
  }

  lines.push(
    "  (humor/energia/sono/libido oscilam pelo ciclo — considere essa fase ao interpretar sintomas subjetivos)",
  );
  return lines.join("\n");
}

function formatWearables(
  rows: Array<Record<string, unknown>>,
): string | null {
  if (rows.length === 0) return null;
  // Agregação simples (médias últimos 7 dias)
  let sleepMin = 0,
    sleepCount = 0;
  let steps = 0,
    stepsCount = 0;
  let restingHr = 0,
    rhrCount = 0;
  let hrv = 0,
    hrvCount = 0;
  let vo2max: number | null = null;

  for (const r of rows) {
    if (typeof r.sleep_minutes === "number") {
      sleepMin += r.sleep_minutes;
      sleepCount++;
    }
    if (typeof r.steps === "number") {
      steps += r.steps;
      stepsCount++;
    }
    if (typeof r.resting_hr === "number") {
      restingHr += r.resting_hr;
      rhrCount++;
    }
    if (typeof r.hrv === "number" || typeof r.hrv === "string") {
      hrv += Number(r.hrv);
      hrvCount++;
    }
    if (vo2max === null && (typeof r.vo2max === "number" || typeof r.vo2max === "string")) {
      vo2max = Number(r.vo2max);
    }
  }

  const lines: string[] = [];
  if (sleepCount)
    lines.push(`- Sono médio: ${Math.round(sleepMin / sleepCount / 60 * 10) / 10}h (${sleepCount}d)`);
  if (stepsCount) lines.push(`- Passos médios: ${Math.round(steps / stepsCount).toLocaleString("pt-BR")}/dia`);
  if (rhrCount) lines.push(`- FC repouso média: ${Math.round(restingHr / rhrCount)} bpm`);
  if (hrvCount) lines.push(`- HRV média: ${Math.round(hrv / hrvCount)} ms`);
  if (vo2max != null) lines.push(`- VO2max: ${vo2max}`);

  return lines.length > 0 ? lines.join("\n") : null;
}
