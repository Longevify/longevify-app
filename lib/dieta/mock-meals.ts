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
// Valores nutricionais por 100g. Referências: TACO (Tabela Brasileira de
// Composição de Alimentos), USDA FoodData Central e DRI/RDA.
//
// Os campos ausentes são intencionalmente omitidos (= 0 no somatório),
// não esquecidos: arroz branco não fornece Vit A, por exemplo, e
// poluir o objeto com 0s explícitos só dificulta leitura.

const FOOD_DB: Record<string, Nutrients> = {
  // ─── Proteínas animais ────────────────────────────────────────────
  frango_grelhado: {
    calories: 165, protein: 31, carbs: 0, fat: 3.6,
    saturatedFat: 1, cholesterol: 89, sodium: 74,
    vitaminB3: 13.7, vitaminB6: 0.81, vitaminB12: 0.34,
    iron: 1, zinc: 1, selenium: 27.6, potassium: 256,
    choline: 73,
  },
  ovo: {
    // 1 ovo médio ≈ 50g, então 100g ≈ 2 ovos
    calories: 155, protein: 13, carbs: 1.1, fat: 11,
    saturatedFat: 3.3, cholesterol: 373, sodium: 124,
    vitaminA: 160, vitaminD: 2.2, vitaminE: 1, vitaminK: 0.3,
    vitaminB2: 0.46, vitaminB6: 0.17, vitaminB9: 47, vitaminB12: 1.1,
    iron: 1.2, zinc: 1.3, selenium: 30.7, calcium: 50, potassium: 138,
    choline: 251,
  },
  salmao: {
    calories: 208, protein: 22, carbs: 0, fat: 13,
    saturatedFat: 3.1, cholesterol: 55, sodium: 59,
    vitaminA: 12, vitaminD: 11, vitaminE: 1.1,
    vitaminB1: 0.23, vitaminB2: 0.4, vitaminB3: 7.9, vitaminB6: 0.94, vitaminB12: 3.2,
    iron: 0.3, zinc: 0.6, selenium: 36.5, potassium: 363,
    omega3: 2.3, choline: 91,
  },
  sardinha: {
    calories: 208, protein: 25, carbs: 0, fat: 11,
    saturatedFat: 1.5, cholesterol: 142, sodium: 307,
    vitaminA: 32, vitaminD: 4.8, vitaminE: 2, vitaminK: 2.6,
    vitaminB2: 0.2, vitaminB3: 5.2, vitaminB6: 0.17, vitaminB12: 8.9,
    calcium: 380, iron: 2.9, zinc: 1.3, selenium: 52.7, potassium: 397,
    omega3: 1.5, choline: 75,
  },
  carne_bovina: {
    calories: 250, protein: 26, carbs: 0, fat: 17,
    saturatedFat: 6.8, cholesterol: 78, sodium: 72,
    vitaminB2: 0.18, vitaminB3: 4.6, vitaminB6: 0.42, vitaminB12: 2.6,
    iron: 2.6, zinc: 4.6, selenium: 21, potassium: 318,
    choline: 80,
  },

  // ─── Carboidratos ─────────────────────────────────────────────────
  arroz_integral: {
    calories: 124, protein: 2.6, carbs: 25.8, fat: 1,
    fiber: 2.7, saturatedFat: 0.3, sodium: 5,
    vitaminE: 0.1, vitaminK: 1.9,
    vitaminB1: 0.18, vitaminB3: 4.3, vitaminB6: 0.51, vitaminB9: 8,
    magnesium: 43, iron: 0.4, zinc: 0.6, selenium: 5.8, potassium: 86,
    choline: 30,
  },
  arroz_branco: {
    calories: 130, protein: 2.4, carbs: 28, fat: 0.3,
    fiber: 0.4,
    vitaminB1: 0.06, vitaminB3: 1.5, vitaminB6: 0.09, vitaminB9: 3,
    magnesium: 12, iron: 1.2, zinc: 0.5, selenium: 7.5, potassium: 35,
  },
  feijao_preto: {
    calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5,
    fiber: 8.7, sodium: 2,
    vitaminE: 0.9, vitaminK: 5.6,
    vitaminB1: 0.24, vitaminB2: 0.06, vitaminB6: 0.07, vitaminB9: 149,
    calcium: 27, magnesium: 70, iron: 1.8, zinc: 1.1, potassium: 355,
    choline: 32,
  },
  batata_doce: {
    calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1,
    fiber: 3, sugar: 4.2, sodium: 55,
    vitaminA: 709, vitaminC: 2.4, vitaminE: 0.3, vitaminK: 1.8,
    vitaminB1: 0.08, vitaminB2: 0.06, vitaminB6: 0.21, vitaminB9: 11,
    calcium: 30, magnesium: 25, iron: 0.6, potassium: 337,
    choline: 12.3,
  },
  aveia: {
    calories: 389, protein: 16.9, carbs: 66, fat: 6.9,
    fiber: 10.6, saturatedFat: 1.2,
    vitaminE: 0.4, vitaminK: 2,
    vitaminB1: 0.46, vitaminB2: 0.16, vitaminB3: 1.1, vitaminB6: 0.12, vitaminB9: 56,
    magnesium: 177, iron: 4.7, zinc: 4, selenium: 28.9, potassium: 429,
    choline: 40.4,
  },

  // ─── Verduras e legumes ──────────────────────────────────────────
  brocolis: {
    calories: 34, protein: 2.8, carbs: 7, fat: 0.4,
    fiber: 2.6, sodium: 33,
    vitaminA: 31, vitaminC: 89, vitaminE: 0.78, vitaminK: 102,
    vitaminB1: 0.07, vitaminB2: 0.12, vitaminB6: 0.18, vitaminB9: 63,
    calcium: 47, magnesium: 21, iron: 0.7, zinc: 0.4, potassium: 316,
    choline: 18.7,
  },
  espinafre: {
    calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4,
    fiber: 2.2, sodium: 79,
    vitaminA: 469, vitaminC: 28, vitaminE: 2, vitaminK: 483,
    vitaminB2: 0.19, vitaminB6: 0.2, vitaminB9: 194,
    calcium: 99, magnesium: 79, iron: 2.7, zinc: 0.5, potassium: 558,
    choline: 19.3,
  },
  salada_mix: {
    calories: 18, protein: 1.4, carbs: 3.3, fat: 0.2,
    fiber: 2, sodium: 28,
    vitaminA: 200, vitaminC: 9, vitaminE: 0.3, vitaminK: 100,
    vitaminB9: 50,
    calcium: 36, magnesium: 13, iron: 0.9, potassium: 200,
    choline: 7,
  },

  // ─── Frutas ──────────────────────────────────────────────────────
  banana: {
    calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3,
    fiber: 2.6, sugar: 12.2, sodium: 1,
    vitaminA: 3, vitaminC: 8.7, vitaminE: 0.1, vitaminK: 0.5,
    vitaminB1: 0.03, vitaminB2: 0.07, vitaminB6: 0.37, vitaminB9: 20,
    calcium: 5, magnesium: 27, iron: 0.3, potassium: 358,
    choline: 9.8,
  },
  maca: {
    calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2,
    fiber: 2.4, sugar: 10, sodium: 1,
    vitaminA: 3, vitaminC: 4.6, vitaminE: 0.18, vitaminK: 2.2,
    vitaminB6: 0.04,
    calcium: 6, magnesium: 5, potassium: 107,
  },

  // ─── Gorduras boas ───────────────────────────────────────────────
  azeite: {
    calories: 884, protein: 0, carbs: 0, fat: 100,
    saturatedFat: 13.8,
    vitaminE: 14.4, vitaminK: 60,
  },
  abacate: {
    calories: 160, protein: 2, carbs: 8.5, fat: 14.7,
    fiber: 6.7, saturatedFat: 2.1, sodium: 7,
    vitaminA: 7, vitaminC: 10, vitaminE: 2.1, vitaminK: 21,
    vitaminB2: 0.13, vitaminB3: 1.7, vitaminB6: 0.26, vitaminB9: 81,
    calcium: 12, magnesium: 29, iron: 0.6, potassium: 485,
    omega3: 0.1, choline: 14.2,
  },
  nozes: {
    calories: 654, protein: 15, carbs: 14, fat: 65,
    fiber: 6.7, saturatedFat: 6.1, sodium: 2,
    vitaminE: 0.7, vitaminK: 2.7,
    vitaminB1: 0.34, vitaminB2: 0.15, vitaminB6: 0.54, vitaminB9: 98,
    calcium: 98, magnesium: 158, iron: 2.9, zinc: 3.1, selenium: 4.9, potassium: 441,
    omega3: 9, choline: 39.2,
  },

  // ─── Laticínios ──────────────────────────────────────────────────
  iogurte_natural: {
    calories: 59, protein: 10, carbs: 3.6, fat: 0.4,
    sugar: 3.2, saturatedFat: 0.3, cholesterol: 5, sodium: 36,
    vitaminA: 27, vitaminB2: 0.14, vitaminB12: 0.75,
    calcium: 110, magnesium: 11, zinc: 0.5, selenium: 9.7, potassium: 141,
    choline: 15,
  },
  queijo_branco: {
    calories: 264, protein: 18, carbs: 4, fat: 20,
    saturatedFat: 11.4, cholesterol: 70, sodium: 380,
    vitaminA: 264, vitaminB2: 0.42, vitaminB12: 1.3,
    calcium: 700, magnesium: 20, zinc: 2.9, selenium: 14.5, potassium: 81,
    choline: 15,
  },
  leite_desnatado: {
    calories: 35, protein: 3.4, carbs: 5, fat: 0.1,
    sugar: 5, saturatedFat: 0.1, cholesterol: 2, sodium: 42,
    vitaminD: 1.2, vitaminB2: 0.18, vitaminB12: 0.5,
    calcium: 125, magnesium: 11, zinc: 0.4, selenium: 3.7, potassium: 150,
    choline: 16.4,
  },
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
  // Todos os micronutrientes opcionais — escala só os que existem
  // pra não poluir o objeto com 0s.
  const optional: (keyof Nutrients)[] = [
    "fiber",
    "sugar",
    "saturatedFat",
    "cholesterol",
    "sodium",
    "vitaminA",
    "vitaminD",
    "vitaminE",
    "vitaminK",
    "vitaminC",
    "vitaminB1",
    "vitaminB2",
    "vitaminB3",
    "vitaminB6",
    "vitaminB9",
    "vitaminB12",
    "calcium",
    "iron",
    "magnesium",
    "potassium",
    "zinc",
    "selenium",
    "omega3",
    "choline",
  ];
  for (const key of optional) {
    const v = per100g[key];
    if (typeof v === "number") {
      result[key] = v * factor;
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
