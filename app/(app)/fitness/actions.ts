"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { evaluateAchievements } from "@/lib/fitness/achievements";
import {
  awardPoints,
  maybeAwardDailyTasksAndStreak,
} from "@/lib/social/server";
import type {
  Achievement,
  ActivityType,
  EquipmentKind,
  ExperienceLevel,
  GpsPoint,
  IntensityLevel,
  PaceSegment,
  ProgramGoal,
  ProgramStructure,
} from "@/lib/fitness/types";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Loga um set de musculação. Cria a workout_session do dia
 * automaticamente se ainda não existir (upsert lazy). Retorna o ID
 * do set criado.
 */
export async function logStrengthSet(input: {
  exerciseId: string;
  weightKg: number | null;
  reps: number;
  rpe?: number | null;
}): Promise<
  ActionResult<{
    setId: string;
    sessionId: string;
    newAchievements: Achievement[];
  }>
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível" };
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) {
    return { ok: false, error: "Não autenticado" };
  }
  if (!input.exerciseId || input.reps <= 0) {
    return { ok: false, error: "Dados inválidos (exercício / reps)" };
  }

  const supabase = await createSupabaseWithJwt(accessToken);
  const today = new Date().toISOString().slice(0, 10);

  // Acha a session aberta de hoje OU cria uma nova
  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("patient_id", userId)
    .eq("kind", "strength")
    .eq("session_date", today)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionId: string;
  let sessionNewlyCreated = false;
  if (existing?.id) {
    sessionId = existing.id as string;
  } else {
    const { data: created, error: createErr } = await supabase
      .from("workout_sessions")
      .insert({
        patient_id: userId,
        kind: "strength",
        session_date: today,
      })
      .select("id")
      .single();
    if (createErr || !created) {
      return {
        ok: false,
        error: `Erro ao criar sessão: ${createErr?.message ?? "—"}`,
      };
    }
    sessionId = created.id as string;
    sessionNewlyCreated = true;
  }

  // Acha próximo set_order
  const { data: lastSet } = await supabase
    .from("workout_sets")
    .select("set_order")
    .eq("session_id", sessionId)
    .eq("exercise_id", input.exerciseId)
    .order("set_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const setOrder = ((lastSet?.set_order as number | undefined) ?? 0) + 1;

  const { data: inserted, error: insErr } = await supabase
    .from("workout_sets")
    .insert({
      session_id: sessionId,
      exercise_id: input.exerciseId,
      set_order: setOrder,
      weight_kg: input.weightKg,
      reps: input.reps,
      rpe: input.rpe ?? null,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return { ok: false, error: `Erro ao gravar: ${insErr?.message ?? "—"}` };
  }

  revalidatePath("/fitness/musculacao");

  // Lucas (2026-05-26): cabear pontos workout_logged. Só awarda na 1ª
  // set da sessão (sessionNewlyCreated) — sets subsequentes não somam
  // pontos extras (senão usuário com 30 sets ganha 600pts, abusivo).
  if (sessionNewlyCreated) {
    await awardPoints("workout_logged", { sessionId });
  }

  // Avalia conquistas (Phase 3C). Fire-and-forget — não bloqueia o
  // retorno. Mas precisamos do resultado pra tocar o toast no client.
  // Como server actions são síncronas, esperamos rápido (~50ms total
  // pra avaliar mesmo com 30 conquistas).
  const unlocked = await evaluateAchievements();

  // Awarda achievement_unlocked pra cada conquista nova — usa o xp da
  // conquista como pointsOverride (cada conquista tem peso próprio).
  for (const a of unlocked) {
    await awardPoints("achievement_unlocked", { achievementId: a.id }, a.xp);
  }

  // Lucas (2026-05-26): check daily tasks + streak depois de awarda
  // workout/running/other — talvez user acabou de completar (refeição
  // + treino) hoje. Função é idempotente (não dispara 2x no mesmo dia).
  await maybeAwardDailyTasksAndStreak();

  return {
    ok: true,
    data: {
      setId: inserted.id as string,
      sessionId,
      newAchievements: unlocked,
    },
  };
}

/**
 * Salva um programa gerado por IA. Faz "deactivate-all + insert active"
 * em transação manual — programa novo vira o ativo, antigos viram
 * histórico (active = false).
 *
 * Phase 2B — Lucas pediu "AI workout generator com base em perguntas
 * iniciais".
 */
export async function saveAiWorkoutProgram(input: {
  name: string;
  goal: ProgramGoal;
  frequencyPerWeek: number;
  equipmentAvailable: EquipmentKind[];
  experienceLevel: ExperienceLevel;
  restrictions: string;
  structure: ProgramStructure;
  aiModel?: string;
}): Promise<ActionResult<{ programId: string }>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível" };
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) {
    return { ok: false, error: "Não autenticado" };
  }
  if (!input.structure?.days?.length) {
    return { ok: false, error: "Estrutura do programa inválida" };
  }

  const supabase = await createSupabaseWithJwt(accessToken);

  // Desativa programas anteriores (uniqueness do índice parcial exige isso)
  const { error: deactErr } = await supabase
    .from("workout_programs")
    .update({ active: false })
    .eq("patient_id", userId)
    .eq("active", true);
  if (deactErr) {
    return {
      ok: false,
      error: `Erro ao desativar programa anterior: ${deactErr.message}`,
    };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("workout_programs")
    .insert({
      patient_id: userId,
      name: input.name,
      goal: input.goal,
      frequency_per_week: input.frequencyPerWeek,
      equipment_available: input.equipmentAvailable,
      experience_level: input.experienceLevel,
      restrictions: input.restrictions || null,
      structure: input.structure,
      ai_model: input.aiModel ?? "claude-sonnet-4-6",
      active: true,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return {
      ok: false,
      error: `Erro ao salvar programa: ${insErr?.message ?? "—"}`,
    };
  }

  revalidatePath("/fitness/musculacao");
  revalidatePath("/fitness/musculacao/programa");
  return { ok: true, data: { programId: inserted.id as string } };
}

/** Arquiva o programa ativo (deactivate). */
export async function archiveActiveProgram(): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível" };
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return { ok: false, error: "Não autenticado" };
  const supabase = await createSupabaseWithJwt(accessToken);
  const { error } = await supabase
    .from("workout_programs")
    .update({ active: false })
    .eq("patient_id", userId)
    .eq("active", true);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/fitness/musculacao");
  revalidatePath("/fitness/musculacao/programa");
  return { ok: true };
}

