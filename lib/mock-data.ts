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
    // Unidade correta: ng/mL (não ng/dL — esta última é unidade de hormônios
    // esteroides como testosterona). 25(OH)D no Brasil/Endocrine Society é
    // sempre reportada em ng/mL ou nmol/L. 1 ng/mL = 2.5 nmol/L.
    unit: "ng/mL",
    value: 42.3,
    status: "normal",
    // Endocrine Society 2011 + SBEM 2018: ≥30 ng/mL "suficiente"; literatura
    // de longevidade mira 40–60 (sem evidência forte para >60). Toxicidade
    // documentada >100. Mantemos optimal 40–60 (longevity) e normal 30–100.
    optimalRange: [40, 60],
    normalRange: [30, 100],
    referenceLabel: "40 – 60",
    history: gen(28, 42),
    description:
      "Hormônio esteroide produzido na pele com luz UVB. Importante para osso, função imune e regulação hormonal.",
  },
  {
    id: "ferritin",
    name: "Ferritina",
    // Fígado é o principal reservatório de ferro corporal (~30%).
    category: "Fígado",
    categoryId: "liver",
    // Unidade correta: ng/mL (equivalente numérico a µg/L). Laboratórios BR
    // (Fleury, Einstein, DASA) reportam em ng/mL. ng/dL está errado.
    unit: "ng/mL",
    value: 88,
    status: "optimal",
    // Mayo Clinic + UpToDate (homens adultos): 24–336 referência laboratorial
    // padrão. Longevity-style mira 50–150 (não maximizar — ferritina é também
    // reagente de fase aguda, e sobrecarga acelera oxidação).
    optimalRange: [50, 150],
    normalRange: [30, 300],
    referenceLabel: "30 – 300",
    history: gen(62, 88),
    description: "Proteína de estoque de ferro. Baixa = deficiência funcional; muito alta pode indicar inflamação ou sobrecarga.",
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
    // HbA1c reflete CONTROLE GLICÊMICO (média de glicose nos últimos 2-3
    // meses), não "reserva pancreática" — reserva funcional do pâncreas
    // mede-se com peptídeo C. Categorizamos em "Pâncreas" pela conexão
    // clínica com regulação glicêmica, mas é simplificação de UI.
    category: "Pâncreas",
    categoryId: "pancreas",
    unit: "%",
    value: 5.1,
    status: "optimal",
    // ADA/SBD: <5.7 normal, 5.7–6.4 pré-DM, ≥6.5 DM. Longevity (Attia, etc.)
    // mira <5.4 como alvo funcional — onde curvas de risco CV/mortalidade
    // começam a subir.
    optimalRange: [0, 5.4],
    normalRange: [5.4, 5.7],
    referenceLabel: "< 5.4",
    history: gen(5.4, 5.1),
    description:
      "Reflete o controle glicêmico médio dos últimos 2–3 meses. Marcador-chave de risco metabólico, cardiovascular e cognitivo.",
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

// ───────────────────────────────────────────────────────────────────────────
// FAIXAS POR SEXO — overrides clínicos para biomarcadores cujos cortes
// variam entre adulto masculino e feminino.
//
// Diretrizes:
//   - HDL: AHA/ACC 2018 (♂ <40 baixo, ♀ <50 baixo, ≥60 protetor)
//   - Testosterona: Endocrine Society 2018 (Bhasin et al., JCEM 2018)
//     ♂ 300-1000 ng/dL · ♀ 15-70 ng/dL (faixas completamente diferentes)
//   - Ferritina: Mayo Clinic; Camaschella NEJM 2019
//     ♂ até ~300 sem alarme · ♀ até ~200 · alvo funcional 50-150
//   - ALT: Prati et al., Ann Intern Med 2002; AASLD 2017 MASLD
//     ♂ <30 "true normal" · ♀ <19 "true normal"
//
// Para LDL, ApoB, HbA1c, TSH, PCR-us, Vitamina D: cortes unificados entre
// sexos (consenso clínico atual).
// ───────────────────────────────────────────────────────────────────────────

export interface BiomarkerSexOverride {
  optimalRange: [number, number];
  normalRange: [number, number];
  referenceLabel: string;
  source: string;
  note: string;
}

export const BIOMARKER_RANGES_BY_SEX: Record<
  string,
  { male: BiomarkerSexOverride; female: BiomarkerSexOverride }
> = {
  hdl: {
    male: {
      optimalRange: [60, 100],
      normalRange: [40, 60],
      referenceLabel: "> 60 (♂)",
      source: "AHA/ACC 2018 (Grundy et al., Circulation)",
      note: "Em homens, HDL <40 mg/dL é fator de risco cardiovascular independente.",
    },
    female: {
      optimalRange: [60, 100],
      normalRange: [50, 60],
      referenceLabel: "> 60 (♀)",
      source: "AHA/ACC 2018 (Grundy et al., Circulation)",
      note:
        "Em mulheres, HDL <50 mg/dL é fator de risco — corte mais alto que em homens. Estrogênio eleva HDL na pré-menopausa; queda na pós-menopausa é comum e merece avaliação metabólica completa.",
    },
  },
  testo: {
    male: {
      optimalRange: [600, 1000],
      normalRange: [300, 600],
      referenceLabel: "600–1000 ng/dL (♂)",
      source: "Endocrine Society 2018 (Bhasin et al., JCEM)",
      note:
        "Em homem adulto, hipogonadismo bioquímico requer T total <264 ng/dL em 2 medidas matinais + sintomas. Avaliar SHBG, T livre, LH antes de decisão clínica.",
    },
    female: {
      optimalRange: [25, 70],
      normalRange: [15, 25],
      referenceLabel: "15–70 ng/dL (♀ adulto)",
      source: "Endocrine Society; faixas de referência laboratoriais",
      note:
        "Em mulher adulta, valores >70 ng/dL podem sugerir hiperandrogenismo (SOP é a causa mais comum; investigar também tumores adrenais/ovarianos e uso exógeno). Valores muito baixos costumam ser fisiológicos pós-menopausa e raramente exigem tratamento isolado.",
    },
  },
  ferritin: {
    male: {
      optimalRange: [50, 200],
      normalRange: [30, 300],
      referenceLabel: "30–300 ng/mL (♂)",
      source: "Mayo Clinic Laboratories; Camaschella NEJM 2019",
      note:
        "Em homem com ferritina >300 ng/mL sem causa óbvia (e TSAT >45%), investigar hemocromatose hereditária (HFE C282Y). Ferritina elevada com PCR normal sugere sobrecarga real; com PCR alta, é reagente de fase aguda.",
    },
    female: {
      optimalRange: [50, 150],
      normalRange: [30, 200],
      referenceLabel: "30–200 ng/mL (♀)",
      source: "Mayo Clinic Laboratories; Camaschella NEJM 2019",
      note:
        "Em mulher em idade fértil, ferritina <30 ng/mL frequentemente cursa com fadiga, queda de cabelo, brain fog mesmo com hemoglobina normal. Em mulher pós-menopausa, ranges convergem aos masculinos. Valores >200 sem causa óbvia merecem investigar inflamação e sobrecarga.",
    },
  },
  alt: {
    male: {
      optimalRange: [0, 30],
      normalRange: [30, 40],
      referenceLabel: "< 30 U/L (♂)",
      source: "Prati et al., Ann Intern Med 2002; AASLD 2017 NAFLD/MASLD",
      note:
        "Em homem adulto, 'true normal' hepatologia moderna é <30 U/L. Valores entre 30-40 — embora dentro de faixas laboratoriais antigas — já flaggam MASLD subclínica em ~30% dos adultos. Acima de 50 persistente merece avaliação com FIB-4 e ultrassom abdominal.",
    },
    female: {
      optimalRange: [0, 19],
      normalRange: [19, 40],
      referenceLabel: "< 19 U/L (♀)",
      source: "Prati et al., Ann Intern Med 2002; AASLD 2017 NAFLD/MASLD",
      note:
        "Em mulher adulta, 'true normal' hepatologia moderna é <19 U/L — corte mais conservador que em homens. Valores entre 19-40 já podem indicar MASLD subclínica. Atenção a uso de anticoncepcionais hormonais, suplementos não-regulados e álcool — todos podem elevar ALT.",
    },
  },
};

/**
 * Aplica faixa sex-specific a um biomarker e RECLASSIFICA o status com
 * os cortes corretos para o sexo do paciente.
 *
 * Para HDL, Testosterona, Ferritina e ALT (mapeados em
 * `BIOMARKER_RANGES_BY_SEX`), substitui `optimalRange`, `normalRange`,
 * `referenceLabel` e recalcula `status`. Para os demais biomarcadores,
 * retorna o objeto inalterado.
 *
 * Use SEMPRE no topo de qualquer componente que renderiza dados do
 * paciente — os componentes filhos consomem o objeto resolvido e nada
 * mais precisa mudar.
 */
export function applyPatientSexToBiomarker(
  biomarker: Biomarker,
  sex: PatientSex,
): Biomarker {
  const override = BIOMARKER_RANGES_BY_SEX[biomarker.id]?.[sex];
  if (!override) return biomarker;

  const { optimalRange, normalRange, referenceLabel } = override;
  const inRange = (r: [number, number]) =>
    biomarker.value >= r[0] && biomarker.value <= r[1];

  let status: BiomarkerStatus;
  if (inRange(optimalRange)) status = "optimal";
  else if (inRange(normalRange)) status = "normal";
  else status = "out";

  return {
    ...biomarker,
    optimalRange,
    normalRange,
    referenceLabel,
    status,
  };
}

/**
 * Versão batch — aplica `applyPatientSexToBiomarker` a um array.
 */
export function applyPatientSexToBiomarkers(
  biomarkers: Biomarker[],
  sex: PatientSex,
): Biomarker[] {
  return biomarkers.map((b) => applyPatientSexToBiomarker(b, sex));
}

/**
 * Resolve o override de sexo para um biomarcador (sem reclassificar).
 * Retorna `null` se não há variação por sexo definida — UI usa o default.
 */
export function getSexOverride(
  biomarkerId: string,
  sex: PatientSex,
): BiomarkerSexOverride | null {
  return BIOMARKER_RANGES_BY_SEX[biomarkerId]?.[sex] ?? null;
}

/**
 * Classifica um valor (number) em status considerando sexo do paciente.
 * Para HDL/Testo/Ferritin/ALT usa cortes sex-specific; para os demais
 * usa as faixas default do biomarker.
 */
export function classifyValueForSex(
  biomarkerId: string,
  defaultOptimalRange: [number, number] | undefined,
  defaultNormalRange: [number, number] | undefined,
  value: number,
  sex: PatientSex,
): BiomarkerStatus {
  const override = getSexOverride(biomarkerId, sex);
  const opt = override?.optimalRange ?? defaultOptimalRange;
  const norm = override?.normalRange ?? defaultNormalRange;

  const inRange = (r?: [number, number]) =>
    !!r && value >= r[0] && value <= r[1];
  if (inRange(opt)) return "optimal";
  if (inRange(norm)) return "normal";
  return "out";
}

/** Versão pra biomarcadores reais (sem extras hardcoded do mock).
 *  Lucas 2026-05-20: home + outras telas precisam refletir stats reais
 *  quando paciente tem exames. */
export function biomarkersStatsFor(biomarkers: Biomarker[]) {
  return {
    total: biomarkers.length,
    optimal: biomarkers.filter((b) => b.status === "optimal").length,
    normal: biomarkers.filter((b) => b.status === "normal").length,
    out: biomarkers.filter((b) => b.status === "out").length,
  };
}
