/**
 * Computa Longevify Score, idade biológica e organ scores a partir dos
 * biomarcadores REAIS do paciente.
 *
 * Lucas (2026-05-20): "o app todo tem que ser configurado com base nesses
 * meus dados, as cores no boneco, minha idade biológica e tudo mais, os
 * dados reais tem que substituir os dados demo."
 *
 * Modelo MVP — algoritmos simples mas defensáveis. Não substitui modelo
 * clínico validado (GrimAge, PhenoAge), mas dá feedback útil baseado
 * em dados reais. Pode evoluir conforme escala.
 *
 * Funções puras, sem side effects, sem deps externas.
 */

import type {
  Biomarker,
  OrganBioAge,
  OrganScore,
  Patient,
} from "@/lib/mock-data";

// ─── Mapeamento biomarker → órgãos ─────────────────────────────────────────
//
// Um biomarcador pode pertencer a MÚLTIPLOS órgãos (ex: glicose afeta
// pâncreas E rins). Pesos diferentes (1.0 = relevância forte, 0.5 = média).

interface OrganMapping {
  organ: string;
  weight: number;
}

const ORGAN_LABELS = [
  "Coração",
  "Pulmões",
  "Fígado",
  "Pâncreas",
  "Rins",
  "Intestino",
  "Cérebro",
] as const;

type OrganName = (typeof ORGAN_LABELS)[number];

/**
 * Mapeia biomarker.id → órgãos com peso. Cobre os ~80 biomarcadores do
 * catálogo (após migration 0008). IDs fora deste mapa caem em "Resumo"
 * apenas (impactam o score geral mas não um órgão específico).
 */
