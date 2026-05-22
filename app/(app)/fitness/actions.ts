"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type {
  EquipmentKind,
  ExperienceLevel,
  GpsPoint,
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
}): Promise<ActionResult<{ setId: string; sessionId: string }>> {
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
  return { ok: true, data: { setId: inserted.id as string, sessionId } };
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
}): Promise<ActionResult<{ sessionId: string; runningId: string }>> {
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
  return {
    ok: true,
    data: { sessionId, runningId: running.id as string },
  };
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
