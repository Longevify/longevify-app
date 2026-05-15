/**
 * Mocks inline pra UX não quebrar enquanto o backend (feat/dieta-backend) está em flight.
 * Quando os endpoints estiverem live, esse arquivo pode ser deletado.
 */

import type {
  MealEntry,
  RecognizePhotoResponse,
  ParseTextResponse,
  BarcodeResponse,
  DailyTarget,
} from "./types";

export const MOCK_DAILY_TARGET: DailyTarget = {
  calories: 2000,
  protein: 120,
  carbs: 220,
  fat: 65,
  fiber: 25,
  sodium: 2000,
};

export const MOCK_MEALS: MealEntry[] = [
  {
    id: "mock-1",
    patientId: "demo",
    takenAt: new Date().toISOString().replace(/T\d{2}/, "T08"),
    mealType: "breakfast",
    inputMethod: "text",
    items: [
      {
        name: "Ovo mexido",
        quantity: 2,
        unit: "unit",
        source: "ai-text",
        confidence: 0.95,
        nutrients: {
          calories: 140,
          protein: 12,
          carbs: 1,
          fat: 10,
        },
      },
      {
        name: "Pão integral",
        quantity: 2,
        unit: "unit",
        source: "ai-text",
        confidence: 0.9,
        nutrients: {
          calories: 140,
          protein: 5,
          carbs: 26,
          fat: 2,
        },
      },
    ],
    totalNutrients: {
      calories: 280,
      protein: 17,
      carbs: 27,
      fat: 12,
    },
  },
  {
    id: "mock-2",
    patientId: "demo",
    takenAt: new Date().toISOString().replace(/T\d{2}/, "T13"),
    mealType: "lunch",
    inputMethod: "photo",
    items: [
      {
        name: "Frango grelhado",
        quantity: 150,
        unit: "g",
        source: "ai-photo",
        confidence: 0.88,
        nutrients: {
          calories: 248,
          protein: 46,
          carbs: 0,
          fat: 6,
        },
      },
      {
        name: "Arroz integral",
        quantity: 100,
        unit: "g",
        source: "ai-photo",
        confidence: 0.82,
        nutrients: {
          calories: 123,
          protein: 3,
          carbs: 26,
          fat: 1,
        },
      },
      {
        name: "Feijão preto",
        quantity: 80,
        unit: "g",
        source: "ai-photo",
        confidence: 0.79,
        nutrients: {
          calories: 91,
          protein: 6,
          carbs: 16,
          fat: 0.4,
          fiber: 5,
        },
      },
    ],
    totalNutrients: {
      calories: 462,
      protein: 55,
      carbs: 42,
      fat: 7.4,
      fiber: 5,
    },
  },
];

export const MOCK_RECOGNIZE_PHOTO: RecognizePhotoResponse = {
  items: [
    {
      name: "Salada verde",
      quantity: 100,
      unit: "g",
      source: "ai-photo",
      confidence: 0.91,
      nutrients: {
        calories: 20,
        protein: 2,
        carbs: 3,
        fat: 0.3,
        fiber: 2,
      },
    },
    {
      name: "Frango grelhado",
      quantity: 120,
      unit: "g",
      source: "ai-photo",
      confidence: 0.87,
      nutrients: {
        calories: 198,
        protein: 37,
        carbs: 0,
        fat: 4.8,
      },
    },
    {
      name: "Azeite de oliva",
      quantity: 10,
      unit: "ml",
      source: "ai-photo",
      confidence: 0.72,
      nutrients: {
        calories: 88,
        protein: 0,
        carbs: 0,
        fat: 10,
        omega3: 0.76,
      },
    },
  ],
  totalNutrients: {
    calories: 306,
    protein: 39,
    carbs: 3,
    fat: 15.1,
    fiber: 2,
    omega3: 0.76,
  },
  confidence: 0.83,
  rawDescription:
    "Prato com salada de folhas verdes, peito de frango grelhado fatiado e fio de azeite.",
};

export const MOCK_PARSE_TEXT: ParseTextResponse = {
  items: [
    {
      name: "Frango grelhado",
      quantity: 150,
      unit: "g",
      source: "ai-text",
      confidence: 0.95,
      nutrients: {
        calories: 248,
        protein: 46,
        carbs: 0,
        fat: 6,
      },
    },
    {
      name: "Arroz integral",
      quantity: 200,
      unit: "g",
      source: "ai-text",
      confidence: 0.92,
      nutrients: {
        calories: 246,
        protein: 6,
        carbs: 52,
        fat: 2,
        fiber: 3,
      },
    },
    {
      name: "Salada com azeite",
      quantity: 1,
      unit: "unit",
      source: "ai-text",
      confidence: 0.78,
      nutrients: {
        calories: 105,
        protein: 1,
        carbs: 4,
        fat: 10,
        fiber: 2,
      },
    },
  ],
  totalNutrients: {
    calories: 599,
    protein: 53,
    carbs: 56,
    fat: 18,
    fiber: 5,
  },
  unparsedTokens: [],
};

export const MOCK_BARCODE: BarcodeResponse = {
  item: {
    name: "Iogurte Grego Natural",
    quantity: 170,
    unit: "g",
    source: "barcode",
    nutrients: {
      calories: 190,
      protein: 17,
      carbs: 9,
      fat: 10,
      calcium: 190,
    },
  },
  productName: "Iogurte Grego Natural Integral",
  brand: "Fage",
  servingSize: "170g",
};
