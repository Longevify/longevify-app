/**
 * Lookup de nutrientes em bases públicas (gratuitas).
 *
 * Arquitetura híbrida pra reconhecimento de comida do Longevify:
 *
 *   GPT-4o (foto) → identifica alimentos + estima porção (gramas)
 *                            ↓
 *   Pra cada alimento, lookup em cascade:
 *
 *     1. TACO (local, mirror)  ─ Tabela Brasileira oficial NEPA/Unicamp
 *                                 ~80 alimentos BR comuns hard-coded.
 *                                 Match instantâneo (< 1ms), zero custo.
 *
 *     2. USDA FoodData Central ─ API pública grátis (api_key=DEMO_KEY ou
 *                                 USDA_API_KEY). 1.4M+ alimentos. Padrão
 *                                 mundial, dados verificados.
 *
 *     3. Open Food Facts       ─ API pública grátis, sem key. 3M+ produtos
 *                                 industrializados com dados de embalagem.
 *                                 Bom pra match de produtos BR com barcode
 *                                 ou nome comercial.
 *
 *     4. Fallback LLM          ─ Se nenhuma fonte encontrou, GPT-4o estima
 *                                 nutrientes na própria resposta de visão.
 *
 * Lucas (2026-05-18): "o unico pago que eu coloco é o GPT, o Logmeal e o
 * fatsecret a gente coloca em um futuro distante. As opções grátis pode
 * colocar se você achar que vai agregar."
 */

import type { Nutrients } from "./types";
import tacoDataset from "./taco-data.json";

// ─── Types ──────────────────────────────────────────────────────────────────

export type NutritionSource = "taco" | "usda" | "openfoodfacts" | "llm" | "none";

export interface NutritionLookupResult {
  source: NutritionSource;
  /** Nutrientes ESCALADOS pra `grams` (não por 100g). */
  nutrients: Nutrients;
  /** Nome canônico do alimento que matchou (pra debug/UI). */
  matchedName: string;
  /** 0-1, quão confiante é o match. TACO match exato = 1.0, USDA fuzzy = ~0.7. */
  matchConfidence: number;
}

// ─── TACO (local) ───────────────────────────────────────────────────────────

interface TacoFood {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  per100g: Partial<Nutrients>;
}

interface TacoDataset {
  _meta: Record<string, unknown>;
  foods: TacoFood[];
}

const TACO: TacoDataset = tacoDataset as TacoDataset;

/** Normaliza string pra match (lowercase, sem acentos, sem chars especiais). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacritics
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Match TACO por nome ou alias.
 * Estratégia: pega o food cujo nome ou algum alias é substring do query
 * (ou vice-versa). Prioriza match mais longo (mais específico).
 */
function findTacoMatch(query: string): TacoFood | null {
  const q = normalize(query);
  if (!q) return null;

  let best: { food: TacoFood; score: number } | null = null;

  for (const food of TACO.foods) {
    const candidates = [food.name, ...food.aliases].map(normalize);
    for (const cand of candidates) {
      if (!cand) continue;
      // Score = comprimento da overlap se um contém o outro
      let score = 0;
      if (q === cand) score = 1000; // match exato
      else if (q.includes(cand)) score = cand.length * 2; // candidato dentro do query
      else if (cand.includes(q)) score = q.length; // query dentro do candidato (menos preferido)
      if (score > 0 && (!best || score > best.score)) {
        best = { food, score };
      }
    }
  }

  return best?.food ?? null;
}

/** Multiplica nutrientes (por 100g) pela quantidade real em gramas. */
function scaleNutrients(
  per100g: Partial<Nutrients>,
  grams: number,
): Nutrients {
  const factor = grams / 100;
  const out: Nutrients = {
    calories: (per100g.calories ?? 0) * factor,
    protein: (per100g.protein ?? 0) * factor,
    carbs: (per100g.carbs ?? 0) * factor,
    fat: (per100g.fat ?? 0) * factor,
  };
  // Campos opcionais: só adicionar se estavam presentes na fonte
  const optionalKeys: (keyof Nutrients)[] = [
    "fiber", "sugar", "saturatedFat", "cholesterol", "sodium",
    "vitaminA", "vitaminD", "vitaminE", "vitaminK", "vitaminC",
    "vitaminB1", "vitaminB2", "vitaminB3", "vitaminB6", "vitaminB9", "vitaminB12",
    "calcium", "iron", "magnesium", "potassium", "zinc", "selenium",
    "omega3", "choline",
  ];
  for (const k of optionalKeys) {
    const v = per100g[k];
    if (typeof v === "number" && v > 0) {
      out[k] = v * factor;
    }
  }
  return out;
}

