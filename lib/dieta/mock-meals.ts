import type { MealEntry, Nutrients } from "./types";
import { sumNutrients } from "./calculations";

/**
 * Helpers determinísticos pra geração de dados mock — evita hydration
 * mismatch entre SSR e client (React #418).
 */
function isoNDaysAgo(n: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ─── Banco de alimentos brasileiros ─────────────────────────────────────────
//
// Valores nutricionais por 100g (ou unidade indicada). Referências:
// TACO (Tabela Brasileira de Composição de Alimentos) + USDA.

const FOOD_DB: Record<string, Omit<Nutrients, never>> = {
  // Proteínas
  frango_grelhado: { calories: 165, protein: 31, carbs: 0, fat: 3.6, sodium: 74 },
  ovo: { calories: 70, protein: 6, carbs: 0.4, fat: 5, vitaminD: 1.1, vitaminB12: 0.6 },
  salmao: { calories: 208, protein: 22, carbs: 0, fat: 13, omega3: 2.3, vitaminD: 11 },
  sardinha: { calories: 208, protein: 25, carbs: 0, fat: 11, omega3: 1.5, vitaminD: 4.8, calcium: 380 },
  carne_bovina: { calories: 250, protein: 26, carbs: 0, fat: 17, iron: 2.6, zinc: 4.6 },
  // Carbs
  arroz_integral: { calories: 124, protein: 2.6, carbs: 25.8, fat: 1, fiber: 2.7 },
  arroz_branco: { calories: 130, protein: 2.4, carbs: 28, fat: 0.3, fiber: 0.4 },
  feijao_preto: { calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5, fiber: 8.7, iron: 1.8 },
  batata_doce: { calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1, fiber: 3 },
  aveia: { calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, magnesium: 177 },
  // Verduras
  brocolis: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, calcium: 47 },
  espinafre: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, iron: 2.7 },
  salada_mix: { calories: 18, protein: 1.4, carbs: 3.3, fat: 0.2, fiber: 2 },
  // Frutas
  banana: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
  maca: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, sugar: 10 },
  // Gorduras
  azeite: { calories: 884, protein: 0, carbs: 0, fat: 100 },
  abacate: { calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, omega3: 0.1 },
  nozes: { calories: 654, protein: 15, carbs: 14, fat: 65, omega3: 9, fiber: 6.7 },
  // Laticínios
  iogurte_natural: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, calcium: 110 },
  queijo_branco: { calories: 264, protein: 18, carbs: 4, fat: 20, calcium: 700 },
  leite_desnatado: { calories: 35, protein: 3.4, carbs: 5, fat: 0.1, calcium: 125, vitaminD: 1.2 },
};

/** Multiplica nutrientes pela quantidade real consumida (vs 100g base). */
function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100;
  const result: Nutrients = {
    calories: per100g.calories * factor,
    protein: per100g.protein * factor,
    carbs: per100g.carbs * factor,
    fat: per100g.fat * factor,
  };
  const optional: (keyof Nutrients)[] = [
    "fiber",
    "sugar",
    "sodium",
    "vitaminD",
    "vitaminB12",
    "iron",
    "calcium",
    "magnesium",
    "omega3",
    "zinc",
  ];
  for (const key of optional) {
    if (typeof per100g[key] === "number") {
      result[key] = (per100g[key] as number) * factor;
    }
  }
  return result;
}

// ─── Builder helper ─────────────────────────────────────────────────────────

let mealIdCounter = 0;
function nextMealId(): string {
  mealIdCounter += 1;
  return `meal-${mealIdCounter}`;
}

let itemIdCounter = 0;
function nextItemId(): string {
  itemIdCounter += 1;
  return `item-${itemIdCounter}`;
}

function buildMeal(
  daysAgo: number,
  hour: number,
  mealType: MealEntry["mealType"],
  foods: Array<[keyof typeof FOOD_DB, number]>, // [food, grams]
  inputMethod: MealEntry["inputMethod"] = "text",
): MealEntry {
  const items = foods.map(([food, grams]) => ({
    id: nextItemId(),
    name: prettyName(food),
    quantity: grams,
    unit: "g" as const,
    nutrients: scaleNutrients(FOOD_DB[food] as Nutrients, grams),
    source: inputMethod,
  }));
  return {
    id: nextMealId(),
    patientId: "joao-silva-demo",
    takenAt: isoNDaysAgo(daysAgo, hour),
    mealType,
    inputMethod,
    items,
    totalNutrients: sumNutrients(items),
  };
}

