import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type {
  ActivityType,
  Exercise,
  EquipmentKind,
  ExerciseCategory,
  ExperienceLevel,
  GpsPoint,
  IntensityLevel,
  MuscleGroup,
  OtherWorkout,
  PaceSegment,
  ProgramGoal,
  ProgramStructure,
  RunningSession,
  WorkoutProgram,
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
 * Phase 3L — Pega todos workout_sets de uma data específica do user,
 * agrupados por exercise.
 */
export interface StrengthSessionDetail {
  date: string;
  totalSets: number;
  totalVolume: number;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    sets: Array<{
      setOrder: number;
      weightKg: number | null;
      reps: number;
      rpe: number | null;
      notes: string | null;
      createdAt: string;
    }>;
  }>;
}

export async function getStrengthSessionByDate(
  date: string,
): Promise<StrengthSessionDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);

  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      `set_order, weight_kg, reps, rpe, notes, created_at, exercise_id,
       workout_sessions!inner(patient_id, session_date, kind),
       exercise_catalog!inner(name, muscle_group)`,
    )
    .eq("workout_sessions.patient_id", userId)
    .eq("workout_sessions.kind", "strength")
    .eq("workout_sessions.session_date", date)
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) return null;

  const byExercise = new Map<
    string,
    StrengthSessionDetail["exercises"][number]
  >();
  let totalVolume = 0;
  for (const r of data) {
    const cat = (
      r as { exercise_catalog?: { name?: string; muscle_group?: string } }
    ).exercise_catalog;
    const exId = r.exercise_id as string;
    const w = (r.weight_kg as number | null) ?? 0;
    const reps = r.reps as number;
    totalVolume += w * reps;
    const cur = byExercise.get(exId) ?? {
      exerciseId: exId,
      exerciseName: cat?.name ?? exId,
      muscleGroup: cat?.muscle_group ?? "full_body",
      sets: [],
    };
    cur.sets.push({
      setOrder: r.set_order as number,
      weightKg: r.weight_kg as number | null,
      reps,
      rpe: r.rpe as number | null,
      notes: (r.notes as string | null) ?? null,
      createdAt: r.created_at as string,
    });
    byExercise.set(exId, cur);
  }

  return {
    date,
    totalSets: data.length,
    totalVolume,
    exercises: Array.from(byExercise.values()),
  };
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
 * Volume agregado POR GRUPO MUSCULAR (last 7d vs prev 7d). Usado pelo
 * card "Análise semanal" → mostra qual músculo evoluiu mais.
 */
export async function getMuscleGroupAnalysis(): Promise<
  Array<{
    muscleGroup: string;
    thisWeekVolume: number;
    lastWeekVolume: number;
    thisWeekSets: number;
    deltaPct: number;
  }>
> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 7);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setUTCDate(today.getUTCDate() - 14);

  const sevenStr = sevenDaysAgo.toISOString().slice(0, 10);
  const fourteenStr = fourteenDaysAgo.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      `
      weight_kg, reps,
      exercise_catalog!inner(muscle_group),
      workout_sessions!inner(session_date, patient_id, kind)
      `,
    )
    .eq("workout_sessions.patient_id", userId)
    .eq("workout_sessions.kind", "strength")
    .gte("workout_sessions.session_date", fourteenStr);

  if (error || !data) return [];

  type WeekAgg = { volume: number; sets: number };
  const byGroup = new Map<string, { thisWeek: WeekAgg; lastWeek: WeekAgg }>();

  for (const row of data) {
    const cat = (row as { exercise_catalog?: { muscle_group?: string } })
      .exercise_catalog;
    const sess = (row as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    const mg = cat?.muscle_group;
    const date = sess?.session_date;
    if (!mg || !date) continue;
    const weight = (row.weight_kg as number | null) ?? 0;
    const reps = row.reps as number;
    const volume = weight * reps;
    const isThisWeek = date >= sevenStr;
    const cur =
      byGroup.get(mg) ?? {
        thisWeek: { volume: 0, sets: 0 },
        lastWeek: { volume: 0, sets: 0 },
      };
    if (isThisWeek) {
      cur.thisWeek.volume += volume;
      cur.thisWeek.sets += 1;
    } else {
      cur.lastWeek.volume += volume;
      cur.lastWeek.sets += 1;
    }
    byGroup.set(mg, cur);
  }

  const out: Array<{
    muscleGroup: string;
    thisWeekVolume: number;
    lastWeekVolume: number;
    thisWeekSets: number;
    deltaPct: number;
  }> = [];
  for (const [mg, agg] of byGroup) {
    const delta =
      agg.lastWeek.volume > 0
        ? ((agg.thisWeek.volume - agg.lastWeek.volume) / agg.lastWeek.volume) * 100
        : agg.thisWeek.volume > 0
          ? 100
          : 0;
    out.push({
      muscleGroup: mg,
      thisWeekVolume: agg.thisWeek.volume,
      lastWeekVolume: agg.lastWeek.volume,
      thisWeekSets: agg.thisWeek.sets,
      deltaPct: Math.round(delta),
    });
  }
  out.sort((a, b) => b.thisWeekVolume - a.thisWeekVolume);
  return out;
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

// ─── Workout programs (AI generator) ──────────────────────────────────

function mapWorkoutProgramRow(r: Record<string, unknown>): WorkoutProgram {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    name: r.name as string,
    goal: r.goal as ProgramGoal,
    frequencyPerWeek: r.frequency_per_week as number,
    equipmentAvailable: (r.equipment_available as EquipmentKind[]) ?? [],
    experienceLevel: r.experience_level as ExperienceLevel,
    restrictions: (r.restrictions as string | null) ?? null,
    structure: r.structure as ProgramStructure,
    aiModel: r.ai_model as string,
    active: r.active as boolean,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

/**
 * Retorna o programa ATIVO do user (1 só por user, garantido por unique
 * index parcial). Null se nunca gerou.
 */
export async function getActiveWorkoutProgram(): Promise<WorkoutProgram | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("workout_programs")
    .select("*")
    .eq("patient_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  return mapWorkoutProgramRow(data as Record<string, unknown>);
}

/**
 * Lista todos os programas do user (ativos + arquivados), do mais
 * recente pro mais antigo. Usado pra mostrar histórico de programas
 * gerados.
 */
export async function listWorkoutPrograms(): Promise<WorkoutProgram[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("workout_programs")
    .select("*")
    .eq("patient_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => mapWorkoutProgramRow(r as Record<string, unknown>));
}

/**
 * Hidrata `exerciseName` em cada exercício do programa, fazendo lookup
 * no exercise_catalog. Útil pra UI render sem precisar de outro fetch.
 */
export async function hydrateProgramExerciseNames(
  program: WorkoutProgram,
): Promise<WorkoutProgram> {
  if (!isSupabaseConfigured()) return program;
  const { accessToken } = await getUserIdFromCookie();
  if (!accessToken) return program;
  const supabase = await createSupabaseWithJwt(accessToken);

  // Coleta todos exercise_ids únicos
  const ids = new Set<string>();
  for (const day of program.structure.days) {
    for (const ex of day.exercises) ids.add(ex.exerciseId);
  }
  if (ids.size === 0) return program;

  const { data, error } = await supabase
    .from("exercise_catalog")
    .select("id, name")
    .in("id", Array.from(ids));
  if (error || !data) return program;

  const nameMap = new Map<string, string>();
  for (const r of data) nameMap.set(r.id as string, r.name as string);

  return {
    ...program,
    structure: {
      ...program.structure,
      days: program.structure.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((ex) => ({
          ...ex,
          exerciseName: nameMap.get(ex.exerciseId) ?? ex.exerciseId,
        })),
      })),
    },
  };
}

// ─── Corrida (running) ────────────────────────────────────────────────

/**
 * Phase 3H — Detail de uma corrida específica.
 */
