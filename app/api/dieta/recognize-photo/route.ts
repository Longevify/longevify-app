import { NextResponse } from "next/server";
import { sumNutrients } from "@/lib/dieta/calculations";
import {
  recognizeFoodPhoto,
  toFoodItems,
  AllProvidersFailedError,
} from "@/lib/dieta/food-vision-providers";

/**
 * POST /api/dieta/recognize-photo
 *
 * Recebe FormData com `image` (foto do prato). Pipeline (Lucas 2026-05):
 *   - Gemini 2.5 Flash primeiro (rápido, grátis até 1500/dia)
 *   - GPT-5 vision como fallback quando confidence baixa ou erro
 *
 * Resposta:
 *   {
 *     items: FoodItem[],
 *     totalNutrients: Nutrients,
 *     provider: "gemini" | "gpt-5",
 *     fallbackReason?: string  // só presente se houve fallback
 *   }
 *
 * Limites:
 *   - Arquivo max 4MB (Vercel function payload limit padrão 4.5MB; 4MB
 *     dá margem). Se passar, user precisa comprimir antes de enviar.
 *   - Tipos aceitos: image/jpeg, image/png, image/webp, image/heic.
 */

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ACCEPTED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const runtime = "nodejs";
export const maxDuration = 30; // segundos — fallback pro GPT-5 pode demorar

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Body inválido. Envie multipart/form-data com 'image'." },
      { status: 400 },
    );
  }

  const image = formData.get("image");
  if (!image || !(image instanceof File)) {
    return NextResponse.json(
      { error: "Imagem ausente. Envie 'image' como FormData." },
      { status: 400 },
    );
  }

  if (image.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Imagem grande demais (${(image.size / 1024 / 1024).toFixed(1)}MB). Limite: ${MAX_BYTES / 1024 / 1024}MB.`,
      },
      { status: 413 },
    );
  }

  if (image.type && !ACCEPTED_MIMES.has(image.type)) {
    return NextResponse.json(
      { error: `Tipo de imagem não suportado: ${image.type}` },
      { status: 415 },
    );
  }

  try {
    const result = await recognizeFoodPhoto(image);

    if (result.items.length === 0) {
      return NextResponse.json(
        {
          items: [],
          totalNutrients: sumNutrients([]),
          provider: result.provider,
          fallbackReason: result.fallbackReason,
          note: "Nenhum alimento identificado na foto. Tenta outra foto mais nítida ou usa o input de texto.",
        },
        { status: 200 },
      );
    }

    const foodItems = toFoodItems(result.items);

    // eslint-disable-next-line no-console
    console.log("[recognize-photo]", {
      provider: result.provider,
      itemsCount: foodItems.length,
      avgConfidence:
        result.items.reduce((s, it) => s + it.confidence, 0) /
        result.items.length,
      fallbackReason: result.fallbackReason,
    });

    return NextResponse.json({
      items: foodItems,
      totalNutrients: sumNutrients(foodItems),
      provider: result.provider,
      fallbackReason: result.fallbackReason,
    });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      // eslint-disable-next-line no-console
      console.error(
        "[recognize-photo] todos providers falharam:",
        err.providerErrors,
      );
      // Detecta padrões comuns pra dar mensagem útil ao user
      const allMessages = err.providerErrors.map((e) => e.message).join(" ");
      let userMessage =
        "Não conseguimos analisar essa foto agora. Tenta de novo em alguns minutos ou usa o input de texto.";

      if (/PERMISSION_DENIED|403|denied access/i.test(allMessages)) {
        userMessage =
          "Serviço de visão IA temporariamente indisponível (problema de credenciais). Equipe foi notificada. Enquanto isso, usa o input de texto ou código de barras.";
      } else if (/quota|429|RESOURCE_EXHAUSTED/i.test(allMessages)) {
        userMessage =
          "Limite de uso diário do reconhecimento de fotos atingido. Tenta amanhã ou usa o input de texto.";
      }

      return NextResponse.json(
        {
          error: userMessage,
          providerErrors:
            process.env.NODE_ENV === "production"
              ? undefined
              : err.providerErrors,
        },
        { status: 503 },
      );
    }

    const message = err instanceof Error ? err.message : "Erro desconhecido";
    // eslint-disable-next-line no-console
    console.error("[recognize-photo] erro:", message);
    return NextResponse.json(
      {
        error: "Falha ao analisar a foto. Tenta de novo em alguns segundos.",
        detail: process.env.NODE_ENV === "production" ? undefined : message,
      },
      { status: 500 },
    );
  }
}
