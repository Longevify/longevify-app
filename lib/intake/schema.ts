// Schema do questionário de intake clínico (Quick + Comprehensive).
// Persistido em localStorage por enquanto; vai pra Supabase em outra etapa.

export type IntakeVariant = "quick" | "comprehensive";

export type BiologicalSex = "male" | "female";

export type SmokingStatus = "never" | "former" | "current";
export type AlcoholFrequency = "never" | "occasional" | "weekly" | "daily";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "intense";

export type Ethnicity =
  | "branca"
  | "preta"
  | "parda"
  | "amarela"
  | "indigena"
  | "prefiro-nao-dizer";

export type DiagnosedCondition =
  | "hipertensao"
  | "diabetes-tipo-2"
  | "dislipidemia"
  | "doenca-cardiaca"
  | "avc"
  | "cancer"
  | "autoimune"
  | "depressao"
  | "ansiedade"
  | "asma-dpoc"
  | "doenca-renal"
  | "doenca-hepatica"
  | "tireoide"
  | "nenhuma"
  | "outra";

export type FamilyEarlyEvent =
  | "infarto"
  | "avc"
  | "cancer"
  | "diabetes"
  | "alzheimer"
  | "morte-subita"
  | "nenhuma";

export type ExerciseType =
  | "musculacao"
  | "corrida"
  | "ciclismo"
  | "natacao"
  | "yoga-pilates"
  | "esportes-coletivos"
  | "caminhada"
  | "outro";

export type DietPattern =
  | "ocidental"
  | "mediterranea"
  | "cetogenica"
  | "paleo"
  | "vegetariana"
  | "vegana"
  | "outro";

export type SugarIntake = "muito-alto" | "alto" | "moderado" | "baixo" | "quase-zero";

export type FatigueFrequency = "sempre" | "frequente" | "as-vezes" | "raro" | "nunca";

export type MenopauseStatus = "pre" | "peri" | "pos" | "nao-sei";

export type ContraceptiveMethod =
  | "nenhum"
  | "pilula"
  | "diu-hormonal"
  | "diu-cobre"
  | "outro";

export type PrimaryGoal =
  | "longevidade"
  | "performance"
  | "prevencao"
  | "perder-peso"
  | "energia"
  | "saude-mental"
  | "outro";

export type ImportantValue =
  | "viver-mais"
  | "viver-melhor"
  | "performance-fisica"
  | "performance-mental"
  | "estetica"
  | "fertilidade"
  | "envelhecimento-ativo";

export type Acquisition =
  | "amigo"
  | "instagram"
  | "busca"
  | "podcast"
  | "medico"
  | "outro";

export type CollectionLocationKind = "home" | "lab";

export interface IntakeIdentity {
  fullName?: string;
  birthDate?: string; // ISO yyyy-mm-dd
  biologicalSex?: BiologicalSex;
  ethnicity?: Ethnicity;
  heightCm?: number;
  weightKg?: number;
  city?: string;
  state?: string;
}

export interface IntakeMedicalHistory {
  diagnosedConditions: DiagnosedCondition[];
  surgeries?: string;
  hospitalized5y?: boolean;
  hospitalizationDetails?: string;
  medications?: string;
  supplements?: string;
  drugAllergies?: string;
  foodAllergies?: string;
  // Quick variant — texto livre quando tem doença crônica
  hasChronicCondition?: boolean;
  chronicConditionDetail?: string;
}

export interface IntakeFamilyHistory {
  earlyEvents: FamilyEarlyEvent[];
}

export interface IntakeLifestyle {
  exerciseDaysPerWeek?: number; // 0-7
  exerciseTypes: ExerciseType[];
  sleepHours?: number; // 4-12
  sleepQuality?: number; // 1-10
  perceivedStress?: number; // 1-10
  smokingStatus?: SmokingStatus;
  smokingQuitYearsAgo?: number;
  smokingCigsPerDay?: number;
  alcoholFrequency?: AlcoholFrequency;
  alcoholDosesPerWeek?: number; // 0-30
  diet?: DietPattern;
  refinedSugar?: SugarIntake;
  waterCupsPerDay?: number; // 0-15
}

export interface IntakeMentalHealth {
  moodScore?: number; // 1-10
  fatigueFrequency?: FatigueFrequency;
  diagnosedDepressionAnxiety?: boolean;
  inTherapy?: boolean;
  focusScore?: number; // 1-10
  libidoScore?: number; // 1-10 — opcional
}

export interface IntakeFemaleHealth {
  lastPeriodDate?: string; // ISO
  regularCycle?: boolean;
  contraceptive?: ContraceptiveMethod;
  pregnancies?: number;
  menopause?: MenopauseStatus;
}

export interface IntakeMaleHealth {
  urologicComplaint?: boolean;
  urologicComplaintDetail?: string;
  prostateExamRegular?: boolean;
  testosteroneTested?: boolean;
}

export interface IntakeGoals {
  primaryGoal?: PrimaryGoal;
  primaryGoalOther?: string;
  importantValues: ImportantValue[];
  acquisition?: Acquisition;
  acquisitionOther?: string;
  freeNote?: string;
}

export interface IntakeScheduling {
  location?: CollectionLocationKind;
  selectedSlotISO?: string;
  address?: string;
  weekOffsetDays?: number;
  bookingId?: string;
  bookingConfirmedAt?: string;
}

export interface IntakeData {
  identity: IntakeIdentity;
  medical: IntakeMedicalHistory;
  family: IntakeFamilyHistory;
  lifestyle: IntakeLifestyle;
  mental: IntakeMentalHealth;
  female: IntakeFemaleHealth;
  male: IntakeMaleHealth;
  goals: IntakeGoals;
  scheduling: IntakeScheduling;
}

export interface IntakeRecord {
  variant: IntakeVariant;
  // step da máquina de estados; ver `lib/intake/steps.ts`
  step: string;
  data: IntakeData;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const EMPTY_INTAKE_DATA: IntakeData = {
  identity: {},
  medical: { diagnosedConditions: [] },
  family: { earlyEvents: [] },
  lifestyle: { exerciseTypes: [] },
  mental: {},
  female: {},
  male: {},
  goals: { importantValues: [] },
  scheduling: {},
};

// Helpers de cálculo --------------------------------------------------------

export function calcAgeFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function calcBMI(
  heightCm?: number,
  weightKg?: number,
): { value: number; band: "abaixo" | "normal" | "sobrepeso" | "obesidade" } | null {
  if (!heightCm || !weightKg) return null;
  if (heightCm < 80 || weightKg < 25) return null;
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  const value = Math.round(bmi * 10) / 10;
  const band =
    bmi < 18.5
      ? "abaixo"
      : bmi < 25
        ? "normal"
        : bmi < 30
          ? "sobrepeso"
          : "obesidade";
  return { value, band };
}
