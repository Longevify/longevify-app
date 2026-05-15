import { NextResponse } from "next/server";
import { sumNutrients } from "@/lib/dieta/calculations";
import type { FoodItem } from "@/lib/dieta/types";

/**
 * POST /api/dieta/recognize-photo
 *
 * Recebe FormData com image (foto do prato).
 * Por enquanto: retorna mock determinístico.
 *
 * TODO: ligar pra GPT-4 Vision quando OPENAI_VISION_KEY estiver setado.
 * Prompt: "Identifique cada alimento na imagem com estimativa de gramas.
 * Retorne JSON [{ name, grams }]. Use nomes em PT-BR."
 *
 * Custo estimado: ~$0.01 por foto (gpt-4o-mini-vision com 512x512).
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof File)) {
      return NextResponse.json(
        { error: "Imagem ausente. Envie 'image' como FormData." },
        { status: 400 },
      );
    }

    // ── Mock recognition ──
    // Gera resultado determinístico baseado no nome/tamanho do arquivo.
    // Real implementation iria pra gpt-4 vision aqui.
    const hash = (image.name + image.size).split("").reduce((a, c) => a + c.charCodeAt(0), 0);

    const MOCK_PLATES: { name: string; quantity: number; unit: "g"; nutrients: FoodItem["nutrients"] }[][] = [
      [
        { name: "Frango grelhado", quantity: 150, unit: "g", nutrients: { calories: 247, protein: 46.5, carbs: 0, fat: 5.4, sodium: 111 } },
        { name: "Arroz integral", quantity: 120, unit: "g", nutrients: { calories: 149, protein: 3.1, carbs: 31, fat: 1.2, fiber: 3.2 } },
        { name: "Brócolis", quantity: 100, unit: "g", nutrients: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, calcium: 47 } },
      ],
      [
        { name: "Salmão grelhado", quantity: 140, unit: "g", nutrients: { calories: 291, protein: 30.8, carbs: 0, fat: 18.2, omega3: 3.2, vitaminD: 15 } },
        { name: "Batata doce", quantity: 180, unit: "g", nutrients: { calories: 155, protein: 2.9, carbs: 36.2, fat: 0.2, fiber: 5.4 } },
        { name: "Salada verde", quantity: 80, unit: "g", nutrients: { calories: 14, protein: 1.1, carbs: 2.6, fat: 0.2, fiber: 1.6 } },
      ],
      [
        { name: "Ovo mexido", quantity: 100, unit: "g", nutrients: { calories: 140, protein: 12, carbs: 0.8, fat: 10, vitaminD: 2.2, vitaminB12: 1.2 } },
        { name: "Aveia", quantity: 40, unit: "g", nutrients: { calories: 156, protein: 6.8, carbs: 26.4, fat: 2.8, fiber: 4.2 } },
        { name: "Banana", quantity: 120, unit: "g", nutrients: { calories: 107, protein: 1.3, carbs: 27.4, fat: 0.4, fiber: 3.1 } },
      ],
    ];

    const platePick = MOCK_PLATES[hash % MOCK_PLATES.length];
    const items: FoodItem[] = platePick.map((p, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
      nutrients: p.nutrients,
      source: "photo",
      confidence: 0.85 + (idx % 3) * 0.04,
    }));

    return NextResponse.json({
      items,
      totalNutrients: sumNutrients(items),
      mock: true,
      note: "Detecção mock — ligar GPT-4 Vision em produção.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
