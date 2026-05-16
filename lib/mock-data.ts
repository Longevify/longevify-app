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
  /** Label completo — usado no desktop sidebar. Ex: "Saúde Cardíaca" */
  label: string;
  /** Label curto — usado em layouts compactos (mobile). Ex: "Coração".
   *  Quando ausente, cai no `label`. */
  shortLabel?: string;
  grade: CategoryGrade;
}

export interface ScorePoint {
  date: string; // ISO
  score: number;
}

export interface BioAgePoint {
  date: string; // ISO
  age: number;
}

export interface OrganBioAge {
  organ: string;
  /** Age in years */
  age: number;
  /** Number of biomarkers for this organ */
  markersCount: number;
  status: "optimal" | "normal" | "out";
}

export interface OrganScore {
  organ: string;
  /** Score 0–100 — média ponderada dos biomarcadores do órgão */
  score: number;
  /** Number of biomarkers for this organ */
  markersCount: number;
  status: "optimal" | "normal" | "out";
}

export type PatientSex = "male" | "female";

export interface Patient {
  firstName: string;
  lastName: string;
  /** Sexo biológico — escolhe o avatar corporal exibido em /dados.
   *  Default "male" enquanto a coluna correspondente não vier do banco. */
  sex: PatientSex;
  chronologicalAge: number;
  biologicalAge: number;
  longevifyScore: number;
  scoreStatus: "on-track" | "attention" | "at-risk";
  latestExamDate: string;
  pendingResultsDays: [number, number]; // e.g. [7, 10]
  scoreHistory: ScorePoint[];
  biologicalAgeHistory: BioAgePoint[];
  organBioAges: OrganBioAge[];
  organScores: OrganScore[];
}

// Sidebar de /dados — 8 categorias alinhadas com o avatar 3D (1 "Resumo" +
// 7 órgãos). Mantém os IDs esperados pelo `CATEGORY_TO_REGION` em
// `body-avatar-3d.tsx` (heart, brain, liver, kidneys, lungs, intestine,
// pancreas) e pelo filtro `ORGAN_CATEGORY_IDS` em `dados-view.tsx`.
//
// Grades inferidas das `organBioAges` reais (Cardiovascular = B normal,
// Pâncreas = B normal pq metabólico age 27.4 > cronológica 27; demais A).
export const CATEGORIES: BiomarkerCategory[] = [
  { id: "all", label: "Todos os Dados", shortLabel: "Resumo", grade: "A" },
  { id: "heart", label: "Coração", shortLabel: "Coração", grade: "B" },
  { id: "lungs", label: "Pulmões", shortLabel: "Pulmões", grade: "A" },
  { id: "liver", label: "Fígado", shortLabel: "Fígado", grade: "A" },
  { id: "pancreas", label: "Pâncreas", shortLabel: "Pâncreas", grade: "B" },
  { id: "kidneys", label: "Rins", shortLabel: "Rins", grade: "A" },
  { id: "intestine", label: "Intestino", shortLabel: "Intestino", grade: "A" },
  { id: "brain", label: "Cérebro", shortLabel: "Cérebro", grade: "A" },
];

