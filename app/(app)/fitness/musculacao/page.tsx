import {
  getExerciseCatalog,
  getMuscleGroupAnalysis,
  getStrengthVolumeHistory,
  getTodaysWorkout,
  getActiveWorkoutProgram,
} from "@/lib/fitness/server";
import { MusculacaoClient } from "./musculacao-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Lucas (2026-05-26): "por padrão preciso que você varie o treino de 3
// em 3 meses". 90 dias = 90 × 86400000 ms.
const ROTATION_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;

export default async function MusculacaoPage() {
  const [exercises, volumeHistory, muscleAnalysis, today, activeProgram] =
    await Promise.all([
      getExerciseCatalog(),
      getStrengthVolumeHistory(14),
      getMuscleGroupAnalysis(),
      getTodaysWorkout(),
      getActiveWorkoutProgram(),
    ]);

  // needsRotation = programa ativo >= 90 dias desde createdAt do programa
  // raiz (não rotação anterior). Como cada rotação cria nova row com
  // createdAt fresco, calculamos a partir do createdAt da rotação ATUAL —
  // ou seja, "está nessa rotação há 3+ meses".
  const programAgeDays = activeProgram
    ? Math.floor(
        (Date.now() - new Date(activeProgram.createdAt).getTime()) /
          86_400_000,
      )
    : 0;
  const needsRotation = activeProgram
    ? Date.now() - new Date(activeProgram.createdAt).getTime() >=
      ROTATION_THRESHOLD_MS
    : false;

  return (
    <MusculacaoClient
      exercises={exercises}
      volumeHistory={volumeHistory}
      muscleAnalysis={muscleAnalysis}
      todayWorkout={
        today
          ? {
              dayIndex: today.dayIndex,
              totalDays: today.program.structure.days.length,
              dayName: today.day.name,
              focus: today.day.focus,
              exerciseCount: today.day.exercises.length,
              programName: today.program.name,
            }
          : null
      }
      rotation={
        activeProgram
          ? {
              needsRotation,
              programAgeDays,
              rotationCount: activeProgram.rotationCount,
              programName: activeProgram.name,
            }
          : null
      }
    />
  );
}
