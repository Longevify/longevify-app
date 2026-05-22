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