function prettyName(slug: keyof typeof FOOD_DB): string {
  return slug
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── 7 dias de dieta brasileira realista pro mock ───────────────────────────

export const MOCK_MEALS: MealEntry[] = [
  // ── Hoje (daysAgo=0) ──
  buildMeal(0, 7, "breakfast", [
    ["aveia", 50],
    ["banana", 120],
    ["leite_desnatado", 200],
  ]),
  buildMeal(0, 12, "lunch", [
    ["frango_grelhado", 180],
    ["arroz_integral", 150],
    ["feijao_preto", 100],
    ["salada_mix", 80],
    ["azeite", 10],
  ]),

  // ── Ontem ──
  buildMeal(1, 7, "breakfast", [
    ["ovo", 100], // 2 ovos
    ["aveia", 40],
    ["maca", 130],
  ]),
  buildMeal(1, 12, "lunch", [
    ["salmao", 150],
    ["batata_doce", 200],
    ["brocolis", 120],
    ["azeite", 8],
  ], "photo"),
  buildMeal(1, 19, "dinner", [
    ["frango_grelhado", 150],
    ["arroz_branco", 120],
    ["salada_mix", 100],
  ]),

  // ── 2 dias atrás ──
  buildMeal(2, 8, "breakfast", [
    ["iogurte_natural", 200],
    ["banana", 120],
    ["nozes", 20],
  ]),
  buildMeal(2, 13, "lunch", [
    ["carne_bovina", 180],
    ["arroz_branco", 150],
    ["feijao_preto", 100],
    ["salada_mix", 80],
  ]),
  buildMeal(2, 16, "snack", [["maca", 130]]),
  buildMeal(2, 20, "dinner", [
    ["sardinha", 100],
    ["batata_doce", 150],
    ["espinafre", 80],
  ]),

  // ── 3 dias atrás ──
  buildMeal(3, 7, "breakfast", [
    ["ovo", 100],
    ["queijo_branco", 50],
    ["maca", 130],
  ]),
  buildMeal(3, 12, "lunch", [
    ["frango_grelhado", 150],
    ["arroz_integral", 150],
    ["feijao_preto", 100],
    ["abacate", 80],
  ]),
  buildMeal(3, 19, "dinner", [
    ["salmao", 130],
    ["brocolis", 150],
    ["arroz_integral", 100],
  ], "barcode"),

  // ── 4 dias atrás ──
  buildMeal(4, 8, "breakfast", [
    ["aveia", 50],
    ["banana", 120],
  ]),
  buildMeal(4, 13, "lunch", [
    ["carne_bovina", 150],
    ["arroz_branco", 200],
    ["feijao_preto", 80],
  ]),

  // ── 5 dias atrás ──
  buildMeal(5, 8, "breakfast", [
    ["iogurte_natural", 150],
    ["banana", 100],
    ["nozes", 15],
  ]),
  buildMeal(5, 12, "lunch", [
    ["frango_grelhado", 200],
    ["batata_doce", 180],
    ["espinafre", 100],
    ["azeite", 8],
  ]),
  buildMeal(5, 19, "dinner", [
    ["ovo", 150], // 3 ovos
    ["salada_mix", 100],
    ["queijo_branco", 40],
  ]),

  // ── 6 dias atrás ──
  buildMeal(6, 7, "breakfast", [
    ["aveia", 50],
    ["maca", 130],
    ["leite_desnatado", 150],
  ]),
  buildMeal(6, 13, "lunch", [
    ["sardinha", 120],
    ["arroz_integral", 150],
    ["feijao_preto", 100],
    ["brocolis", 100],
  ]),
];

// ─── API pública pros componentes ───────────────────────────────────────────

export function getMealsForDate(daysAgo: number): MealEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(today);
  target.setDate(target.getDate() - daysAgo);

  return MOCK_MEALS.filter((m) => {
    const d = new Date(m.takenAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === target.getTime();
  });
}

export function getTodayMeals(): MealEntry[] {
  return getMealsForDate(0);
}

export function getDailyTotals(daysAgo: number): Nutrients {
  return sumNutrients(getMealsForDate(daysAgo).flatMap((m) => m.items));
}

export function getWeeklyTrend(): { date: string; nutrients: Nutrients }[] {
  return [6, 5, 4, 3, 2, 1, 0].map((d) => {
    const date = new Date();
    date.setDate(date.getDate() - d);
    return {
      date: date.toISOString().slice(0, 10),
      nutrients: getDailyTotals(d),
    };
  });
}

export function getWeeklyAverage(): Nutrients {
  const trend = getWeeklyTrend();
  if (trend.length === 0) return sumNutrients([]);
  const sums: Nutrients = sumNutrients(trend.map((d) => ({
    id: "",
    name: "",
    quantity: 0,
    unit: "g" as const,
    nutrients: d.nutrients,
    source: "manual" as const,
  })));
  const keys = Object.keys(sums) as (keyof Nutrients)[];
  const avg = { ...sums };
  for (const k of keys) {
    if (typeof avg[k] === "number") {
      avg[k] = (avg[k] as number) / trend.length;
    }
  }
  return avg;
}