const BIOMARKER_TO_ORGANS: Record<string, OrganMapping[]> = {
  // ─── Cardiovascular / Coração ─────────────────────────────────────
  ldl: [{ organ: "Coração", weight: 1.0 }],
  hdl: [{ organ: "Coração", weight: 1.0 }],
  apob: [{ organ: "Coração", weight: 1.0 }],
  total_cholesterol: [{ organ: "Coração", weight: 0.7 }],
  triglycerides: [
    { organ: "Coração", weight: 0.8 },
    { organ: "Fígado", weight: 0.4 },
  ],
  vldl: [{ organ: "Coração", weight: 0.6 }],
  non_hdl_cholesterol: [{ organ: "Coração", weight: 0.8 }],
  lpa: [{ organ: "Coração", weight: 0.9 }],
  apoa1: [{ organ: "Coração", weight: 0.7 }],
  crp: [{ organ: "Coração", weight: 0.7 }],
  homocysteine: [
    { organ: "Coração", weight: 0.7 },
    { organ: "Cérebro", weight: 0.5 },
  ],
  nt_probnp: [{ organ: "Coração", weight: 1.0 }],

  // ─── Pâncreas / Glicemia ─────────────────────────────────────────
  glucose: [{ organ: "Pâncreas", weight: 1.0 }],
  hba1c: [{ organ: "Pâncreas", weight: 1.0 }],
  insulin_fasting: [{ organ: "Pâncreas", weight: 1.0 }],
  homa_ir: [{ organ: "Pâncreas", weight: 1.0 }],

  // ─── Fígado ──────────────────────────────────────────────────────
  alt: [{ organ: "Fígado", weight: 1.0 }],
  ast: [{ organ: "Fígado", weight: 1.0 }],
  ggt: [{ organ: "Fígado", weight: 0.9 }],
  alkaline_phosphatase: [{ organ: "Fígado", weight: 0.6 }],
  bilirubin_total: [{ organ: "Fígado", weight: 0.8 }],
  bilirubin_direct: [{ organ: "Fígado", weight: 0.7 }],
  bilirubin_indirect: [{ organ: "Fígado", weight: 0.7 }],
  albumin: [{ organ: "Fígado", weight: 0.8 }],
  total_protein: [{ organ: "Fígado", weight: 0.5 }],

  // ─── Rins ────────────────────────────────────────────────────────
  urea: [{ organ: "Rins", weight: 0.8 }],
  creatinine: [{ organ: "Rins", weight: 1.0 }],
  uric_acid: [
    { organ: "Rins", weight: 0.7 },
    { organ: "Coração", weight: 0.3 },
  ],
  egfr: [{ organ: "Rins", weight: 1.0 }],
  cystatin_c: [{ organ: "Rins", weight: 1.0 }],
  sodium: [{ organ: "Rins", weight: 0.5 }],
  potassium: [{ organ: "Rins", weight: 0.6 }],
  chloride: [{ organ: "Rins", weight: 0.4 }],

  // ─── Cérebro (tireoide + B12 + homocisteína) ──────────────────────
  tsh: [{ organ: "Cérebro", weight: 0.6 }],
  t3_free: [{ organ: "Cérebro", weight: 0.6 }],
  t4_free: [{ organ: "Cérebro", weight: 0.6 }],
  t3_reverse: [{ organ: "Cérebro", weight: 0.4 }],
  anti_tpo: [{ organ: "Cérebro", weight: 0.5 }],
  anti_tg: [{ organ: "Cérebro", weight: 0.4 }],
  vitb12: [{ organ: "Cérebro", weight: 0.8 }],
  folate: [{ organ: "Cérebro", weight: 0.6 }],
  vitb6: [{ organ: "Cérebro", weight: 0.5 }],

  // ─── Pulmões (oxigenação / hemoglobina) ───────────────────────────
  hemoglobin: [
    { organ: "Pulmões", weight: 0.7 },
    { organ: "Coração", weight: 0.3 },
  ],
  hematocrit: [{ organ: "Pulmões", weight: 0.6 }],

  // ─── Intestino (vitaminas absorção + B-complex) ──────────────────
  vitd: [
    { organ: "Intestino", weight: 0.6 },
    { organ: "Coração", weight: 0.3 },
  ],
  vita: [{ organ: "Intestino", weight: 0.5 }],
  vite: [{ organ: "Intestino", weight: 0.5 }],
  vitk: [{ organ: "Intestino", weight: 0.5 }],
  iron_serum: [{ organ: "Intestino", weight: 0.5 }],
  ferritin: [{ organ: "Fígado", weight: 0.4 }],
  transferrin: [{ organ: "Intestino", weight: 0.4 }],
  transferrin_sat: [{ organ: "Intestino", weight: 0.5 }],

  // ─── Sistêmicos (afetam vários órgãos com peso menor) ─────────────
  testo: [{ organ: "Coração", weight: 0.3 }],
  testo_free: [{ organ: "Coração", weight: 0.3 }],
  cortisol_morning: [{ organ: "Cérebro", weight: 0.4 }],
  vhs: [{ organ: "Coração", weight: 0.3 }],
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Score 0-100 baseado no status do biomarcador.
 *   optimal = 100, normal = 65, out = 30
 *
 * Calibrado pra refletir a UX dos badges: "ótimo" verde forte (100),
 * "atenção" amarelo (65, indica margem de melhoria), "fora" vermelho (30).
 */
function statusToScore(status: Biomarker["status"]): number {
  switch (status) {
    case "optimal":
      return 100;
    case "normal":
      return 65;
    case "out":
      return 30;
  }
}

/**
 * Idade biológica adjustment por biomarcador status.
 *   optimal = -1.5 anos (rejuvenesce ligeiramente)
 *   normal = +0.3 anos (tendência leve a envelhecer)
 *   out = +2.5 anos (envelhece significativamente)
 */
function statusToAgeDelta(status: Biomarker["status"]): number {
  switch (status) {
    case "optimal":
      return -1.5;
    case "normal":
      return 0.3;
    case "out":
      return 2.5;
  }
}

function clampAge(age: number, chrono: number): number {
  // Limita variação a ±15 anos da cronológica pra evitar números absurdos
  const min = Math.max(18, chrono - 15);
  const max = chrono + 15;
  return Math.min(max, Math.max(min, age));
}

// ─── Longevify Score (0-100) ───────────────────────────────────────────────

/**
 * Média ponderada dos biomarcadores. Status pondera score:
 *   - optimal contribui 100
 *   - normal contribui 65
 *   - out contribui 30
 *
 * Peso adicional: biomarcadores cardiometabólicos (LDL, ApoB, HbA1c, CRP)
 * têm peso 1.5x — refletem maior impacto em mortalidade.
 */
const HIGH_IMPACT_IDS = new Set([
  "ldl",
  "apob",
  "hdl",
  "hba1c",
  "crp",
  "homa_ir",
  "lpa",
  "homocysteine",
]);

export function computeLongevifyScore(biomarkers: Biomarker[]): {
  score: number;
  status: Patient["scoreStatus"];
} {
  if (biomarkers.length === 0) {
    return { score: 70, status: "attention" };
  }
  let weightedSum = 0;
  let totalWeight = 0;
  for (const b of biomarkers) {
    const weight = HIGH_IMPACT_IDS.has(b.id) ? 1.5 : 1.0;
    weightedSum += statusToScore(b.status) * weight;
    totalWeight += weight;
  }
  const score = Math.round(weightedSum / totalWeight);

  const status: Patient["scoreStatus"] =
    score >= 80 ? "on-track" : score >= 60 ? "attention" : "at-risk";

  return { score: Math.max(0, Math.min(100, score)), status };
}

// ─── Idade biológica ───────────────────────────────────────────────────────

/**
 * Modelo simples: parte da idade cronológica e ajusta por delta de
 * cada biomarcador (status). Marcadores high-impact têm peso 1.5x no
 * delta também.
 *
 * Caps em chrono ± 15 anos pra realismo.
 */
export function computeBiologicalAge(
  biomarkers: Biomarker[],
  chronologicalAge: number,
): number {
  if (biomarkers.length === 0) return chronologicalAge;

  let totalDelta = 0;
  let totalWeight = 0;
  for (const b of biomarkers) {
    const weight = HIGH_IMPACT_IDS.has(b.id) ? 1.5 : 1.0;
    totalDelta += statusToAgeDelta(b.status) * weight;
    totalWeight += weight;
  }
  // Normaliza: divide pela soma de pesos, mas mantém escala — base 10
  // marcadores ~ ajuste de até ±10 anos.
  const normalizedDelta = (totalDelta / totalWeight) * Math.min(biomarkers.length, 30) * 0.4;
  const bioAge = chronologicalAge + normalizedDelta;

  return Math.round(clampAge(bioAge, chronologicalAge) * 10) / 10;
}

// ─── Organ scores (por órgão) ──────────────────────────────────────────────

interface OrganBucket {
  weightedSum: number;
  totalWeight: number;
  count: number;
  /** Count individual de cada status pra decidir status do órgão. */
  optimalCount: number;
  normalCount: number;
  outCount: number;
}

function emptyBuckets(): Record<OrganName, OrganBucket> {
  const out = {} as Record<OrganName, OrganBucket>;
  for (const o of ORGAN_LABELS) {
    out[o] = {
      weightedSum: 0,
      totalWeight: 0,
      count: 0,
      optimalCount: 0,
      normalCount: 0,
      outCount: 0,
    };
  }
  return out;
}

function bucketStatus(b: OrganBucket): "optimal" | "normal" | "out" {
  if (b.count === 0) return "normal";
  // Se >30% dos marcadores estão fora, órgão é "out"
  if (b.outCount / b.count > 0.3) return "out";
  // Se >60% estão ótimos, órgão é "optimal"
  if (b.optimalCount / b.count > 0.6) return "optimal";
  return "normal";
}

export function computeOrganScores(biomarkers: Biomarker[]): OrganScore[] {
  const buckets = emptyBuckets();

  for (const b of biomarkers) {
    const mappings = BIOMARKER_TO_ORGANS[b.id];
    if (!mappings) continue;
    for (const m of mappings) {
      const bucket = buckets[m.organ as OrganName];
      if (!bucket) continue;
      const score = statusToScore(b.status);
      bucket.weightedSum += score * m.weight;
      bucket.totalWeight += m.weight;
      bucket.count++;
      if (b.status === "optimal") bucket.optimalCount++;
      else if (b.status === "normal") bucket.normalCount++;
      else bucket.outCount++;
    }
  }

  return ORGAN_LABELS.map((organ) => {
    const b = buckets[organ];
    const score = b.totalWeight > 0 ? Math.round(b.weightedSum / b.totalWeight) : 70;
    return {
      organ,
      score: Math.max(0, Math.min(100, score)),
      markersCount: b.count,
      status: bucketStatus(b),
    } satisfies OrganScore;
  });
}

// ─── Organ bio-ages (por órgão) ────────────────────────────────────────────

export function computeOrganBioAges(
  biomarkers: Biomarker[],
  chronologicalAge: number,
): OrganBioAge[] {
  const buckets = emptyBuckets();

  for (const b of biomarkers) {
    const mappings = BIOMARKER_TO_ORGANS[b.id];
    if (!mappings) continue;
    for (const m of mappings) {
      const bucket = buckets[m.organ as OrganName];
      if (!bucket) continue;
      const delta = statusToAgeDelta(b.status);
      bucket.weightedSum += delta * m.weight;
      bucket.totalWeight += m.weight;
      bucket.count++;
      if (b.status === "optimal") bucket.optimalCount++;
      else if (b.status === "normal") bucket.normalCount++;
      else bucket.outCount++;
    }
  }

  return ORGAN_LABELS.map((organ) => {
    const b = buckets[organ];
    if (b.count === 0) {
      return {
        organ,
        age: chronologicalAge,
        markersCount: 0,
        status: "normal" as const,
      };
    }
    // Normaliza delta como bio-age geral (escala menor que score)
    const normalizedDelta = (b.weightedSum / b.totalWeight) * Math.min(b.count, 10) * 0.4;
    const organAge =
      Math.round(clampAge(chronologicalAge + normalizedDelta, chronologicalAge) * 10) / 10;
    return {
      organ,
      age: organAge,
      markersCount: b.count,
      status: bucketStatus(b),
    } satisfies OrganBioAge;
  });
}
