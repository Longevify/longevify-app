import {
  getExerciseCatalog,
  getMuscleGroupAnalysis,
  getStrengthVolumeHistory,
} from "@/lib/fitness/server";
import { MusculacaoClient } from "./musculacao-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MusculacaoPage() {
  const [exercises, volumeHistory, muscleAnalysis] = await Promise.all([
    getExerciseCatalog(),
    getStrengthVolumeHistory(14),
    getMuscleGroupAnalysis(),
  ]);

  return (
    <MusculacaoClient
      exercises={exercises}
      volumeHistory={volumeHistory}
      muscleAnalysis={muscleAnalysis}
    />
  );
}
