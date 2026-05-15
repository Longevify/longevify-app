import { NextResponse } from "next/server";
import { sumNutrients } from "@/lib/dieta/calculations";
import type { FoodItem, Nutrients } from "@/lib/dieta/types";

/**
 * POST /api/dieta/parse-text
 * Body: { text: "frango grelhado 150g com arroz integral e brócolis" }
 *
 * Por enquanto: parser keyword-based simples.
 * TODO: ligar pra LLM (Claude Haiku 4.7 / Kimi K2.5) pra parsing mais
 * robusto. Custo estimado <$0.001 por parse.
 */

const KEYWORD_DB: Record<string, { name: string; defaultGrams: number; per100g: Nutrients }> = {
  frango: { name: "Frango grelhado", defaultGrams: 150, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
  arroz: { name: "Arroz", defaultGrams: 120, per100g: { calories: 130, protein: 2.4, carbs: 28, fat: 0.3, fiber: 0.4 } },
  feijao: { name: "Feijão", defaultGrams: 100, per100g: { calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5, fiber: 8.7, iron: 1.8 } },
  feijão: { name: "Feijão", defaultGrams: 100, per100g: { calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5, fiber: 8.7, iron: 1.8 } },
  ovo: { name: "Ovo", defaultGrams: 50, per100g: { calories: 140, protein: 12, carbs: 0.8, fat: 10, vitaminD: 2.2, vitaminB12: 1.2 } },
  salmao: { name: "Salmão", defaultGrams: 130, per100g: { calories: 208, protein: 22, carbs: 0, fat: 13, omega3: 2.3, vitaminD: 11 } },
  salmão: { name: "Salmão", defaultGrams: 130, per100g: { calories: 208, protein: 22, carbs: 0, fat: 13, omega3: 2.3, vitaminD: 11 } },
  sardinha: { name: "Sardinha", defaultGrams: 100, per100g: { calories: 208, protein: 25, carbs: 0, fat: 11, omega3: 1.5, vitaminD: 4.8, calcium: 380 } },
  carne: { name: "Carne bovina", defaultGrams: 150, per100g: { calories: 250, protein: 26, carbs: 0, fat: 17, iron: 2.6, zinc: 4.6 } },
  brocolis: { name: "Brócolis", defaultGrams: 100, per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, calcium: 47 } },
  brócolis: { name: "Brócolis", defaultGrams: 100, per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, calcium: 47 } },
  banana: { name: "Banana", defaultGrams: 120, per100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 } },
  maca: { name: "Maçã", defaultGrams: 130, per100g: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, sugar: 10 } },
  maçã: { name: "Maçã", defaultGrams: 130, per100g: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, sugar: 10 } },
  aveia: { name: "Aveia", defaultGrams: 40, per100g: { calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, magnesium: 177 } },
  iogurte: { name: "Iogurte natural", defaultGrams: 150, per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, calcium: 110 } },
  azeite: { name: "Azeite", defaultGrams: 10, per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 } },
  abacate: { name: "Abacate", defaultGrams: 80, per100g: { calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 } },
  nozes: { name: "Nozes", defaultGrams: 20, per100g: { calories: 654, protein: 15, carbs: 14, fat: 65, omega3: 9, fiber: 6.7 } },
  batata: { name: "Batata doce", defaultGrams: 150, per100g: { calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1, fiber: 3 } },
  espinafre: { name: "Espinafre", defaultGrams: 80, per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, iron: 2.7 } },
  queijo: { name: "Queijo branco", defaultGrams: 40, per100g: { calories: 264, protein: 18, carbs: 4, fat: 20, calcium: 700 } },
  leite: { name: "Leite desnatado", defaultGrams: 200, per100g: { calories: 35, protein: 3.4, carbs: 5, fat: 0.1, calcium: 125, vitaminD: 1.2 } },
};

function scale(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100;
  const result: Nutrients = {
    calories: per100g.calories * factor,
    protein: per100g.protein * factor,
    carbs: per100g.carbs * factor,
    fat: per100g.fat * factor,
  };
  const optional: (keyof Nutrients)[] = [
    "fiber", "sugar", "sodium", "vitaminD", "vitaminB12",
    "iron", "calcium", "magnesium", "omega3", "zinc",
  ];
  for (const key of optional) {
    if (typeof per100g[key] === "number") {
      result[key] = (per100g[key] as number) * factor;
    }
  }
  return result;
}

function extractQuantity(textChunk: string, defaultGrams: number): number {
  // Procura padrões "150g", "150 g", "1 xícara", "2 colheres"
  const gMatch = textChunk.match(/(\d+)\s*g\b/);
  if (gMatch) return parseInt(gMatch[1], 10);
  const xicaraMatch = textChunk.match(/(\d+)\s*x[íi]cara/);
  if (xicaraMatch) return parseInt(xicaraMatch[1], 10) * 150;
  const colherMatch = textChunk.match(/(\d+)\s*colher/);
  if (colherMatch) return parseInt(colherMatch[1], 10) * 15;
  const unitMatch = textChunk.match(/(\d+)\s*(ovo|ovos|maçã|maca|banana)/);
  if (unitMatch) return parseInt(unitMatch[1], 10) * 50;
  return defaultGrams;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = (body.text ?? "").toString().toLowerCase();

    if (!text.trim()) {
      return NextResponse.json({ error: "Texto vazio" }, { status: 400 });
    }

    const items: FoodItem[] = [];
    const found = new Set<string>();

    for (const keyword of Object.keys(KEYWORD_DB)) {
      if (text.includes(keyword) && !found.has(KEYWORD_DB[keyword].name)) {
        const def = KEYWORD_DB[keyword];
        // Pega chunk do texto perto da keyword pra extrair quantidade
        const idx = text.indexOf(keyword);
        const chunk = text.slice(Math.max(0, idx - 20), idx + keyword.length + 30);
        const grams = extractQuantity(chunk, def.defaultGrams);
        items.push({
          id: `text-${Date.now()}-${items.length}`,
          name: def.name,
          quantity: grams,
          unit: "g",
          nutrients: scale(def.per100g, grams),
          source: "text",
          confidence: 0.75,
        });
        found.add(def.name);
      }
    }

    if (items.length === 0) {
      return NextResponse.json(
        {
          items: [],
          totalNutrients: sumNutrients([]),
          note: "Nenhum alimento reconhecido. Tente: 'frango grelhado 150g, arroz integral, brócolis'.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      items,
      totalNutrients: sumNutrients(items),
      mock: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
