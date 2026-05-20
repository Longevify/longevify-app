/**
 * Helper server-side pra invocar /api/protocolo/ai-gen e gerar tasks +
 * goals via Claude Sonnet 4.6 pros biomarcadores fora do catálogo
 * rule-based (BIOMARKER_PROTOCOL).
 *
 * Lucas (2026-05-20): "tudo tem que mudar com base nessas informações...
 * pode colocar [AI] pra fazer esse nível de personalização."
 */

import "server-only";
import type { Biomarker } from "@/lib/mock-data";
import type { Patient } from "@/lib/mock-data";
import type { ProtocolTask, WorkingOnGoal } from "./tasks";

interface AIResponse {
  ok: boolean;
  tasks?: Array<{
    id: string;
    label: string;
    reasoning: string;
    productHint?: string | null;
  }>;
  goals?: Array<{
    id: string;
    title: string;
    description: string;
    severity: "high" | "medium" | "low";
  }>;
  error?: string;
}

/**
 * Filtra biomarcadores fora do catálogo rule-based (que `generateProtocolTasks`
 * já cobre) e gera tasks/goals AI pra eles via Claude Sonnet 4.6.
 *
 * Retorna best-effort: se OpenAI/Anthropic falhar, devolve arrays vazios.
 * Caller combina com o rule-based via spread.
 */
export async function generateAIProtocolForGaps(
  biomarkers: Biomarker[],
  patient: Patient,
  ruleBasedIds: Set<string>,
): Promise<{ tasks: ProtocolTask[]; goals: WorkingOnGoal[] }> {
  // Só os que NÃO estão no rule-based, com status que pede atenção
  const gaps = biomarkers.filter(
    (b) =>
      !ruleBasedIds.has(b.id) &&
      (b.status === "out" || b.status === "normal"),
  );

  if (gaps.length === 0) {
    return { tasks: [], goals: [] };
  }

  // Limita a 10 biomarcadores por call (controla custo + tempo)
  const sample = gaps.slice(0, 10);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/protocolo/ai-gen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        biomarkers: sample.map((b) => ({
          id: b.id,
          name: b.name,
          value: b.value,
          unit: b.unit,
          status: b.status,
          referenceLabel: b.referenceLabel,
          category: b.category,
        })),
        patientFirstName: patient.firstName,
        patientAge: patient.chronologicalAge,
        patientSex: patient.sex,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      console.warn("[ai-gen] HTTP", res.status);
      return { tasks: [], goals: [] };
    }

    const data = (await res.json()) as AIResponse;
    if (!data.ok || !data.tasks || !data.goals) {
      return { tasks: [], goals: [] };
    }

    return {
      tasks: data.tasks.map((t) => ({
        id: t.id,
        label: t.label,
        reasoning: t.reasoning,
        // productHint pode ser usado futuramente pra linkar com produto via fuzzy match
      })),
      goals: data.goals.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        severity: g.severity,
      })),
    };
  } catch (err) {
    console.warn("[ai-gen] fetch falhou:", err);
    return { tasks: [], goals: [] };
  }
}
