/**
 * Helpers server-side pra ler/escrever profile + entries de ciclo
 * menstrual no Supabase.
 *
 * Convenção (mesma dos outros módulos): nunca throws. Retorna null se
 * sem auth / supabase off / erro. Caller decide UI fallback.
 */

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type {
  ContraceptiveKind,
  CycleRegularity,
  FlowLevel,
  MenstrualEntry,
  MenstrualProfile,
  ReproductiveStatus,
  SymptomKey,
} from "./types";

// ─── Profile rows ──────────────────────────────────────────────────────────

interface DbProfileRow {
  patient_id: string;
  tracking_enabled: boolean;
  last_period_start: string | null;
  avg_cycle_days: number;
  avg_period_days: number;
  cycle_regularity: CycleRegularity;
  contraceptive_kind: ContraceptiveKind | null;
  reproductive_status: ReproductiveStatus;
  onboarded_at: string | null;
  notes: string | null;
}

function profileFromRow(r: DbProfileRow): MenstrualProfile {
  return {
    patientId: r.patient_id,
    trackingEnabled: r.tracking_enabled,
    lastPeriodStart: r.last_period_start,
    avgCycleDays: r.avg_cycle_days,
    avgPeriodDays: r.avg_period_days,
    cycleRegularity: r.cycle_regularity,
    contraceptiveKind: r.contraceptive_kind,
    reproductiveStatus: r.reproductive_status,
    onboardedAt: r.onboarded_at,
    notes: r.notes,
  };
}

/** Lê profile do user logado. Retorna null se não onboarded ou sem auth. */
export async function fetchMyMenstrualProfile(): Promise<MenstrualProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) return null;

  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("menstrual_profile")
    .select("*")
    .eq("patient_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[menstrual] fetchMyMenstrualProfile:", error.message);
    return null;
  }
  if (!data) return null;
  return profileFromRow(data as DbProfileRow);
}

// ─── Entries rows ──────────────────────────────────────────────────────────

interface DbEntryRow {
  id: string;
  patient_id: string;
  entry_date: string;
  flow: FlowLevel | null;
  symptoms: unknown;
  mood: number | null;
  energy: number | null;
  libido: number | null;
  sleep_quality: number | null;
  sexual_activity: boolean | null;
  notes: string | null;
}

function entryFromRow(r: DbEntryRow): MenstrualEntry {
  return {
    id: r.id,
    entryDate: r.entry_date,
    flow: r.flow,
    symptoms: Array.isArray(r.symptoms) ? (r.symptoms as SymptomKey[]) : [],
    mood: r.mood,
    energy: r.energy,
    libido: r.libido,
    sleepQuality: r.sleep_quality,
    sexualActivity: r.sexual_activity,
    notes: r.notes,
  };
}

/**
 * Lê entries do user num intervalo. Retorna array (possivelmente vazio)
 * ou null em caso de erro de auth/DB.
 */
export async function fetchMyMenstrualEntries(
  from?: string,
  to?: string,
): Promise<MenstrualEntry[] | null> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) return null;

  const supabase = await createSupabaseWithJwt(accessToken);
  let query = supabase
    .from("menstrual_entries")
    .select("*")
    .eq("patient_id", userId)
    .order("entry_date", { ascending: false })
    .limit(200);

  if (from) query = query.gte("entry_date", from);
  if (to) query = query.lte("entry_date", to);

  const { data, error } = await query;
  if (error) {
    console.warn("[menstrual] fetchMyMenstrualEntries:", error.message);
    return null;
  }
  return (data ?? []).map((r) => entryFromRow(r as DbEntryRow));
}
