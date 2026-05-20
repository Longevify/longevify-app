import {
  getTodayMeals,
  getDailyTotals,
  getWeeklyTrend,
  getWeeklyAverage,
} from "@/lib/dieta/mock-meals";
import {
  getDailyTarget,
  getDeficitInsights,
  sumMealNutrients,
} from "@/lib/dieta/calculations";
import {
  fetchUserMealsToday,
  fetchUserMealsWeeklyTrend,
} from "@/lib/dieta/meal-storage";
import type { Nutrients } from "@/lib/dieta/types";
import { DietaClient } from "./dieta-client";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lucas (2026-05-18): "a análise está acertando, porém não estão sendo
 * salvos esses dados novos". Página agora prioriza dados REAIS do
 * Supabase (tabela meal_entries) e cai pra mock só quando o user ainda
 * não registrou nada — assim a demo continua bonita pra contas zeradas.
 */
export default async function DietaPage() {
  const user = await getCurrentUser();

  // Lucas (2026-05-20): "para um usuário novo, a aba de dieta tem que
  // estar vazia." Antes paciente real sem refeições caía no mock do João.
  // Agora: só DEMO usa mock; user real sem refeições vê estado vazio
  // (zerado), pronto pra adicionar a primeira refeição.

  // Tenta puxar dados reais do user logado em paralelo
  const [realTodayMeals, realWeeklyTrend] = await Promise.all([
    fetchUserMealsToday(),
    fetchUserMealsWeeklyTrend(),
  ]);

  const hasRealToday = (realTodayMeals?.length ?? 0) > 0;
  const hasRealWeekly =
    realWeeklyTrend?.some((d) => d.nutrients.calories > 0) ?? false;

  // Demo (João): usa mock pra demonstrar UX cheia.
  // User real: usa SÓ dados reais; sem refeições → vazio.
  const useMockFallback = user.isDemo;

  const emptyDayNutrients: Nutrients = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const todayMeals = hasRealToday
    ? realTodayMeals!
    : useMockFallback
      ? getTodayMeals()
      : [];
  const todayTotals: Nutrients = hasRealToday
    ? sumMealNutrients(realTodayMeals!)
    : useMockFallback
      ? getDailyTotals(0)
      : emptyDayNutrients;
  const targets = getDailyTarget();

  const emptyWeeklyTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().slice(0, 10),
      nutrients: { ...emptyDayNutrients },
    };
  });

  const weeklyTrend = hasRealWeekly
    ? realWeeklyTrend!
    : useMockFallback
      ? getWeeklyTrend()
      : emptyWeeklyTrend;
  const weeklyAvg: Nutrients = hasRealWeekly
    ? avgWeeklyNutrients(realWeeklyTrend!)
    : useMockFallback
      ? getWeeklyAverage()
      : emptyDayNutrients;
  const insights = useMockFallback || hasRealWeekly
    ? getDeficitInsights(weeklyAvg)
    : []; // user novo: sem insights ainda

  return (
    <DietaClient
      todayMeals={todayMeals}
      todayTotals={todayTotals}
      targets={targets}
      weeklyTrend={weeklyTrend}
      insights={insights}
    />
  );
}

/** Média diária dos 7 dias (só dias com consumo registrado). */
function avgWeeklyNutrients(
  trend: { date: string; nutrients: Nutrients }[],
): Nutrients {
  const totals: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  let count = 0;
  for (const day of trend) {
    if (day.nutrients.calories <= 0) continue;
    count++;
    for (const k of Object.keys(day.nutrients) as (keyof Nutrients)[]) {
      const v = day.nutrients[k];
      if (typeof v === "number") {
        totals[k] = (totals[k] ?? 0) + v;
      }
    }
  }
  if (count === 0) return totals;
  for (const k of Object.keys(totals) as (keyof Nutrients)[]) {
    const v = totals[k];
    if (typeof v === "number") {
      totals[k] = v / count;
    }
  }
  return totals;
}
