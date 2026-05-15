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

/**
 * Nutrientes rastreados pelo Longevify. Macros + vitaminas + minerais +
 * outros parâmetros (fibra, açúcar, gordura saturada, colesterol etc.).
 *
 * Valores ausentes (undefined) são tratados como 0 nos somatórios — o
 * mock só preenche o que o alimento de fato fornece em quantidade
 * relevante (referência TACO/USDA).
 */
export interface Nutrients {
  // ─── Macros ─────────────────────────────────────────────────────
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g

  // ─── Subcomponentes de macros (qualidade) ───────────────────────
  fiber?: number; // g — solúvel+insolúvel
  sugar?: number; // g — açúcares totais (inclui adicionados)
  saturatedFat?: number; // g — limite WHO <22g/dia
  cholesterol?: number; // mg — referência 300mg/dia
  sodium?: number; // mg — limite 2.300mg/dia

  // ─── Vitaminas (lipossolúveis) ──────────────────────────────────
  vitaminA?: number; // µg RAE — visão, imunidade
  vitaminD?: number; // µg — osso, imunidade
  vitaminE?: number; // mg α-tocoferol — antioxidante
  vitaminK?: number; // µg — coagulação, osso

  // ─── Vitaminas (hidrossolúveis) ─────────────────────────────────
  vitaminC?: number; // mg — antioxidante, colágeno
  vitaminB1?: number; // mg tiamina — metab. energético
  vitaminB2?: number; // mg riboflavina — pele, olhos
  vitaminB3?: number; // mg niacina — pele, lipídio
  vitaminB6?: number; // mg piridoxina — neurotransmissores
  vitaminB9?: number; // µg folato — DNA, gestação
  vitaminB12?: number; // µg cobalamina — nervos, sangue

  // ─── Minerais ───────────────────────────────────────────────────
  calcium?: number; // mg — osso, músculo
  iron?: number; // mg — hemoglobina
  magnesium?: number; // mg — 300+ enzimas
  potassium?: number; // mg — pressão arterial
  zinc?: number; // mg — imunidade, testo
  selenium?: number; // µg — antioxidante, tireoide

