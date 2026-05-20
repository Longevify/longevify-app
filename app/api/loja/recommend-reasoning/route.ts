import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * POST /api/loja/recommend-reasoning
 *
 * Gera 1 frase contextualizada por produto recomendado, baseada nos
 * biomarcadores do paciente. Substitui texto genérico ("Apoia saúde
 * cardiovascular") por personalizado ("Recomendado pra você porque seu
 * LDL em 142 mg/dL está acima do ideal de 100").
 *
 * Lucas (2026-05-20): "a recomendação de produtos tem que mudar com base
 * nisso... pensa em qual modelo de AI seria o mais eficiente."
 *
 * Modelo: gpt-4o-mini
 * - Tarefa de texto curto (1 frase por produto)
 * - JSON mode determinístico
 * - Custo ~$0.0003 por chamada (10 produtos = ~$0.003 = R$0.015)
 *
 * Stateless. Cache em sessionStorage do client por chave estável.
 */

interface ProductInput {
  productId: string;
  productName: string;
  matchedBiomarkers: Array<{ name: string; value: number; unit: string; status: string }>;
}

interface RequestBody {
  products?: ProductInput[];
  patientFirstName?: string;
}

interface Reasoning {
  productId: string;
  reasoning: string;
}

interface ParsedResponse {
  reasonings?: Reasoning[];
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

  const products = body.products ?? [];
  if (products.length === 0) {
    return NextResponse.json(
      { ok: true, reasonings: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "openai-not-configured" },
      { status: 503 },
    );
  }

  const name = body.patientFirstName ?? "o paciente";
  const productsBlock = products
    .map((p) => {
      const bioLines = p.matchedBiomarkers
        .map((b) => `    - ${b.name}: ${b.value} ${b.unit} (${b.status})`)
        .join("\n");
      return `Produto: ${p.productName} (id=${p.productId})\n  Biomarcadores relacionados:\n${bioLines}`;
    })
    .join("\n\n");

  const prompt = `Você é um nutricionista da Longevify falando direto com ${name}. Pra cada produto abaixo, escreva 1 frase curta explicando por que ele faz sentido pro ${name} ESPECIFICAMENTE, citando os valores dos biomarcadores associados.

PRODUTOS:
${productsBlock}

REGRAS:
- 1 frase por produto, máx 180 caracteres
- Cite valor + unidade do biomarcador específico (ex: "seu LDL em 142 mg/dL")
- Tom direto, acolhedor, sem clichê médico
- NÃO usar "você deve" / "precisa de receita" / disclaimer genérico
- PT-BR, sem rebuscamento
- Se múltiplos biomarcadores: cite o mais relevante (status=out > normal)

OUTPUT (SOMENTE JSON, sem comentários):
{
  "reasonings": [
    { "productId": "omega-3", "reasoning": "Recomendado pra você porque seu LDL em 142 mg/dL está acima do ideal — Ômega-3 ajuda a reduzir partículas aterogênicas." }
  ]
}`;

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as ParsedResponse;

    if (!Array.isArray(parsed.reasonings)) {
      throw new Error("invalid-shape");
    }

    return NextResponse.json(
      { ok: true, reasonings: parsed.reasonings },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[loja/recommend-reasoning]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "openai-error",
        reasonings: [],
      },
      { status: 500 },
    );
  }
}
