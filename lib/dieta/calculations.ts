import {
  type FoodItem,
  type MealEntry,
  type Nutrients,
  type NutrientTargets,
  DEFAULT_TARGETS,
  EMPTY_NUTRIENTS,
} from "./types";

/**
 * Soma nutrientes de uma lista de FoodItems. Trata undefined como 0.
 */
export function sumNutrients(items: FoodItem[]): Nutrients {
  const totals: Nutrients = { ...EMPTY_NUTRIENTS };
  for (const item of items) {
    for (const key of Object.keys(totals) as (keyof Nutrients)[]) {
      const val = item.nutrients[key];
      if (typeof val === "number") {
        totals[key] = (totals[key] ?? 0) + val;
      }
    }
  }
  return totals;
}

/**
 * Soma nutrientes totais de uma lista de meals.
 */
export function sumMealNutrients(meals: MealEntry[]): Nutrients {
  return sumNutrients(meals.flatMap((m) => m.items));
}

/**
 * Retorna o target diário pro paciente. Por enquanto retorna o default;
 * no futuro vai customizar por peso/sexo/idade.
 */
export function getDailyTarget(): NutrientTargets {
  return DEFAULT_TARGETS;
}

/**
 * % de cumprimento de cada nutriente vs target.
 * Valor 1.0 = atingiu alvo. >1.0 = passou. <1.0 = abaixo.
 */
export function getNutrientPercentages(
  nutrients: Nutrients,
  targets: NutrientTargets = DEFAULT_TARGETS,
): Record<keyof NutrientTargets, number> {
  return {
    calories: nutrients.calories / targets.calories,
    protein: nutrients.protein / targets.protein,
    carbs: nutrients.carbs / targets.carbs,
    fat: nutrients.fat / targets.fat,
    fiber: (nutrients.fiber ?? 0) / targets.fiber,
    vitaminD: (nutrients.vitaminD ?? 0) / targets.vitaminD,
    vitaminB12: (nutrients.vitaminB12 ?? 0) / targets.vitaminB12,
    iron: (nutrients.iron ?? 0) / targets.iron,
    omega3: (nutrients.omega3 ?? 0) / targets.omega3,
  };
}

// ─── Insights ───────────────────────────────────────────────────────────────

export interface DietInsight {
  id: string;
  severity: "good" | "warn" | "info";
  title: string;
  detail: string;
}

/**
 * Gera insights a partir da média semanal de nutrientes. Foco em
 * deficiências relacionadas a biomarcadores que o Longevify trackeia.
 */
export function getDeficitInsights(weeklyAvg: Nutrients): DietInsight[] {
  const insights: DietInsight[] = [];
  const t = DEFAULT_TARGETS;

  if (weeklyAvg.protein < t.protein * 0.8) {
    insights.push({
      id: "low-protein",
      severity: "warn",
      title: "Proteína 20% abaixo do alvo",
      detail: `Média ${weeklyAvg.protein.toFixed(0)}g/dia · alvo ${t.protein}g. Acrescente 2 ovos ou 100g de frango por refeição pra fechar.`,
    });
  } else if (weeklyAvg.protein > t.protein * 1.1) {
    insights.push({
      id: "good-protein",
      severity: "good",
      title: "Proteína em faixa ótima",
      detail: `Média ${weeklyAvg.protein.toFixed(0)}g/dia — mantém massa magra e síntese hormonal.`,
    });
  }

  if ((weeklyAvg.omega3 ?? 0) < t.omega3 * 0.6) {
    insights.push({
      id: "low-omega3",
      severity: "warn",
      title: "Ômega 3 baixo na semana",
      detail: `Apenas ${(weeklyAvg.omega3 ?? 0).toFixed(1)}g/dia (ideal ${t.omega3}g). Inclua salmão, sardinha ou suplementação 2x/semana.`,
    });
  }

  if ((weeklyAvg.vitaminD ?? 0) < t.vitaminD * 0.5) {
    insights.push({
      id: "low-vitd",
      severity: "warn",
      title: "Vitamina D dietética insuficiente",
      detail: `Sua alimentação só fornece ${(weeklyAvg.vitaminD ?? 0).toFixed(1)}µg/dia. Sol matinal + suplementação 2.000 UI são necessários.`,
    });
  }

  if ((weeklyAvg.fiber ?? 0) < t.fiber * 0.7) {
    insights.push({
      id: "low-fiber",
      severity: "warn",
      title: "Fibra abaixo do recomendado",
      detail: `Média ${(weeklyAvg.fiber ?? 0).toFixed(0)}g/dia (alvo 30g). Aumenta saciedade, reduz LDL e alimenta microbioma.`,
    });
  }

  if ((weeklyAvg.sugar ?? 0) > 50) {
    insights.push({
      id: "high-sugar",
      severity: "warn",
      title: "Açúcar adicionado alto",
      detail: `${(weeklyAvg.sugar ?? 0).toFixed(0)}g/dia em média. AHA recomenda <25g pra mulheres, <36g pra homens.`,
    });
  }

  if (weeklyAvg.calories < t.calories * 0.7) {
    insights.push({
      id: "low-cal",
      severity: "warn",
      title: "Ingestão calórica baixa",
      detail: `${weeklyAvg.calories.toFixed(0)} kcal/dia. Restrição prolongada compromete função tireoidiana e massa magra.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "all-good",
      severity: "good",
      title: "Dieta consistente esta semana",
      detail: "Macros e micros dentro da faixa ideal. Mantém o protocolo.",
    });
  }

  return insights.slice(0, 4);
}