/**
 * Salva uma sessão de corrida.
 *
 * Cria workout_session (kind='running') + running_session (1:1) com
 * coords GPS, pace por km, distância total e duração.
 *
 * Lucas (2026-05-21): "atuando como cronometro, medidor de pace e
 * mostrando a localização de onde você está correndo, quanto o pace
 * ta variando nos determinados pontos do trajeto"
 */
export async function saveRunningSession(input: {
  distanceKm: number;
  durationSeconds: number;
  avgPaceSecondsPerKm: number;
  coordinates: GpsPoint[];
  paceSegments: PaceSegment[];
  notes?: string;
}): Promise<
  ActionResult<{
    sessionId: string;
    runningId: string;
    newAchievements: Achievement[];
  }>
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível" };
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) {
    return { ok: false, error: "Não autenticado" };
  }
  if (input.distanceKm <= 0 || input.durationSeconds <= 0) {
    return { ok: false, error: "Distância ou duração inválida" };
  }

  const supabase = await createSupabaseWithJwt(accessToken);
  const today = new Date().toISOString().slice(0, 10);

  // Cria a workout_session
  const { data: session, error: sessErr } = await supabase
    .from("workout_sessions")
    .insert({
      patient_id: userId,
      kind: "running",
      session_date: today,
      notes: input.notes ?? null,
      ended_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessErr || !session) {
    return {
      ok: false,
      error: `Erro ao criar sessão: ${sessErr?.message ?? "—"}`,
    };
  }

  const sessionId = session.id as string;

  // Cria a running_session
  const { data: running, error: runErr } = await supabase
    .from("running_sessions")
    .insert({
      session_id: sessionId,
      distance_km: input.distanceKm,
      duration_seconds: input.durationSeconds,
      avg_pace_seconds_per_km: input.avgPaceSecondsPerKm,
      coordinates: input.coordinates,
      pace_segments: input.paceSegments,
    })
    .select("id")
    .single();

  if (runErr || !running) {
    // Rollback parcial: deleta workout_session pra não ter órfão
    await supabase.from("workout_sessions").delete().eq("id", sessionId);
    return {
      ok: false,
      error: `Erro ao gravar corrida: ${runErr?.message ?? "—"}`,
    };
  }

  revalidatePath("/fitness/corrida");
  // Lucas (2026-05-26): pontos running_logged (30pts) — uma vez por
  // sessão, fired aqui antes de retornar.
  await awardPoints("running_logged", { sessionId, distanceKm: input.distanceKm });

  const unlocked = await evaluateAchievements();
  for (const a of unlocked) {
    await awardPoints("achievement_unlocked", { achievementId: a.id }, a.xp);
  }

  // Lucas (2026-05-26): check daily tasks + streak depois de awarda
  // workout/running/other — talvez user acabou de completar (refeição
  // + treino) hoje. Função é idempotente (não dispara 2x no mesmo dia).
  await maybeAwardDailyTasksAndStreak();
  return {
    ok: true,
    data: {
      sessionId,
      runningId: running.id as string,
      newAchievements: unlocked,
    },
  };
}

