/**
 * Reconhecimento de comida a partir de foto.
 *
 * Cadeia de providers com fallback em cascata (Lucas 2026-05+):
 *
 *   1. Gemini 2.5 Flash (primário, gratuito até 1500 reqs/dia, ~1.5s)
 *   2. GPT-5 vision (~3s, ~$0.01/foto)
 *   3. Claude Sonnet 4.6 vision (~2-3s, ~$0.01/foto)
 *   4. Moonshot Kimi vision (~2-3s, barato — OpenAI-compatible)
 *   5. Hugging Face Llama 3.2 Vision (~3-5s, gratuito free tier —
 *      `HUGGINGFACE_API_KEY` já configurada no prod)
 *   6. Throws "AllProvidersFailedError" → route.ts retorna 503 com
 *      mensagem útil
 *
 * Ordenação: fastest+highest quality primeiro, mais lento+gratuito por
 * último. Cada provider missing key vira "skip" silencioso — não bloqueia
 * cascade. Single error de qualquer um cai pro próximo.
 */

import type { FoodItem, Nutrients } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";
// gpt-4o (não mini) — Lucas 2026-05-18 pediu maior precisão estilo Cal.ai.
// Mini errava muito em pratos brasileiros mistos. gpt-4o vision é ~2-4×
// melhor em food recognition + portion estimation. Custo sobe de
// ~$0.0001/foto pra ~$0.005/foto, mas latência ainda fica ~3-5s
// (dentro do timeout de 45s).
const OPENAI_MODEL = "gpt-4o";
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
// Moonshot vision: `kimi-latest` retornava "404 Not found the model kimi-latest"
// nos logs. O nome canônico do modelo vision é moonshot-v1-{8k,32k,128k}-vision-preview
// — preview ainda mas disponível pra contas com vision liberado. 32k é o sweet
// spot (~$0.5/M tokens, contexto suficiente pra imagem+resposta).
const MOONSHOT_MODEL = "moonshot-v1-32k-vision-preview";
const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
// HuggingFace Inference Providers (router endpoint). Modelo Llama 3.2 Vision
// Instruct é open source, free tier ~30 calls/dia. Boa qualidade pra reconhecer
// pratos brasileiros comuns (treinou com web data PT-BR).
const HUGGINGFACE_MODEL = "meta-llama/Llama-3.2-11B-Vision-Instruct";
const HUGGINGFACE_BASE_URL =
  "https://router.huggingface.co/v1";

// Confidence média abaixo desse threshold → vai pro fallback
const FALLBACK_CONFIDENCE_THRESHOLD = 0.6;

interface RecognizedItem {
  name: string;
  grams: number;
  confidence: number;
  nutrients: Nutrients;
}

type Provider = "gemini" | "gpt-5" | "anthropic" | "moonshot" | "huggingface";

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

