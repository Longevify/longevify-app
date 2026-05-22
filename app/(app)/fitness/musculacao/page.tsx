import {
  getExerciseCatalog,
  getStrengthVolumeHistory,
} from "@/lib/fitness/server";
import { MusculacaoClient } from "./musculacao-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MusculacaoPage() {
  const [exercises, volumeHistory] = await Promise.all([
    getExerciseCatalog(),
    getStrengthVolumeHistory(14),
  ]);

  return (
    <MusculacaoClient
      exercises={exercises}
      volumeHistory={volumeHistory}
    />
  );
}
