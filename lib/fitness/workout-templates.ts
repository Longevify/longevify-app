import type {
  ProgramStructure,
  ProgramGoal,
  ExperienceLevel,
} from "./types";

/**
 * Phase 3K — Workout templates pré-feitos.
 *
 * Splits populares com sets/reps/RPE típicos. User pode escolher um
 * direto sem precisar gerar com IA — útil pra iniciantes ou quem só
 * quer começar rápido.
 *
 * Todos os exercise_ids referenciam exercise_catalog (seed migration
 * 0012). Se algum template usa um exercise que ainda não existe, a UI
 * filtra na hora de salvar.
 */

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  /** Nível recomendado */
  level: ExperienceLevel;
  goal: ProgramGoal;
  frequency: number; // dias/semana
  /** Tags pra busca/filtro */
  tags: string[];
  emoji: string;
  structure: ProgramStructure;
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "fbw_3x_iniciante",
    name: "Full Body 3x — Iniciante",
    description:
      "Treino corpo inteiro 3x/semana. Foco em compostos e progressão linear. Ideal pra primeiros 6-12 meses.",
    level: "iniciante",
    goal: "saude_geral",
    frequency: 3,
    tags: ["full body", "iniciante", "compostos"],
    emoji: "🌱",
    structure: {
      warmupNotes:
        "5-10min de cardio leve (esteira/bike) + 2 sets leves de warmup do 1º exercício.",
      progressionStrategy:
        "Aumente 2.5kg toda semana que conseguir todas as reps em todos os sets (top set RPE 7-8).",
      days: [
        {
          dayIndex: 1,
          name: "Treino A",
          focus: ["legs", "chest", "back"],
          exercises: [
            {
              exerciseId: "squat",
              targetSets: 3,
              targetReps: "8-10",
              targetRpe: 7,
              restSeconds: 120,
              notes: "Foco em técnica, profundidade até a coxa paralela",
            },
            {
              exerciseId: "bench_press",
              targetSets: 3,
              targetReps: "8-10",
              targetRpe: 7,
              restSeconds: 120,
              notes: "Aperta as escápulas, pé firme no chão",
            },
            {
              exerciseId: "bent_over_row",
              targetSets: 3,
              targetReps: "8-10",
              targetRpe: 8,
              restSeconds: 90,
              notes: "Tronco a 45°, puxa pra barriga",
            },
            {
              exerciseId: "overhead_press",
              targetSets: 2,
              targetReps: "8-10",
              targetRpe: 7,
              restSeconds: 90,
              notes: null,
            },
            {
              exerciseId: "plank",
              targetSets: 2,
              targetReps: "30-60s",
              targetRpe: null,
              restSeconds: 60,
              notes: "Core firme, sem afundar quadril",
            },
          ],
        },
        {
          dayIndex: 2,
          name: "Treino B",
          focus: ["legs", "back", "shoulders"],
          exercises: [
            {
              exerciseId: "deadlift",
              targetSets: 3,
              targetReps: "5-6",
              targetRpe: 8,
              restSeconds: 180,
              notes: "Barra rente ao corpo, core travado",
            },
            {
              exerciseId: "incline_dumbbell_press",
              targetSets: 3,
              targetReps: "8-10",
              targetRpe: 7,
              restSeconds: 90,
              notes: null,
            },
            {
              exerciseId: "pull_up",
              targetSets: 3,
              targetReps: "AMRAP",
              targetRpe: 9,
              restSeconds: 120,
              notes: "Se não fizer 5, use assist ou negativas",
            },
            {
              exerciseId: "lateral_raise",
              targetSets: 3,
              targetReps: "12-15",
              targetRpe: 8,
              restSeconds: 60,
              notes: null,
            },
            {
              exerciseId: "bicep_curl",
              targetSets: 2,
              targetReps: "10-12",
              targetRpe: 8,
              restSeconds: 60,
              notes: null,
            },
          ],
        },
        {
          dayIndex: 3,
          name: "Treino C",
          focus: ["legs", "core", "arms"],
          exercises: [
            {
              exerciseId: "leg_press",
              targetSets: 3,
              targetReps: "10-12",
              targetRpe: 8,
              restSeconds: 120,
              notes: "Pés à largura dos ombros, joelhos alinhados",
            },
            {
              exerciseId: "dumbbell_press",
              targetSets: 3,
              targetReps: "10-12",
              targetRpe: 7,
              restSeconds: 90,
              notes: null,
            },
            {
              exerciseId: "lat_pulldown",
              targetSets: 3,
              targetReps: "10-12",
              targetRpe: 8,
              restSeconds: 90,
              notes: null,
            },
            {
              exerciseId: "tricep_pushdown",
              targetSets: 3,
              targetReps: "10-12",
              targetRpe: 8,
              restSeconds: 60,
              notes: null,
            },
            {
              exerciseId: "russian_twist",
              targetSets: 3,
              targetReps: "20",
              targetRpe: null,
              restSeconds: 45,
              notes: "Conta 20 (10 por lado)",
            },
          ],
        },
      ],
    },
  },
  {
    id: "ppl_6x",
    name: "Push / Pull / Legs — 6x",
    description:
      "Split clássico de hipertrofia 6x/semana. Push (peito/ombro/tríceps), Pull (costas/bíceps), Legs (pernas/core). Roda 2x.",
    level: "intermediario",
    goal: "hipertrofia",
    frequency: 6,
    tags: ["ppl", "hipertrofia", "high volume"],
    emoji: "💪",
    structure: {
      warmupNotes:
        "5-10min cardio leve + dynamic stretches no grupo muscular do dia.",
      progressionStrategy:
        "Foco em volume crescente. Aumente peso quando bater top set com RPE 7 facilmente.",
      days: [
        {
          dayIndex: 1,
          name: "Push A",
          focus: ["chest", "shoulders", "arms"],
          exercises: [
            { exerciseId: "bench_press", targetSets: 4, targetReps: "6-8", targetRpe: 8, restSeconds: 150, notes: null },
            { exerciseId: "incline_dumbbell_press", targetSets: 3, targetReps: "10-12", targetRpe: 8, restSeconds: 90, notes: null },
            { exerciseId: "overhead_press", targetSets: 3, targetReps: "8-10", targetRpe: 8, restSeconds: 120, notes: null },
            { exerciseId: "lateral_raise", targetSets: 4, targetReps: "12-15", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "tricep_pushdown", targetSets: 3, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "cable_fly", targetSets: 3, targetReps: "12-15", targetRpe: 9, restSeconds: 60, notes: null },
          ],
        },
        {
          dayIndex: 2,
          name: "Pull A",
          focus: ["back", "arms"],
          exercises: [
            { exerciseId: "pull_up", targetSets: 4, targetReps: "AMRAP", targetRpe: 9, restSeconds: 120, notes: null },
            { exerciseId: "bent_over_row", targetSets: 4, targetReps: "8-10", targetRpe: 8, restSeconds: 120, notes: null },
            { exerciseId: "lat_pulldown", targetSets: 3, targetReps: "10-12", targetRpe: 8, restSeconds: 90, notes: null },
            { exerciseId: "face_pull", targetSets: 3, targetReps: "12-15", targetRpe: 8, restSeconds: 60, notes: "Pra saúde do ombro" },
            { exerciseId: "bicep_curl", targetSets: 3, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "hammer_curl", targetSets: 3, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
          ],
        },
        {
          dayIndex: 3,
          name: "Legs A",
          focus: ["legs", "core"],
          exercises: [
            { exerciseId: "squat", targetSets: 4, targetReps: "6-8", targetRpe: 8, restSeconds: 180, notes: null },
            { exerciseId: "romanian_deadlift", targetSets: 3, targetReps: "8-10", targetRpe: 8, restSeconds: 120, notes: null },
            { exerciseId: "leg_press", targetSets: 3, targetReps: "12-15", targetRpe: 9, restSeconds: 90, notes: null },
            { exerciseId: "leg_curl", targetSets: 3, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "calf_raise", targetSets: 4, targetReps: "15-20", targetRpe: 9, restSeconds: 45, notes: null },
            { exerciseId: "plank", targetSets: 3, targetReps: "45-60s", targetRpe: null, restSeconds: 45, notes: null },
          ],
        },
        {
          dayIndex: 4,
          name: "Push B",
          focus: ["chest", "shoulders", "arms"],
          exercises: [
            { exerciseId: "incline_dumbbell_press", targetSets: 4, targetReps: "8-10", targetRpe: 8, restSeconds: 120, notes: null },
            { exerciseId: "dumbbell_press", targetSets: 3, targetReps: "10-12", targetRpe: 8, restSeconds: 90, notes: null },
            { exerciseId: "lateral_raise", targetSets: 4, targetReps: "12-15", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "tricep_pushdown", targetSets: 4, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "cable_fly", targetSets: 3, targetReps: "12-15", targetRpe: 9, restSeconds: 60, notes: null },
          ],
        },
        {
          dayIndex: 5,
          name: "Pull B",
          focus: ["back", "arms"],
          exercises: [
            { exerciseId: "deadlift", targetSets: 3, targetReps: "5-6", targetRpe: 8, restSeconds: 180, notes: null },
            { exerciseId: "lat_pulldown", targetSets: 4, targetReps: "8-10", targetRpe: 8, restSeconds: 90, notes: null },
            { exerciseId: "bent_over_row", targetSets: 3, targetReps: "10-12", targetRpe: 8, restSeconds: 90, notes: null },
            { exerciseId: "face_pull", targetSets: 3, targetReps: "12-15", targetRpe: 8, restSeconds: 60, notes: null },
            { exerciseId: "bicep_curl", targetSets: 4, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
          ],
        },
        {
          dayIndex: 6,
          name: "Legs B",
          focus: ["legs", "core"],
          exercises: [
            { exerciseId: "romanian_deadlift", targetSets: 4, targetReps: "6-8", targetRpe: 8, restSeconds: 150, notes: null },
            { exerciseId: "squat", targetSets: 3, targetReps: "10-12", targetRpe: 8, restSeconds: 120, notes: null },
            { exerciseId: "leg_press", targetSets: 4, targetReps: "12-15", targetRpe: 9, restSeconds: 90, notes: null },
            { exerciseId: "leg_curl", targetSets: 3, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "calf_raise", targetSets: 4, targetReps: "15-20", targetRpe: 9, restSeconds: 45, notes: null },
            { exerciseId: "russian_twist", targetSets: 3, targetReps: "20", targetRpe: null, restSeconds: 45, notes: null },
          ],
        },
      ],
    },
  },
  {
    id: "upper_lower_4x",
    name: "Upper / Lower — 4x",
    description:
      "Split upper/lower 4x/semana. Balanço bom entre frequência e volume. Excelente pra hipertrofia + força.",
    level: "intermediario",
    goal: "hipertrofia",
    frequency: 4,
    tags: ["upper lower", "hipertrofia", "balanceado"],
    emoji: "⚖️",
    structure: {
      warmupNotes: "5min cardio + 2 sets leves do 1º exercício.",
      progressionStrategy:
        "Mantém volume médio (3-4 sets), foca em força nos compostos. Aumente carga toda 2 semanas.",
      days: [
        {
          dayIndex: 1,
          name: "Upper A — Força",
          focus: ["chest", "back", "shoulders", "arms"],
          exercises: [
            { exerciseId: "bench_press", targetSets: 4, targetReps: "5-6", targetRpe: 8, restSeconds: 180, notes: "Foco em força" },
            { exerciseId: "bent_over_row", targetSets: 4, targetReps: "5-6", targetRpe: 8, restSeconds: 180, notes: null },
            { exerciseId: "overhead_press", targetSets: 3, targetReps: "8-10", targetRpe: 8, restSeconds: 120, notes: null },
            { exerciseId: "pull_up", targetSets: 3, targetReps: "AMRAP", targetRpe: 9, restSeconds: 120, notes: null },
            { exerciseId: "tricep_pushdown", targetSets: 3, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "bicep_curl", targetSets: 3, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
          ],
        },
        {
          dayIndex: 2,
          name: "Lower A — Força",
          focus: ["legs", "core"],
          exercises: [
            { exerciseId: "squat", targetSets: 4, targetReps: "5-6", targetRpe: 8, restSeconds: 180, notes: null },
            { exerciseId: "romanian_deadlift", targetSets: 4, targetReps: "6-8", targetRpe: 8, restSeconds: 150, notes: null },
            { exerciseId: "leg_press", targetSets: 3, targetReps: "10-12", targetRpe: 8, restSeconds: 90, notes: null },
            { exerciseId: "leg_curl", targetSets: 3, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "calf_raise", targetSets: 4, targetReps: "15-20", targetRpe: 9, restSeconds: 45, notes: null },
          ],
        },
        {
          dayIndex: 3,
          name: "Upper B — Hipertrofia",
          focus: ["chest", "back", "shoulders", "arms"],
          exercises: [
            { exerciseId: "incline_dumbbell_press", targetSets: 4, targetReps: "8-10", targetRpe: 8, restSeconds: 90, notes: null },
            { exerciseId: "lat_pulldown", targetSets: 4, targetReps: "8-10", targetRpe: 8, restSeconds: 90, notes: null },
            { exerciseId: "lateral_raise", targetSets: 4, targetReps: "12-15", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "face_pull", targetSets: 3, targetReps: "12-15", targetRpe: 8, restSeconds: 60, notes: null },
            { exerciseId: "cable_fly", targetSets: 3, targetReps: "12-15", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "hammer_curl", targetSets: 3, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
          ],
        },
        {
          dayIndex: 4,
          name: "Lower B — Hipertrofia",
          focus: ["legs", "core"],
          exercises: [
            { exerciseId: "leg_press", targetSets: 4, targetReps: "10-12", targetRpe: 8, restSeconds: 90, notes: null },
            { exerciseId: "squat", targetSets: 3, targetReps: "10-12", targetRpe: 8, restSeconds: 120, notes: null },
            { exerciseId: "leg_curl", targetSets: 4, targetReps: "10-12", targetRpe: 9, restSeconds: 60, notes: null },
            { exerciseId: "calf_raise", targetSets: 4, targetReps: "15-20", targetRpe: 9, restSeconds: 45, notes: null },
            { exerciseId: "plank", targetSets: 3, targetReps: "45-60s", targetRpe: null, restSeconds: 45, notes: null },
            { exerciseId: "russian_twist", targetSets: 3, targetReps: "20", targetRpe: null, restSeconds: 45, notes: null },
          ],
        },
      ],
    },
  },
  {
    id: "fbw_minimalista",
    name: "Full Body Minimalista — 3x",
    description:
      "Só 4 exercícios compostos por sessão. Pra quem tem pouco tempo. Foco máximo em retorno.",
    level: "iniciante",
    goal: "forca",
    frequency: 3,
    tags: ["minimalista", "tempo curto", "compostos"],
    emoji: "⚡",
    structure: {
      warmupNotes:
        "5min warmup geral + sets piramidais do 1º exercício pra preparar o sistema nervoso.",
      progressionStrategy:
        "Linear: +2.5kg na barra toda semana que conseguir todas as reps RPE ≤ 8.",
      days: [
        {
          dayIndex: 1,
          name: "A — Squat day",
          focus: ["legs", "chest"],
          exercises: [
            { exerciseId: "squat", targetSets: 3, targetReps: "5", targetRpe: 8, restSeconds: 180, notes: "Top set RPE 8" },
            { exerciseId: "bench_press", targetSets: 3, targetReps: "5", targetRpe: 8, restSeconds: 180, notes: null },
            { exerciseId: "bent_over_row", targetSets: 3, targetReps: "5", targetRpe: 8, restSeconds: 180, notes: null },
            { exerciseId: "plank", targetSets: 2, targetReps: "60s", targetRpe: null, restSeconds: 60, notes: null },
          ],
        },
        {
          dayIndex: 2,
          name: "B — Deadlift day",
          focus: ["legs", "back", "shoulders"],
          exercises: [
            { exerciseId: "deadlift", targetSets: 3, targetReps: "5", targetRpe: 8, restSeconds: 180, notes: null },
            { exerciseId: "overhead_press", targetSets: 3, targetReps: "5", targetRpe: 8, restSeconds: 180, notes: null },
            { exerciseId: "pull_up", targetSets: 3, targetReps: "AMRAP", targetRpe: 9, restSeconds: 120, notes: null },
            { exerciseId: "russian_twist", targetSets: 2, targetReps: "20", targetRpe: null, restSeconds: 60, notes: null },
          ],
        },
        {
          dayIndex: 3,
          name: "C — Variação",
          focus: ["legs", "chest", "back"],
          exercises: [
            { exerciseId: "romanian_deadlift", targetSets: 3, targetReps: "8", targetRpe: 8, restSeconds: 120, notes: null },
            { exerciseId: "incline_dumbbell_press", targetSets: 3, targetReps: "8", targetRpe: 8, restSeconds: 120, notes: null },
            { exerciseId: "lat_pulldown", targetSets: 3, targetReps: "8", targetRpe: 8, restSeconds: 120, notes: null },
            { exerciseId: "plank", targetSets: 2, targetReps: "60s", targetRpe: null, restSeconds: 60, notes: null },
          ],
        },
      ],
    },
  },
];
