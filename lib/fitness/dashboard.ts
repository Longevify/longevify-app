import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

/**
 * Server helpers de AGREGAÇÃO pra dashboard unificado de /fitness.
 *
 * Lucas (2026-05-21+22): "torne essa aba do app perfeita" — esta layer
 * cruza musculação + corrida + outros pra oferecer visão de saúde geral
 * de treino: heatmap, streak, totais, distribuição por tipo.
 */

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  strengthSets: number;
  strengthVolume: number; // kg
  runningKm: number;
  otherMinutes: number;
  /** Score sintético 0-4 pra heatmap (estilo GitHub) */
  intensity: 0 | 1 | 2 | 3 | 4;
}

/**
 * Heatmap de atividade dos últimos N dias.
 * Cruza workout_sets + running_sessions + other_workouts.
 *
 * Intensity 0 = nada, 1 = leve (<30min eq), 2 = moderado, 3 = forte,
 * 4 = pesado. Computada via score sintético (sets×2 + km×3 + min/10).
 */
export async function getActivityHeatmap(
  days = 90,
): Promise<ActivityDay[]> {
  const empty: ActivityDay[] = Array.from({ length: days + 1 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (days - i));
    return {
      date: d.toISOString().slice(0, 10),
      strengthSets: 0,
      strengthVolume: 0,
      runningKm: 0,
      otherMinutes: 0,
      intensity: 0,
    };
  });

  if (!isSupabaseConfigured()) return empty;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return empty;
  const supabase = await createSupabaseWithJwt(accessToken);

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // 1) Strength sets agregados por dia
  const { data: setsData } = await supabase
    .from("workout_sets")
    .select(
      `weight_kg, reps,
       workout_sessions!inner(patient_id, session_date, kind)`,
    )
    .eq("workout_sessions.patient_id", userId)
    .eq("workout_sessions.kind", "strength")
    .gte("workout_sessions.session_date", cutoffStr);

  // 2) Running sessions
  const { data: runData } = await supabase
    .from("running_sessions")
    .select(
      `distance_km,
       workout_sessions!inner(patient_id, session_date)`,
    )
    .eq("workout_sessions.patient_id", userId)
    .gte("workout_sessions.session_date", cutoffStr);

  // 3) Other workouts
  const { data: otherData } = await supabase
    .from("other_workouts")
    .select(
      `duration_minutes,
       workout_sessions!inner(patient_id, session_date)`,
    )
    .eq("workout_sessions.patient_id", userId)
    .gte("workout_sessions.session_date", cutoffStr);

  const byDate = new Map<string, ActivityDay>();
  empty.forEach((d) => byDate.set(d.date, { ...d }));

  for (const row of setsData ?? []) {
    const sess = (row as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    const date = sess?.session_date;
    if (!date) continue;
    const cur = byDate.get(date);
    if (!cur) continue;
    cur.strengthSets += 1;
    cur.strengthVolume += ((row.weight_kg as number | null) ?? 0) *
      (row.reps as number);
  }

  for (const row of runData ?? []) {
    const sess = (row as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    const date = sess?.session_date;
    if (!date) continue;
    const cur = byDate.get(date);
    if (!cur) continue;
    cur.runningKm += (row.distance_km as number | null) ?? 0;
  }

  for (const row of otherData ?? []) {
    const sess = (row as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    const date = sess?.session_date;
    if (!date) continue;
    const cur = byDate.get(date);
    if (!cur) continue;
    cur.otherMinutes += (row.duration_minutes as number | null) ?? 0;
  }

  // Compute intensity score 0-4
  for (const day of byDate.values()) {
    // Score sintético: sets×2 + km×3 + min/10
    const score =
      day.strengthSets * 2 + day.runningKm * 3 + day.otherMinutes / 10;
    if (score === 0) day.intensity = 0;
    else if (score < 6) day.intensity = 1;
    else if (score < 12) day.intensity = 2;
    else if (score < 24) day.intensity = 3;
    else day.intensity = 4;
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * Streak atual: quantos dias seguidos com qualquer atividade (até hoje
 * ou ontem se hoje ainda não treinou).
 */
export function computeStreak(days: ActivityDay[]): {
  current: number;
  longest: number;
} {
  let current = 0;
  let longest = 0;
  let running = 0;

  // Calcula longest streak histórico
  for (const d of days) {
    if (d.intensity > 0) {
      running += 1;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
  }

  // Calcula current streak (contagem de trás pra frente)
  // Ignora hoje se não tem atividade — permite que streak conte até ontem
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayStart = days.length - 1;

  // Se hoje tem atividade, conta a partir de hoje. Senão, começa em ontem.
  let startIdx = yesterdayStart;
  if (days[yesterdayStart]?.date === today && days[yesterdayStart].intensity === 0) {
    startIdx = yesterdayStart - 1;
  }

  for (let i = startIdx; i >= 0; i--) {
    if (days[i]?.intensity > 0) current += 1;
    else break;
  }

  return { current, longest };
}

/**
 * Stats agregadas pro dashboard fitness — mês + semana + ano (volume,
 * km, min, treinos totais).
 */
export interface FitnessOverview {
  thisWeek: {
    workouts: number;
    strengthVolume: number;
    runningKm: number;
    otherMinutes: number;
  };
  thisMonth: {
    workouts: number;
    strengthVolume: number;
    runningKm: number;
    otherMinutes: number;
  };
  thisYear: {
    workouts: number;
    strengthVolume: number;
    runningKm: number;
    otherMinutes: number;
  };
  /** Distribuição entre os 3 tipos por minutos equivalentes (mês) */
  breakdown: {
    strength: number;
    running: number;
    other: number;
  };
}

export async function getFitnessOverview(): Promise<FitnessOverview> {
  const empty: FitnessOverview = {
    thisWeek: { workouts: 0, strengthVolume: 0, runningKm: 0, otherMinutes: 0 },
    thisMonth: { workouts: 0, strengthVolume: 0, runningKm: 0, otherMinutes: 0 },
    thisYear: { workouts: 0, strengthVolume: 0, runningKm: 0, otherMinutes: 0 },
    breakdown: { strength: 0, running: 0, other: 0 },
  };
  if (!isSupabaseConfigured()) return empty;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return empty;
  const supabase = await createSupabaseWithJwt(accessToken);

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1)
    .toISOString()
    .slice(0, 10);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const sevenAgo = new Date(now);
  sevenAgo.setUTCDate(sevenAgo.getUTCDate() - 7);
  const startOfWeek = sevenAgo.toISOString().slice(0, 10);

  // Sessions distintas por kind no ano (pra workouts count)
  const { data: sessionsData } = await supabase
    .from("workout_sessions")
    .select("id, kind, session_date")
    .eq("patient_id", userId)
    .gte("session_date", startOfYear);

  // Sets por sessão (volume)
  const { data: setsData } = await supabase
    .from("workout_sets")
    .select(
      `weight_kg, reps,
       workout_sessions!inner(patient_id, session_date, kind)`,
    )
    .eq("workout_sessions.patient_id", userId)
    .eq("workout_sessions.kind", "strength")
    .gte("workout_sessions.session_date", startOfYear);

  // Running km
  const { data: runData } = await supabase
    .from("running_sessions")
    .select(
      `distance_km, duration_seconds,
       workout_sessions!inner(patient_id, session_date)`,
    )
    .eq("workout_sessions.patient_id", userId)
    .gte("workout_sessions.session_date", startOfYear);

  // Other minutes
  const { data: otherData } = await supabase
    .from("other_workouts")
    .select(
      `duration_minutes,
       workout_sessions!inner(patient_id, session_date)`,
    )
    .eq("workout_sessions.patient_id", userId)
    .gte("workout_sessions.session_date", startOfYear);

  const out = { ...empty };

  const bucketize = (
    date: string,
    incr: (b: typeof out.thisWeek) => void,
  ) => {
    if (date >= startOfYear) incr(out.thisYear);
    if (date >= startOfMonth) incr(out.thisMonth);
    if (date >= startOfWeek) incr(out.thisWeek);
  };

  for (const r of sessionsData ?? []) {
    const date = r.session_date as string;
    bucketize(date, (b) => {
      b.workouts += 1;
    });
  }

  for (const r of setsData ?? []) {
    const sess = (r as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    const date = sess?.session_date;
    if (!date) continue;
    const vol = ((r.weight_kg as number | null) ?? 0) * (r.reps as number);
    bucketize(date, (b) => {
      b.strengthVolume += vol;
    });
  }

  for (const r of runData ?? []) {
    const sess = (r as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    const date = sess?.session_date;
    if (!date) continue;
    const km = (r.distance_km as number | null) ?? 0;
    bucketize(date, (b) => {
      b.runningKm += km;
    });
  }

  for (const r of otherData ?? []) {
    const sess = (r as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    const date = sess?.session_date;
    if (!date) continue;
    const mins = (r.duration_minutes as number) ?? 0;
    bucketize(date, (b) => {
      b.otherMinutes += mins;
    });
  }

  // Breakdown por minutos equivalentes (estimate):
  // 1 set strength ~ 2 min; 1 km corrida ~ 6 min; outros já tem min
  // Usa thisMonth
  const m = out.thisMonth;
  const strengthMin = (await supabase
    .from("workout_sets")
    .select(`id, workout_sessions!inner(patient_id, session_date, kind)`, {
      count: "exact",
      head: true,
    })
    .eq("workout_sessions.patient_id", userId)
    .eq("workout_sessions.kind", "strength")
    .gte("workout_sessions.session_date", startOfMonth)).count ?? 0;
  out.breakdown = {
    strength: strengthMin * 2,
    running: Math.round(m.runningKm * 6),
    other: m.otherMinutes,
  };

  return out;
}

/**
 * Top 5 PRs (records) recentes — cruza workout_sets + exercise_catalog
 * pra pegar maior peso ou reps por exercício nos últimos 90 dias.
 */
export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  weightKg: number | null;
  reps: number;
  rpe: number | null;
  sessionDate: string;
  /** Score = weight × reps (1RM proxy) */
  score: number;
}

export async function getRecentPersonalRecords(
  limit = 5,
): Promise<PersonalRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      `id, exercise_id, weight_kg, reps, rpe,
       workout_sessions!inner(patient_id, session_date, kind),
       exercise_catalog!inner(name, muscle_group)`,
    )
    .eq("workout_sessions.patient_id", userId)
    .eq("workout_sessions.kind", "strength")
    .gte("workout_sessions.session_date", cutoffStr);
  if (error || !data) return [];

  // Agrupa por exercise_id, pega o maior score
  const bestByExercise = new Map<string, PersonalRecord>();
  for (const r of data) {
    const sess = (r as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    const ex = (r as {
      exercise_catalog?: { name?: string; muscle_group?: string };
    }).exercise_catalog;
    if (!sess?.session_date || !ex?.name) continue;
    const weight = r.weight_kg as number | null;
    const reps = r.reps as number;
    const score = (weight ?? 0) * reps;
    const cur = bestByExercise.get(r.exercise_id as string);
    if (!cur || cur.score < score) {
      bestByExercise.set(r.exercise_id as string, {
        exerciseId: r.exercise_id as string,
        exerciseName: ex.name,
        muscleGroup: ex.muscle_group ?? "full_body",
        weightKg: weight,
        reps,
        rpe: r.rpe as number | null,
        sessionDate: sess.session_date,
        score,
      });
    }
  }

  return Array.from(bestByExercise.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