const RECOGNITION_INSTRUCTION = `Você é um nutricionista brasileiro experiente, treinado em fotografia de comida estilo Cal.ai. Sua especialidade é identificar PRATOS BRASILEIROS (feijoada, picadinho, escondidinho, bobó, baião, virado, etc.) e estimar porções com precisão.

PROCESSO DE ANÁLISE — siga essas 3 etapas mentalmente antes de retornar:

ETAPA 1 — IDENTIFICAÇÃO
- Liste TODOS os alimentos distinguíveis na foto (mesmo os pequenos: pickles, ervas, azeite)
- Use cores, texturas, formas pra distinguir alimentos parecidos (ex: arroz branco vs integral pela cor; carne moída vs picada pela textura)
- Em pratos típicos BR: identifique o prato base (ex: "feijoada") E os componentes ("feijão preto", "carne seca", "linguiça", "couve refogada")
- Em dúvida entre 2 alimentos similares, escolha o mais comum no contexto BR

ETAPA 2 — ESTIMATIVA DE PORÇÃO
Use referências visuais conhecidas:
- Prato raso padrão BR: 26cm de diâmetro = ~500ml de capacidade
- Prato fundo: 22cm, ~400ml
- Travessa: 28-32cm
- Colher de sopa rasa: ~15g sólido / 12ml líquido
- Copo americano: 200ml | Copo longo: 300ml
- 1 fatia de pão de forma: ~25g | 1 pão francês: ~50g
- 1 ovo médio: ~50g (sem casca)
- 1 banana média: ~120g | 1 maçã média: ~180g
- Filé de frango do tamanho da palma: ~120g
- 1 concha de feijão: ~80g (com caldo)
- Arroz cozido cobrindo metade do prato: ~150g

Pense: "quanto isso ocupa do prato?" e "quão espessa é a camada?" pra calcular gramas.

ETAPA 3 — NUTRIENTES
Calcule os nutrientes pra GRAMAS REAIS estimadas (não por 100g). Use tabela TACO (brasileira) como base; USDA pra alimentos importados.

REGRAS RÍGIDAS:
- Nomes em PT-BR específicos (ex: "Arroz branco cozido", não só "arroz"; "Frango grelhado peito sem pele")
- Se vir cebola/temperos pequenos em quantidade trivial (<5g), INCLUA no item principal (não criar item separado)
- Se prato típico BR (feijoada/baião/etc.), retorne componentes E não o conjunto agregado
- confidence (0-1):
  • 0.85-1.0: alimento óbvio e bem visível, porção clara
  • 0.6-0.85: alimento identificado mas porção estimada
  • 0.3-0.6: alimento ambíguo OU porção difícil de medir
  • 0.0-0.3: chute educado
- Foto borrada, sem comida, ou inviável → retorne items: []
- NUNCA invente o que não está visível

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
    // temperature 0 → respostas determinísticas. Pra reconhecimento de
    // alimento, NÃO queremos criatividade — queremos consistência (mesma
    // foto, mesma análise). Lucas 2026-05-18: "tente ser mais certeiro".
    temperature: 0,
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
            text: "Analise essa refeição passo a passo (identificação → porção → nutrientes) e retorne SOMENTE o JSON. Lembre: usa as referências visuais (prato 26cm, colher 15g, etc.) pra estimar gramas.",
          },
          {
            type: "image_url",
            // detail: "high" → OpenAI usa 765 tokens em vez de 85 pra
            // analisar a imagem. Custa mais ($0.005 vs $0.001 por foto)
            // mas a precisão sobe MUITO em identificação e estimativa de
            // porção. Cal.ai usa essa estratégia.
            image_url: { url: dataUrl, detail: "high" },
          },
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

// ─── HuggingFace Inference Providers ───────────────────────────────────────
//
// HF tem um router OpenAI-compatible que aceita o mesmo formato que GPT-5 /
// Moonshot. Modelo Llama 3.2 11B Vision Instruct é grátis no free tier
// (com rate limit), bom o suficiente pra fallback final.
async function callHuggingFace(apiKey: string, image: File) {
  return callOpenAICompatible({
    apiKey,
    model: HUGGINGFACE_MODEL,
    baseURL: HUGGINGFACE_BASE_URL,
    image,
  });
}

// ─── Anthropic Claude vision ───────────────────────────────────────────────
//
// SDK próprio (não-OpenAI-compatible). Claude Sonnet 4.6 tem vision nativo,
// excelente em interpretação de imagens (com structured output via tool use
// ou parsing direto). Aqui fazemos parsing direto do response text — mais
// simples e barato (tool use cobra extra tokens).
async function callAnthropic(
  apiKey: string,
  image: File,
): Promise<RecognizedItem[]> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const base64 = await fileToBase64(image);
  const mimeType = image.type || "image/jpeg";

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: RECOGNITION_INSTRUCTION,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as
                | "image/jpeg"
                | "image/png"
                | "image/webp"
                | "image/gif",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Analise essa refeição e retorne o JSON conforme as instruções. SOMENTE o JSON, sem texto antes ou depois.",
          },
        ],
      },
    ],
  });

  // Extrai texto do response (Claude pode retornar múltiplos blocks).
  // Filter por type === "text" e cast — o SDK tipa estrito (TextBlock,
  // ThinkingBlock, etc.) mas só queremos a text aqui.
  const text = response.content
    .filter((block) => block.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");

  return normalizeItems(extractJson(text));
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Reconhece os itens de uma foto de refeição.
 *
 * Lucas (2026-05-17): "Deixe o OpenAI como unico modelo no momento,
 * depois eu adiciono o gemini."
 *
 * Estratégia simplificada:
 *   - SÓ usa OpenAI GPT-5 vision (OPENAI_API_KEY)
 *   - Sem cascade — se OpenAI falhar, retorna AllProvidersFailedError
 *
 * Os helpers de cascade (callGemini/callAnthropic/callMoonshot/
 * callHuggingFace) ficam preservados no arquivo pra quando Lucas
 * quiser reativar — basta voltar a lista `enabledProviders` aqui.
 */
export async function recognizeFoodPhoto(
  image: File,
): Promise<RecognitionResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const errors: Array<{ provider: Provider; message: string }> = [];

  if (!openaiKey) {
    errors.push({ provider: "gpt-5", message: "OPENAI_API_KEY ausente" });
    throw new AllProvidersFailedError(errors);
  }

  try {
    const items = await callOpenAI(openaiKey, image);
    if (items.length > 0) {
      return { items, provider: "gpt-5" };
    }
    errors.push({ provider: "gpt-5", message: "retornou 0 itens" });
  } catch (err) {
    errors.push({
      provider: "gpt-5",
      message: err instanceof Error ? err.message : "erro desconhecido",
    });
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
