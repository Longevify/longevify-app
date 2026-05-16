/**
 * Reconhecimento de comida a partir de foto.
 *
 * Cadeia de providers com fallback em cascata (Lucas 2026-05):
 *
 *   1. Gemini 2.5 Flash (primário, gratuito até 1500 reqs/dia, ~1.5s)
 *   2. GPT-5 vision (fallback se confidence baixa ou erro, ~3s)
 *   3. Moonshot Kimi K2 vision (fallback final — já configurado em prod
 *      via MOONSHOT_API_KEY, OpenAI-compatible)
 *   4. Throws "AllProvidersFailedError" → route.ts retorna 503 com
 *      mensagem útil
 */

import type { FoodItem, Nutrients } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_MODEL = "gpt-5";
const MOONSHOT_MODEL = "kimi-latest";
const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";

// Confidence média abaixo desse threshold → vai pro fallback
const FALLBACK_CONFIDENCE_THRESHOLD = 0.6;

interface RecognizedItem {
  name: string;
  grams: number;
  confidence: number;
  nutrients: Nutrients;
}

type Provider = "gemini" | "gpt-5" | "moonshot";

interface RecognitionResult {
  items: RecognizedItem[];
  provider: Provider;
  fallbackReason?: string;
}

export class AllProvidersFailedError extends Error {
  public readonly providerErrors: Array<{ provider: Provider; message: string }>;
  constructor(providerErrors: Array<{ provider: Provider; message: string }>) {
    const summary = providerErrors
      .map((e) => `${e.provider}: ${e.message}`)
      .join(" | ");
    super(`Todos os providers de visão falharam: ${summary}`);
    this.name = "AllProvidersFailedError";
    this.providerErrors = providerErrors;
  }
}

// ─── Prompt compartilhado ──────────────────────────────────────────────────

const RECOGNITION_INSTRUCTION = `Você é um nutricionista brasileiro analisando a foto de uma refeição.

Identifique CADA alimento visível na foto, estime a porção em gramas e retorne os nutrientes daquela porção.

Regras:
- Nomes em português do Brasil (ex: "Arroz integral", "Frango grelhado", "Feijão preto")
- Estimativas de gramas baseadas no tamanho aparente do prato/utensílio (assume prato padrão ~26cm, talher de mesa, copo 250ml)
- Nutrientes pro TAMANHO real estimado (não por 100g)
- confidence (0-1): 1.0 = certeza absoluta; 0.5 = razoável; 0.2 = chute educado
- Se o prato não parecer comida (foto borrada, animal, paisagem), retorne items vazios
- Não invente alimentos não visíveis

Valores nutricionais — preencha o que conseguir estimar:
- calories (kcal), protein (g), carbs (g), fat (g) — SEMPRE
- fiber, sugar, saturatedFat, cholesterol (mg), sodium (mg)
- vitaminA (µg), vitaminD (µg), vitaminE (mg), vitaminK (µg)
- vitaminC (mg), vitaminB1, vitaminB2, vitaminB3, vitaminB6 (mg), vitaminB9 (µg), vitaminB12 (µg)
- calcium (mg), iron (mg), magnesium (mg), potassium (mg), zinc (mg), selenium (µg)
- omega3 (g), choline (mg)

Use referências TACO (Tabela Brasileira) ou USDA. Omita campo se for desprezível (<5% da DRI).

Retorne SOMENTE JSON no schema:
{
  "items": [
    {
      "name": "string",
      "grams": number,
      "confidence": number,
      "nutrients": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "fiber": number,
        ...
      }
    }
  ]
}`;

// ─── Helpers ──────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return buf.toString("base64");
}

function avgConfidence(items: RecognizedItem[]): number {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, it) => acc + (it.confidence ?? 0), 0);
  return sum / items.length;
}

/** Parser tolerante — modelos às vezes envolvem JSON em ```json ... ``` */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip markdown fences se vierem
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fenced ? fenced[1] : trimmed;
  return JSON.parse(body);
}

interface RawApiPayload {
  items?: Array<{
    name?: unknown;
    grams?: unknown;
    confidence?: unknown;
    nutrients?: Record<string, unknown>;
  }>;
}

function normalizeItems(payload: unknown): RecognizedItem[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as RawApiPayload;
  if (!Array.isArray(p.items)) return [];
  return p.items
    .map((it): RecognizedItem | null => {
      if (!it || typeof it !== "object") return null;
      const name = typeof it.name === "string" ? it.name.trim() : null;
      const grams =
        typeof it.grams === "number" && it.grams > 0 ? it.grams : null;
      if (!name || !grams) return null;
      const confidence =
        typeof it.confidence === "number"
          ? Math.max(0, Math.min(1, it.confidence))
          : 0.5;
      const nutrients = sanitizeNutrients(it.nutrients);
      return { name, grams, confidence, nutrients };
    })
    .filter((it): it is RecognizedItem => it !== null);
}

const NUTRIENT_KEYS: (keyof Nutrients)[] = [
  "calories",
  "protein",
  "carbs",
  "fat",
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

function sanitizeNutrients(raw: Record<string, unknown> | undefined): Nutrients {
  const out: Nutrients = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  if (!raw || typeof raw !== "object") return out;
  for (const key of NUTRIENT_KEYS) {
    const v = raw[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      out[key] = v;
    }
  }
  return out;
}

// ─── Gemini 2.5 Flash ──────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  image: File,
): Promise<RecognizedItem[]> {
  const { GoogleGenAI, Type } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey });

  const base64 = await fileToBase64(image);
  const mimeType = image.type || "image/jpeg";

  // Schema explícito → Gemini garante JSON válido (response.text é parseable)
  const nutrientsSchema = {
    type: Type.OBJECT,
    properties: Object.fromEntries(
      NUTRIENT_KEYS.map((k) => [k, { type: Type.NUMBER }]),
    ),
    required: ["calories", "protein", "carbs", "fat"],
  };

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: RECOGNITION_INSTRUCTION },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                grams: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
                nutrients: nutrientsSchema,
              },
              required: ["name", "grams", "confidence", "nutrients"],
            },
          },
        },
        required: ["items"],
      },
    },
  });

  const text = response.text ?? "";
  return normalizeItems(extractJson(text));
}

