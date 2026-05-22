import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type {
  Exercise,
  EquipmentKind,
  ExerciseCategory,
  MuscleGroup,
  WorkoutSet,
  WorkoutSession,
} from "./types";

/**
 * Server helpers pra feature fitness.
 *
 * Reads usam JWT helper (sem auto-refresh) pra evitar race de cookies
 * em render paths.
 */

export async function getExerciseCatalog(): Promise<Exercise[]> {
  if (!isSupabaseConfigured()) return [];
  const { accessToken } = await getUserIdFromCookie();
  if (!accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("exercise_catalog")
    .select("id, name, muscle_group, equipment, category, description, video_url")
    .order("muscle_group", { ascending: true })
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    muscleGroup: r.muscle_group as MuscleGroup,
    equipment: r.equipment as EquipmentKind | null,
    category: r.category as ExerciseCategory,
    description: (r.description as string | null) ?? null,
    videoUrl: (r.video_url as string | null) ?? null,
  }));
}

/**
 * Retorna últimos N sets pra um exercise. Usado pra dashboard "Histórico
 * deste exercício" + chart de progressão.
 */
export async function getExerciseHistory(
  exerciseId: string,
  limit = 50,
): Promise<Array<WorkoutSet & { sessionDate: string }>> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  // Join via subselect: sets do user p/ exercício, ordenados pela
  // session_date da session
  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      `
      id, session_id, exercise_id, set_order, weight_kg, reps, rpe, notes, created_at,
      workout_sessions!inner(session_date, patient_id)
      `,
    )
    .eq("exercise_id", exerciseId)
    .eq("workout_sessions.patient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => {
    const sessionRel = (r as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    return {
      id: r.id as string,
      sessionId: r.session_id as string,
      exerciseId: r.exercise_id as string,
      setOrder: r.set_order as number,
      weightKg: r.weight_kg as number | null,
      reps: r.reps as number,
      rpe: r.rpe as number | null,
      notes: (r.notes as string | null) ?? null,
      createdAt: r.created_at as string,
      sessionDate: sessionRel?.session_date ?? (r.created_at as string).slice(0, 10),
    };
  });
}

/**
 * Última sessão "strength" do user de HOJE (se houver). Permite continuar
 * adicionando sets a uma sessão aberta em vez de criar uma nova a cada
 * exercício.
 */
export async function getTodayStrengthSession(): Promise<WorkoutSession | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, patient_id, kind, started_at, ended_at, session_date, notes")
    .eq("patient_id", userId)
    .eq("kind", "strength")
    .eq("session_date", today)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    patientId: data.patient_id as string,
    kind: data.kind as "strength",
    startedAt: data.started_at as string,
    endedAt: (data.ended_at as string | null) ?? null,
    sessionDate: data.session_date as string,
    notes: (data.notes as string | null) ?? null,
  };
}

/**
 * Volume total (kg) levantado por dia nos últimos N dias. Volume =
 * sum(weight_kg × reps). Usado no card "Resumo semanal".
 */
export async function getStrengthVolumeHistory(
  days = 14,
): Promise<Array<{ date: string; volumeKg: number; setsCount: number }>> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      `
      weight_kg, reps,
      workout_sessions!inner(session_date, patient_id, kind)
      `,
    )
    .eq("workout_sessions.patient_id", userId)
    .eq("workout_sessions.kind", "strength")
    .gte("workout_sessions.session_date", cutoffStr);

  if (error || !data) return [];

  // Agrega por dia
  const byDate = new Map<string, { volumeKg: number; setsCount: number }>();
  for (const row of data) {
    const sessionRel = (row as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    const date = sessionRel?.session_date;
    if (!date) continue;
    const weight = (row.weight_kg as number | null) ?? 0;
    const reps = row.reps as number;
    const cur = byDate.get(date) ?? { volumeKg: 0, setsCount: 0 };
    cur.volumeKg += weight * reps;
    cur.setsCount += 1;
    byDate.set(date, cur);
  }

  // Constrói array dos últimos N dias (mesmo zeros)
  const out: Array<{ date: string; volumeKg: number; setsCount: number }> = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (days - i));
    const dStr = d.toISOString().slice(0, 10);
    const entry = byDate.get(dStr) ?? { volumeKg: 0, setsCount: 0 };
    out.push({ date: dStr, ...entry });
  }
  return out;
}
