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
      title: "Energia mais baixa é normal agora",
      body: "Seu corpo está gastando recursos pra menstruar. Priorize sono e movimento leve — não é hora de treino pesado.",
    },
    {
      kind: "pattern",
      title: "Registre fluxo e sintomas",
      body: "Quanto mais dias você registrar, melhor a análise nos próximos ciclos. Comece pelo fluxo de hoje.",
    },
    {
      kind: "tip",
      title: "Cólica forte? Magnésio ajuda",
      body: "Magnésio 300-400mg/dia reduz a cólica em muitas mulheres. Calor local também alivia. Fluxo que dura mais de 7 dias merece avaliação médica.",
    },
  ],
  follicular: [
    {
      kind: "phase",
      title: "Energia em alta — aproveita",
      body: "Estrogênio subindo dá foco mental melhor, treino rende mais e o humor tende a estar lá em cima. Boa janela pra projetos exigentes.",
    },
    {
      kind: "pattern",
      title: "Hora de testar limites",
      body: "Recuperação muscular fica mais rápida nessa fase. Vale tentar PRs (recordes pessoais) ou treinos mais longos.",
    },
    {
      kind: "tip",
      title: "Proteína proporcional ao peso",
      body: "1.6g de proteína por kg ajuda músculo a aproveitar esse momento. Carne, ovo, peixe, whey — escolha o que cabe no dia.",
    },
  ],
  ovulation: [
    {
      kind: "phase",
      title: "Janela fértil",
      body: "Pico de fertilidade. Libido tende a subir e energia continua alta. Atenção redobrada com contracepção se não está tentando engravidar.",
    },
    {
      kind: "pattern",
      title: "Sinais que valem registrar",
      body: "Muco cervical transparente e elástico (parece clara de ovo) é o marcador mais confiável de ovulação. Dor leve num dos lados também é comum.",
    },
    {
      kind: "tip",
      title: "Aproveite o pico de energia",
      body: "Mesma lógica da folicular: treinos intensos rendem bem. Adicione exercícios que envolvem coordenação — cérebro fica mais responsivo.",
    },
  ],
  luteal: [
    {
      kind: "phase",
      title: "Hora de desacelerar",
      body: "Progesterona alta deixa o corpo mais cansado. Cravings, retenção e mood oscilando são esperados. Não é fraqueza — é fisiologia.",
    },
    {
      kind: "pattern",
      title: "TPM mapeada vira previsão",
      body: "Registrar mood e energia nessa fase ajuda a prever quando os sintomas começam no próximo ciclo. Conhecer o padrão já alivia metade.",
    },
    {
      kind: "tip",
      title: "Magnésio + B6 ajudam na TPM",
      body: "Combinação clássica e evidence-based. Chocolate amargo (>70%) é melhor que doce pra cravings. Diminua intensidade dos treinos.",
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

Regras de escrita (CRÍTICAS — Lucas pediu "texto que seja fácil de ler"):
- **title**: 3-7 palavras, direto, sem rebuscamento. Ex: "Energia alta hoje" ou "Sono mais frágil é esperado".
- **body**: 2 frases CURTAS (140-220 chars total). Cada frase com no máximo 15 palavras. Linguagem cotidiana, sem jargão técnico sem explicar. Estilo de mensagem de WhatsApp, não bula de remédio.
  - Ex bom: "Energia tende a estar mais baixa nessa fase. Vale priorizar sono e treinos leves nessa semana."
  - Ex ruim: "A elevação dos níveis de progesterona durante a fase lútea provoca diversos sintomas TPM relacionados à modulação serotoninérgica."
- Cada card foca em UM tópico só, não 3.

Tipos:
- "phase" = o que a fase atual significa NA PRÁTICA pro corpo (energia, humor, sono), com 1 ação concreta
- "pattern" = padrão REAL observado nos registros recentes; se ≤2 entries, sugere registrar mais dias pra desbloquear análise
- "tip" = 1 ação concreta evidence-based (dose de suplemento, hábito específico, OU sinal de alarme pra procurar médico)

Outras regras:
- PT-BR, sem clichê "para mulheres", sem disclaimer genérico ("consulte seu médico" em toda frase)
- NÃO prescreva medicamento controlado nem ajuste de contraceptivo
- Se reproductive_status for "pregnant"/"postpartum"/"menopause"/"perimenopause", adapta o tom
- Sem listas dentro do body — texto corrido sempre`;
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
