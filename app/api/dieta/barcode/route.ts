import { NextResponse } from "next/server";
import type { FoodItem, Nutrients } from "@/lib/dieta/types";

/**
 * GET /api/dieta/barcode?code=7891234567890
 *
 * Consulta Open Food Facts (DB global, gratuito, sem auth).
 * Cobertura BR: ~80% dos produtos industrializados.
 *
 * Docs: https://world.openfoodfacts.org/data
 */

interface OFFProduct {
  product_name?: string;
  product_name_pt?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number; // em g
    "vitamin-d_100g"?: number;
    "vitamin-b12_100g"?: number;
    iron_100g?: number; // em mg
    calcium_100g?: number; // em mg
    magnesium_100g?: number;
    "omega-3-fat_100g"?: number;
    zinc_100g?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
}

interface OFFResponse {
  status: 0 | 1;
  product?: OFFProduct;
  code: string;
}

function nutrientsFromOFF(p: OFFProduct, grams: number): Nutrients {
  const n = p.nutriments ?? {};
  const factor = grams / 100;
  return {
    calories: (n["energy-kcal_100g"] ?? 0) * factor,
    protein: (n.proteins_100g ?? 0) * factor,
    carbs: (n.carbohydrates_100g ?? 0) * factor,
    fat: (n.fat_100g ?? 0) * factor,
    fiber: n.fiber_100g ? n.fiber_100g * factor : undefined,
    sugar: n.sugars_100g ? n.sugars_100g * factor : undefined,
    sodium: n.sodium_100g ? n.sodium_100g * 1000 * factor : undefined, // g→mg
    vitaminD: n["vitamin-d_100g"] ? n["vitamin-d_100g"] * factor : undefined,
    vitaminB12: n["vitamin-b12_100g"] ? n["vitamin-b12_100g"] * factor : undefined,
    iron: n.iron_100g ? n.iron_100g * factor : undefined,
    calcium: n.calcium_100g ? n.calcium_100g * factor : undefined,
    magnesium: n.magnesium_100g ? n.magnesium_100g * factor : undefined,
    omega3: n["omega-3-fat_100g"] ? n["omega-3-fat_100g"] * factor : undefined,
    zinc: n.zinc_100g ? n.zinc_100g * factor : undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const gramsParam = searchParams.get("grams");
  const grams = gramsParam ? parseFloat(gramsParam) : 100;

  if (!code || !/^\d{8,14}$/.test(code)) {
    return NextResponse.json(
      { error: "Código de barras inválido (8-14 dígitos)." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
      {
        headers: { "User-Agent": "Longevify/1.0 (suporte@longevify.com.br)" },
        next: { revalidate: 86400 }, // cache 24h
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Open Food Facts retornou ${res.status}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as OFFResponse;

    if (data.status === 0 || !data.product) {
      return NextResponse.json(
        { error: "Produto não encontrado no Open Food Facts. Tente outro código ou adicione manualmente." },
        { status: 404 },
      );
    }

    const p = data.product;
    const name = p.product_name_pt ?? p.product_name ?? `Produto ${code}`;
    const brand = p.brands?.split(",")[0]?.trim();
    const displayName = brand ? `${name} (${brand})` : name;

    const item: FoodItem = {
      id: `bc-${Date.now()}`,
      name: displayName,
      quantity: grams,
      unit: "g",
      nutrients: nutrientsFromOFF(p, grams),
      source: "barcode",
      barcode: code,
    };

    return NextResponse.json({
      item,
      defaultGrams: p.serving_quantity ?? 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
