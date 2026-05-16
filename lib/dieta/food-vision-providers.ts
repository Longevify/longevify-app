/**
 * Reconhecimento de comida a partir de foto.
 *
 * Workflow (Lucas 2026-05): "primeiro gemini flash e caso não consiga
 * identificar ou esteja com dúvida, coloque o GPT-5 para analisar".
 *
 *   1. Gemini 2.5 Flash (primário) — rápido (~1.5s), grátis até 1500
 *      reqs/dia. Retorna JSON estruturado com itens + nutrientes +
 *      confidence por item.
 *   2. Se confidence média < 0.6 OU < 1 item identificado OU Gemini
 *      falhar → cai pra GPT-5 vision (mais robusto, ~3-4s, ~$0.01).
 *   3. Erro nos dois → throws (route.ts retorna 500).
 *
 * O modelo identifica nome + gramas + nutrientes em uma única chamada.
 * Nutrient lookup em DB externa (TACO/Open Food Facts) é V2 — por agora
 * confiamos no LLM (eles são bem precisos pra estimar valores de
 * alimentos comuns).
 */

import type { FoodItem, Nutrients } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_MODEL = "gpt-5";

// Confidence média abaixo desse threshold → vai pro fallback
const FALLBACK_CONFIDENCE_THRESHOLD = 0.6;

interface RecognizedItem {
  name: string;
  grams: number;
  confidence: number;
  nutrients: Nutrients;
}

interface RecognitionResult {
  items: RecognizedItem[];
  provider: "gemini" | "gpt-5";
  fallbackReason?: string;
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

// ─── OpenAI GPT-5 vision (fallback) ────────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  image: File,
): Promise<RecognizedItem[]> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const base64 = await fileToBase64(image);
  const mimeType = image.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
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

// ─── Orchestrator com fallback ─────────────────────────────────────────────

/**
 * Reconhece os itens de uma foto de refeição.
 *
 * Tenta Gemini Flash primeiro; se confidence baixa ou erro, cai pro
 * GPT-5. Retorna provider usado + razão do fallback (pra debug/UX).
 */
export async function recognizeFoodPhoto(
  image: File,
): Promise<RecognitionResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    throw new Error(
      "Nenhum provider configurado — defina GEMINI_API_KEY ou OPENAI_API_KEY.",
    );
  }

  // 1ª tentativa: Gemini
  if (geminiKey) {
    try {
      const items = await callGemini(geminiKey, image);
      const avg = avgConfidence(items);
      const passed =
        items.length > 0 && avg >= FALLBACK_CONFIDENCE_THRESHOLD;

      if (passed) {
        return { items, provider: "gemini" };
      }

      // Confidence baixa ou items vazios → fallback
      if (openaiKey) {
        const reason =
          items.length === 0
            ? "gemini retornou 0 itens"
            : `confidence média ${avg.toFixed(2)} < ${FALLBACK_CONFIDENCE_THRESHOLD}`;
        try {
          const fallbackItems = await callOpenAI(openaiKey, image);
          return {
            items: fallbackItems,
            provider: "gpt-5",
            fallbackReason: reason,
          };
        } catch (err) {
          // Fallback também falhou — devolve o resultado original do Gemini
          return {
            items,
            provider: "gemini",
            fallbackReason: `fallback gpt-5 falhou: ${
              err instanceof Error ? err.message : "unknown"
            }`,
          };
        }
      }

      // Sem fallback disponível — devolve Gemini mesmo com confidence baixa
      return { items, provider: "gemini" };
    } catch (err) {
      // Gemini falhou completamente → tenta GPT-5
      if (openaiKey) {
        const items = await callOpenAI(openaiKey, image);
        return {
          items,
          provider: "gpt-5",
          fallbackReason: `gemini falhou: ${
            err instanceof Error ? err.message : "unknown"
          }`,
        };
      }
      throw err;
    }
  }

  // Sem Gemini key → vai direto pro GPT-5
  if (openaiKey) {
    const items = await callOpenAI(openaiKey, image);
    return { items, provider: "gpt-5", fallbackReason: "gemini key ausente" };
  }

  // Inacessível (já validamos acima), mas TS feliz
  throw new Error("Nenhum provider de visão disponível.");
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
