/**
 * Cálculos nutricionais do módulo de Dieta.
 *
 * Todas as funções são puras (sem side effects, sem I/O) pra facilitar
 * unit testing e reuso tanto em server components quanto em client hooks.
 */

import type { FoodItem, Nutrients, DailyTarget, DietInsight } from "./types";

// ─── sumNutrients ─────────────────────────────────────────────────────────────

/**
 * Soma os nutrientes de uma lista de FoodItems.
 * Retorna zero pra campos obrigatórios e omite opcionais se nenhum item
 * os declarar — evita gráficos mostrando "0 µg Vit D" quando o dado
 * simplesmente não foi informado.
 */
export function sumNutrients(items: FoodItem[]): Nutrients {
  if (items.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const result: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  for (const item of items) {
    const n = item.nutrients;
    result.calories += n.calories;
    result.protein += n.protein;
    result.carbs += n.carbs;
    result.fat += n.fat;

    // Opcionais — só inclui se ao menos um item tiver o campo
    if (n.fiber !== undefined) result.fiber = (result.fiber ?? 0) + n.fiber;
    if (n.sugar !== undefined) result.sugar = (result.sugar ?? 0) + n.sugar;
    if (n.sodium !== undefined) result.sodium = (result.sodium ?? 0) + n.sodium;
    if (n.vitaminD !== undefined)
      result.vitaminD = (result.vitaminD ?? 0) + n.vitaminD;
    if (n.vitaminB12 !== undefined)
      result.vitaminB12 = (result.vitaminB12 ?? 0) + n.vitaminB12;
    if (n.iron !== undefined) result.iron = (result.iron ?? 0) + n.iron;
    if (n.calcium !== undefined)
      result.calcium = (result.calcium ?? 0) + n.calcium;
    if (n.magnesium !== undefined)
      result.magnesium = (result.magnesium ?? 0) + n.magnesium;
    if (n.omega3 !== undefined) result.omega3 = (result.omega3 ?? 0) + n.omega3;
  }

  // Arredonda tudo pra 1 casa decimal pra evitar floating point noise
  return roundNutrients(result);
}

/** Arredonda todos os campos de um Nutrients pra 1 decimal */
function roundNutrients(n: Nutrients): Nutrients {
  const r = (v: number | undefined) =>
    v !== undefined ? +(v.toFixed(1)) : undefined;
  return {
    calories: +n.calories.toFixed(1),
    protein: +n.protein.toFixed(1),
    carbs: +n.carbs.toFixed(1),
    fat: +n.fat.toFixed(1),
    ...(n.fiber !== undefined && { fiber: r(n.fiber) }),
    ...(n.sugar !== undefined && { sugar: r(n.sugar) }),
    ...(n.sodium !== undefined && { sodium: r(n.sodium) }),
    ...(n.vitaminD !== undefined && { vitaminD: r(n.vitaminD) }),
    ...(n.vitaminB12 !== undefined && { vitaminB12: r(n.vitaminB12) }),
    ...(n.iron !== undefined && { iron: r(n.iron) }),
    ...(n.calcium !== undefined && { calcium: r(n.calcium) }),
    ...(n.magnesium !== undefined && { magnesium: r(n.magnesium) }),
    ...(n.omega3 !== undefined && { omega3: r(n.omega3) }),
  };
}

// ─── getDailyTarget ───────────────────────────────────────────────────────────

/**
 * Metas diárias baseadas no perfil do paciente.
 *
 * Referências:
 * - Proteína: 1.6g/kg (IOM + meta-análise de longevidade Witard 2022)
 *   → ~45g pra 28kg lean mass; ~113g pra 70kg. Usa peso estimado do paciente.
 * - Calorias: Harris-Benedict revisado (Mifflin-St Jeor) × fator de atividade
 *   moderada (1.55) — sem peso real, usa estimativa por cronologicalAge + sex.
 * - Fibra: 25g/dia (WHO) — mínimo pra saúde intestinal e microbioma
 * - Sódio: 2000mg/dia (WHO/SBC) — max
 * - Vitamina D: 20µg/dia (Endocrine Society) — acima da DRI pra longevidade
 * - B12: 2.4µg/dia (IOM)
 * - Ferro: 8mg/dia (IOM, homens >18) | 18mg/dia (mulheres 19-50)
 * - Ômega-3: 1.6g/dia (AHA) — EPA+DHA equivalente
 *
 * Patient aqui é o tipo do mock-data.ts — campos relevantes:
 * chronologicalAge, sex.
 */
export function getDailyTarget(patient: {
  chronologicalAge: number;
  sex: "male" | "female";
  biologicalAge?: number;
}): DailyTarget {
  const isMale = patient.sex === "male";
  const age = patient.chronologicalAge;

  // Estimativa de peso (sem dado real, usa mediana brasileira IBGE 2020)
  const estimatedWeightKg = isMale ? 76 : 65;

  // Mifflin-St Jeor BMR (sem peso real — usa estimativa)
  // Homem: (10 × 76) + (6.25 × 172) - (5 × age) + 5
  // Mulher: (10 × 65) + (6.25 × 160) - (5 × age) - 161
  const bmr = isMale
    ? 10 * estimatedWeightKg + 6.25 * 172 - 5 * age + 5
    : 10 * estimatedWeightKg + 6.25 * 160 - 5 * age - 161;

  // Fator de atividade moderada (caminhada + gym 3-4x semana) = 1.55
  const tdee = Math.round(bmr * 1.55);

  // Proteína: 1.6g/kg peso estimado (longevidade focus)
  const protein = Math.round(estimatedWeightKg * 1.6);

  // Macro split: proteína fix, carbs 45-55% cal, fat o restante
  // 1g prot = 4 kcal, 1g carb = 4 kcal, 1g fat = 9 kcal
  const proteinKcal = protein * 4;
  const carbsKcal = Math.round(tdee * 0.45);
  const carbs = Math.round(carbsKcal / 4);
  const fatKcal = tdee - proteinKcal - carbsKcal;
  const fat = Math.round(fatKcal / 9);

  return {
    calories: tdee,
    protein,
    carbs,
    fat,
    fiber: 25, // WHO minimum
    sodium: 2000, // WHO/SBC max
  };
}

// ─── getDeficitInsights ───────────────────────────────────────────────────────

/** Recomendações de referência pra insights */
const MICRONUTRIENT_REFS: Array<{
  key: keyof Nutrients;
  recommended: number;
  unit: string;
  label: string;
  thresholds: { warning: number; critical: number }; // % da meta
}> = [
  {
    key: "vitaminD",
    recommended: 20, // µg/dia — Endocrine Society (longevidade)
    unit: "µg",
    label: "Vitamina D",
    thresholds: { warning: 0.7, critical: 0.4 }, // <70% = warning, <40% = crítico
  },
  {
    key: "vitaminB12",
    recommended: 2.4, // µg/dia — IOM
    unit: "µg",
    label: "Vitamina B12",
    thresholds: { warning: 0.7, critical: 0.4 },
  },
  {
    key: "iron",
    recommended: 8, // mg/dia — IOM (homens) — UI ajusta por sexo
    unit: "mg",
    label: "Ferro",
    thresholds: { warning: 0.7, critical: 0.5 },
  },
  {
    key: "calcium",
    recommended: 1000, // mg/dia — IOM (adultos 19-50)
    unit: "mg",
    label: "Cálcio",
    thresholds: { warning: 0.7, critical: 0.5 },
  },
  {
    key: "magnesium",
    recommended: 400, // mg/dia — IOM (homens 19-30)
    unit: "mg",
    label: "Magnésio",
    thresholds: { warning: 0.65, critical: 0.4 },
  },
  {
    key: "omega3",
    recommended: 1.6, // g/dia — AHA (EPA+DHA equivalent)
    unit: "g",
    label: "Ômega-3",
    thresholds: { warning: 0.6, critical: 0.3 },
  },
  {
    key: "fiber",
    recommended: 25, // g/dia — WHO
    unit: "g",
    label: "Fibra",
    thresholds: { warning: 0.75, critical: 0.5 },
  },
  {
    key: "sodium",
    recommended: 2000, // mg/dia — WHO (MAX, aqui verifica excesso)
    unit: "mg",
    label: "Sódio",
    thresholds: { warning: 1.15, critical: 1.4 }, // >115% = warning (acima da meta)
  },
];

/**
 * Analisa a tendência semanal e retorna array de insights nutricionais
 * priorizados por severidade.
 *
 * @param weeklyNutrients - array de Nutrients, um por dia (7 dias idealmente)
 *   Dias sem dados devem ser omitidos (não passados como zeros artificiais)
 *   pra não distorcer a média.
 * @param sex - sexo biológico do paciente (ajusta DRI de ferro)
 */
export function getDeficitInsights(
  weeklyNutrients: Nutrients[],
  sex: "male" | "female" = "male",
): DietInsight[] {
  if (weeklyNutrients.length === 0) return [];

  const insights: DietInsight[] = [];
  const daysWithData = weeklyNutrients.length;

  // Ajuste de ferro por sexo (IOM)
  const ironRecommended = sex === "female" ? 18 : 8;

  for (const ref of MICRONUTRIENT_REFS) {
    // Ajusta ferro
    const recommended =
      ref.key === "iron" ? ironRecommended : ref.recommended;

    // Calcula média apenas nos dias que têm esse micronutriente registrado
    const daysWithNutrient = weeklyNutrients.filter(
      (n) => n[ref.key] !== undefined,
    );
    if (daysWithNutrient.length === 0) continue;

    const avg =
      daysWithNutrient.reduce((sum, n) => sum + (n[ref.key] as number), 0) /
      daysWithNutrient.length;

    const ratio = avg / recommended;

    // Sódio: lógica invertida (excesso é ruim)
    if (ref.key === "sodium") {
      if (ratio < ref.thresholds.warning) continue; // dentro do limite
      const severity = ratio >= ref.thresholds.critical ? "critical" : "warning";
      insights.push({
        nutrient: ref.key,
        message: buildInsightMessage(ref.label, avg, recommended, ref.unit, "excess"),
        severity,
        avgActual: +avg.toFixed(2),
        recommended,
        unit: ref.unit,
      });
      continue;
    }

    // Demais nutrientes: deficit é ruim
    if (ratio >= ref.thresholds.warning) continue; // consumo ok

    const severity = ratio <= ref.thresholds.critical ? "critical" : "warning";
    insights.push({
      nutrient: ref.key,
      message: buildInsightMessage(ref.label, avg, recommended, ref.unit, "deficit"),
      severity,
      avgActual: +avg.toFixed(2),
      recommended,
      unit: ref.unit,
    });
  }

  // Verifica macros: calorias muito abaixo do target pra paciente demo
  // (apenas warning genérico — target real vem do getDailyTarget)
  const avgCalories =
    weeklyNutrients.reduce((s, n) => s + n.calories, 0) / daysWithData;
  if (avgCalories < 1200) {
    insights.push({
      nutrient: "calories",
      message: `Ingestão calórica média muito baixa: ${avgCalories.toFixed(0)} kcal/dia. Isso pode comprometer metabolismo basal e massa muscular.`,
      severity: "critical",
      avgActual: +avgCalories.toFixed(1),
      recommended: 2000,
      unit: "kcal",
    });
  }

  // Ordena: crítico primeiro, depois warning, depois info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function buildInsightMessage(
  label: string,
  avg: number,
  recommended: number,
  unit: string,
  type: "deficit" | "excess",
): string {
  const avgStr = avg < 1 ? avg.toFixed(2) : avg.toFixed(1);
  const recStr =
    recommended < 1 ? recommended.toFixed(1) : recommended.toFixed(0);

  if (type === "deficit") {
    return `Ingestão baixa de ${label}: média de ${avgStr} ${unit}/dia nos últimos 7 dias vs. meta de ${recStr} ${unit}/dia recomendados. Considere incluir mais fontes na dieta.`;
  }
  return `Consumo elevado de ${label}: média de ${avgStr} ${unit}/dia vs. limite recomendado de ${recStr} ${unit}/dia. Reduza alimentos processados e sal adicionado.`;
}

// ─── Utility: percentual de meta atingida ────────────────────────────────────

/**
 * Calcula o percentual de atingimento de cada macro em relação ao target.
 * Retorna objeto { calories: 0.85, protein: 1.1, ... } — >1 = acima da meta.
 */
export function getMacroProgress(
  actual: Nutrients,
  target: DailyTarget,
): Record<"calories" | "protein" | "carbs" | "fat" | "fiber" | "sodium", number> {
  return {
    calories: target.calories > 0 ? actual.calories / target.calories : 0,
    protein: target.protein > 0 ? actual.protein / target.protein : 0,
    carbs: target.carbs > 0 ? actual.carbs / target.carbs : 0,
    fat: target.fat > 0 ? actual.fat / target.fat : 0,
    fiber:
      target.fiber > 0 && actual.fiber !== undefined
        ? actual.fiber / target.fiber
        : 0,
    sodium:
      target.sodium > 0 && actual.sodium !== undefined
        ? actual.sodium / target.sodium
        : 0,
  };
}
