import {
  getTodayMeals,
  getDailyTotals,
  getWeeklyTrend,
  getWeeklyAverage,
} from "@/lib/dieta/mock-meals";
import { getDailyTarget, getDeficitInsights } from "@/lib/dieta/calculations";
import { DietaClient } from "./dieta-client";

export default function DietaPage() {
  const todayMeals = getTodayMeals();
  const todayTotals = getDailyTotals(0);
  const targets = getDailyTarget();
  const weeklyTrend = getWeeklyTrend();
  const weeklyAvg = getWeeklyAverage();
  const insights = getDeficitInsights(weeklyAvg);

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
