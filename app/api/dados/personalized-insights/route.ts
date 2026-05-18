import { NextResponse } from "next/server";
import { BIOMARKERS } from "@/lib/mock-data";
import type { Biomarker, Patient } from "@/lib/mock-data";

/**
 * POST /api/dados/personalized-insights
 *
 * Lucas (2026-05-17): "quero mais stories detalhando e analisando os
 * resultados do exame de sangue (...) seria bom usar AI para fazer
 * essas analises de maneira mais específica, personalizada e única."
 *
 * Gera análises HUMANIZADAS e PRAGMÁTICAS pra cada biomarcador do paciente,
 * em um único request batch (1 chamada GPT-5 retorna 6 insights). Saída
 * em JSON estruturado pra renderização nos slides do onboarding.
 *
 * Body: { biomarkerIds: string[], patient: Patient (subset) }
 * Response: { insights: Record<biomarkerId, BiomarkerInsight> }
 *
 * Cache: V1 sem cache (~$0.02/sessão de stories aberto). V2 podemos
 * cachear em Redis com TTL 24h por (patient_id, biomarker_id, value).
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export interface BiomarkerInsight {
  /** Mensagem principal — 1 frase humanizada (max ~120 chars). */
  mainMessage: string;
  /** Por que esse resultado aconteceu? 2-3 frases relacionando com perfil
   *  do paciente. */
  whyHappened: string;
  /** Ações práticas — 2-3 bullets curtos. */
  whatToDo: string[];
  /** Quanto tempo pra ver mudança? 1 frase. */
  timeline: string;
}

interface InsightsResponse {
  insights: Record<string, BiomarkerInsight>;
  provider: "gpt-5" | "static";
  /** True quando OpenAI falhou e caímos no texto estático. */
  fallback?: boolean;
}

const MODEL = "gpt-5";

function buildPrompt(biomarkers: Biomarker[], patient: Partial<Patient>): string {
  const profile = [
    `Nome: ${patient.firstName ?? "paciente"}`,
    `Idade cronológica: ${patient.chronologicalAge ?? "—"} anos`,
    `Idade biológica: ${patient.biologicalAge ?? "—"} anos`,
    `Longevify Score: ${patient.longevifyScore ?? "—"}/100`,
    `Sexo: ${patient.sex === "female" ? "feminino" : "masculino"}`,
  ].join(" · ");

  const biomarkerLines = biomarkers
    .map((b) => {
      const statusLabel =
        b.status === "optimal"
          ? "ótimo"
          : b.status === "normal"
            ? "normal (atenção)"
            : "fora da faixa";
      const optimalRange = b.optimalRange
        ? `${b.optimalRange[0]}-${b.optimalRange[1]} ${b.unit}`
        : `${b.referenceLabel} ${b.unit}`;
      return `- ${b.id} (${b.name}): valor=${b.value} ${b.unit}, faixa ideal=${optimalRange}, status=${statusLabel}, categoria=${b.category}`;
    })
    .join("\n");

  return `Você é o Dr. Lon, médico especialista em medicina da longevidade, falando direto com ${patient.firstName ?? "o paciente"}.

Perfil:
${profile}

Analise os seguintes biomarcadores e, pra CADA UM, gere uma análise HUMANIZADA, PRAGMÁTICA e PERSONALIZADA. Tom: conversa de WhatsApp com um amigo médico. Frases curtas. Sem rebuscamento. Use analogias do dia a dia.

${biomarkerLines}

Retorne SOMENTE um JSON no formato:
{
  "insights": {
    "<biomarker-id>": {
      "mainMessage": "1 frase humanizada (max 120 chars) — qual a notícia principal",
      "whyHappened": "2-3 frases — POR QUE provavelmente esse resultado aconteceu, relacionando com o perfil (idade, score, outros marcadores). Especulação clínica é OK desde que plausível.",
      "whatToDo": ["ação prática 1 (max 80 chars)", "ação prática 2", "ação prática 3"],
      "timeline": "1 frase — em quanto tempo dá pra ver mudança real"
    },
    ...
  }
}

Regras IMPORTANTES:
- mainMessage: começa direto, sem "Sua [biomarker]" — vá direto na mensagem. Ex: "Tá no ponto certo, segue assim" ou "Subiu acima do ideal — dá pra baixar".
- whyHappened: NÃO dê palpite genérico. Use o perfil — idade, score, outros marcadores. Ex pra LDL alto em homem de 40: "Genética conta MUITO em LDL. Dieta com gordura saturada (carne vermelha frequente, queijos amarelos) também sobe o número."
- whatToDo: ações CONCRETAS. Não "coma mais frutas". Use "30g de fibra solúvel/dia (1 abacate + 1 maçã + farelo de aveia no café)".
- timeline: realista. "8-12 semanas com suplementação + dieta" pra LDL. "6-8 semanas com sol matinal" pra Vit D.
- Em PT-BR. Linguagem do dia a dia. Sem termos técnicos sem explicar.
- SE valor está ótimo: tom POSITIVO, foque em "como manter". whyHappened explica por que tá bom, whatToDo é "preserve esses hábitos: ...", timeline é "reavalie a cada 6 meses".`;
}

