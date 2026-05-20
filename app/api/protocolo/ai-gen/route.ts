import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/protocolo/ai-gen
 *
 * Gera tasks e goals de protocolo via Claude Sonnet 4.6 pros biomarcadores
 * que NÃO estão no catálogo rule-based (BIOMARKER_PROTOCOL em
 * lib/protocolo/tasks.ts).
 *
 * Lucas (2026-05-20): "os protocolos tem que mudar... tudo tem que mudar
 * com base nessas informações... se achar que para fazer esse nível de
 * personalização precisa colocar algum modelo de AI, pode colocar."
 *
 * Modelo escolhido: claude-sonnet-4-6
 * - Qualidade alta (acerta tom clínico-próximo PT-BR)
 * - Custo baixo (~$0.005/protocolo, 3-5 biomarkers num único call)
 * - Não precisa do Opus aqui — tarefa textual, não visão
 *
 * Stateless — caller passa todo contexto. Cache em sessionStorage do
 * client por chave (set de biomarker ids + values).
 */

interface BiomarkerInput {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: "optimal" | "normal" | "out";
  referenceLabel: string;
  category: string;
}

interface RequestBody {
  biomarkers?: BiomarkerInput[];
  patientFirstName?: string;
  patientAge?: number;
  patientSex?: "male" | "female";
}

interface AITask {
  id: string;
  label: string;
  reasoning: string;
  /** Pode ser null se task não tem produto vinculado (ex: lifestyle/exam). */
  productHint?: string | null;
}

interface AIGoal {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

interface ParsedResponse {
  tasks: AITask[];
  goals: AIGoal[];
}

function buildPrompt(body: RequestBody): string {
  const name = body.patientFirstName ?? "o paciente";
  const age = body.patientAge ? `${body.patientAge} anos` : "idade não informada";
  const sex = body.patientSex === "female" ? "feminino" : "masculino";

  const biomarkerLines = (body.biomarkers ?? [])
    .map(
      (b) =>
        `- ${b.name} (id=${b.id}, categoria=${b.category}): ${b.value} ${b.unit} | status=${b.status} | referência=${b.referenceLabel}`,
    )
    .join("\n");

  return `Você é um médico de medicina da longevidade gerando recomendações educacionais (NÃO prescrições) pro paciente ${name} (${age}, ${sex}).

Os biomarcadores abaixo precisam de atenção (status normal ou out). Gere uma task educacional curta + um goal terapêutico pra CADA um.

BIOMARCADORES:
${biomarkerLines}

REGRAS DE TASK:
- 1 task por biomarcador, label imperativa e curta (1-2 frases, max 200 chars)
- Foco em ação CONCRETA (suplemento com dose específica OU mudança de hábito)
- Mencione alavanca principal ANTES de suplementação isolada (dieta/sono/exercício > pílula)
- Tom educacional. NUNCA usar imperativo médico ("você DEVE", "precisa de receita").
- Sem prescrição de medicamento controlado, nem ajuste de dose de medicação existente
- Em PT-BR, linguagem direta

REGRAS DE GOAL:
- 1 goal por biomarcador (mesmo id base)
- title curto (máx 60 chars), ex: "Atingir folato ≥5 ng/mL"
- description: 2 frases com (1) valor atual + faixa-alvo (2) alavanca principal
- severity: "high" se status=out, "medium" se status=normal

REGRAS DE SEGURANÇA:
- Se biomarcador é hormonal (testo, estradiol, cortisol, TSH, T3, T4) e fora: SEMPRE sugerir avaliação médica antes de qualquer ação
- Se é mineral pesado ou ferro: investigar causa antes de suplementar (sobrecarga = risco)
- Se valor extremamente alterado (ex: glicose > 200, hemoglobina < 8): sugerir buscar médico em até X dias

OUTPUT (SOMENTE JSON, sem comentários):
{
  "tasks": [
    {
      "id": "ai-{biomarker.id}",
      "label": "...",
      "reasoning": "...",
      "productHint": null
    }
  ],
  "goals": [
    {
      "id": "ai-goal-{biomarker.id}",
      "title": "...",
      "description": "...",
      "severity": "high" | "medium" | "low"
    }
  ]
}`;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  const biomarkers = body.biomarkers ?? [];
  if (biomarkers.length === 0) {
    return NextResponse.json(
      { ok: true, tasks: [], goals: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "anthropic-not-configured" },
      { status: 503 },
    );
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: buildPrompt(body) }],
    });

    const text = (response.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = fenced ? fenced[1] : text;
    const parsed = JSON.parse(jsonStr) as ParsedResponse;

    // Validação
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.goals)) {
      throw new Error("invalid-shape");
    }

    return NextResponse.json(
      { ok: true, tasks: parsed.tasks, goals: parsed.goals },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[protocolo/ai-gen]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "anthropic-error",
        tasks: [],
        goals: [],
      },
      { status: 500 },
    );
  }
}
