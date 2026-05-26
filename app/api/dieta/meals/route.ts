import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import { awardPoints } from "@/lib/social/server";
import type { FoodItem, MealType, Nutrients } from "@/lib/dieta/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Endpoints:
 *   POST /api/dieta/meals   — salva uma refeição
 *   GET  /api/dieta/meals   — lista refeições do user (opcionalmente filtradas)
 *
 * Lucas (2026-05-18): "a análise está acertando, porém não estão sendo
 * salvos esses dados novos (não precisa salvar as fotos tiradas)".
 *
 * Storage: SÓ os dados estruturados (items + total_nutrients) vão pro
 * Supabase. A foto é descartada após o reconhecimento — não passa nem
 * pelo bucket. Decisão de privacidade + custo zero de storage.
 */

const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const VALID_INPUT_METHODS = ["photo", "text", "barcode", "manual"] as const;

interface SaveBody {
  meal_type?: MealType;
  input_method?: (typeof VALID_INPUT_METHODS)[number];
  items?: FoodItem[];
  total_nutrients?: Nutrients;
  notes?: string;
  taken_at?: string; // ISO; default = now()
}

// ─── POST: salvar refeição ─────────────────────────────────────────────────

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

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json-body" },
      { status: 400 },
    );
  }

  // Validações mínimas — RLS no Supabase já garante patient_id == uid
  if (!body.meal_type || !VALID_MEAL_TYPES.includes(body.meal_type)) {
    return NextResponse.json(
      { ok: false, error: "invalid-meal-type" },
      { status: 400 },
    );
  }
  if (
    !body.input_method ||
    !VALID_INPUT_METHODS.includes(body.input_method)
  ) {
    return NextResponse.json(
      { ok: false, error: "invalid-input-method" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "items-required" },
      { status: 400 },
    );
  }
  if (!body.total_nutrients || typeof body.total_nutrients !== "object") {
    return NextResponse.json(
      { ok: false, error: "total-nutrients-required" },
      { status: 400 },
    );
  }

  const takenAt = body.taken_at ?? new Date().toISOString();

  const supabase = await createSupabaseWithJwt(accessToken);

  const { data, error } = await supabase
    .from("meal_entries")
    .insert({
      patient_id: userId,
      taken_at: takenAt,
      meal_type: body.meal_type,
      input_method: body.input_method,
      items: body.items,
      total_nutrients: body.total_nutrients,
      notes: body.notes ?? null,
    })
    .select("id, taken_at, meal_type, input_method, created_at")
    .single();

  if (error) {
    console.error("[meals/POST] supabase error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  // Lucas (2026-05-26): pontos meal_logged (5pts) — cada refeição
  // logada. Múltiplas refeições no mesmo dia somam (5 × 4 = 20pts/dia
  // se loga café/almoço/lanche/jantar). Fire-and-forget — não bloqueia
  // resposta caso awardPoints falhe.
  await awardPoints("meal_logged", {
    mealId: data?.id,
    mealType: body.meal_type,
  }).catch((err) => {
    console.error("[meals/POST] awardPoints failed:", err);
  });

  return NextResponse.json(
    { ok: true, meal: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// ─── GET: listar refeições ─────────────────────────────────────────────────
//
// Query params:
//   ?from=YYYY-MM-DD  — filtra taken_at >= from (inclusivo, 00:00 UTC)
//   ?to=YYYY-MM-DD    — filtra taken_at <  to (exclusivo)
//   ?limit=N          — default 50, max 200
//
// Sem params → últimas 50 refeições.

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
  const limitRaw = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);

  const supabase = await createSupabaseWithJwt(accessToken);

  let query = supabase
    .from("meal_entries")
    .select(
      "id, taken_at, meal_type, input_method, items, total_nutrients, notes, photo_url, created_at",
    )
    .eq("patient_id", userId)
    .order("taken_at", { ascending: false })
    .limit(limit);

  if (from) query = query.gte("taken_at", `${from}T00:00:00Z`);
  if (to) query = query.lt("taken_at", `${to}T00:00:00Z`);

  const { data, error } = await query;

  if (error) {
    console.error("[meals/GET] supabase error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, meals: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
