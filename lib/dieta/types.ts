/**
 * Tipos do modulo de rastreamento alimentar (Dieta).
 *
 * Alimenta o Concierge com contexto nutricional pra correlacoes como:
 * "Sua Vitamina D esta baixa (42 ng/dL) — nos ultimos 14 dias voce nao
 * registrou peixes gordurosos, principal fonte alimentar de Vit D."
 */

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type InputMethod = "photo" | "text" | "barcode";
export type FoodSource = "ai-photo" | "ai-text" | "barcode" | "manual";

/**
 * Macronutrientes obrigatorios + micronutrientes opcionais rastreados
 * pelas analises de longevidade (foco: Vit D, B12, ferro, omega-3 --
 * biomarcadores que o Longevify ja mede em exame).
 */
export interface Nutrients {
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber?: number; // g
  sugar?: number; // g
  sodium?: number; // mg
  // Micronutrientes de longevidade — correlacionam com biomarcadores Longevify
  vitaminD?: number; // ug
  vitaminB12?: number; // ug
  iron?: number; // mg
  calcium?: number; // mg
  magnesium?: number; // mg
  omega3?: number; // g
}

/**
 * Item alimentar individual com origem e confianca.
 * `confidence` so existe pra fontes de IA (ai-photo, ai-text) —
 * barcode e manual tem precisao deterministica.
 */
export interface FoodItem {
  name: string; // Ex: "Arroz integral cozido"
  quantity: number; // quantidade numerica
  unit: "g" | "ml" | "unit"; // unidade de medida
  nutrients: Nutrients; // nutrientes para a quantidade informada
  source: FoodSource;
  confidence?: number; // 0.0-1.0 — apenas pra fontes AI
}

/**
 * Registro completo de uma refeicao.
 * `totalNutrients` e SEMPRE a soma de `items[*].nutrients`.
 * `photoUrl` e path no Supabase Storage (nao URL publica direta).
 */
export interface MealEntry {
  id: string;
  patientId: string;
  takenAt: string; // ISO 8601
  mealType: MealType;
  inputMethod: InputMethod;
  items: FoodItem[];
  totalNutrients: Nutrients;
  notes?: string;
  photoUrl?: string; // path no Supabase Storage: "dieta/{patientId}/{mealId}.jpg"
}

// --- Tipos de resposta das API routes -----------------------------------------

export interface RecognizePhotoResponse {
  items: FoodItem[];
  totalNutrients: Nutrients;
  confidence: number; // confianca media dos itens reconhecidos
  rawDescription: string; // descricao textual do que a IA viu
}

export interface ParseTextResponse {
  items: FoodItem[];
  totalNutrients: Nutrients;
  unparsedTokens: string[]; // tokens nao reconhecidos no texto livre
}

export interface BarcodeResponse {
  item: FoodItem;
  productName: string;
  brand?: string;
  servingSize?: string;
}

export interface DietaApiError {
  error: string;
  code: "NOT_FOUND" | "INVALID_INPUT" | "UPSTREAM_ERROR" | "INTERNAL_ERROR";
}

// --- Analise / insights -------------------------------------------------------

export interface DietInsight {
  nutrient: keyof Nutrients;
  message: string; // PT-BR, pronto pra exibir ao paciente
  severity: "info" | "warning" | "critical";
  avgActual: number; // media real dos ultimos 7 dias
  recommended: number; // meta diaria recomendada
  unit: string;
}

export interface DailyTarget {
  calories: number;
  protein: number; // g — ~1.6g/kg peso corporal (longevidade)
  carbs: number; // g
  fat: number; // g
  fiber: number; // g — minimo 25g
  sodium: number; // mg — maximo 2000mg
}
