import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * POST /api/menstrual/insights
 *
 * Gera análises AI personalizadas baseadas no profile + entries recentes
 * do ciclo menstrual. Lucas (2026-05-19): "faça análises com AI para
 * guiar a mulher que está usando a aba".
 *
 * Endpoint stateless — aceita o contexto inteiro no body, retorna 3
 * insights. Caller decide se cacheia (client cacheia em sessionStorage
 * pra não chamar GPT toda vez que abre a aba).
 *
 * Sem auth requerida: o contexto vem do cliente já, não consultamos
 * banco aqui. Funciona pra demo (Lucas) e user real igual.
 */

interface InsightRequestBody {
  firstName?: string;
  phase?: string;
  cycleDay?: number;
  cycleLength?: number;
  daysUntilNextPeriod?: number;
  cycleRegularity?: string;
  reproductiveStatus?: string;
  contraceptiveKind?: string | null;
  recentEntries?: Array<{
    date: string;
    flow?: string | null;
    symptoms?: string[];
    mood?: number | null;
    energy?: number | null;
    libido?: number | null;
    sleepQuality?: number | null;
  }>;
}

interface InsightCard {
  kind: "phase" | "pattern" | "tip";
  title: string;
  body: string;
}

const FALLBACK_INSIGHTS: Record<string, InsightCard[]> = {
  menstrual: [
    {
      kind: "phase",
      title: "Período menstrual em curso",
      body: "Energia e disposição naturalmente mais baixas. Priorize sono, ferro (carnes magras, lentilha, beterraba) e movimento leve. Cólica é normal mas intensa demais merece avaliação.",
    },
    {
      kind: "tip",
      title: "Cólica e fluxo intenso",
      body: "Magnésio (300-400mg/dia) e ômega-3 reduzem inflamação. Calor local ajuda na hora. Se o fluxo dura >7 dias ou inunda absorvente em <2h, registre e converse com seu médico.",
    },
  ],
  follicular: [
    {
      kind: "phase",
      title: "Fase folicular — energia em alta",
      body: "Estrogênio subindo. Bom momento pra treinos intensos, foco em trabalhos cognitivos exigentes e socialização. Aproveita a janela.",
    },
    {
      kind: "tip",
      title: "Maximize essa fase",
      body: "Priorize exercícios de força e cardio de alta intensidade. Proteína 1.6g/kg ajuda na recuperação muscular acelerada que sua fisiologia permite agora.",
    },
  ],
  ovulation: [
    {
      kind: "phase",
      title: "Janela ovulatória",
      body: "Pico fértil. Aumento leve de libido e sensação de bem-estar comum. Se está tentando engravidar, esses são os dias mais férteis. Se não, atenção redobrada com contracepção.",
    },
    {
      kind: "tip",
      title: "Sinais da ovulação",
      body: "Muco cervical fica transparente/elástico (clara de ovo). Temperatura basal sobe ~0.3°C após. Algumas mulheres sentem dor leve em um dos lados (Mittelschmerz).",
    },
  ],
  luteal: [
    {
      kind: "phase",
      title: "Fase lútea — preparação",
      body: "Progesterona em alta. Mudanças de humor, retenção, sensibilidade nos seios, fome aumentada são comuns. Cravings por doce/sal vêm da queda de serotonina.",
    },
    {
      kind: "tip",
      title: "Como atravessar bem",
      body: "Diminua intensidade dos treinos, priorize sono (queda de energia é fisiológica). Magnésio + B6 amenizam TPM. Chocolate amargo > açúcar refinado pra cravings.",
    },
  ],
};

function fallback(phase: string): InsightCard[] {
  return FALLBACK_INSIGHTS[phase] ?? FALLBACK_INSIGHTS.follicular;
}

function buildPrompt(body: InsightRequestBody): string {
  const name = body.firstName ?? "a usuária";
  const entriesSummary =
    body.recentEntries && body.recentEntries.length > 0
      ? body.recentEntries
          .slice(0, 10)
          .map((e) => {
            const parts: string[] = [`${e.date}`];
            if (e.flow && e.flow !== "none") parts.push(`fluxo:${e.flow}`);
            if (e.symptoms?.length) parts.push(`sintomas:[${e.symptoms.join(",")}]`);
            if (typeof e.mood === "number") parts.push(`mood:${e.mood}/5`);
            if (typeof e.energy === "number") parts.push(`energia:${e.energy}/5`);
            return parts.join(" ");
          })
          .join("\n")
      : "(sem registros recentes)";

  return `Você é uma médica em medicina da longevidade da Longevify, falando direto com ${name}. Gere 3 análises personalizadas sobre o ciclo dela.

CONTEXTO:
- Fase atual: ${body.phase ?? "desconhecida"}
- Dia ${body.cycleDay ?? "?"} de ${body.cycleLength ?? "?"}
- Próximo período em ~${body.daysUntilNextPeriod ?? "?"} dias
- Regularidade: ${body.cycleRegularity ?? "?"}
- Status reprodutivo: ${body.reproductiveStatus ?? "regular"}
- Contraceptivo: ${body.contraceptiveKind ?? "none"}

ÚLTIMOS REGISTROS:
${entriesSummary}

Retorne SOMENTE JSON com 3 cards:
{
  "insights": [
    { "kind": "phase", "title": "...", "body": "..." },
    { "kind": "pattern", "title": "...", "body": "..." },
    { "kind": "tip", "title": "...", "body": "..." }
  ]
}

Regras:
- title curto (max 50 chars)
- body 2-3 frases (180-260 chars), tom clínico-próximo, acolhedor
- "phase" = o que a fase atual significa fisiologicamente, com ação prática
- "pattern" = padrão real observado nos registros (sintoma recorrente, fluxo, energia, mood); se não tem dados suficientes, sugere registrar pra desbloquear análise
- "tip" = ação concreta (suplemento com dose, hábito, sinal de alarme); evidência-based
- PT-BR sem clichê "para mulheres"; sem disclaimer genérico
- NÃO prescreva medicamento controlado nem ajuste de contraceptivo
- Se reproductive_status for "pregnant"/"postpartum"/"menopause"/"perimenopause", adapta o tom`;
}

export async function POST(request: Request) {
  let body: InsightRequestBody;
  try {
    body = (await request.json()) as InsightRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  const phase = body.phase ?? "unknown";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: true, insights: fallback(phase), source: "static" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [{ role: "user", content: buildPrompt(body) }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { insights?: InsightCard[] };
    const insights = Array.isArray(parsed.insights)
      ? parsed.insights
          .filter(
            (i) =>
              i &&
              typeof i.title === "string" &&
              typeof i.body === "string" &&
              ["phase", "pattern", "tip"].includes(i.kind),
          )
          .slice(0, 3)
      : [];

    if (insights.length === 0) {
      return NextResponse.json(
        { ok: true, insights: fallback(phase), source: "static-fallback" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { ok: true, insights, source: "gpt-4o-mini" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.warn("[menstrual/insights]", err);
    return NextResponse.json(
      { ok: true, insights: fallback(phase), source: "static-error" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
