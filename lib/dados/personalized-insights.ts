/**
 * Geração de insights personalizados por biomarcador.
 *
 * Lucas (2026-05-18): "você ja tem que ter feito isso antes mesmo de
 * ter carregado o onboarding, tem que ter sido feito no momento em que
 * você recebeu os dados do exame de sangue e depois guarda isso e ja
 * deixa pronto para mostrar no onboarding, de modo que o indivíduo não
 * tenha que ficar esperando para que a análise carregue."
 *
 * Estratégia:
 *   - Helper isomórfico (lib/dados/...) usado por:
 *     a) Server component (home/page.tsx) — pré-fetch ao carregar a
 *        página, passa pro PostExamStories já populado
 *     b) API route (api/dados/personalized-insights) — fallback se
 *        client component precisar refetch
 *   - Cache em memória (Map) por chave estável (patient.id + biomarker
 *     id + value rounded). Mock data não muda, então primeiro hit
 *     popula, próximos hits são instantâneos.
 *   - TTL implícito: até o processo Vercel reiniciar (~hours-days).
 */

import type { Biomarker, Patient } from "@/lib/mock-data";

export interface BiomarkerInsight {
  mainMessage: string;
  whyHappened: string;
  whatToDo: string[];
  timeline: string;
}

export interface PersonalizedInsightsResult {
  insights: Record<string, BiomarkerInsight>;
  provider: "gpt-4o-mini" | "static";
  fallback?: boolean;
}

const MODEL = "gpt-4o-mini";

// Cache em memória — chave: patient_firstName + biomarker_id + value
// (arredondado pra não invalidar com float noise).
const insightCache = new Map<string, BiomarkerInsight>();

function cacheKey(
  patient: Partial<Patient>,
  biomarker: Pick<Biomarker, "id" | "value">,
): string {
  return `${patient.firstName ?? "anon"}|${biomarker.id}|${biomarker.value.toFixed(1)}`;
}

function buildPrompt(
  biomarkers: Biomarker[],
  patient: Partial<Patient>,
): string {
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
- mainMessage: começa direto, sem "Sua [biomarker]" — vá direto na mensagem.
- whyHappened: NÃO dê palpite genérico. Use o perfil — idade, score, outros marcadores.
- whatToDo: ações CONCRETAS. Não "coma mais frutas". Use medidas reais.
- timeline: realista. Tempo de resposta clínica daquele marcador específico.
- Em PT-BR. Linguagem do dia a dia. Sem termos técnicos sem explicar.
- SE valor está ótimo: tom POSITIVO, foque em "como manter".`;
}

/** Fallback estático — pra não travar UI quando AI indisponível/falha. */
export function staticFallback(biomarker: Biomarker): BiomarkerInsight {
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

/**
 * Gera (ou recupera do cache) insights pra uma lista de biomarcadores.
 * NÃO LANÇA — em caso de erro de API, devolve fallback estático.
 *
 * Pode ser chamado tanto de server component (await direto) quanto de
 * API route. Isomorphic.
 */
export async function generatePersonalizedInsights(
  biomarkers: Biomarker[],
  patient: Partial<Patient>,
): Promise<PersonalizedInsightsResult> {
  if (biomarkers.length === 0) {
    return { insights: {}, provider: "static" };
  }

  // Cache hit por item — só chama IA pros que faltam
  const cachedInsights: Record<string, BiomarkerInsight> = {};
  const missing: Biomarker[] = [];
  for (const b of biomarkers) {
    const key = cacheKey(patient, b);
    const cached = insightCache.get(key);
    if (cached) {
      cachedInsights[b.id] = cached;
    } else {
      missing.push(b);
    }
  }

  // Todos cacheados? Retorna sem chamar OpenAI
  if (missing.length === 0) {
    return { insights: cachedInsights, provider: "gpt-4o-mini" };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    // Sem key → fallback estático pros missing
    const insights = { ...cachedInsights };
    for (const b of missing) insights[b.id] = staticFallback(b);
    return { insights, provider: "static", fallback: true };
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: openaiKey });
    const prompt = buildPrompt(missing, patient);

    const completion = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      insights?: Record<string, Partial<BiomarkerInsight>>;
    };

    const insights: Record<string, BiomarkerInsight> = { ...cachedInsights };
    for (const b of missing) {
      const ai = parsed.insights?.[b.id];
      if (
        ai &&
        typeof ai.mainMessage === "string" &&
        typeof ai.whyHappened === "string" &&
        Array.isArray(ai.whatToDo) &&
        typeof ai.timeline === "string"
      ) {
        const insight: BiomarkerInsight = {
          mainMessage: ai.mainMessage,
          whyHappened: ai.whyHappened,
          whatToDo: ai.whatToDo.filter((s): s is string => typeof s === "string"),
          timeline: ai.timeline,
        };
        insights[b.id] = insight;
        insightCache.set(cacheKey(patient, b), insight);
      } else {
        insights[b.id] = staticFallback(b);
      }
    }

    return { insights, provider: "gpt-4o-mini" };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[personalized-insights] OpenAI falhou:", err);
    const insights = { ...cachedInsights };
    for (const b of missing) insights[b.id] = staticFallback(b);
    return { insights, provider: "static", fallback: true };
  }
}
