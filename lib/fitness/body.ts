import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

/**
 * Phase 3I — Server helpers de body measurements (composição corporal).
 */

export interface BodyMeasurement {
  id: string;
  measuredAt: string; // YYYY-MM-DD
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
  visceralFat: number | null;
  boneMassKg: number | null;
  waterPct: number | null;
  notes: string | null;
  createdAt: string;
}

function mapRow(r: Record<string, unknown>): BodyMeasurement {
  const n = (v: unknown) => (v === null || v === undefined ? null : (v as number));
  return {
    id: r.id as string,
    measuredAt: r.measured_at as string,
    weightKg: n(r.weight_kg),
    bodyFatPct: n(r.body_fat_pct),
    muscleMassKg: n(r.muscle_mass_kg),
    waistCm: n(r.waist_cm),
    chestCm: n(r.chest_cm),
    hipCm: n(r.hip_cm),
    armCm: n(r.arm_cm),
    thighCm: n(r.thigh_cm),
    calfCm: n(r.calf_cm),
    visceralFat: n(r.visceral_fat),
    boneMassKg: n(r.bone_mass_kg),
    waterPct: n(r.water_pct),
    notes: (r.notes as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function getBodyMeasurements(
  limit = 60,
): Promise<BodyMeasurement[]> {
  if (!isSupabaseConfigured()) return [];
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return [];
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("patient_id", userId)
    .order("measured_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => mapRow(r as Record<string, unknown>));
}

export async function getLatestBodyMeasurement(): Promise<
  BodyMeasurement | null
> {
  if (!isSupabaseConfigured()) return null;
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId || !accessToken) return null;
  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("patient_id", userId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

/**
 * Trend de uma métrica específica nos últimos N meses.
 * Retorna [{ date, value }] ordenado asc.
 */
export interface BodyTrendPoint {
  date: string;
  value: number;
}

export function computeTrend(
  measurements: BodyMeasurement[],
  metric: keyof BodyMeasurement,
): BodyTrendPoint[] {
  const out: BodyTrendPoint[] = [];
  // Iterate em order asc
  const sorted = [...measurements].sort((a, b) =>
    a.measuredAt.localeCompare(b.measuredAt),
  );
  for (const m of sorted) {
    const v = m[metric];
    if (typeof v === "number" && Number.isFinite(v)) {
      out.push({ date: m.measuredAt, value: v });
    }
  }
  return out;
}
