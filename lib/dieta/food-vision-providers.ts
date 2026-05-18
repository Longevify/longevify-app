/**
 * Reconhecimento de comida a partir de foto — arquitetura híbrida.
 *
 * Lucas (2026-05-18): "o unico pago que eu coloco é o GPT, o Logmeal e o
 * fatsecret a gente coloca em um futuro distante. As opções grátis pode
 * colocar se você achar que vai agregar para a identificação e analise."
 *
 * Pipeline:
 *
 *   FOTO
 *    │
 *    ├─ ETAPA 1: identifyFood() — GPT-4o vision (detail:high, temperature:0)
 *    │   → retorna lista [{name: "arroz branco", grams: 150, confidence: 0.9}, ...]
 *    │   PROMPT SÓ pede identificação + porção. SEM calcular nutrientes.
 *    │   (LLMs são fortes em ver comida, fracos em valores nutricionais exatos.)
 *    │
 *    └─ ETAPA 2: lookupNutritionCascade() — pra cada item em paralelo:
 *        1) TACO local (NEPA/Unicamp, BR oficial, ~80 alimentos comuns)
 *        2) USDA FoodData Central (API pública, 1.4M+ alimentos)
 *        3) Open Food Facts (produtos industrializados, com filter BR)
 *        4) Fallback: GPT-4o estima nutrientes em chamada adicional
 *
 * Trade-off: separar identify de nutrition adiciona 1-3s de latência total
 * (lookup HTTP em USDA/OFF), mas GANHA muita precisão nutricional —
 * valores oficiais BR + USDA verificados, não estimativa LLM. Para
 * pratos BR comuns, TACO bate match instantâneo (< 1ms).
 *
 * Histórico: até PR #191 mantínhamos cascade Gemini→GPT→Claude→Moonshot→HF
 * pra ter providers fallback. Lucas decidiu simplificar: SÓ GPT pago. Se
 * GPT cair, retornamos erro friendly em vez de tentar provider inferior.
 */

import type { FoodItem, Nutrients } from "./types";
import {
  lookupNutritionCascade,
  summarizeSources,
  type NutritionSource,
} from "./nutrition-databases";

// gpt-4o (não mini) — Lucas 2026-05-18 pediu maior precisão estilo Cal.ai.
// Mini errava muito em pratos brasileiros mistos. gpt-4o vision é ~2-4×
// melhor em food recognition + portion estimation. Custo sobe de
// ~$0.0001/foto pra ~$0.005/foto.
const OPENAI_MODEL = "gpt-4o";

// Para o "fallback de nutrientes via LLM" usamos gpt-4o-mini — mais barato
// e suficiente pra valores aproximados quando TACO/USDA/OFF falham.
const OPENAI_NUTRIENTS_FALLBACK_MODEL = "gpt-4o-mini";

// ─── Types ──────────────────────────────────────────────────────────────────

interface IdentifiedItem {
  /** Nome em PT-BR (idioma principal, usado em UI e TACO/OFF lookup). */
  name: string;
  /**
   * Nome em inglês (opcional). Usado pra lookup no USDA FoodData Central
   * que indexa só em EN. Sem nameEn, USDA pode não dar match em pratos BR
   * — ex: "feijão" retorna 0 hits no USDA, mas "black beans cooked" volta
   * com 8 hits válidos. GPT-4o gera o EN no mesmo prompt — custo zero.
   */
  nameEn?: string;
  grams: number;
  confidence: number;
}

export interface RecognizedItem {
  name: string;
  grams: number;
  confidence: number;
  nutrients: Nutrients;
  nutritionSource: NutritionSource;
  matchedName?: string;
}

type Provider = "gpt-4o" | "gpt-4o-mini-fallback";

interface RecognitionResult {
  items: RecognizedItem[];
  provider: Provider;
  /** Estatísticas de fontes dos nutrientes — útil pra debug e UI ("8 itens do TACO, 2 do USDA"). */
  nutritionSourceStats: Record<NutritionSource, number>;
}

export class AllProvidersFailedError extends Error {
  public readonly providerErrors: Array<{ provider: Provider; message: string }>;
  constructor(providerErrors: Array<{ provider: Provider; message: string }>) {
    const summary = providerErrors
      .map((e) => `${e.provider}: ${e.message}`)
      .join(" | ");
    super(`Reconhecimento de comida falhou: ${summary}`);
    this.name = "AllProvidersFailedError";
    this.providerErrors = providerErrors;
  }
}