export async function getRunningSession(
  id: string,
): Promise<RunningSession | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("running_sessions")
    .select(
      `id, session_id, distance_km, duration_seconds, avg_pace_seconds_per_km,
       coordinates, pace_segments, created_at,
       workout_sessions!inner(patient_id, session_date, started_at, notes)`,
    )
    .eq("id", id)
    .eq("workout_sessions.patient_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const sessionRel = (
    data as {
      workout_sessions?: {
        session_date?: string;
        started_at?: string;
        notes?: string | null;
      };
    }
  ).workout_sessions;
  return {
    id: data.id as string,
    sessionId: data.session_id as string,
    distanceKm: data.distance_km as number | null,
    durationSeconds: data.duration_seconds as number | null,
    avgPaceSecondsPerKm: data.avg_pace_seconds_per_km as number | null,
    coordinates: (data.coordinates as GpsPoint[] | null) ?? null,
    paceSegments: (data.pace_segments as PaceSegment[] | null) ?? null,
    createdAt: data.created_at as string,
    sessionDate: sessionRel?.session_date,
    startedAt: sessionRel?.started_at,
    notes: sessionRel?.notes ?? null,
  };
}

/**
 * Lista corridas do user, mais recente primeiro. Por padrão retorna
 * top 20.
 */
export async function getRunningHistory(
  limit = 20,
): Promise<RunningSession[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("running_sessions")
    .select(
      `
      id, session_id, distance_km, duration_seconds, avg_pace_seconds_per_km,
      coordinates, pace_segments, created_at,
      workout_sessions!inner(patient_id, session_date, started_at, notes)
      `,
    )
    .eq("workout_sessions.patient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => {
    const sessionRel = (r as {
      workout_sessions?: {
        session_date?: string;
        started_at?: string;
        notes?: string | null;
      };
    }).workout_sessions;
    return {
      id: r.id as string,
      sessionId: r.session_id as string,
      distanceKm: r.distance_km as number | null,
      durationSeconds: r.duration_seconds as number | null,
      avgPaceSecondsPerKm: r.avg_pace_seconds_per_km as number | null,
      coordinates: (r.coordinates as GpsPoint[] | null) ?? null,
      paceSegments: (r.pace_segments as PaceSegment[] | null) ?? null,
      createdAt: r.created_at as string,
      sessionDate: sessionRel?.session_date,
      startedAt: sessionRel?.started_at,
      notes: sessionRel?.notes ?? null,
    };
  });
}

/**
 * Stats agregadas pra header da aba Corrida.
 */
export async function getRunningStats(): Promise<{
  totalKmThisMonth: number;
  totalRunsThisMonth: number;
  bestPaceSecondsPerKm: number | null;
  longestRunKm: number | null;
}> {
  if (!isSupabaseConfigured())
    return {
      totalKmThisMonth: 0,
      totalRunsThisMonth: 0,
      bestPaceSecondsPerKm: null,
      longestRunKm: null,
    };
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken)
    return {
      totalKmThisMonth: 0,
      totalRunsThisMonth: 0,
      bestPaceSecondsPerKm: null,
      longestRunKm: null,
    };
  const supabase = await createSupabaseWithJwt(accessToken);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("running_sessions")
    .select(
      `distance_km, avg_pace_seconds_per_km, workout_sessions!inner(patient_id, session_date)`,
    )
    .eq("workout_sessions.patient_id", userId);

  if (error || !data) {
    return {
      totalKmThisMonth: 0,
      totalRunsThisMonth: 0,
      bestPaceSecondsPerKm: null,
      longestRunKm: null,
    };
  }

  let totalKmThisMonth = 0;
  let totalRunsThisMonth = 0;
  let bestPace: number | null = null;
  let longestKm: number | null = null;

  for (const r of data) {
    const sessionRel = (r as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    const km = (r.distance_km as number | null) ?? 0;
    const pace = r.avg_pace_seconds_per_km as number | null;
    if (sessionRel?.session_date && sessionRel.session_date >= startOfMonth) {
      totalKmThisMonth += km;
      totalRunsThisMonth += 1;
    }
    if (km > 0 && (longestKm === null || km > longestKm)) longestKm = km;
    if (pace && pace > 0 && (bestPace === null || pace < bestPace))
      bestPace = pace;
  }

  return {
    totalKmThisMonth,
    totalRunsThisMonth,
    bestPaceSecondsPerKm: bestPace,
    longestRunKm: longestKm,
  };
}

// ─── Outras atividades ───────────────────────────────────────────────

