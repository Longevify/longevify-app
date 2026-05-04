import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Ingest endpoint — recebe métricas de saúde do app nativo (Capacitor)
 * e persiste em `daily_health_metrics`.
 *
 * Source típicos:
 *  - iOS HealthKit (via @capacitor-community/health) — Apple Watch,
 *    iPhone sensors, Health app aggregations
 *  - Android Health Connect (mesmo plugin) — Wear OS, fitness apps
 *
 * Body esperado (JSON):
 *   {
 *     source: "healthkit" | "healthconnect",
 *     metrics: [
 *       {
 *         date: "2026-05-04",          // YYYY-MM-DD
 *         sleep_minutes?: 480,
 *         sleep_efficiency?: 0.92,
 *         steps?: 9243,
 *         active_minutes?: 38,
 *         zone2_minutes?: 25,
 *         resting_hr?: 58,
 *         hrv?: 42.5,
 *         vo2max?: 47.2,
 *         calories_burned?: 2300,
 *       },
 *       // ... múltiplos dias por request (batching)
 *     ]
 *   }
 *
 * Upsert por (patient_id, date) — idempotente. App pode chamar várias
 * vezes com os mesmos dados sem duplicar.
 *
 * RLS na tabela garante que só o owner pode escrever — JWT do user é
 * cravado no Authorization header via createSupabaseWithJwt.
 */

interface MetricEntry {
  date: string;
  sleep_minutes?: number;
  sleep_efficiency?: number;
  steps?: number;
  active_minutes?: number;
  zone2_minutes?: number;
  resting_hr?: number;
  hrv?: number;
  vo2max?: number;
  calories_burned?: number;
  strain?: number;
}

interface IngestPayload {
  source: "healthkit" | "healthconnect";
  metrics: MetricEntry[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase-not-configured" },
      { status: 503 },
    );
  }

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "not-authenticated" },
      { status: 401 },
    );
  }

  let payload: IngestPayload;
  try {
    payload = (await req.json()) as IngestPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  if (!payload?.source || !Array.isArray(payload.metrics)) {
    return NextResponse.json(
      { ok: false, error: "invalid-payload" },
      { status: 400 },
    );
  }
  if (!["healthkit", "healthconnect"].includes(payload.source)) {
    return NextResponse.json(
      { ok: false, error: "invalid-source" },
      { status: 400 },
    );
  }
  if (payload.metrics.length === 0) {
    return NextResponse.json({ ok: true, ingested: 0 });
  }
  if (payload.metrics.length > 365) {
    // Limite de 1 ano de batch — evita abuse
    return NextResponse.json(
      { ok: false, error: "batch-too-large", max: 365 },
      { status: 400 },
    );
  }

  // Valida cada entry
  const rows: Record<string, unknown>[] = [];
  for (const m of payload.metrics) {
    if (!m.date || !ISO_DATE.test(m.date)) {
      return NextResponse.json(
        { ok: false, error: "invalid-date", value: m.date },
        { status: 400 },
      );
    }
    rows.push({
      patient_id: userId,
      date: m.date,
      sleep_minutes: numericOrNull(m.sleep_minutes),
      sleep_efficiency: numericOrNull(m.sleep_efficiency),
      steps: numericOrNull(m.steps),
      active_minutes: numericOrNull(m.active_minutes),
      zone2_minutes: numericOrNull(m.zone2_minutes),
      resting_hr: numericOrNull(m.resting_hr),
      hrv: numericOrNull(m.hrv),
      vo2max: numericOrNull(m.vo2max),
      calories_burned: numericOrNull(m.calories_burned),
      strain: numericOrNull(m.strain),
    });
  }

  const supabase = await createSupabaseWithJwt(accessToken);
  const { error } = await supabase
    .from("daily_health_metrics")
    .upsert(rows, { onConflict: "patient_id,date" });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      ingested: rows.length,
      source: payload.source,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function numericOrNull(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}