// ─── Prompt: SÓ identificação + porção ──────────────────────────────────────
//
// Diferente do prompt antigo, este NÃO pede nutrientes. Razões:
//   1) LLMs estimam macros decentes mas micros muito mal (vits/minerais
//      "inventados" sem base científica real)
//   2) Foco do prompt em "ver bem o prato" → output mais consistente
//   3) Resposta mais curta = mais barata + mais rápida (~30% redução)

const IDENTIFICATION_PROMPT = `Você é um nutricionista brasileiro experiente, treinado em fotografia de comida estilo Cal.ai. Sua única tarefa AGORA: IDENTIFICAR os alimentos visíveis e ESTIMAR a porção de cada um em gramas. NÃO calcule nutrientes — outro sistema vai fazer isso.

PROCESSO DE ANÁLISE — siga essas 2 etapas mentalmente:

ETAPA 1 — IDENTIFICAÇÃO
- Liste TODOS os alimentos distinguíveis na foto (mesmo os pequenos: pickles, ervas, azeite)
- Use cores, texturas, formas pra distinguir alimentos parecidos (ex: arroz branco vs integral pela cor; carne moída vs picada pela textura)
- Em pratos típicos BR: identifique componentes separados ("feijão preto cozido", "carne seca cozida", "linguiça", "couve manteiga refogada") — NÃO retorne o agregado ("feijoada")
- Use nomes em PT-BR específicos:
  • "Arroz branco cozido" (não só "arroz")
  • "Frango grelhado, peito sem pele" (não só "frango")
  • "Feijão preto cozido" (não só "feijão")
  • "Pão francês" (não só "pão")
- Pra CADA alimento, forneça TAMBÉM o nome em inglês ("nameEn") — usaremos pra lookup em base nutricional internacional (USDA). Use o nome técnico/genérico em EN, não marca:
  • "Arroz branco cozido" → "white rice cooked"
  • "Frango grelhado, peito sem pele" → "chicken breast grilled skinless"
  • "Feijão preto cozido" → "black beans cooked"
  • "Pão francês" → "french bread roll"
- Se vir tempero/molho pequeno (<5g), INCLUA no item principal — não criar item separado

ETAPA 2 — ESTIMATIVA DE PORÇÃO (em gramas)
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
- Arroz cozido cobrindo metade do prato raso: ~150g

Pense: "quanto isso ocupa do prato?" e "quão espessa é a camada?" pra calcular gramas.

CONFIDENCE (0-1):
- 0.85-1.0: alimento óbvio e bem visível, porção clara
- 0.6-0.85: alimento identificado mas porção estimada
- 0.3-0.6: alimento ambíguo OU porção difícil de medir
- 0.0-0.3: chute educado

REGRAS:
- Foto borrada, sem comida, ou inviável → retorne items: []
- NUNCA invente o que não está visível
- Preferir nomes que existam na Tabela Brasileira (TACO) ou USDA — vai facilitar lookup nutricional automático

Retorne SOMENTE JSON no schema:
{
  "items": [
    { "name": "string (PT-BR)", "nameEn": "string (English)", "grams": number, "confidence": number }
  ]
}`;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return buf.toString("base64");
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fenced ? fenced[1] : trimmed;
  return JSON.parse(body);
}

interface RawIdentifyPayload {
  items?: Array<{
    name?: unknown;
    nameEn?: unknown;
    grams?: unknown;
    confidence?: unknown;
  }>;
}

function parseIdentifiedItems(payload: unknown): IdentifiedItem[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as RawIdentifyPayload;
  if (!Array.isArray(p.items)) return [];
  return p.items
    .map((it): IdentifiedItem | null => {
      if (!it || typeof it !== "object") return null;
      const name = typeof it.name === "string" ? it.name.trim() : null;
      const nameEn =
        typeof it.nameEn === "string" && it.nameEn.trim().length > 0
          ? it.nameEn.trim()
          : undefined;
      const grams =
        typeof it.grams === "number" && it.grams > 0 ? it.grams : null;
      if (!name || !grams) return null;
      const confidence =
        typeof it.confidence === "number"
          ? Math.max(0, Math.min(1, it.confidence))
          : 0.5;
      return { name, nameEn, grams, confidence };
    })
    .filter((it): it is IdentifiedItem => it !== null);
}

// ─── Etapa 1: identificação via GPT-4o vision ───────────────────────────────

