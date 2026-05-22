import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type { FlowLevel, SymptomKey } from "@/lib/menstrual/types";
import { SYMPTOM_CATALOG } from "@/lib/menstrual/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET  /api/menstrual/entries?from=&to=  — lista entries do user
 * POST /api/menstrual/entries            — upsert do dia (unique
 *      constraint em patient_id+entry_date faz substituir se já existir)
 */

const VALID_FLOW: FlowLevel[] = ["none", "spotting", "light", "medium", "heavy"];
const VALID_SYMPTOMS = new Set(Object.keys(SYMPTOM_CATALOG) as SymptomKey[]);

interface SaveEntryBody {
  entry_date?: string; // YYYY-MM-DD
  flow?: FlowLevel | null;
  symptoms?: SymptomKey[];
  mood?: number | null;
  energy?: number | null;
  libido?: number | null;
  sleep_quality?: number | null;
  /** Lucas (2026-05-22): tri-state — null/true/false */
  sexual_activity?: boolean | null;
  notes?: string | null;
}

function validScale(n: unknown): boolean {
  return n == null || (typeof n === "number" && n >= 1 && n <= 5);
}

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

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
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, entries: data ?? [] },
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

  let body: SaveEntryBody;
  try {
    body = (await request.json()) as SaveEntryBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  // Validações
  if (!body.entry_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.entry_date)) {
    return NextResponse.json(
      { ok: false, error: "entry_date-required-YYYY-MM-DD" },
      { status: 400 },
    );
  }
  if (body.flow != null && !VALID_FLOW.includes(body.flow)) {
    return NextResponse.json(
      { ok: false, error: "invalid-flow" },
      { status: 400 },
    );
  }
  if (body.symptoms) {
    if (!Array.isArray(body.symptoms)) {
      return NextResponse.json(
        { ok: false, error: "symptoms-must-be-array" },
        { status: 400 },
      );
    }
    for (const s of body.symptoms) {
      if (!VALID_SYMPTOMS.has(s)) {
        return NextResponse.json(
          { ok: false, error: `invalid-symptom: ${s}` },
          { status: 400 },
        );
      }
    }
  }
  for (const [k, v] of [
    ["mood", body.mood],
    ["energy", body.energy],
    ["libido", body.libido],
    ["sleep_quality", body.sleep_quality],
  ] as const) {
    if (!validScale(v)) {
      return NextResponse.json(
        { ok: false, error: `${k}-must-be-1-to-5-or-null` },
        { status: 400 },
      );
    }
  }

  const supabase = await createSupabaseWithJwt(accessToken);

  // Valida sexual_activity (tri-state: null/true/false)
  if (
    body.sexual_activity != null &&
    typeof body.sexual_activity !== "boolean"
  ) {
    return NextResponse.json(
      { ok: false, error: "sexual_activity-must-be-boolean-or-null" },
      { status: 400 },
    );
  }

  const payload = {
    patient_id: userId,
    entry_date: body.entry_date,
    flow: body.flow ?? null,
    symptoms: body.symptoms ?? [],
    mood: body.mood ?? null,
    energy: body.energy ?? null,
    libido: body.libido ?? null,
    sleep_quality: body.sleep_quality ?? null,
    sexual_activity: body.sexual_activity ?? null,
    notes: body.notes ?? null,
  };

  const { data, error } = await supabase
    .from("menstrual_entries")
    .upsert(payload, { onConflict: "patient_id,entry_date" })
    .select("*")
    .single();

  if (error) {
    console.error("[menstrual/entries/POST]", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, entry: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
