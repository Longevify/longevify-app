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
 *
 * Pra nutrientes de tipo "limit" (sódio, açúcar, gordura saturada,
 * colesterol), valores > 1.0 são RUINS. A UI inverte a cor.
 */
export function getNutrientPercentages(
  nutrients: Nutrients,
  targets: NutrientTargets = DEFAULT_TARGETS,
): Record<keyof NutrientTargets, number> {
  return {
    // Macros
    calories: nutrients.calories / targets.calories,
    protein: nutrients.protein / targets.protein,
    carbs: nutrients.carbs / targets.carbs,
    fat: nutrients.fat / targets.fat,
    // Subcomponentes
    fiber: (nutrients.fiber ?? 0) / targets.fiber,
    sugar: (nutrients.sugar ?? 0) / targets.sugar,
    saturatedFat: (nutrients.saturatedFat ?? 0) / targets.saturatedFat,
    cholesterol: (nutrients.cholesterol ?? 0) / targets.cholesterol,
    sodium: (nutrients.sodium ?? 0) / targets.sodium,
    // Vitaminas
    vitaminA: (nutrients.vitaminA ?? 0) / targets.vitaminA,
    vitaminD: (nutrients.vitaminD ?? 0) / targets.vitaminD,
    vitaminE: (nutrients.vitaminE ?? 0) / targets.vitaminE,
    vitaminK: (nutrients.vitaminK ?? 0) / targets.vitaminK,
    vitaminC: (nutrients.vitaminC ?? 0) / targets.vitaminC,
    vitaminB1: (nutrients.vitaminB1 ?? 0) / targets.vitaminB1,
    vitaminB2: (nutrients.vitaminB2 ?? 0) / targets.vitaminB2,
    vitaminB3: (nutrients.vitaminB3 ?? 0) / targets.vitaminB3,
    vitaminB6: (nutrients.vitaminB6 ?? 0) / targets.vitaminB6,
    vitaminB9: (nutrients.vitaminB9 ?? 0) / targets.vitaminB9,
    vitaminB12: (nutrients.vitaminB12 ?? 0) / targets.vitaminB12,
    // Minerais
    calcium: (nutrients.calcium ?? 0) / targets.calcium,
    iron: (nutrients.iron ?? 0) / targets.iron,
    magnesium: (nutrients.magnesium ?? 0) / targets.magnesium,
    potassium: (nutrients.potassium ?? 0) / targets.potassium,
    zinc: (nutrients.zinc ?? 0) / targets.zinc,
    selenium: (nutrients.selenium ?? 0) / targets.selenium,
    // Outros
    omega3: (nutrients.omega3 ?? 0) / targets.omega3,
    choline: (nutrients.choline ?? 0) / targets.choline,
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
 * deficiências relacionadas a biomarcadores que o Longevify trackeia
 * + excessos de nutrientes-limite (sódio, açúcar, sat. fat).
 *
 * Limita a 4 insights pra evitar overload — prioriza warn antes de
 * good. Se nada estiver fora da curva, mostra um único "tudo certo".
 */
export function getDeficitInsights(weeklyAvg: Nutrients): DietInsight[] {
  const warnings: DietInsight[] = [];
  const goods: DietInsight[] = [];
  const t = DEFAULT_TARGETS;

  // ── Proteína ─────────────────────────────────────────────────
  if (weeklyAvg.protein < t.protein * 0.8) {
    warnings.push({
      id: "low-protein",
      severity: "warn",
      title: "Proteína 20% abaixo do alvo",
      detail: `Média ${weeklyAvg.protein.toFixed(0)}g/dia · alvo ${t.protein}g. Acrescente 2 ovos ou 100g de frango por refeição pra fechar.`,
    });
  } else if (weeklyAvg.protein > t.protein * 1.1) {
    goods.push({
      id: "good-protein",
      severity: "good",
      title: "Proteína em faixa ótima",
      detail: `Média ${weeklyAvg.protein.toFixed(0)}g/dia — mantém massa magra e síntese hormonal.`,
    });
  }

  // ── Ômega-3 ──────────────────────────────────────────────────
  if ((weeklyAvg.omega3 ?? 0) < t.omega3 * 0.6) {
    warnings.push({
      id: "low-omega3",
      severity: "warn",
      title: "Ômega 3 baixo na semana",
      detail: `Apenas ${(weeklyAvg.omega3 ?? 0).toFixed(1)}g/dia (ideal ${t.omega3}g). Inclua salmão, sardinha ou suplementação 2x/semana.`,
    });
  }

  // ── Vit D ───────────────────────────────────────────────────
  if ((weeklyAvg.vitaminD ?? 0) < t.vitaminD * 0.5) {
    warnings.push({
      id: "low-vitd",
      severity: "warn",
      title: "Vitamina D dietética insuficiente",
      detail: `Sua alimentação só fornece ${(weeklyAvg.vitaminD ?? 0).toFixed(1)}µg/dia. Sol matinal + suplementação 2.000 UI são necessários.`,
    });
  }

  // ── Vit C ───────────────────────────────────────────────────
  if ((weeklyAvg.vitaminC ?? 0) < t.vitaminC * 0.6) {
    warnings.push({
      id: "low-vitc",
      severity: "warn",
      title: "Vitamina C abaixo do recomendado",
      detail: `Média ${(weeklyAvg.vitaminC ?? 0).toFixed(0)}mg/dia (alvo ${t.vitaminC}mg). Acerola, kiwi, morango ou laranja resolvem.`,
    });
  }

  // ── Magnésio ─────────────────────────────────────────────────
  if ((weeklyAvg.magnesium ?? 0) < t.magnesium * 0.6) {
    warnings.push({
      id: "low-mg",
      severity: "warn",
      title: "Magnésio insuficiente",
      detail: `${(weeklyAvg.magnesium ?? 0).toFixed(0)}mg/dia em média (alvo ${t.magnesium}mg). Folhas verdes escuras, oleaginosas e cacau.`,
    });
  }

  // ── Potássio ────────────────────────────────────────────────
  if ((weeklyAvg.potassium ?? 0) < t.potassium * 0.6) {
    warnings.push({
      id: "low-k",
      severity: "warn",
      title: "Potássio baixo — pressão arterial",
      detail: `${(weeklyAvg.potassium ?? 0).toFixed(0)}mg/dia (alvo ${t.potassium}mg). Banana, batata-doce, abacate e feijão.`,
    });
  }

  // ── Folato (B9) ─────────────────────────────────────────────
  if ((weeklyAvg.vitaminB9 ?? 0) < t.vitaminB9 * 0.6) {
    warnings.push({
      id: "low-b9",
      severity: "warn",
      title: "Folato (B9) abaixo do alvo",
      detail: `Média ${(weeklyAvg.vitaminB9 ?? 0).toFixed(0)}µg/dia. Feijão, lentilha e folhas verdes elevam rapidamente.`,
    });
  }

  // ── Cálcio ──────────────────────────────────────────────────
  if ((weeklyAvg.calcium ?? 0) < t.calcium * 0.6) {
    warnings.push({
      id: "low-ca",
      severity: "warn",
      title: "Cálcio dietético baixo",
      detail: `${(weeklyAvg.calcium ?? 0).toFixed(0)}mg/dia (alvo ${t.calcium}mg). Iogurte, queijo, sardinha em conserva ou folhas verdes.`,
    });
  }

  // ── Ferro ───────────────────────────────────────────────────
  if ((weeklyAvg.iron ?? 0) < t.iron * 0.7) {
    warnings.push({
      id: "low-fe",
      severity: "warn",
      title: "Ferro abaixo do alvo",
      detail: `${(weeklyAvg.iron ?? 0).toFixed(1)}mg/dia (alvo ${t.iron}mg). Carne vermelha, feijão preto + vit C aumenta absorção.`,
    });
  }

  // ── Fibra ───────────────────────────────────────────────────
  if ((weeklyAvg.fiber ?? 0) < t.fiber * 0.7) {
    warnings.push({
      id: "low-fiber",
      severity: "warn",
      title: "Fibra abaixo do recomendado",
      detail: `Média ${(weeklyAvg.fiber ?? 0).toFixed(0)}g/dia (alvo ${t.fiber}g). Aumenta saciedade, reduz LDL e alimenta microbioma.`,
    });
  }

  // ── Açúcar (LIMITE) ─────────────────────────────────────────
  if ((weeklyAvg.sugar ?? 0) > t.sugar * 1.5) {
    warnings.push({
      id: "high-sugar",
      severity: "warn",
      title: "Açúcar acima do limite",
      detail: `${(weeklyAvg.sugar ?? 0).toFixed(0)}g/dia em média (limite ${t.sugar}g). Foco em reduzir refrigerante, doces e sucos.`,
    });
  }

  // ── Sódio (LIMITE) ──────────────────────────────────────────
  if ((weeklyAvg.sodium ?? 0) > t.sodium * 1.1) {
    warnings.push({
      id: "high-sodium",
      severity: "warn",
      title: "Sódio acima do limite",
      detail: `${(weeklyAvg.sodium ?? 0).toFixed(0)}mg/dia (limite ${t.sodium}mg). Cuidado com embutidos, queijos e temperos industrializados.`,
    });
  }

  // ── Gordura saturada (LIMITE) ───────────────────────────────
  if ((weeklyAvg.saturatedFat ?? 0) > t.saturatedFat * 1.1) {
    warnings.push({
      id: "high-satfat",
      severity: "warn",
      title: "Gordura saturada acima do ideal",
      detail: `${(weeklyAvg.saturatedFat ?? 0).toFixed(0)}g/dia em média (limite ${t.saturatedFat}g). Troque por azeite, abacate e oleaginosas.`,
    });
  }

  // ── Calorias muito baixas ──────────────────────────────────
  if (weeklyAvg.calories < t.calories * 0.7) {
    warnings.push({
      id: "low-cal",
      severity: "warn",
      title: "Ingestão calórica baixa",
      detail: `${weeklyAvg.calories.toFixed(0)} kcal/dia. Restrição prolongada compromete função tireoidiana e massa magra.`,
    });
  }

  // ── Ômega-3 ótimo ──────────────────────────────────────────
  if ((weeklyAvg.omega3 ?? 0) >= t.omega3 * 1.0) {
    goods.push({
      id: "good-omega3",
      severity: "good",
      title: "Ômega 3 dentro do alvo",
      detail: `${(weeklyAvg.omega3 ?? 0).toFixed(1)}g/dia — reduz inflamação e protege cardio.`,
    });
  }

  // ── Fibra ótima ────────────────────────────────────────────
  if ((weeklyAvg.fiber ?? 0) >= t.fiber * 0.9) {
    goods.push({
      id: "good-fiber",
      severity: "good",
      title: "Fibra na faixa ideal",
      detail: `${(weeklyAvg.fiber ?? 0).toFixed(0)}g/dia — saciedade, microbioma e LDL agradecem.`,
    });
  }

  // Prioriza warnings, completa com goods até 4 itens
  const out = [...warnings, ...goods];
  if (out.length === 0) {
    return [
      {
        id: "all-good",
        severity: "good",
        title: "Dieta consistente esta semana",
        detail: "Macros e micros dentro da faixa ideal. Mantém o protocolo.",
      },
    ];
  }
  return out.slice(0, 4);
}
