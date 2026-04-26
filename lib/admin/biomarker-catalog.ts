import { BIOMARKERS, type BiomarkerStatus } from "@/lib/mock-data";

export interface BiomarkerMeta {
  id: string;
  name: string;
  unit: string;
  referenceLabel: string;
  optimalRange?: [number, number];
  normalRange?: [number, number];
  /**
   * Valores acima deste limite são considerados absurdos e devem disparar
   * warning de entrada (faixa de sanidade clínica).
   */
  sanityMax: number;
  sanityMin: number;
  category: string;
}

const SANITY_MAX: Record<string, number> = {
  ldl: 500,
  apob: 300,
  hdl: 200,
  vitd: 200,
  ferritin: 2000,
  hba1c: 15,
  tsh: 100,
  crp: 50,
  testo: 2500,
  alt: 500,
};

export const BIOMARKER_CATALOG: BiomarkerMeta[] = BIOMARKERS.map((b) => ({
  id: b.id,
  name: b.name,
  unit: b.unit,
  referenceLabel: b.referenceLabel,
  optimalRange: b.optimalRange,
  normalRange: b.normalRange,
  sanityMax: SANITY_MAX[b.id] ?? 10_000,
  sanityMin: 0,
  category: b.category,
}));

export function classifyValue(
  meta: BiomarkerMeta,
  value: number,
): BiomarkerStatus {
  const inRange = (r?: [number, number]) =>
    !!r && value >= r[0] && value <= r[1];
  if (inRange(meta.optimalRange)) return "optimal";
  if (inRange(meta.normalRange)) return "normal";
  return "out";
}

export function isSanityWarning(meta: BiomarkerMeta, value: number): boolean {
  if (Number.isNaN(value)) return false;
  return value > meta.sanityMax || value < meta.sanityMin;
}

export function getBiomarkerMeta(id: string): BiomarkerMeta | undefined {
  return BIOMARKER_CATALOG.find((b) => b.id === id);
}
