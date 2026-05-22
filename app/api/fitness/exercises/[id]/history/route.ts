import { NextResponse } from "next/server";
import { getExerciseHistory } from "@/lib/fitness/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fitness/exercises/[id]/history
 *
 * Retorna últimos N sets do user pro exercício especificado, ordenados
 * por created_at desc. Usado pelo popup de dashboard ao clicar num
 * exercício em /fitness/musculacao.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const history = await getExerciseHistory(id, 50);
  return NextResponse.json(
    { history },
    { headers: { "Cache-Control": "no-store" } },
  );
}
