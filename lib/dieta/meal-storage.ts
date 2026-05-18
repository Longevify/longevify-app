/**
 * Helpers server-side pra ler refeições salvas no Supabase (tabela
 * meal_entries — migration 0006).
 *
 * Lucas (2026-05-18): "a análise está acertando, porém não estão sendo
 * salvos esses dados novos". Esse módulo é o lado de LEITURA. O lado de
 * escrita está em /api/dieta/meals (POST).
 *
 * Convenção: se Supabase não estiver configurado, sem auth, ou DB vazio,
 * retorna `null` — caller decide se cai pra mock data ou mostra empty
 * state. Nunca throws — UX da dieta não pode quebrar por causa do
 * Supabase.
 */

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUserIdFromCookie } from "@/lib/auth/jwt";
import { createSupabaseWithJwt } from "@/lib/supabase/server-with-jwt";
import type {
  FoodItem,
  InputMethod,
  MealEntry,
  MealType,
  Nutrients,
} from "./types";

interface DbRow {
  id: string;
  patient_id?: string;
  taken_at: string;
  meal_type: MealType;
  input_method: InputMethod;
  items: unknown;
  total_nutrients: unknown;
  notes: string | null;
  photo_url: string | null;
}

/**
 * Converte uma row do DB pra MealEntry do domínio. Tolera campos
 * malformados (volta default seguro) — nunca throws.
 */
function rowToMeal(row: DbRow): MealEntry {
  return {
    id: row.id,
    patientId: row.patient_id ?? "",
    takenAt: row.taken_at,
    mealType: row.meal_type,
    inputMethod: row.input_method,
    items: Array.isArray(row.items) ? (row.items as FoodItem[]) : [],
    totalNutrients:
      row.total_nutrients && typeof row.total_nutrients === "object"
        ? (row.total_nutrients as Nutrients)
        : { calories: 0, protein: 0, carbs: 0, fat: 0 },
    notes: row.notes ?? undefined,
    photoUrl: row.photo_url ?? undefined,
  };
}

/**
 * Lê refeições do user logado num intervalo de datas.
 *
 * @param fromIso ISO date (inclusivo). Default = início do dia atual (00:00 local).
 * @param toIso   ISO date (exclusivo). Default = início do próximo dia.
 * @returns array de MealEntry ou null se sem auth / supabase off / erro
 */
export async function fetchUserMeals(
  fromIso?: string,
  toIso?: string,
  limit = 100,
): Promise<MealEntry[] | null> {
  if (!isSupabaseConfigured()) return null;

  const { userId, accessToken } = await getUserIdFromCookie();
  if (!userId) return null;

  const supabase = await createSupabaseWithJwt(accessToken);

  let query = supabase
    .from("meal_entries")
    .select(
      "id, patient_id, taken_at, meal_type, input_method, items, total_nutrients, notes, photo_url",
    )
    .eq("patient_id", userId)
    .order("taken_at", { ascending: false })
    .limit(limit);

  if (fromIso) query = query.gte("taken_at", fromIso);
  if (toIso) query = query.lt("taken_at", toIso);

  const { data, error } = await query;
  if (error) {
    console.warn("[meal-storage] fetchUserMeals falhou:", error.message);
    return null;
  }

  return (data ?? []).map((r) => rowToMeal(r as DbRow));
}

/**
 * Atalho pras refeições do dia atual (00:00 → próximo 00:00, fuso do
 * servidor — mesmo que client. Boa convenção pra MVP).
 */
export async function fetchUserMealsToday(): Promise<MealEntry[] | null> {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return fetchUserMeals(start.toISOString(), end.toISOString());
}

/**
 * Últimos 7 dias agrupados por data, agregados por nutriente. Usado pra
 * card "Tendência semanal" do dashboard.
 */
export async function fetchUserMealsWeeklyTrend(): Promise<
  { date: string; nutrients: Nutrients }[] | null
> {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 6); // 7 dias incluindo hoje
  start.setHours(0, 0, 0, 0);

  const meals = await fetchUserMeals(start.toISOString());
  if (meals == null) return null;

  // Bucket por YYYY-MM-DD
  const byDate = new Map<string, Nutrients>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }
  for (const m of meals) {
    const key = m.takenAt.slice(0, 10);
    const acc = byDate.get(key);
    if (!acc) continue;
    for (const k of Object.keys(m.totalNutrients) as (keyof Nutrients)[]) {
      const v = m.totalNutrients[k];
      if (typeof v === "number") {
        acc[k] = (acc[k] ?? 0) + v;
      }
    }
  }

  return Array.from(byDate.entries()).map(([date, nutrients]) => ({
    date,
    nutrients,
  }));
}