export async function lookupTaco(
  name: string,
  grams: number,
): Promise<NutritionLookupResult | null> {
  const match = findTacoMatch(name);
  if (!match) return null;
  return {
    source: "taco",
    nutrients: scaleNutrients(match.per100g, grams),
    matchedName: match.name,
    matchConfidence: normalize(name) === normalize(match.name) ? 1.0 : 0.85,
  };
}

// ─── USDA FoodData Central ──────────────────────────────────────────────────

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
// DEMO_KEY tem rate limit baixíssimo (30/hora, 50/dia). Pra prod, signup
// gratuito em fdc.nal.usda.gov/api-key-signup.html → set USDA_API_KEY no
// Vercel env.
function usdaApiKey(): string {
  return process.env.USDA_API_KEY || "DEMO_KEY";
}

/**
 * USDA FoodNutrient.nutrientId → nosso campo Nutrients.
 * IDs canônicos do USDA FDC (verificados em https://fdc.nal.usda.gov/portal-data/external/datadictionary).
 */
const USDA_NUTRIENT_MAP: Record<number, keyof Nutrients> = {
  1008: "calories",      // Energy (kcal)
  1003: "protein",       // Protein
  1005: "carbs",         // Carbohydrate, by difference
  1004: "fat",           // Total lipid (fat)
  1079: "fiber",         // Fiber, total dietary
  2000: "sugar",         // Sugars, total
  1258: "saturatedFat",  // Fatty acids, total saturated
  1253: "cholesterol",   // Cholesterol
  1093: "sodium",        // Sodium
  1106: "vitaminA",      // Vitamin A, RAE (µg)
  1114: "vitaminD",      // Vitamin D (D2 + D3)
  1109: "vitaminE",      // Vitamin E (alpha-tocopherol)
  1185: "vitaminK",      // Vitamin K (phylloquinone)
  1162: "vitaminC",      // Vitamin C
  1165: "vitaminB1",     // Thiamin
  1166: "vitaminB2",     // Riboflavin
  1167: "vitaminB3",     // Niacin
  1175: "vitaminB6",     // Vitamin B-6
  1177: "vitaminB9",     // Folate, total
  1178: "vitaminB12",    // Vitamin B-12
  1087: "calcium",       // Calcium
  1089: "iron",          // Iron
  1090: "magnesium",     // Magnesium
  1092: "potassium",     // Potassium
  1095: "zinc",          // Zinc
  1103: "selenium",      // Selenium
  1180: "choline",       // Choline, total
};

interface UsdaFoodNutrient {
  nutrientId?: number;
  value?: number;
  amount?: number; // alguns endpoints usam amount em vez de value
}

interface UsdaSearchHit {
  fdcId: number;
  description: string;
  foodNutrients?: UsdaFoodNutrient[];
  // Prioritizar foods USDA "Survey (FNDDS)" ou "Foundation" — mais confiáveis
  dataType?: string;
}

interface UsdaSearchResponse {
  foods?: UsdaSearchHit[];
  totalHits?: number;
}

/** Ranking de dataType USDA — mais confiável → menos confiável. */
const USDA_DATATYPE_RANK: Record<string, number> = {
  "Foundation": 4,            // Curated by USDA, highest quality
  "SR Legacy": 3,             // Standard Reference (legacy)
  "Survey (FNDDS)": 2,        // What we eat in America
  "Branded": 1,               // Brand-submitted (less curated)
};

