/**
 * Tipos do feature de tracking de ciclo menstrual.
 *
 * Lucas (2026-05-18): "crie uma aba no app para usuários femininos para
 * acompanhar o ciclo menstrual... vai alimentar o modelo, adicionando
 * ainda mais contexto e tornando o diagnóstico ainda mais preciso."
 *
 * Schema casado com migration 0007_menstrual_cycle.sql.
 */

// ─── Fases do ciclo ────────────────────────────────────────────────────────
//
// Modelo simplificado de 4 fases que cobre 99% dos casos:
//   menstrual   — dia 1 ao fim do fluxo (default 5 dias)
//   follicular  — pós-menstruação até ~13 dias antes do próximo período
//   ovulation   — ~1-2 dias centrais (pico fértil)
//   luteal      — pós-ovulação até dia 1 do próximo ciclo
//
// Bibliografia de referência: ACOG (American College of Obstetricians and
// Gynecologists) e NIH Menstrual Cycle Phases — modelo educacional.

export type CyclePhase =
  | "menstrual"
  | "follicular"
  | "ovulation"
  | "luteal"
  | "unknown";

export interface CyclePhaseInfo {
  phase: CyclePhase;
  /** Dia atual do ciclo (1 = primeiro dia do período mais recente). */
  cycleDay: number;
  /** Duração total estimada deste ciclo. */
  cycleLength: number;
  /** Dias até o próximo período (estimado). */
  daysUntilNextPeriod: number;
  /** Data prevista do próximo período. */
  nextPeriodDate: Date;
}

// ─── Profile ───────────────────────────────────────────────────────────────

export type CycleRegularity =
  | "regular"
  | "irregular"
  | "variable"
  | "unknown";

export type ContraceptiveKind =
  | "none"
  | "pill"
  | "iud_hormonal"
  | "iud_copper"
  | "implant"
  | "injection"
  | "patch"
  | "ring"
  | "condom_only"
  | "natural"
  | "sterilization"
  | "other";

export type ReproductiveStatus =
  | "regular"
  | "trying_to_conceive"
  | "pregnant"
  | "postpartum"
  | "perimenopause"
  | "menopause"
  | "unknown";

export interface MenstrualProfile {
  patientId: string;
  trackingEnabled: boolean;
  lastPeriodStart: string | null; // ISO date YYYY-MM-DD
  avgCycleDays: number;
  avgPeriodDays: number;
  cycleRegularity: CycleRegularity;
  contraceptiveKind: ContraceptiveKind | null;
  reproductiveStatus: ReproductiveStatus;
  onboardedAt: string | null;
  notes: string | null;
}

// ─── Entries (log diário) ──────────────────────────────────────────────────

export type FlowLevel = "none" | "spotting" | "light" | "medium" | "heavy";

/**
 * Catálogo de sintomas. UI exibe como chips. Migration usa JSONB array
 * de strings → expansão futura não exige migration. PT-BR pra exibir.
 */
export const SYMPTOM_CATALOG = {
  cramps: { pt: "Cólica", emoji: "💢" },
  headache: { pt: "Dor de cabeça", emoji: "🤕" },
  breast_tenderness: { pt: "Seios sensíveis", emoji: "🤱" },
  bloating: { pt: "Inchaço", emoji: "🎈" },
  acne: { pt: "Acne", emoji: "🫧" },
  back_pain: { pt: "Dor lombar", emoji: "🦴" },
  nausea: { pt: "Náusea", emoji: "🤢" },
  fatigue: { pt: "Fadiga", emoji: "😴" },
  cravings: { pt: "Desejos alimentares", emoji: "🍫" },
  mood_swings: { pt: "Oscilação de humor", emoji: "🎢" },
  insomnia: { pt: "Insônia", emoji: "🌙" },
  cervical_mucus: { pt: "Muco cervical", emoji: "💧" },
} as const;

export type SymptomKey = keyof typeof SYMPTOM_CATALOG;

export interface MenstrualEntry {
  id?: string;
  entryDate: string; // ISO date YYYY-MM-DD
  flow: FlowLevel | null;
  symptoms: SymptomKey[];
  mood: number | null; // 1-5
  energy: number | null; // 1-5
  libido: number | null; // 1-5
  sleepQuality: number | null; // 1-5
  /**
   * Lucas (2026-05-22): "tem que aparecer a opção de registrar se teve
   * relação sexual naquele dia ou não."
   * Tri-state: null = não respondeu, true = sim, false = não.
   */
  sexualActivity: boolean | null;
  notes: string | null;
}

// ─── Labels PT-BR pra UI ───────────────────────────────────────────────────

export const PHASE_LABEL: Record<CyclePhase, string> = {
  menstrual: "Menstrual",
  follicular: "Folicular",
  ovulation: "Ovulação",
  luteal: "Lútea",
  unknown: "—",
};

/**
 * Cores SUAVES e ACESSÍVEIS — paleta médica não-clichê. Background fica
 * em ~30% opacity no calendário (não compete com texto).
 */
export const PHASE_COLOR: Record<CyclePhase, { bg: string; ring: string; text: string }> = {
  menstrual: { bg: "#fecaca", ring: "#dc2626", text: "#7f1d1d" },     // rose-200/600/900
  follicular: { bg: "#fed7aa", ring: "#fb923c", text: "#7c2d12" },    // orange-200/400/900
  ovulation: { bg: "#fef08a", ring: "#eab308", text: "#713f12" },     // yellow-200/500/900
  luteal: { bg: "#e9d5ff", ring: "#a855f7", text: "#581c87" },        // purple-200/500/900
  unknown: { bg: "#e4e4e7", ring: "#a1a1aa", text: "#3f3f46" },       // zinc-200/400/700
};

export const FLOW_LABEL: Record<FlowLevel, string> = {
  none: "Nenhum",
  spotting: "Borra",
  light: "Leve",
  medium: "Médio",
  heavy: "Intenso",
};

export const REGULARITY_LABEL: Record<CycleRegularity, string> = {
  regular: "Regular (variação <3 dias)",
  irregular: "Irregular",
  variable: "Variável (3-7 dias de variação)",
  unknown: "Não sei dizer",
};

export const CONTRACEPTIVE_LABEL: Record<ContraceptiveKind, string> = {
  none: "Nenhum",
  pill: "Pílula anticoncepcional",
  iud_hormonal: "DIU hormonal (Mirena/Kyleena)",
  iud_copper: "DIU de cobre",
  implant: "Implante (Implanon)",
  injection: "Injeção",
  patch: "Adesivo",
  ring: "Anel vaginal",
  condom_only: "Apenas preservativo",
  natural: "Método natural / tabela",
  sterilization: "Laqueadura / vasectomia",
  other: "Outro",
};

export const REPRODUCTIVE_STATUS_LABEL: Record<ReproductiveStatus, string> = {
  regular: "Ciclos regulares",
  trying_to_conceive: "Tentando engravidar",
  pregnant: "Gestante",
  postpartum: "Pós-parto / amamentação",
  perimenopause: "Pré-menopausa",
  menopause: "Menopausa",
  unknown: "Prefiro não dizer",
};