export async function getOtherWorkouts(
  limit = 30,
): Promise<OtherWorkout[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("other_workouts")
    .select(
      `
      id, session_id, activity_type, duration_minutes, intensity,
      distance_km, estimated_calories, created_at,
      workout_sessions!inner(patient_id, session_date, notes)
      `,
    )
    .eq("workout_sessions.patient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => {
    const sessionRel = (r as {
      workout_sessions?: { session_date?: string; notes?: string | null };
    }).workout_sessions;
    return {
      id: r.id as string,
      sessionId: r.session_id as string,
      activityType: r.activity_type as ActivityType,
      durationMinutes: r.duration_minutes as number,
      intensity: r.intensity as IntensityLevel,
      distanceKm: (r.distance_km as number | null) ?? null,
      estimatedCalories: (r.estimated_calories as number | null) ?? null,
      createdAt: r.created_at as string,
      sessionDate: sessionRel?.session_date,
      notes: sessionRel?.notes ?? null,
    };
  });
}

/**
 * Stats agregadas pra header da aba Outros — total minutos/calorias do
 * mês + breakdown por atividade.
 */
export async function getOtherStats(): Promise<{
  totalMinutesThisMonth: number;
  totalCaloriesThisMonth: number;
  totalWorkoutsThisMonth: number;
  breakdown: Array<{ type: ActivityType; minutes: number; count: number }>;
}> {
  const empty = {
    totalMinutesThisMonth: 0,
    totalCaloriesThisMonth: 0,
    totalWorkoutsThisMonth: 0,
    breakdown: [],
  };
  if (!isSupabaseConfigured()) return empty;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return empty;
  const supabase = await createSupabaseWithJwt(accessToken);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("other_workouts")
    .select(
      `activity_type, duration_minutes, estimated_calories,
       workout_sessions!inner(patient_id, session_date)`,
    )
    .eq("workout_sessions.patient_id", userId);

  if (error || !data) return empty;

  let totalMinutes = 0;
  let totalCalories = 0;
  let totalWorkouts = 0;
  const byType = new Map<ActivityType, { minutes: number; count: number }>();

  for (const r of data) {
    const sessionRel = (r as { workout_sessions?: { session_date?: string } })
      .workout_sessions;
    if (!sessionRel?.session_date || sessionRel.session_date < startOfMonth) continue;
    const mins = (r.duration_minutes as number) ?? 0;
    const cals = (r.estimated_calories as number | null) ?? 0;
    const type = r.activity_type as ActivityType;
    totalMinutes += mins;
    totalCalories += cals;
    totalWorkouts += 1;
    const cur = byType.get(type) ?? { minutes: 0, count: 0 };
    cur.minutes += mins;
    cur.count += 1;
    byType.set(type, cur);
  }

  const breakdown = Array.from(byType.entries())
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    totalMinutesThisMonth: totalMinutes,
    totalCaloriesThisMonth: totalCalories,
    totalWorkoutsThisMonth: totalWorkouts,
    breakdown,
  };
}

// ─── Today's workout (Phase 3B) ───────────────────────────────────────

/**
 * Calcula qual treino do programa ativo é o "de hoje" baseado em ciclo
 * round-robin: count de strength sessions desde a criação do programa
 * mod length(days) + 1.
 *
 * Lógica simples — não trava o user em "deve ser dia X específico". Só
 * sugere o próximo do split.
 *
 * Retorna null se não há programa ativo.
 */
export async function getTodaysWorkout(): Promise<{
  program: WorkoutProgram;
  dayIndex: number;
  /** O ProgramDay que toca hoje, com nomes hidratados. */
  day: WorkoutProgram["structure"]["days"][number];
  /** Quantos strength workouts completados desde criação. */
  completedSinceStart: number;
} | null> {
  const program = await getActiveWorkoutProgram();
  if (!program) return null;
  const hydrated = await hydrateProgramExerciseNames(program);

  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);

  // Conta workout_sessions kind=strength desde a criação do programa
  const { count, error } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", userId)
    .eq("kind", "strength")
    .gte("created_at", hydrated.createdAt);

  if (error) return null;
  const completedSinceStart = count ?? 0;

  const totalDays = hydrated.structure.days.length;
  if (totalDays === 0) return null;

  // dayIndex de 1 a N: próximo treino na rotação
  const cycleIdx = completedSinceStart % totalDays; // 0-based
  const day = hydrated.structure.days[cycleIdx];

  return {
    program: hydrated,
    dayIndex: cycleIdx + 1,
    day,
    completedSinceStart,
  };
}
