export type BiomarkerStatus = "optimal" | "normal" | "out";
export type CategoryGrade = "A" | "B" | "C" | "D";

export interface BiomarkerPoint {
  date: string; // ISO
  value: number;
}

export interface Biomarker {
  id: string;
  name: string;
  category: string; // label, e.g. "Cardiovascular"
  categoryId: string; // slug
  unit: string;
  value: number;
  status: BiomarkerStatus;
  optimalRange?: [number, number]; // inclusive
  normalRange?: [number, number];
  referenceLabel: string; // e.g. "< 100" or "40 – 60"
  history: BiomarkerPoint[];
  description?: string;
}

export interface BiomarkerCategory {
  id: string;
  label: string;
  grade: CategoryGrade;
}

export interface ScorePoint {
  date: string; // ISO
  score: number;
}

export interface Patient {
  firstName: string;
  lastName: string;
  chronologicalAge: number;
  biologicalAge: number;
  longevifyScore: number;
  scoreStatus: "on-track" | "attention" | "at-risk";
  latestExamDate: string;
  pendingResultsDays: [number, number]; // e.g. [7, 10]
  scoreHistory: ScorePoint[];
}

export const CATEGORIES: BiomarkerCategory[] = [
  { id: "all", label: "Todos os Dados", grade: "A" },
  { id: "longevity", label: "Marcadores de Longevidade", grade: "A" },
  { id: "cardiac", label: "Saúde Cardíaca", grade: "B" },
  { id: "thyroid", label: "Saúde da Tireoide", grade: "A" },
  { id: "immune", label: "Regulação Imune", grade: "A" },
  { id: "hormonal", label: "Saúde Hormonal", grade: "A" },
  { id: "metabolic", label: "Saúde Metabólica", grade: "A" },
  { id: "nutrients", label: "Nutrientes", grade: "B" },
  { id: "hepatic", label: "Saúde Hepática", grade: "A" },
  { id: "heavy-metals", label: "Metais Pesados", grade: "A" },
];

export const PATIENT: Patient = {
  firstName: "João",
  lastName: "Silva",
  chronologicalAge: 27,
  biologicalAge: 25,
  longevifyScore: 70,
  scoreStatus: "on-track",
  latestExamDate: "2026-03-15",
  pendingResultsDays: [7, 10],
  scoreHistory: [
    { date: "2024-01-01", score: 58 },
    { date: "2024-06-01", score: 62 },
    { date: "2025-01-01", score: 66 },
    { date: "2025-06-01", score: 68 },
    { date: "2025-09-01", score: 70 },
  ],
};

/**
 * Gera série temporal mock de biomarcadores. DETERMINÍSTICO — sem
 * Math.random() ou Date.now() pra evitar hydration mismatch entre
 * SSR e client (React #418 em produção).
 *
 * Pseudo-aleatório usa Math.sin(i * 2.3) + Math.cos(i * 1.7) que dá
 * variação visualmente OK pros sparklines mas é 100% reprodutível.
 *
 * Datas ancoradas em uma base fixa (2026-01-01) em vez de Date.now()
 * — datas demo não precisam ser "agora", e demo data é mock visual.
 */
const DEMO_DATE_ANCHOR = new Date("2026-05-01T12:00:00.000Z");

function gen(
  start: number,
  end: number,
  points = 6,
  jitter = 0.06,
): BiomarkerPoint[] {
  const out: BiomarkerPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const base = start + (end - start) * t;
    // Pseudo-aleatório determinístico (sin/cos seeded por i)
    const noise =
      (Math.sin(i * 2.3) * jitter + Math.cos(i * 1.7) * 0.4 * jitter) *
      ((start + end) / 2);
    const d = new Date(DEMO_DATE_ANCHOR);
    d.setMonth(d.getMonth() - (points - 1 - i) * 2);
    out.push({
      date: d.toISOString(),
      value: +(base + noise).toFixed(1),
    });
  }
  return out;
}

