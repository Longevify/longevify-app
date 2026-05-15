/**
 * Modelo de dados pro tracking de dieta do Longevify.
 *
 * 3 inputs suportados:
 *   - photo: foto do prato → IA reconhece (GPT-4 Vision quando ligar)
 *   - text: texto livre ("frango grelhado + arroz")
 *   - barcode: código de barras → Open Food Facts API
 *
 * Os dados de dieta alimentam Dr. Lon pra dar diagnósticos mais
 * precisos (ex: Vit D baixa + dieta sem peixe gordo = consistent).
 */

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type InputMethod = "photo" | "text" | "barcode" | "manual";

export interface Nutrients {
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber?: number;
  sugar?: number;
  sodium?: number; // mg
  // Micronutrientes relevantes pra Longevify Score / biomarkers
  vitaminD?: number; // µg
  vitaminB12?: number; // µg
  iron?: number; // mg
  calcium?: number; // mg
  magnesium?: number; // mg
  omega3?: number; // g
  zinc?: number; // mg
}

export interface FoodItem {
  id: string;
  name: string; // "Arroz integral"
  quantity: number;
  unit: "g" | "ml" | "unit" | "tbsp" | "cup";
  nutrients: Nutrients;
  source: InputMethod;
  confidence?: number; // 0-1 pra fontes AI
  barcode?: string; // só pra source=barcode
}

export interface MealEntry {
  id: string;
  patientId: string;
  takenAt: string; // ISO
  mealType: MealType;
  inputMethod: InputMethod;
  items: FoodItem[];
  totalNutrients: Nutrients;
  notes?: string;
  photoUrl?: string;
}

// ─── Daily targets (recomendação Longevify pra adulto saudável) ─────────────

export interface NutrientTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  vitaminD: number;
  vitaminB12: number;
  iron: number;
  omega3: number;
}

export const DEFAULT_TARGETS: NutrientTargets = {
  calories: 2200,
  protein: 130, // 1.6g/kg pra adulto 80kg
  carbs: 250,
  fat: 75,
  fiber: 30,
  vitaminD: 20, // µg/dia
  vitaminB12: 2.4,
  iron: 14,
  omega3: 1.6, // g/dia
};

// ─── Labels PT-BR ───────────────────────────────────────────────────────────

export const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: "Café da manhã",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
};

export const MEAL_TYPE_ICON: Record<MealType, string> = {
  breakfast: "☕",
  lunch: "🍽️",
  dinner: "🌙",
  snack: "🥨",
};

// ─── Empty nutrients pra somar com spread ───────────────────────────────────

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
  vitaminD: 0,
  vitaminB12: 0,
  iron: 0,
  calcium: 0,
  magnesium: 0,
  omega3: 0,
  zinc: 0,
};
