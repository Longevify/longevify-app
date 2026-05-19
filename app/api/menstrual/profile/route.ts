import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type {
  ContraceptiveKind,
  CycleRegularity,
  ReproductiveStatus,
} from "@/lib/menstrual/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET  /api/menstrual/profile — retorna profile do user logado (ou null
 *      se ainda não fez onboarding).
 *
 * POST /api/menstrual/profile — upsert (onboarding ou update). Usa
 *      onConflict no patient_id (1 row por user).
 */

const VALID_REGULARITY: CycleRegularity[] = [
  "regular",
  "irregular",
  "variable",
  "unknown",
];
const VALID_CONTRACEPTIVE: ContraceptiveKind[] = [
  "none",
  "pill",
  "iud_hormonal",
  "iud_copper",
  "implant",
  "injection",
  "patch",
  "ring",
  "condom_only",
  "natural",
  "sterilization",
  "other",
];
const VALID_REPRODUCTIVE: ReproductiveStatus[] = [
  "regular",
  "trying_to_conceive",
  "pregnant",
  "postpartum",
  "perimenopause",
  "menopause",
  "unknown",
];

interface SaveProfileBody {
  tracking_enabled?: boolean;
  last_period_start?: string | null;
  avg_cycle_days?: number;
  avg_period_days?: number;
  cycle_regularity?: CycleRegularity;
  contraceptive_kind?: ContraceptiveKind | null;
  reproductive_status?: ReproductiveStatus;
  notes?: string | null;
  /** Quando true, marca onboarded_at = now() */
  mark_onboarded?: boolean;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503 },
    );
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "no-session-cookie" },
      { status: 401 },
    );
  }

  const supabase = await createSupabaseWithJwt(accessToken);
  const { data, error } = await supabase
    .from("menstrual_profile")
    .select("*")
    .eq("patient_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, profile: data ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503 },
    );
  }
  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "no-session-cookie" },
      { status: 401 },
    );
  }

  let body: SaveProfileBody;
  try {
    body = (await request.json()) as SaveProfileBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  // Validações
  if (
    body.avg_cycle_days != null &&
    (body.avg_cycle_days < 15 || body.avg_cycle_days > 60)
  ) {
    return NextResponse.json(
      { ok: false, error: "avg_cycle_days-out-of-range" },
      { status: 400 },
    );
  }
  if (
    body.avg_period_days != null &&
    (body.avg_period_days < 1 || body.avg_period_days > 15)
  ) {
    return NextResponse.json(
      { ok: false, error: "avg_period_days-out-of-range" },
      { status: 400 },
    );
  }
  if (
    body.cycle_regularity &&
    !VALID_REGULARITY.includes(body.cycle_regularity)
  ) {
    return NextResponse.json(
      { ok: false, error: "invalid-regularity" },
      { status: 400 },
    );
  }
  if (
    body.contraceptive_kind &&
    !VALID_CONTRACEPTIVE.includes(body.contraceptive_kind)
  ) {
    return NextResponse.json(
      { ok: false, error: "invalid-contraceptive" },
      { status: 400 },
    );
  }
  if (
    body.reproductive_status &&
    !VALID_REPRODUCTIVE.includes(body.reproductive_status)
  ) {
    return NextResponse.json(
      { ok: false, error: "invalid-reproductive-status" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseWithJwt(accessToken);

  // Upsert: insert se não existe, update se existe (onConflict patient_id)
  const payload: Record<string, unknown> = {
    patient_id: userId,
  };
  if (body.tracking_enabled != null) payload.tracking_enabled = body.tracking_enabled;
  if (body.last_period_start !== undefined) payload.last_period_start = body.last_period_start;
  if (body.avg_cycle_days != null) payload.avg_cycle_days = body.avg_cycle_days;
  if (body.avg_period_days != null) payload.avg_period_days = body.avg_period_days;
  if (body.cycle_regularity) payload.cycle_regularity = body.cycle_regularity;
  if (body.contraceptive_kind !== undefined) payload.contraceptive_kind = body.contraceptive_kind;
  if (body.reproductive_status) payload.reproductive_status = body.reproductive_status;
  if (body.notes !== undefined) payload.notes = body.notes;
  if (body.mark_onboarded) payload.onboarded_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("menstrual_profile")
    .upsert(payload, { onConflict: "patient_id" })
    .select("*")
    .single();

  if (error) {
    console.error("[menstrual/profile/POST]", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, profile: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