/** Fallback estático quando OpenAI não disponível ou falha — pra não
 *  travar o onboarding. Conteúdo é menos personalizado mas funcional. */
function staticFallback(biomarker: Biomarker): BiomarkerInsight {
  if (biomarker.status === "optimal") {
    return {
      mainMessage: `Tá no ponto, segue assim`,
      whyHappened: `Seu ${biomarker.name} em ${biomarker.value} ${biomarker.unit} está na faixa ótima. Provavelmente é combinação de hábitos consistentes + base genética favorável nesse marcador.`,
      whatToDo: [
        "Mantenha os hábitos atuais — não mude o que está funcionando",
        "Reavalie em 6 meses pra confirmar estabilidade",
      ],
      timeline: "Próxima coleta em 6 meses — mantenha o padrão.",
    };
  }
  return {
    mainMessage: `${biomarker.name} ${biomarker.status === "out" ? "fora da faixa ideal" : "abaixo do ótimo"}`,
    whyHappened: `Seu ${biomarker.name} em ${biomarker.value} ${biomarker.unit} está fora do ideal (${biomarker.referenceLabel}). Causas comuns: dieta, sono insuficiente, sedentarismo, ou predisposição genética.`,
    whatToDo: [
      "Suplementação direcionada (a Longevify recomenda no slide seguinte)",
      "Ajuste alimentar específico pro marcador",
      "Reavaliação em 60-90 dias",
    ],
    timeline: "Resposta típica em 8-12 semanas com intervenção consistente.",
  };
}

export async function POST(request: Request) {
  let body: { biomarkerIds?: string[]; patient?: Partial<Patient> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const ids = Array.isArray(body.biomarkerIds) ? body.biomarkerIds : [];
  if (ids.length === 0) {
    return NextResponse.json({
      insights: {},
      provider: "static",
    } satisfies InsightsResponse);
  }

  const biomarkers = BIOMARKERS.filter((b) => ids.includes(b.id));
  if (biomarkers.length === 0) {
    return NextResponse.json({
      insights: {},
      provider: "static",
    } satisfies InsightsResponse);
  }

  const patient = body.patient ?? {};
  const openaiKey = process.env.OPENAI_API_KEY;

  // Sem OpenAI key → fallback estático imediato
  if (!openaiKey) {
    const insights: Record<string, BiomarkerInsight> = {};
    for (const b of biomarkers) {
      insights[b.id] = staticFallback(b);
    }
    return NextResponse.json({
      insights,
      provider: "static",
      fallback: true,
    } satisfies InsightsResponse);
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: openaiKey });
    const prompt = buildPrompt(biomarkers, patient);

    const completion = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      insights?: Record<string, Partial<BiomarkerInsight>>;
    };

    // Sanitize — garante shape correto, fallback por item se faltar
    const insights: Record<string, BiomarkerInsight> = {};
    for (const b of biomarkers) {
      const ai = parsed.insights?.[b.id];
      if (
        ai &&
        typeof ai.mainMessage === "string" &&
        typeof ai.whyHappened === "string" &&
        Array.isArray(ai.whatToDo) &&
        typeof ai.timeline === "string"
      ) {
        insights[b.id] = {
          mainMessage: ai.mainMessage,
          whyHappened: ai.whyHappened,
          whatToDo: ai.whatToDo.filter((s): s is string => typeof s === "string"),
          timeline: ai.timeline,
        };
      } else {
        insights[b.id] = staticFallback(b);
      }
    }

    return NextResponse.json({
      insights,
      provider: "gpt-5",
    } satisfies InsightsResponse);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[personalized-insights] OpenAI falhou:", err);
    const insights: Record<string, BiomarkerInsight> = {};
    for (const b of biomarkers) {
      insights[b.id] = staticFallback(b);
    }
    return NextResponse.json({
      insights,
      provider: "static",
      fallback: true,
    } satisfies InsightsResponse);
  }
}