export const PATIENT: Patient = {
  firstName: "João",
  lastName: "Silva",
  sex: "male",
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
  biologicalAgeHistory: [
    { date: "2023-06-01", age: 29.4 },
    { date: "2024-01-01", age: 28.1 },
    { date: "2024-06-01", age: 27.0 },
    { date: "2025-01-01", age: 26.2 },
    { date: "2025-06-01", age: 25.5 },
    { date: "2026-03-15", age: 25.0 },
  ],
  // 7 órgãos alinhados com `CATEGORIES` (heart, lungs, liver, pancreas,
  // kidneys, intestine, brain). Usado pelo BioAge popup pra mostrar cards
  // de idade biológica por órgão (estilo Superpower).
  organBioAges: [
    { organ: "Coração", age: 26.8, markersCount: 22, status: "normal" },
    { organ: "Pulmões", age: 24.2, markersCount: 12, status: "optimal" },
    { organ: "Fígado", age: 22.1, markersCount: 15, status: "optimal" },
    { organ: "Pâncreas", age: 27.4, markersCount: 16, status: "normal" },
    { organ: "Rins", age: 25.0, markersCount: 14, status: "optimal" },
    { organ: "Intestino", age: 23.5, markersCount: 19, status: "optimal" },
    { organ: "Cérebro", age: 25.6, markersCount: 11, status: "optimal" },
  ],
  // Score 0-100 por órgão — média ponderada dos biomarcadores. Mock
  // alinhado com os status das organBioAges (normal→70s, optimal→80s+).
  organScores: [
    { organ: "Coração", score: 72, markersCount: 22, status: "normal" },
    { organ: "Pulmões", score: 88, markersCount: 12, status: "optimal" },
    { organ: "Fígado", score: 91, markersCount: 15, status: "optimal" },
    { organ: "Pâncreas", score: 68, markersCount: 16, status: "normal" },
    { organ: "Rins", score: 84, markersCount: 14, status: "optimal" },
    { organ: "Intestino", score: 86, markersCount: 19, status: "optimal" },
    { organ: "Cérebro", score: 82, markersCount: 11, status: "optimal" },
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
    // Último ponto SEMPRE = `end` (Lucas 2026-05: "o número que aparece
    // na aba de dados não é a média, mas sim o valor do último
    // resultado"). Antes o ruído fazia o último ponto divergir do
    // `biomarker.value` mostrado no topo da tela, confundindo o user.
    const isLast = i === points - 1;
    const value = isLast ? end : +(base + noise).toFixed(1);
    out.push({ date: d.toISOString(), value });
  }
  return out;
}

/**
 * Faixas de referência (Ótimo · Normal · Fora) baseadas em diretrizes
 * médicas: AHA/ACC 2018 (lipídios), ADA 2024 (glicemia/HbA1c),
 * Endocrine Society (vitamina D, testosterona, TSH), Sociedade Brasileira
 * de Cardiologia (ApoB, Lp(a)), JAMA 2024 (ALT/TGP), Mayo Clinic
 * (ferritina, B12). Cada biomarcador tem `optimalRange` (verde) e
 * `normalRange` (amarelo); tudo fora desse intervalo é "Fora" (vermelho).
 */