export const BIOMARKERS: Biomarker[] = [
  {
    id: "ldl",
    name: "LDL Colesterol",
    category: "Cardiovascular",
    categoryId: "cardiac",
    unit: "mg/dL",
    value: 103,
    status: "out",
    optimalRange: [0, 70],
    normalRange: [70, 100],
    referenceLabel: "< 100",
    history: gen(118, 103),
    description:
      "O LDL transporta colesterol ao fígado e tecidos. Níveis elevados aumentam risco cardiovascular.",
  },
  {
    id: "apob",
    name: "Apolipoproteína B (ApoB)",
    category: "Cardiovascular",
    categoryId: "cardiac",
    unit: "mg/dL",
    value: 38,
    status: "optimal",
    optimalRange: [0, 60],
    referenceLabel: "< 60",
    history: gen(52, 38),
    description:
      "Marcador precoce de risco cardiovascular — mede o número de partículas aterogênicas.",
  },
  {
    id: "vitd",
    name: "Vitamina D",
    category: "Nutrientes",
    categoryId: "nutrients",
    unit: "ng/dL",
    value: 42.3,
    status: "normal",
    optimalRange: [50, 80],
    normalRange: [30, 50],
    referenceLabel: "30 – 80",
    history: gen(28, 42),
    description:
      "Essencial para saúde óssea, função imune e regulação hormonal.",
  },
  {
    id: "ferritin",
    name: "Ferritina",
    category: "Sangue",
    categoryId: "nutrients",
    unit: "ng/dL",
    value: 88,
    status: "optimal",
    optimalRange: [50, 150],
    referenceLabel: "50 – 150",
    history: gen(62, 88),
    description: "Reserva de ferro corporal. Níveis baixos sugerem deficiência.",
  },
  {
    id: "hdl",
    name: "HDL Colesterol",
    category: "Cardiovascular",
    categoryId: "cardiac",
    unit: "mg/dL",
    value: 58,
    status: "optimal",
    optimalRange: [46, 100],
    referenceLabel: "> 46",
    history: gen(48, 58),
    description: "HDL — colesterol 'bom' — protetor cardiovascular.",
  },
  {
    id: "hba1c",
    name: "Hemoglobina Glicada (A1c)",
    category: "Metabólico",
    categoryId: "metabolic",
    unit: "%",
    value: 5.1,
    status: "optimal",
    optimalRange: [0, 5.4],
    normalRange: [5.4, 5.7],
    referenceLabel: "< 5.7",
    history: gen(5.4, 5.1),
    description:
      "Média da glicemia nos últimos 2-3 meses. Indicador-chave de risco metabólico.",
  },
  {
    id: "tsh",
    name: "TSH",
    category: "Tireoide",
    categoryId: "thyroid",
    unit: "µUI/mL",
    value: 1.8,
    status: "optimal",
    optimalRange: [0.5, 2.5],
    normalRange: [0.4, 4.5],
    referenceLabel: "0.5 – 2.5",
    history: gen(2.2, 1.8),
    description: "Hormônio que regula a tireoide.",
  },
  {
    id: "crp",
    name: "PCR Ultra-sensível",
    category: "Inflamação",
    categoryId: "immune",
    unit: "mg/L",
    value: 0.6,
    status: "optimal",
    optimalRange: [0, 1],
    normalRange: [1, 3],
    referenceLabel: "< 1",
    history: gen(1.4, 0.6),
    description: "Marcador de inflamação sistêmica.",
  },
  {
    id: "testo",
    name: "Testosterona Total",
    category: "Hormonal",
    categoryId: "hormonal",
    unit: "ng/dL",
    value: 620,
    status: "optimal",
    optimalRange: [500, 900],
    normalRange: [300, 1000],
    referenceLabel: "500 – 900",
    history: gen(480, 620),
    description: "Importante para massa muscular, libido e saúde óssea.",
  },
  {
    id: "alt",
    name: "ALT (TGP)",
    category: "Hepática",
    categoryId: "hepatic",
    unit: "U/L",
    value: 22,
    status: "optimal",
    optimalRange: [0, 33],
    referenceLabel: "< 33",
    history: gen(26, 22),
    description: "Enzima hepática — marcador de saúde do fígado.",
  },
];

export function biomarkersStats() {
  const total = BIOMARKERS.length + 96; // ~106 total — extras sob mock
  const optimal = BIOMARKERS.filter((b) => b.status === "optimal").length + 72;
  const normal = BIOMARKERS.filter((b) => b.status === "normal").length + 20;
  const out = BIOMARKERS.filter((b) => b.status === "out").length + 4;
  return { total, optimal, normal, out };
}