export async function lookupUsda(
  name: string,
  grams: number,
  /**
   * Nome em inglês (opcional, mas FORTEMENTE recomendado). USDA indexa
   * apenas EN — query "feijão" retorna 0 hits, query "black beans cooked"
   * retorna 8. GPT-4o gera o nameEn no mesmo prompt de identificação,
   * custo extra zero. Sem nameEn, cai pra PT (compat) e provavelmente
   * vira null.
   */
  nameEn?: string,
): Promise<NutritionLookupResult | null> {
  const apiKey = usdaApiKey();
  // Prioriza EN; cai pra PT só pra manter compat caso GPT não tenha mandado nameEn.
  const query = nameEn && nameEn.length > 0 ? nameEn : name;
  const url = new URL(`${USDA_BASE}/foods/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "5");
  url.searchParams.set("api_key", apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000), // 4s timeout — não bloquear UX
    });
  } catch (err) {
    console.warn(`[USDA] fetch falhou pra "${name}":`, err);
    return null;
  }
  if (!response.ok) {
    console.warn(`[USDA] HTTP ${response.status} pra "${name}"`);
    return null;
  }

  const data = (await response.json()) as UsdaSearchResponse;
  const hits = data.foods ?? [];
  if (hits.length === 0) return null;

  // Pega o melhor hit por dataType ranking
  const sorted = [...hits].sort((a, b) => {
    const ra = USDA_DATATYPE_RANK[a.dataType ?? ""] ?? 0;
    const rb = USDA_DATATYPE_RANK[b.dataType ?? ""] ?? 0;
    return rb - ra;
  });
  const best = sorted[0];

  const per100g: Partial<Nutrients> = {};
  for (const fn of best.foodNutrients ?? []) {
    if (fn.nutrientId == null) continue;
    const field = USDA_NUTRIENT_MAP[fn.nutrientId];
    if (!field) continue;
    const v = fn.value ?? fn.amount;
    if (typeof v === "number" && v >= 0) {
      per100g[field] = v;
    }
  }

  // Se não tem nem calorias, considera fail
  if (per100g.calories == null) return null;

  return {
    source: "usda",
    nutrients: scaleNutrients(per100g, grams),
    matchedName: best.description,
    matchConfidence: 0.7,
  };
}

// ─── Open Food Facts ────────────────────────────────────────────────────────
//
// API pública sem auth: https://openfoodfacts.github.io/openfoodfacts-server/api/
// Endpoint de busca: https://world.openfoodfacts.org/cgi/search.pl
// Pra cobertura BR especificamente: br.openfoodfacts.org (subset BR).

const OFF_BASE = "https://world.openfoodfacts.org";

interface OffNutriments {
  // OFF retorna nutrientes por 100g com sufixo "_100g"
  "energy-kcal_100g"?: number;
  "proteins_100g"?: number;
  "carbohydrates_100g"?: number;
  "fat_100g"?: number;
  "fiber_100g"?: number;
  "sugars_100g"?: number;
  "saturated-fat_100g"?: number;
  "cholesterol_100g"?: number; // gramas, precisa multiplicar por 1000 pra mg
  "sodium_100g"?: number; // gramas → x1000 pra mg
  "salt_100g"?: number; // gramas → x400 pra mg sódio (salt × 0.4)
  "vitamin-a_100g"?: number; // µg
  "vitamin-d_100g"?: number; // µg
  "vitamin-c_100g"?: number; // mg
  "calcium_100g"?: number; // mg
  "iron_100g"?: number; // mg
  "potassium_100g"?: number; // mg
  "magnesium_100g"?: number; // mg
  "zinc_100g"?: number; // mg
}

interface OffProduct {
  product_name?: string;
  product_name_pt?: string;
  nutriments?: OffNutriments;
  countries_tags?: string[]; // ["en:brazil", ...] útil pra priorizar produtos BR
}

interface OffSearchResponse {
  products?: OffProduct[];
  count?: number;
}

function mapOffNutriments(n: OffNutriments): Partial<Nutrients> {
  const out: Partial<Nutrients> = {};
  if (typeof n["energy-kcal_100g"] === "number") out.calories = n["energy-kcal_100g"];
  if (typeof n.proteins_100g === "number") out.protein = n.proteins_100g;
  if (typeof n.carbohydrates_100g === "number") out.carbs = n.carbohydrates_100g;
  if (typeof n.fat_100g === "number") out.fat = n.fat_100g;
  if (typeof n.fiber_100g === "number") out.fiber = n.fiber_100g;
  if (typeof n.sugars_100g === "number") out.sugar = n.sugars_100g;
  if (typeof n["saturated-fat_100g"] === "number") out.saturatedFat = n["saturated-fat_100g"];
  if (typeof n.cholesterol_100g === "number") out.cholesterol = n.cholesterol_100g * 1000; // g → mg
  // OFF prefere "sodium" mas alguns produtos só têm "salt"
  if (typeof n.sodium_100g === "number") out.sodium = n.sodium_100g * 1000; // g → mg
  else if (typeof n.salt_100g === "number") out.sodium = n.salt_100g * 400; // salt g → sodium mg
  if (typeof n["vitamin-a_100g"] === "number") out.vitaminA = n["vitamin-a_100g"];
  if (typeof n["vitamin-d_100g"] === "number") out.vitaminD = n["vitamin-d_100g"];
  if (typeof n["vitamin-c_100g"] === "number") out.vitaminC = n["vitamin-c_100g"];
  if (typeof n.calcium_100g === "number") out.calcium = n.calcium_100g * 1000; // g → mg
  if (typeof n.iron_100g === "number") out.iron = n.iron_100g * 1000;
  if (typeof n.potassium_100g === "number") out.potassium = n.potassium_100g * 1000;
  if (typeof n.magnesium_100g === "number") out.magnesium = n.magnesium_100g * 1000;
  if (typeof n.zinc_100g === "number") out.zinc = n.zinc_100g * 1000;
  return out;
}

export async function lookupOpenFoodFacts(
  name: string,
  grams: number,
): Promise<NutritionLookupResult | null> {
  const url = new URL(`${OFF_BASE}/cgi/search.pl`);
  url.searchParams.set("search_terms", name);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "10");
  // Boost de relevância pra produtos BR — OFF aceita filtro por country
  url.searchParams.set("tagtype_0", "countries");
  url.searchParams.set("tag_contains_0", "contains");
  url.searchParams.set("tag_0", "brazil");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        // OFF pede User-Agent identificável (best practice)
        "User-Agent": "Longevify-Health/1.0 (suporte@longevify.com.br)",
      },
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.warn(`[OFF] fetch falhou pra "${name}":`, err);
    return null;
  }
  if (!response.ok) return null;

  const data = (await response.json()) as OffSearchResponse;
  const products = data.products ?? [];
  if (products.length === 0) return null;

  // Pega o primeiro produto que tem nutriments com pelo menos calorias
  const best = products.find(
    (p) => p.nutriments && typeof p.nutriments["energy-kcal_100g"] === "number",
  );
  if (!best || !best.nutriments) return null;

  const per100g = mapOffNutriments(best.nutriments);
  if (per100g.calories == null) return null;

  return {
    source: "openfoodfacts",
    nutrients: scaleNutrients(per100g, grams),
    matchedName: best.product_name_pt ?? best.product_name ?? name,
    matchConfidence: 0.6,
  };
}

// ─── Orquestrador cascade ───────────────────────────────────────────────────

/**
 * Tenta enriquecer um alimento com nutrientes via cascade:
 *
 *   1. TACO local (instant, BR oficial) — usa nome PT
 *   2. USDA FDC (1.4M+ items, padrão mundial) — usa nameEn (EN) se disponível
 *   3. Open Food Facts (produtos industrializados, com prefer BR) — usa nome PT
 *
 * Retorna o primeiro hit. Se todas falharem, retorna null —
 * caller usa fallback (LLM ou nutrientes zerados).
 *
 * @param name nome em PT-BR (usado em TACO + OFF + UI matchedName)
 * @param grams porção real em gramas
 * @param nameEn nome em inglês (opcional, melhora MUITO match no USDA)
 */
export async function lookupNutritionCascade(
  name: string,
  grams: number,
  nameEn?: string,
): Promise<NutritionLookupResult | null> {
  // 1) TACO (síncrono, microsegundos) — usa nome PT
  const taco = await lookupTaco(name, grams);
  if (taco) return taco;

  // 2) USDA + 3) OFF em paralelo (race-style: o que voltar primeiro com
  // dado válido ganha). Reduz latência ~50%. USDA usa EN, OFF usa PT.
  const [usda, off] = await Promise.allSettled([
    lookupUsda(name, grams, nameEn),
    lookupOpenFoodFacts(name, grams),
  ]);

  const usdaResult = usda.status === "fulfilled" ? usda.value : null;
  if (usdaResult) return usdaResult;

  const offResult = off.status === "fulfilled" ? off.value : null;
  if (offResult) return offResult;

  return null;
}

/** Stats helper pra UI/debug — quantos itens vieram de cada fonte. */
export function summarizeSources(
  results: Array<NutritionLookupResult | null>,
): Record<NutritionSource, number> {
  const counts: Record<NutritionSource, number> = {
    taco: 0,
    usda: 0,
    openfoodfacts: 0,
    llm: 0,
    none: 0,
  };
  for (const r of results) {
    if (!r) counts.none++;
    else counts[r.source]++;
  }
  return counts;
}
