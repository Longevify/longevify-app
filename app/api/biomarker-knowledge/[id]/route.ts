import { NextResponse } from "next/server";
import { getBiomarkerKnowledge } from "@/lib/biomarker-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/biomarker-knowledge/[id]
 *
 * Retorna conteúdo educacional pra um biomarcador. Estratégia em camadas:
 *   1. Catálogo local curado (lib/biomarker-knowledge.ts) — top biomarkers
 *      com texto clinicamente revisado
 *   2. Cache em memória (Map) — biomarkers já gerados por AI nessa instância
 *   3. AI gen via Claude Opus 4.7 — pra biomarkers fora do catálogo
 *
 * Lucas (2026-05-20): "tem certos biomarcadores que aparentemente você
 * não tinha elencado como um de seus marcadores possíveis... todos os
 * biomarcadores terão que ter páginas analisáveis no app... gere com base
 * em tudo que você achar sobre na internet."
 *
 * Modelo: Opus 4.7 — conteúdo médico DEVE ser de alta qualidade, sem
 * imprecisões. Custo aceitável dado cache: 1x por biomarcador novo,
 * depois é gratuito. ~$0.30 por geração.
 *
 * Schema retornado bate com BiomarkerKnowledge do módulo local.
 */

interface ImproveActions {
  rotina: string[];
  alimentacao: string[];
  suplementacao: string[];
  exercicio: string[];
  sono: string[];
}

interface BiomarkerKnowledge {
  id: string;
  whatItIs: string;
  whyItMatters: string;
  factors: string[];
  improve: ImproveActions;
  relatedBiomarkerIds: string[];
  rangeContext: string;
  disclaimer?: string;
}

interface RequestQuery {
  /** Nome do biomarcador (em PT-BR). Ajuda o LLM a gerar quando o ID
   *  não tem semântica óbvia (ex: "iron_serum"). */
  name?: string;
  /** Unidade (mg/dL, ng/mL, etc.) — opcional, ajuda contexto. */
  unit?: string;
  /** Categoria clínica (lipidico, hepatico, etc.) — opcional. */
  category?: string;
}

// Cache em memória — vive até a instância Vercel reiniciar (~horas/dias).
// Pra escala, considerar tabela Supabase persistente (TODO).
const aiCache = new Map<string, BiomarkerKnowledge>();

function buildPrompt(
  id: string,
  q: RequestQuery,
): string {
  const name = q.name ?? id;
  const unit = q.unit ? ` (unidade ${q.unit})` : "";
  const category = q.category ? ` da categoria ${q.category}` : "";

  return `Você é um médico de medicina da longevidade. Gere conteúdo educacional sobre o biomarcador "${name}"${unit}${category} pra um app de saúde brasileiro (decisão clínica final SEMPRE com médico humano).

Retorne SOMENTE JSON neste schema:
{
  "id": "${id}",
  "whatItIs": "string — O que é o biomarcador. 3-5 frases didáticas, sem jargão excessivo, explicando o que mede. Cite mecanismo fisiológico básico.",
  "whyItMatters": "string — Por que importa pra longevidade/saúde. 3-5 frases. Cite associação com mortalidade ou doenças relevantes se houver evidência.",
  "factors": [
    "5-8 fatores que influenciam esse marcador",
    "Cada bullet curto, máx 100 chars",
    "Inclua: dieta, exercício, genética, sono, idade, sexo, medicações, condições clínicas quando relevante"
  ],
  "improve": {
    "rotina": ["3-4 ações de rotina/monitoramento"],
    "alimentacao": ["3-5 ações alimentares específicas, com quantidades quando aplicável"],
    "suplementacao": ["2-4 suplementos com doses, sempre com qualifier 'sob orientação' pra controlados"],
    "exercicio": ["2-3 recomendações de exercício específicas"],
    "sono": ["2-3 ações relacionadas a sono"]
  },
  "relatedBiomarkerIds": ["3-5 ids de biomarcadores RELACIONADOS, usando IDs como: ldl, hdl, apob, vitd, hba1c, glucose, ferritin, vitb12, homocysteine, crp, tsh, testo, magnesium, iron_serum, hemoglobin, alt, ast, creatinine, etc."],
  "rangeContext": "string — Explicação da faixa de referência. 2-3 frases sobre por que 'normal' e 'ótimo' podem diferir, contexto de longevidade.",
  "disclaimer": "string — Disclaimer médico curto (1-2 frases) pra esse biomarcador específico se há risco de auto-interpretação errônea. Omita se não aplicável."
}

REGRAS RÍGIDAS:
- Tom: clínico-próximo, didático, evidence-based, em PT-BR
- NUNCA prescrever medicamento controlado
- Sempre mencionar que decisão final é com médico humano
- Citar diretrizes brasileiras (SBC, SBD, SBEM) ou internacionais (AHA, Endocrine Society) quando aplicável
- Se o biomarcador é raro ou específico, seja honesto sobre limitação de evidência
- Não invente IDs em relatedBiomarkerIds — use só os comuns do catálogo Longevify`;
}

async function generateWithAI(
  id: string,
  q: RequestQuery,
): Promise<BiomarkerKnowledge | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      messages: [{ role: "user", content: buildPrompt(id, q) }],
    });

    const text = (response.content as Array<{ type: string; text?: string }>)
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = fenced ? fenced[1] : text;
    const parsed = JSON.parse(jsonStr) as BiomarkerKnowledge;

    // Validação mínima
    if (
      !parsed.id ||
      !parsed.whatItIs ||
      !parsed.whyItMatters ||
      !Array.isArray(parsed.factors) ||
      !parsed.improve ||
      !Array.isArray(parsed.relatedBiomarkerIds)
    ) {
      return null;
    }

    // Garante shape do improve
    const improveDefault: ImproveActions = {
      rotina: [],
      alimentacao: [],
      suplementacao: [],
      exercicio: [],
      sono: [],
    };
    const improve = { ...improveDefault, ...parsed.improve };

    return { ...parsed, id, improve };
  } catch (err) {
    console.error("[biomarker-knowledge AI gen]", err);
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  // Layer 1: catálogo local (textos clínicos revisados)
  const local = getBiomarkerKnowledge(id);
  if (local) {
    return NextResponse.json(
      { ok: true, knowledge: local, source: "catalog" },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  }

  // Layer 2: cache em memória
  const cached = aiCache.get(id);
  if (cached) {
    return NextResponse.json(
      { ok: true, knowledge: cached, source: "ai-cache" },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  }

  // Layer 3: AI gen
  const url = new URL(request.url);
  const query: RequestQuery = {
    name: url.searchParams.get("name") ?? undefined,
    unit: url.searchParams.get("unit") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
  };

  const generated = await generateWithAI(id, query);
  if (!generated) {
    return NextResponse.json(
      { ok: false, error: "could-not-generate" },
      { status: 500 },
    );
  }

  aiCache.set(id, generated);
  return NextResponse.json(
    { ok: true, knowledge: generated, source: "ai-generated" },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
