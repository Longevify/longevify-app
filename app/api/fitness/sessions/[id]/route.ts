import { NextResponse } from "next/server";
import { getSessionDetails } from "@/lib/fitness/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fitness/sessions/[id]
 *
 * Lucas (2026-05-25): "quero que apareça a rotina de exercícios desse
 * dia". Retorna o detalhe completo de uma session (todos os exercícios
 * + sets) pra alimentar o BottomSheet do calendário ao clicar num dia.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const detail = await getSessionDetails(id);
  if (!detail) {
    return NextResponse.json(
      { ok: false, error: "Session não encontrada" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { ok: true, detail },
    { headers: { "Cache-Control": "no-store" } },
  );
}
