import { getExerciseCatalog } from "@/lib/fitness/server";
import { WORKOUT_TEMPLATES } from "@/lib/fitness/workout-templates";
import { TemplatesClient } from "./templates-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Phase 3K — Galeria de templates pré-feitos pra usuário escolher
 * direto sem precisar IA. Catálogo estático mais 4 splits clássicos.
 */
export default async function TemplatesPage() {
  const exercises = await getExerciseCatalog();
  const validIds = new Set(exercises.map((e) => e.id));

  // Hidrata exerciseName + filtra exercise_ids que não existem no catálogo
  const templates = WORKOUT_TEMPLATES.map((t) => ({
    ...t,
    structure: {
      ...t.structure,
      days: t.structure.days.map((d) => ({
        ...d,
        exercises: d.exercises
          .filter((ex) => validIds.has(ex.exerciseId))
          .map((ex) => ({
            ...ex,
            exerciseName:
              exercises.find((e) => e.id === ex.exerciseId)?.name ??
              ex.exerciseId,
          })),
      })),
    },
  }));

  return <TemplatesClient templates={templates} />;
}