  // ─── Outros ─────────────────────────────────────────────────────
  omega3?: number; // g — EPA+DHA+ALA
  choline?: number; // mg — fígado, cérebro
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
//
// Bases: DRI/RDA (IOM 2006) + WHO + recomendações Longevify pra perfil
// de longevidade (proteína mais alta, ômega-3 mais alto, sódio/sat
// fat/açúcar como LIMITE não meta).
//
// `kind: "limit"` = ideal é ficar ABAIXO. `kind: "target"` = ideal é
// atingir. Usado pela UI pra escolher cor de status (verde = abaixo
// pra limit, verde = perto/acima pra target).

export type TargetKind = "target" | "limit";

export interface NutrientTargets {
  // Macros
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Subcomponentes
  fiber: number;
  sugar: number; // limit
  saturatedFat: number; // limit
  cholesterol: number; // limit
  sodium: number; // limit
  // Vitaminas
  vitaminA: number;
  vitaminD: number;
  vitaminE: number;
  vitaminK: number;
  vitaminC: number;
  vitaminB1: number;
  vitaminB2: number;
  vitaminB3: number;
  vitaminB6: number;
  vitaminB9: number;
  vitaminB12: number;
  // Minerais
  calcium: number;
  iron: number;
  magnesium: number;
  potassium: number;
  zinc: number;
  selenium: number;
  // Outros
  omega3: number;
  choline: number;
}

export const DEFAULT_TARGETS: NutrientTargets = {
  // Macros — perfil adulto 80kg, ativo
  calories: 2200,
  protein: 130, // 1.6 g/kg
  carbs: 250,
  fat: 75,
  // Subcomponentes
  fiber: 30,
  sugar: 25, // limit (AHA <25g mulher, <36g homem)
  saturatedFat: 22, // limit (WHO <10% kcal ≈ 22g)
  cholesterol: 300, // limit (mg/dia)
  sodium: 2300, // limit (mg/dia)
  // Vitaminas
  vitaminA: 900, // µg RAE
  vitaminD: 20, // µg (=800 UI)
  vitaminE: 15, // mg
  vitaminK: 120, // µg
  vitaminC: 90, // mg
  vitaminB1: 1.2, // mg
  vitaminB2: 1.3, // mg
  vitaminB3: 16, // mg
  vitaminB6: 1.7, // mg
  vitaminB9: 400, // µg DFE
  vitaminB12: 2.4, // µg
  // Minerais
  calcium: 1000, // mg
  iron: 14, // mg
  magnesium: 420, // mg
  potassium: 3400, // mg
  zinc: 11, // mg
  selenium: 55, // µg
  // Outros
  omega3: 1.6, // g/dia
  choline: 550, // mg
};

/**
 * Mapa de "que tipo de alvo é cada nutriente" — usado pela UI pra
 * inverter a lógica de cor em nutrientes-limite (sódio, açúcar etc.).
 */
export const TARGET_KIND: Record<keyof NutrientTargets, TargetKind> = {
  calories: "target",
  protein: "target",
  carbs: "target",
  fat: "target",
  fiber: "target",
  sugar: "limit",
  saturatedFat: "limit",
  cholesterol: "limit",
  sodium: "limit",
  vitaminA: "target",
  vitaminD: "target",
  vitaminE: "target",
  vitaminK: "target",
  vitaminC: "target",
  vitaminB1: "target",
  vitaminB2: "target",
  vitaminB3: "target",
  vitaminB6: "target",
  vitaminB9: "target",
  vitaminB12: "target",
  calcium: "target",
  iron: "target",
  magnesium: "target",
  potassium: "target",
  zinc: "target",
  selenium: "target",
  omega3: "target",
  choline: "target",
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

/**
 * Label + unidade pra cada nutriente. Usado pelas seções de Vitaminas /
 * Minerais / Outros da tela de Dieta.
 */
export const NUTRIENT_LABEL: Record<
  keyof NutrientTargets,
  { label: string; unit: string; short?: string }
> = {
  calories: { label: "Calorias", unit: "kcal" },
  protein: { label: "Proteína", unit: "g" },
  carbs: { label: "Carboidratos", unit: "g" },
  fat: { label: "Gordura", unit: "g" },
  fiber: { label: "Fibra", unit: "g" },
  sugar: { label: "Açúcar", unit: "g" },
  saturatedFat: { label: "Gordura saturada", unit: "g", short: "Sat." },
  cholesterol: { label: "Colesterol", unit: "mg" },
  sodium: { label: "Sódio", unit: "mg" },
  vitaminA: { label: "Vitamina A", unit: "µg", short: "A" },
  vitaminD: { label: "Vitamina D", unit: "µg", short: "D" },
  vitaminE: { label: "Vitamina E", unit: "mg", short: "E" },
  vitaminK: { label: "Vitamina K", unit: "µg", short: "K" },
  vitaminC: { label: "Vitamina C", unit: "mg", short: "C" },
  vitaminB1: { label: "Vitamina B1 (Tiamina)", unit: "mg", short: "B1" },
  vitaminB2: { label: "Vitamina B2 (Riboflavina)", unit: "mg", short: "B2" },
  vitaminB3: { label: "Vitamina B3 (Niacina)", unit: "mg", short: "B3" },
  vitaminB6: { label: "Vitamina B6", unit: "mg", short: "B6" },
  vitaminB9: { label: "Folato (B9)", unit: "µg", short: "B9" },
  vitaminB12: { label: "Vitamina B12", unit: "µg", short: "B12" },
  calcium: { label: "Cálcio", unit: "mg" },
  iron: { label: "Ferro", unit: "mg" },
  magnesium: { label: "Magnésio", unit: "mg" },
  potassium: { label: "Potássio", unit: "mg" },
  zinc: { label: "Zinco", unit: "mg" },
  selenium: { label: "Selênio", unit: "µg" },
  omega3: { label: "Ômega 3", unit: "g" },
  choline: { label: "Colina", unit: "mg" },
};

// ─── Empty nutrients pra somar com spread ───────────────────────────────────

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  saturatedFat: 0,
  cholesterol: 0,
  sodium: 0,
  vitaminA: 0,
  vitaminD: 0,
  vitaminE: 0,
  vitaminK: 0,
  vitaminC: 0,
  vitaminB1: 0,
  vitaminB2: 0,
  vitaminB3: 0,
  vitaminB6: 0,
  vitaminB9: 0,
  vitaminB12: 0,
  calcium: 0,
  iron: 0,
  magnesium: 0,
  potassium: 0,
  zinc: 0,
  selenium: 0,
  omega3: 0,
  choline: 0,
};