// ─── OpenAI-compatible vision (GPT-5 e Moonshot Kimi compartilham SDK) ──────

async function callOpenAICompatible({
  apiKey,
  model,
  baseURL,
  image,
}: {
  apiKey: string;
  model: string;
  baseURL?: string;
  image: File;
}): Promise<RecognizedItem[]> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey, baseURL });

  const base64 = await fileToBase64(image);
  const mimeType = image.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: RECOGNITION_INSTRUCTION,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analise essa refeição e retorne o JSON conforme as instruções.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  return normalizeItems(extractJson(content));
}

async function callOpenAI(apiKey: string, image: File) {
  return callOpenAICompatible({ apiKey, model: OPENAI_MODEL, image });
}

async function callMoonshot(apiKey: string, image: File) {
  return callOpenAICompatible({
    apiKey,
    model: MOONSHOT_MODEL,
    baseURL: MOONSHOT_BASE_URL,
    image,
  });
}

// ─── Orchestrator com cascade de providers ──────────────────────────────────

/**
 * Reconhece os itens de uma foto de refeição com fallback em cascata.
 *
 * Estratégia (Lucas 2026-05 — depois que Gemini deu 403 PERMISSION_DENIED):
 *   1. Gemini Flash → se OK e confidence ≥ 0.6, retorna
 *   2. GPT-5 → se OK, retorna (com flag de fallback)
 *   3. Moonshot Kimi K2 vision → última tentativa
 *   4. AllProvidersFailedError → route.ts retorna 503 com detalhe
 *
 * Cada falha (erro de rede, 403, 401, JSON malformado) cai pro próximo
 * provider. Provider missing key também conta como skip (não bloqueia
 * a cascade).
 */
export async function recognizeFoodPhoto(
  image: File,
): Promise<RecognitionResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const moonshotKey = process.env.MOONSHOT_API_KEY;

  const errors: Array<{ provider: Provider; message: string }> = [];

  // ── 1ª tentativa: Gemini Flash ──
  let geminiItems: RecognizedItem[] | null = null;
  let geminiLowConfidence = false;
  if (geminiKey) {
    try {
      geminiItems = await callGemini(geminiKey, image);
      const avg = avgConfidence(geminiItems);
      if (geminiItems.length > 0 && avg >= FALLBACK_CONFIDENCE_THRESHOLD) {
        return { items: geminiItems, provider: "gemini" };
      }
      geminiLowConfidence = true;
      const reason =
        geminiItems.length === 0
          ? "gemini retornou 0 itens"
          : `gemini confidence ${avg.toFixed(2)} < ${FALLBACK_CONFIDENCE_THRESHOLD}`;
      errors.push({ provider: "gemini", message: reason });
    } catch (err) {
      errors.push({
        provider: "gemini",
        message: err instanceof Error ? err.message : "erro desconhecido",
      });
    }
  } else {
    errors.push({ provider: "gemini", message: "key ausente" });
  }

  // ── 2ª tentativa: GPT-5 ──
  if (openaiKey) {
    try {
      const items = await callOpenAI(openaiKey, image);
      if (items.length > 0) {
        return {
          items,
          provider: "gpt-5",
          fallbackReason: errors[errors.length - 1]?.message,
        };
      }
      errors.push({ provider: "gpt-5", message: "retornou 0 itens" });
    } catch (err) {
      errors.push({
        provider: "gpt-5",
        message: err instanceof Error ? err.message : "erro desconhecido",
      });
    }
  } else {
    errors.push({ provider: "gpt-5", message: "key ausente" });
  }

  // ── 3ª tentativa: Moonshot Kimi K2 vision ──
  if (moonshotKey) {
    try {
      const items = await callMoonshot(moonshotKey, image);
      if (items.length > 0) {
        return {
          items,
          provider: "moonshot",
          fallbackReason: errors[errors.length - 1]?.message,
        };
      }
      errors.push({ provider: "moonshot", message: "retornou 0 itens" });
    } catch (err) {
      errors.push({
        provider: "moonshot",
        message: err instanceof Error ? err.message : "erro desconhecido",
      });
    }
  } else {
    errors.push({ provider: "moonshot", message: "key ausente" });
  }

  // ── Última cartada: se Gemini deu items com low confidence, devolve eles
  // melhor do que erro 500
  if (geminiItems && geminiItems.length > 0 && geminiLowConfidence) {
    return {
      items: geminiItems,
      provider: "gemini",
      fallbackReason: "todos fallbacks falharam — usando gemini low-confidence",
    };
  }

  throw new AllProvidersFailedError(errors);
}

/** Converte RecognizedItem[] pra FoodItem[] (modelo de domínio do app). */
export function toFoodItems(
  items: RecognizedItem[],
  idPrefix = "ai",
): FoodItem[] {
  const now = Date.now();
  return items.map((it, idx) => ({
    id: `${idPrefix}-${now}-${idx}`,
    name: it.name,
    quantity: Math.round(it.grams),
    unit: "g" as const,
    nutrients: it.nutrients,
    source: "photo" as const,
    confidence: it.confidence,
  }));
}
