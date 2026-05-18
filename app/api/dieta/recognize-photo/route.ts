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
 * Recebe FormData com `image` (foto do prato). Pipeline híbrido
 * (Lucas 2026-05-18 — "o único pago que coloco é o GPT, opções grátis
 * pode adicionar se agregar"):
 *
 *   1. GPT-4o vision (detail:high, temperature:0) — identifica alimentos
 *      e estima porção em gramas. SÓ identificação, sem nutrientes.
 *   2. Pra cada alimento, lookup cascade em bases gratuitas:
 *      a) TACO local (Tabela Brasileira oficial, ~80 alimentos comuns)
 *      b) USDA FoodData Central API (1.4M alimentos)
 *      c) Open Food Facts (produtos industrializados, prefer BR)
 *   3. Fallback LLM (gpt-4o-mini) se cascade falhar.
 *
 * Resposta:
 *   {
 *     items: FoodItem[],
 *     totalNutrients: Nutrients,
 *     provider: "gpt-4o",
 *     nutritionSourceStats: { taco: n, usda: n, openfoodfacts: n, llm: n, none: n }
 *   }
 *
 * Limites:
 *   - Arquivo max 4MB (Vercel function payload limit padrão 4.5MB; 4MB
 *     dá margem). Se passar, user precisa comprimir antes de enviar.
 *   - Tipos aceitos: image/jpeg, image/png, image/webp. HEIC bloqueado.
 */

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
// Lucas (2026-05-18): "The string did not match the expected pattern" do
// OpenAI quando foto vem em HEIC do iPhone. OpenAI vision NÃO aceita HEIC/
// HEIF — só JPEG/PNG/WebP/GIF. O input no client já restringe via
// accept="image/jpeg,..." (Safari iOS auto-converte HEIC → JPEG na hora
// do upload quando a accept é restrita). HEIC/HEIF mantidos aqui só pra
// retornar erro friendly se algo escapar do client.
const OPENAI_SUPPORTED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const REJECTED_MIMES = new Set(["image/heic", "image/heif"]);

export const runtime = "nodejs";
// 45s — gpt-4o-mini responde em ~1-2s, mas latência alta de cold start +
// imagem grande pode subir pra 5-10s. Margem confortável.
export const maxDuration = 45;

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

  // HEIC/HEIF (formato padrão do iPhone) → mensagem específica
  if (image.type && REJECTED_MIMES.has(image.type)) {
    return NextResponse.json(
      {
        error:
          "Foto em HEIC ainda não é suportada. No iPhone, vá em Ajustes → Câmera → Formatos → 'Mais Compatível' (salva em JPEG). Ou tira foto de novo direto pelo botão de câmera do app.",
      },
      { status: 415 },
    );
  }
  if (image.type && !OPENAI_SUPPORTED_MIMES.has(image.type)) {
    return NextResponse.json(
      { error: `Tipo de imagem não suportado: ${image.type}. Use JPEG, PNG ou WebP.` },
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
          nutritionSourceStats: result.nutritionSourceStats,
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
      nutritionSourceStats: result.nutritionSourceStats,
    });

    return NextResponse.json({
      items: foodItems,
      totalNutrients: sumNutrients(foodItems),
      provider: result.provider,
      nutritionSourceStats: result.nutritionSourceStats,
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
