import { NextResponse } from "next/server";
import {
  getFitnessOverview,
  getActivityHeatmap,
  computeStreak,
  getRecentPersonalRecords,
} from "@/lib/fitness/dashboard";
import {
  getMuscleGroupAnalysis,
  getRunningHistory,
} from "@/lib/fitness/server";
// Phase 3E (VO2max + recovery) integration: lazy import via runtime path.
// Permite que este endpoint funcione mesmo se rodando antes do merge 3E
// — uma vez que 3E esteja em main, o import resolve normalmente.
async function loadInsightsModule(): Promise<{
  estimateVo2Max?: () => Promise<unknown>;
  computeRecoveryScore?: () => Promise<unknown>;
} | null> {
  try {
    // Evita type-check em build-time se módulo ainda não existir.
    const modulePath = "@/lib/fitness/insights";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await (import(modulePath) as Promise<any>);
    return mod;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/fitness/insights/weekly
 *
 * Phase 3F — Dr. Lon analisa a semana do user e devolve 2-4 insights
 * actionable em PT-BR.
 *
 * Modelo: Claude Sonnet 4.6 (mesmo do protocolo + workout generator).
 * Custo ~$0.005 por chamada. Sem cache servidor — client cacheia em
 * sessionStorage pelo dia.
 *
 * Saída:
 *   { insights: Array<{ kind, title, body, severity }> }
 */

interface Insight {
  /** strength | running | recovery | consistency | mixed */
  kind: string;
  /** Título curto e imperativo (3-7 palavras) */
  title: string;
  /** Explicação (1-3 frases curtas, tom direto) */
  body: string;
  /** "positive" (parabéns) | "neutral" (fato) | "warning" (ajuste) */
  severity: "positive" | "neutral" | "warning";
}

async function buildContext(): Promise<string> {
  const insightsMod = await loadInsightsModule();
  const [
    overview,
    heatmap,
    records,
    muscleAnalysis,
    runs,
    vo2,
    recovery,
  ] = await Promise.all([
    getFitnessOverview(),
    getActivityHeatmap(28),
    getRecentPersonalRecords(10),
    getMuscleGroupAnalysis(),
    getRunningHistory(20),
    insightsMod?.estimateVo2Max?.() ?? Promise.resolve(null),
    insightsMod?.computeRecoveryScore?.() ?? Promise.resolve(null),
  ]);
  const streak = computeStreak(heatmap);

  // Build context summary plain text for the prompt
  const lines: string[] = [];
  lines.push(`STATS GERAIS:`);
  lines.push(
    `- Semana atual: ${overview.thisWeek.workouts} treinos, ${Math.round(overview.thisWeek.strengthVolume)}kg volume, ${overview.thisWeek.runningKm.toFixed(1)}km corrida, ${overview.thisWeek.otherMinutes}min outras.`,
  );
  lines.push(
    `- Mês: ${overview.thisMonth.workouts} treinos, ${Math.round(overview.thisMonth.strengthVolume).toLocaleString("pt-BR")}kg, ${overview.thisMonth.runningKm.toFixed(1)}km, ${overview.thisMonth.otherMinutes}min.`,
  );
  lines.push(
    `- Ano: ${overview.thisYear.workouts} treinos.`,
  );
  lines.push(
    `- Streak: ${streak.current} dias atual, ${streak.longest} dias recorde.`,
  );

  if (vo2 && typeof vo2 === "object" && "value" in vo2) {
    const v = vo2 as { value: number; tier: string };
    lines.push(`- VO2max estimado: ${v.value} ml/kg/min (${v.tier}).`);
  }
  if (recovery && typeof recovery === "object" && "score" in recovery) {
    const r = recovery as {
      score: number;
      tier: string;
      thisWeekLoad: number;
      avgWeeklyLoad: number;
      daysSinceLastWorkout: number;
    };
    lines.push(
      `- Recovery score: ${r.score}/100 (${r.tier}). Carga semana ${r.thisWeekLoad}, média 4sem ${r.avgWeeklyLoad}. ${r.daysSinceLastWorkout} dia(s) sem treinar.`,
    );
  }

  if (muscleAnalysis.length > 0) {
    lines.push(`\nGRUPOS MUSCULARES (semana atual vs anterior):`);
    for (const m of muscleAnalysis.slice(0, 7)) {
      lines.push(
        `- ${m.muscleGroup}: ${m.thisWeekSets} sets · ${Math.round(m.thisWeekVolume)}kg (delta ${m.deltaPct >= 0 ? "+" : ""}${m.deltaPct}%)`,
      );
    }
  }

  if (records.length > 0) {
    lines.push(`\nTOP 5 PRs (últimos 90 dias):`);
    for (const r of records.slice(0, 5)) {
      lines.push(
        `- ${r.exerciseName} (${r.muscleGroup}): ${r.weightKg ?? "BW"}kg × ${r.reps} reps em ${r.sessionDate}`,
      );
    }
  }

  if (runs.length > 0) {
    const recentRuns = runs.slice(0, 5);
    lines.push(`\nCORRIDAS RECENTES:`);
    for (const r of recentRuns) {
      const pace = r.avgPaceSecondsPerKm
        ? `${Math.floor(r.avgPaceSecondsPerKm / 60)}:${String(Math.floor(r.avgPaceSecondsPerKm % 60)).padStart(2, "0")}/km`
        : "—";
      lines.push(
        `- ${r.sessionDate ?? "—"}: ${(r.distanceKm ?? 0).toFixed(2)}km @ pace ${pace}`,
      );
    }
  }

  return lines.join("\n");
}

function buildPrompt(contextSummary: string): string {
  return `Você é Dr. Lon, coach de fitness inteligente do app Longevify (healthtech BR de longevidade). Analise os dados do user da semana e dê 2-4 INSIGHTS actionable em PT-BR.

DADOS DO USER:
${contextSummary}

REGRAS:
1. Tom direto, casual ("tá", "pra", "rola"), evite formalidade médica.
2. Cada insight tem título curto (3-7 palavras, imperativo) + body de 1-3 frases.
3. Mistura "positive" (parabéns por X), "neutral" (observação interessante) e "warning" (ajuste sugerido) baseado nos dados.
4. NÃO seja genérico. Cite números reais ("seu volume de peito caiu 23%", "5K em 23min — sub-5 pace!").
5. Se recovery < 65, prioriza warning sobre descanso/sobrecarga.
6. Se há PR novo recente, parabeniza.
7. Se algum grupo muscular tá sem volume há tempo, sugere incluir.
8. Se streak alto + recovery baixo, alerta pra desbalanço.
9. NÃO faça diagnóstico médico. NUNCA recomende suplemento/remédio.
10. JSON puro de saída, sem texto fora.

FORMATO:
{
  "insights": [
    {
      "kind": "strength|running|recovery|consistency|mixed",
      "title": "Título curto imperativo",
      "body": "Explicação 1-3 frases.",
      "severity": "positive|neutral|warning"
    }
  ]
}`;
}

export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "anthropic-not-configured" },
      { status: 503 },
    );
  }

  try {
    const context = await buildContext();
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: buildPrompt(context) }],
    });

    const text = (response.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = fenced ? fenced[1] : text;
    const parsed = JSON.parse(jsonStr) as { insights: Insight[] };

    if (!Array.isArray(parsed.insights)) {
      throw new Error("invalid-shape");
    }

    // Sanitize: cap em 4 insights, fields obrigatórios
    const insights = parsed.insights
      .slice(0, 4)
      .filter((i) => i.title && i.body && i.kind && i.severity);

    return NextResponse.json(
      { ok: true, insights, generatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[fitness/insights/weekly]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "anthropic-error",
      },
      { status: 500 },
    );
  }
}