async function identifyFood(
  apiKey: string,
  image: File,
): Promise<IdentifiedItem[]> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const base64 = await fileToBase64(image);
  const mimeType = image.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      {
        role: "system",
        content: IDENTIFICATION_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Identifique os alimentos e estime a porção em gramas. Retorne SOMENTE o JSON.",
          },
          {
            type: "image_url",
            image_url: { url: dataUrl, detail: "high" },
          },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  return parseIdentifiedItems(extractJson(content));
}

// ─── Etapa 2 (fallback): nutrientes via GPT-4o-mini quando TACO/USDA/OFF falham ─

const NUTRIENT_FALLBACK_PROMPT = `Você é um nutricionista. Dado o alimento e a quantidade em gramas, retorne os nutrientes ESTIMADOS PARA AQUELA QUANTIDADE EXATA (não por 100g). Use referências TACO (Brasil) e USDA. Retorne SOMENTE JSON no schema:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "saturatedFat": number,
  "cholesterol": number,
  "sodium": number
}
Omita campo se for desprezível. Valores devem ser pra a quantidade pedida, não por 100g.`;

async function estimateNutrientsViaLLM(
  apiKey: string,
  name: string,
  grams: number,
): Promise<Nutrients | null> {
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: OPENAI_NUTRIENTS_FALLBACK_MODEL,
      response_format: { type: "json_object" },
      temperature: 0,
      messages: [
        { role: "system", content: NUTRIENT_FALLBACK_PROMPT },
        { role: "user", content: `Alimento: ${name}\nQuantidade: ${grams}g` },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const num = (v: unknown): number =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;

    return {
      calories: num(parsed.calories),
      protein: num(parsed.protein),
      carbs: num(parsed.carbs),
      fat: num(parsed.fat),
      fiber: num(parsed.fiber),
      sugar: num(parsed.sugar),
      saturatedFat: num(parsed.saturatedFat),
      cholesterol: num(parsed.cholesterol),
      sodium: num(parsed.sodium),
    };
  } catch (err) {
    console.warn(`[LLM-nutrients-fallback] falhou pra ${name}:`, err);
    return null;
  }
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Pipeline completo: foto → itens identificados + nutrientes do BD.
 *
 * 1. identifyFood() via GPT-4o vision → lista de items + gramas
 * 2. Pra cada item: lookupNutritionCascade() (TACO → USDA → OFF) em paralelo
 * 3. Se cascade falhar pra algum item: fallback LLM estima nutrientes
 */
export async function recognizeFoodPhoto(
  image: File,
): Promise<RecognitionResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const errors: Array<{ provider: Provider; message: string }> = [];

  if (!openaiKey) {
    errors.push({ provider: "gpt-4o", message: "OPENAI_API_KEY ausente" });
    throw new AllProvidersFailedError(errors);
  }

  // ── Etapa 1: identifica os alimentos ──
  let identified: IdentifiedItem[];
  try {
    identified = await identifyFood(openaiKey, image);
  } catch (err) {
    errors.push({
      provider: "gpt-4o",
      message: err instanceof Error ? err.message : "erro desconhecido",
    });
    throw new AllProvidersFailedError(errors);
  }

  if (identified.length === 0) {
    errors.push({
      provider: "gpt-4o",
      message: "Nenhum alimento identificado na foto",
    });
    throw new AllProvidersFailedError(errors);
  }

  // ── Etapa 2: lookup de nutrientes em cascade pra cada item, paralelo ──
  // Passa nameEn (quando GPT forneceu) pro USDA matchar em inglês.
  const lookupResults = await Promise.all(
    identified.map((it) =>
      lookupNutritionCascade(it.name, it.grams, it.nameEn),
    ),
  );

  // ── Etapa 3: pra items sem match no cascade, fallback LLM ──
  const items: RecognizedItem[] = await Promise.all(
    identified.map(async (it, idx): Promise<RecognizedItem> => {
      const lookup = lookupResults[idx];
      if (lookup) {
        return {
          name: it.name,
          grams: it.grams,
          confidence: it.confidence,
          nutrients: lookup.nutrients,
          nutritionSource: lookup.source,
          matchedName: lookup.matchedName,
        };
      }
      // Cascade falhou → tentar LLM fallback
      const llmEstimate = await estimateNutrientsViaLLM(
        openaiKey,
        it.name,
        it.grams,
      );
      return {
        name: it.name,
        grams: it.grams,
        confidence: it.confidence,
        nutrients: llmEstimate ?? {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
        nutritionSource: llmEstimate ? "llm" : "none",
      };
    }),
  );

  return {
    items,
    provider: "gpt-4o",
    nutritionSourceStats: summarizeSources(lookupResults),
  };
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
