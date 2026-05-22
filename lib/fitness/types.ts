/**
 * Tipos da feature fitness — musculação + corrida + outros.
 */

export type WorkoutKind = "strength" | "running" | "cardio" | "other";

export type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "full_body";

export type EquipmentKind =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "bodyweight"
  | "cable"
  | "kettlebell";

export type ExerciseCategory = "compound" | "isolation";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: EquipmentKind | null;
  category: ExerciseCategory;
  description: string | null;
  videoUrl: string | null;
}

export interface WorkoutSession {
  id: string;
  patientId: string;
  kind: WorkoutKind;
  startedAt: string; // ISO
  endedAt: string | null;
  sessionDate: string; // YYYY-MM-DD
  notes: string | null;
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setOrder: number;
  weightKg: number | null;
  reps: number;
  rpe: number | null;
  notes: string | null;
  createdAt: string;
}

// Helper labels PT-BR
export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: "Peito",
  back: "Costas",
  legs: "Pernas",
  shoulders: "Ombros",
  arms: "Braços",
  core: "Core",
  full_body: "Corpo inteiro",
};

export const MUSCLE_GROUP_EMOJI: Record<MuscleGroup, string> = {
  chest: "💪",
  back: "🦴",
  legs: "🦵",
  shoulders: "🏋️",
  arms: "💪",
  core: "🔥",
  full_body: "⚡",
};

export const EQUIPMENT_LABEL: Record<EquipmentKind, string> = {
  barbell: "Barra",
  dumbbell: "Halter",
  machine: "Máquina",
  bodyweight: "Peso corporal",
  cable: "Cabo",
  kettlebell: "Kettlebell",
};

// ─── Workout programs (AI-gerados) ────────────────────────────────────

export type ProgramGoal =
  | "hipertrofia"
  | "forca"
  | "perda_gordura"
  | "condicionamento"
  | "saude_geral";

export type ExperienceLevel = "iniciante" | "intermediario" | "avancado";

export const PROGRAM_GOAL_LABEL: Record<ProgramGoal, string> = {
  hipertrofia: "Hipertrofia (ganho de massa)",
  forca: "Força máxima",
  perda_gordura: "Perda de gordura",
  condicionamento: "Condicionamento físico",
  saude_geral: "Saúde geral",
};

export const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  iniciante: "Iniciante (< 1 ano)",
  intermediario: "Intermediário (1-3 anos)",
  avancado: "Avançado (3+ anos)",
};

export interface ProgramDayExercise {
  exerciseId: string;
  exerciseName?: string; // pra display, populado pelo backend join
  targetSets: number;
  targetReps: string; // e.g. "6-8" ou "10" ou "AMRAP"
  targetRpe: number | null;
  restSeconds: number;
  notes: string | null;
}

export interface ProgramDay {
  dayIndex: number;
  name: string; // e.g. "Push A", "Treino A", "Pernas"
  focus: MuscleGroup[]; // grupos musculares focados
  exercises: ProgramDayExercise[];
}

export interface ProgramStructure {
  days: ProgramDay[];
  warmupNotes?: string;
  progressionStrategy?: string;
}

export interface WorkoutProgram {
  id: string;
  patientId: string;
  name: string;
  goal: ProgramGoal;
  frequencyPerWeek: number;
  equipmentAvailable: EquipmentKind[];
  experienceLevel: ExperienceLevel;
  restrictions: string | null;
  structure: ProgramStructure;
  aiModel: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramQuestionnaire {
  goal: ProgramGoal;
  frequencyPerWeek: number;
  equipmentAvailable: EquipmentKind[];
  experienceLevel: ExperienceLevel;
  restrictions: string;
}

// ─── Corrida (running_sessions) ───────────────────────────────────────

/** Ponto do trajeto: [lat, lon, ts_seconds] (ts = segundos desde started_at) */
export type GpsPoint = [number, number, number];

export interface PaceSegment {
  km: number;
  paceSeconds: number; // segundos por km neste split
  elevationM?: number;
}

export interface RunningSession {
  id: string;
  sessionId: string;
  distanceKm: number | null;
  durationSeconds: number | null;
  avgPaceSecondsPerKm: number | null;
  coordinates: GpsPoint[] | null;
  paceSegments: PaceSegment[] | null;
  createdAt: string;
  // Joined from workout_sessions
  sessionDate?: string;
  startedAt?: string;
  notes?: string | null;
}

// ─── Outras atividades (other_workouts) ───────────────────────────────

export type ActivityType =
  | "bike"
  | "swim"
  | "climb"
  | "yoga"
  | "pilates"
  | "hiit"
  | "mobility"
  | "walking"
  | "rowing"
  | "other";

export type IntensityLevel = "low" | "moderate" | "high";

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  bike: "Ciclismo",
  swim: "Natação",
  climb: "Escalada",
  yoga: "Yoga",
  pilates: "Pilates",
  hiit: "HIIT",
  mobility: "Mobilidade",
  walking: "Caminhada",
  rowing: "Remo",
  other: "Outra",
};

export const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  bike: "🚴",
  swim: "🏊",
  climb: "🧗",
  yoga: "🧘",
  pilates: "🤸",
  hiit: "🔥",
  mobility: "🤲",
  walking: "🚶",
  rowing: "🚣",
  other: "🏃",
};

export const INTENSITY_LABEL: Record<IntensityLevel, string> = {
  low: "Leve",
  moderate: "Moderado",
  high: "Intenso",
};

/**
 * MET values aproximados por atividade × intensidade.
 * Fonte: Compendium of Physical Activities 2024 (Ainsworth et al.).
 * Usado pra estimar calorias quando user não informa.
 */
export const ACTIVITY_MET: Record<ActivityType, Record<IntensityLevel, number>> = {
  bike: { low: 4, moderate: 7, high: 10 },
  swim: { low: 5.5, moderate: 8, high: 11 },
  climb: { low: 5, moderate: 8, high: 11 },
  yoga: { low: 2.5, moderate: 3.5, high: 5 },
  pilates: { low: 3, moderate: 4, high: 5 },
  hiit: { low: 6, moderate: 9, high: 12 },
  mobility: { low: 2, moderate: 2.5, high: 3 },
  walking: { low: 2.5, moderate: 4, high: 5.5 },
  rowing: { low: 5, moderate: 7, high: 10 },
  other: { low: 3, moderate: 5, high: 7 },
};

export interface OtherWorkout {
  id: string;
  sessionId: string;
  activityType: ActivityType;
  durationMinutes: number;
  intensity: IntensityLevel;
  distanceKm: number | null;
  estimatedCalories: number | null;
  createdAt: string;
  // Joined from workout_sessions
  sessionDate?: string;
  notes?: string | null;
}