export const BIOMARKERS: Biomarker[] = [
  {
    id: "ldl",
    name: "LDL Colesterol",
    category: "Coração",
    categoryId: "heart",
    unit: "mg/dL",
    value: 103,
    status: "normal",
    // AHA/ACC 2018: <70 ótimo (alto risco), 100–129 borderline, ≥130 alto.
    optimalRange: [0, 100],
    normalRange: [100, 130],
    referenceLabel: "< 100",
    history: gen(118, 103),
    description:
      "O LDL transporta colesterol ao fígado e tecidos. Níveis elevados aumentam risco cardiovascular.",
  },
  {
    id: "apob",
    name: "Apolipoproteína B (ApoB)",
    category: "Coração",
    categoryId: "heart",
    unit: "mg/dL",
    value: 38,
    status: "optimal",
    // SBC/ESC: <80 ótimo, 80–100 normal, >100 fora.
    optimalRange: [0, 80],
    normalRange: [80, 100],
    referenceLabel: "< 80",
    history: gen(52, 38),
    description:
      "Marcador precoce de risco cardiovascular — mede o número de partículas aterogênicas.",
  },
  {
    id: "vitd",
    name: "Vitamina D",
    // Rins ativam vitamina D via 1α-hidroxilase → CYP27B1.
    category: "Rins",
    categoryId: "kidneys",
    unit: "ng/dL",
    value: 42.3,
    status: "normal",
    // Endocrine Society: 50–80 ótimo, 30–50 suficiente, <30 deficiente, >100 toxicidade.
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
    // Fígado é o principal reservatório de ferro corporal (~30%).
    category: "Fígado",
    categoryId: "liver",
    unit: "ng/dL",
    value: 88,
    status: "optimal",
    // Mayo Clinic (homens): 50–150 ótimo, 30–300 normal, fora <30 ou >300.
    optimalRange: [50, 150],
    normalRange: [30, 300],
    referenceLabel: "30 – 300",
    history: gen(62, 88),
    description: "Reserva de ferro corporal. Níveis baixos sugerem deficiência.",
  },
  {
    id: "hdl",
    name: "HDL Colesterol",
    category: "Coração",
    categoryId: "heart",
    unit: "mg/dL",
    value: 58,
    status: "normal",
    // AHA: >60 ótimo (cardio-protetor), 40–60 normal, <40 fora (homens).
    optimalRange: [60, 100],
    normalRange: [40, 60],
    referenceLabel: "> 60",
    history: gen(48, 58),
    description: "HDL — colesterol 'bom' — protetor cardiovascular.",
  },
  {
    id: "hba1c",
    name: "Hemoglobina Glicada (A1c)",
    // Pâncreas regula glicemia via insulina; HbA1c reflete reserva
    // funcional pancreática nos últimos 2-3 meses.
    category: "Pâncreas",
    categoryId: "pancreas",
    unit: "%",
    value: 5.1,
    status: "optimal",
    // ADA 2024: <5.4 ótimo, 5.4–5.7 pré-diabetes inicial, ≥5.7 fora.
    optimalRange: [0, 5.4],
    normalRange: [5.4, 5.7],
    referenceLabel: "< 5.4",
    history: gen(5.4, 5.1),
    description:
      "Média da glicemia nos últimos 2-3 meses. Indicador-chave de risco metabólico.",
  },
  {
    id: "tsh",
    name: "TSH",
    // TSH é secretado pela hipófise (no cérebro) e regula a tireoide
    // via eixo hipotálamo-hipófise-tireoide.
    category: "Cérebro",
    categoryId: "brain",
    unit: "µUI/mL",
    value: 1.8,
    status: "optimal",
    // Endocrine Society: 0.5–2.0 ótimo, 0.4–4.0 normal, <0.4 ou >4.0 fora.
    optimalRange: [0.5, 2.0],
    normalRange: [0.4, 4.0],
    referenceLabel: "0.5 – 2.0",
    history: gen(2.2, 1.8),
    description: "Hormônio que regula a tireoide.",
  },
  {
    id: "crp",
    name: "PCR Ultra-sensível",
    // PCR reflete inflamação sistêmica e correlaciona com risco
    // cardiovascular e respiratório (DPOC, asma).
    category: "Pulmões",
    categoryId: "lungs",
    unit: "mg/L",
    value: 0.6,
    status: "optimal",
    // AHA: <1.0 ótimo (baixo risco), 1.0–3.0 médio, >3.0 fora.
    optimalRange: [0, 1.0],
    normalRange: [1.0, 3.0],
    referenceLabel: "< 1.0",
    history: gen(1.4, 0.6),
    description: "Marcador de inflamação sistêmica.",
  },
  {
    id: "testo",
    name: "Testosterona Total",
    // Testosterona é regulada pelo eixo hipotálamo-hipófise-gonadal
    // (LH/FSH secretados no cérebro estimulam testículos).
    category: "Cérebro",
    categoryId: "brain",
    unit: "ng/dL",
    value: 620,
    status: "optimal",
    // Endocrine Society (homens): 600–1000 ótimo, 300–600 normal, <300 fora.
    optimalRange: [600, 1000],
    normalRange: [300, 600],
    referenceLabel: "600 – 1000",
    history: gen(480, 620),
    description: "Importante para massa muscular, libido e saúde óssea.",
  },
  {
    id: "alt",
    name: "ALT (TGP)",
    category: "Fígado",
    categoryId: "liver",
    unit: "U/L",
    value: 22,
    status: "optimal",
    // JAMA 2024: <25 ótimo, 25–40 normal, >40 fora.
    optimalRange: [0, 25],
    normalRange: [25, 40],
    referenceLabel: "< 25",
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