/**
 * Loga uma atividade não-musculação não-corrida (bike, natação, yoga,
 * etc.). Cria workout_session (kind='cardio' ou 'other' dependendo
 * da atividade) + other_workouts.
 *
 * Phase 2D — Lucas: "outra para demais exercícios."
 */
export async function logOtherWorkout(input: {
  activityType: ActivityType;
  durationMinutes: number;
  intensity: IntensityLevel;
  distanceKm?: number | null;
  estimatedCalories?: number | null;
  notes?: string;
  sessionDate?: string; // YYYY-MM-DD, default today
}): Promise<
  ActionResult<{
    sessionId: string;
    otherId: string;
    newAchievements: Achievement[];
  }>
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível" };
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) {
    return { ok: false, error: "Não autenticado" };
  }
  if (input.durationMinutes <= 0) {
    return { ok: false, error: "Duração inválida" };
  }

  const supabase = await createSupabaseWithJwt(accessToken);
  const today = input.sessionDate ?? new Date().toISOString().slice(0, 10);

  // kind = 'cardio' pra bike/swim/walk/row/hiit, 'other' pro resto
  const cardioActivities: ActivityType[] = [
    "bike",
    "swim",
    "walking",
    "rowing",
    "hiit",
  ];
  const kind = cardioActivities.includes(input.activityType) ? "cardio" : "other";

  const { data: session, error: sessErr } = await supabase
    .from("workout_sessions")
    .insert({
      patient_id: userId,
      kind,
      session_date: today,
      notes: input.notes ?? null,
      ended_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessErr || !session) {
    return {
      ok: false,
      error: `Erro ao criar sessão: ${sessErr?.message ?? "—"}`,
    };
  }

  const sessionId = session.id as string;

  const { data: inserted, error: insErr } = await supabase
    .from("other_workouts")
    .insert({
      session_id: sessionId,
      activity_type: input.activityType,
      duration_minutes: input.durationMinutes,
      intensity: input.intensity,
      distance_km: input.distanceKm ?? null,
      estimated_calories: input.estimatedCalories ?? null,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    await supabase.from("workout_sessions").delete().eq("id", sessionId);
    return {
      ok: false,
      error: `Erro ao gravar atividade: ${insErr?.message ?? "—"}`,
    };
  }

  revalidatePath("/fitness/outros");
  // Lucas (2026-05-26): outros workouts (bike/swim/yoga/etc) também
  // contam como workout_logged (20pts). Activity_type vai no context
  // pra futuro analytics.
  await awardPoints("workout_logged", {
    sessionId,
    activityType: input.activityType,
  });

  const unlocked = await evaluateAchievements();
  for (const a of unlocked) {
    await awardPoints("achievement_unlocked", { achievementId: a.id }, a.xp);
  }

  // Lucas (2026-05-26): check daily tasks + streak depois de awarda
  // workout/running/other — talvez user acabou de completar (refeição
  // + treino) hoje. Função é idempotente (não dispara 2x no mesmo dia).
  await maybeAwardDailyTasksAndStreak();
  return {
    ok: true,
    data: {
      sessionId,
      otherId: inserted.id as string,
      newAchievements: unlocked,
    },
  };
}

/** Deleta uma atividade other. */
export async function deleteOtherWorkout(
  sessionId: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível" };
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return { ok: false, error: "Não autenticado" };
  const supabase = await createSupabaseWithJwt(accessToken);
  // ON DELETE CASCADE no FK do other_workouts apaga junto
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("patient_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/fitness/outros");
  return { ok: true };
}

/** Deleta um set (rollback de erro de digitação, por exemplo). */
export async function deleteStrengthSet(setId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível" };
  }
  const { accessToken } = await getUserIdFromCookie();
  if (!accessToken) return { ok: false, error: "Não autenticado" };
  const supabase = await createSupabaseWithJwt(accessToken);
  const { error } = await supabase
    .from("workout_sets")
    .delete()
    .eq("id", setId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/fitness/musculacao");
  return { ok: true };
}

/**
 * Phase 3I — Loga/atualiza medidas corporais. Upsert por (patient_id,
 * measured_at) — 1 medição por dia.
 */
export async function logBodyMeasurement(input: {
  measuredAt?: string; // YYYY-MM-DD, default hoje
  weightKg?: number | null;
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
  visceralFat?: number | null;
  boneMassKg?: number | null;
  waterPct?: number | null;
  notes?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível" };
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return { ok: false, error: "Não autenticado" };

  const measuredAt = input.measuredAt ?? new Date().toISOString().slice(0, 10);

  const row = {
    patient_id: userId,
    measured_at: measuredAt,
    weight_kg: input.weightKg ?? null,
    body_fat_pct: input.bodyFatPct ?? null,
    muscle_mass_kg: input.muscleMassKg ?? null,
    waist_cm: input.waistCm ?? null,
    chest_cm: input.chestCm ?? null,
    hip_cm: input.hipCm ?? null,
    arm_cm: input.armCm ?? null,
    thigh_cm: input.thighCm ?? null,
    calf_cm: input.calfCm ?? null,
    visceral_fat: input.visceralFat ?? null,
    bone_mass_kg: input.boneMassKg ?? null,
    water_pct: input.waterPct ?? null,
    notes: input.notes ?? null,
  };

  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("body_measurements")
    .upsert(row, { onConflict: "patient_id,measured_at" })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Erro ao gravar" };
  }

  revalidatePath("/fitness/medidas");
  revalidatePath("/fitness");
  return { ok: true, data: { id: data.id as string } };
}

/** Deleta uma medição. */
export async function deleteBodyMeasurement(
  id: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase indisponível" };
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return { ok: false, error: "Não autenticado" };
  const supabase = await createSupabaseWithJwt(accessToken);
  const { error } = await supabase
    .from("body_measurements")
    .delete()
    .eq("id", id)
    .eq("patient_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/fitness/medidas");
  return { ok: true };
}
