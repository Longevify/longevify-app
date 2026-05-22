import {
  getActiveWorkoutProgram,
  getExerciseCatalog,
  hydrateProgramExerciseNames,
} from "@/lib/fitness/server";
import { ProgramaClient } from "./programa-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProgramaPage() {
  const [exercises, rawProgram] = await Promise.all([
    getExerciseCatalog(),
    getActiveWorkoutProgram(),
  ]);
  const program = rawProgram ? await hydrateProgramExerciseNames(rawProgram) : null;

  return <ProgramaClient exercises={exercises} program={program} />;
}
