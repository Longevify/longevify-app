import {
  getExerciseCatalog,
  getMuscleGroupAnalysis,
  getStrengthVolumeHistory,
  getTodaysWorkout,
} from "@/lib/fitness/server";
import { MusculacaoClient } from "./musculacao-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MusculacaoPage() {
  const [exercises, volumeHistory, muscleAnalysis, today] = await Promise.all([
    getExerciseCatalog(),
    getStrengthVolumeHistory(14),
    getMuscleGroupAnalysis(),
    getTodaysWorkout(),
  ]);

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
    />
  );
}
