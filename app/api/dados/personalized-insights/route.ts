import { NextResponse } from "next/server";
import { BIOMARKERS } from "@/lib/mock-data";
import type { Patient } from "@/lib/mock-data";
import {
  generatePersonalizedInsights,
  type PersonalizedInsightsResult,
} from "@/lib/dados/personalized-insights";

/**
 * POST /api/dados/personalized-insights
 *
 * Wrapper HTTP do helper `generatePersonalizedInsights`. Mantido como
 * fallback se algum client component precisar gerar/refazer insights
 * fora do fluxo de SSR.
 *
 * V1: home/page.tsx (server component) já pré-fetcha via helper direto,
 * passa via prop pra PostExamStories. Esse endpoint só roda se cliente
 * abrir stories sem ter os insights pré-populados (caso edge).
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: { biomarkerIds?: string[]; patient?: Partial<Patient> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const ids = Array.isArray(body.biomarkerIds) ? body.biomarkerIds : [];
  const biomarkers = BIOMARKERS.filter((b) => ids.includes(b.id));

  const result = await generatePersonalizedInsights(
    biomarkers,
    body.patient ?? {},
  );

  return NextResponse.json(result satisfies PersonalizedInsightsResult);
}
