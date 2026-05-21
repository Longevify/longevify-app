// Definições dos 4 questionários clínicos validados usados no app.
// As perguntas são traduções fiéis (PT-BR) das versões originais publicadas
// na literatura — atribuição das fontes é exibida em cada página.

export type LikertOption = { value: number; label: string };

export interface Question {
  id: string;
  text: string;
  options: LikertOption[];
}

export interface InterpretationBand {
  min: number;
  max: number;
  label: string;
  severity: "ok" | "low" | "moderate" | "high";
  guidance: string;
}

/**
 * Item crítico — pergunta cuja resposta acima do threshold dispara
 * escalação IMEDIATA independente do score total do questionário.
 *
 * Exemplo padrão da literatura: PHQ-9 Q9 (ideação suicida) — qualquer
 * resposta ≥ 1 ("vários dias") já é red flag clínico e requer avaliação
 * de risco mesmo com score total <10. Validado em Simon et al., Ann
 * Intern Med 2013, e refletido nas APA Practice Guidelines.
 *
 * UI consumer deve chamar `getCriticalHits()` ANTES de renderizar o
 * `interpretation` band normal — se houver hit, mostra modal/card de
 * escalação prioritária com CVV 188 / SAMU 192 / pronto-socorro.
 */
export interface CriticalItem {
  questionId: string;
  thresholdValue: number;
  reason: string;
  escalation: string;
}

export interface Questionnaire {
  id: "phq9" | "gad7" | "psqi" | "pss10";
  name: string;
  fullName: string;
  scale: string;
  description: string;
  estimatedMinutes: number;
  attribution: string;
  preamble: string;
  questions: Question[];
  // Score builder — recebe respostas indexadas pelo id da pergunta
  score(answers: Record<string, number>): number;
  // Interpretation bands ordenadas crescentemente
  interpretation: InterpretationBand[];
  recommendThreshold: number; // score igual ou maior aciona recomendação ativa
  // Itens críticos — disparam escalação imediata independente do score
  criticalItems?: CriticalItem[];
}

const PHQ_OPTIONS: LikertOption[] = [
  { value: 0, label: "Nenhuma vez" },
  { value: 1, label: "Vários dias" },
  { value: 2, label: "Mais da metade dos dias" },
  { value: 3, label: "Quase todos os dias" },
];

const GAD_OPTIONS: LikertOption[] = [
  { value: 0, label: "Nenhuma vez" },
  { value: 1, label: "Vários dias" },
  { value: 2, label: "Mais da metade dos dias" },
  { value: 3, label: "Quase todos os dias" },
];

const PSS_OPTIONS: LikertOption[] = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Quase nunca" },
  { value: 2, label: "Às vezes" },
  { value: 3, label: "Frequentemente" },
  { value: 4, label: "Muito frequentemente" },
];

const PSQI_QUALITY_OPTIONS: LikertOption[] = [
  { value: 0, label: "Muito boa" },
  { value: 1, label: "Boa" },
  { value: 2, label: "Ruim" },
  { value: 3, label: "Muito ruim" },
];

const PSQI_FREQUENCY_OPTIONS: LikertOption[] = [
  { value: 0, label: "Nenhuma vez no último mês" },
  { value: 1, label: "Menos de 1 vez por semana" },
  { value: 2, label: "1 ou 2 vezes por semana" },
  { value: 3, label: "3 ou mais vezes por semana" },
];

const PSQI_LATENCY_OPTIONS: LikertOption[] = [
  { value: 0, label: "Menos de 15 minutos" },
  { value: 1, label: "Entre 16 e 30 minutos" },
  { value: 2, label: "Entre 31 e 60 minutos" },
  { value: 3, label: "Mais de 60 minutos" },
];

const PSQI_DURATION_OPTIONS: LikertOption[] = [
  { value: 0, label: "Mais de 7 horas" },
  { value: 1, label: "Entre 6 e 7 horas" },
  { value: 2, label: "Entre 5 e 6 horas" },
  { value: 3, label: "Menos de 5 horas" },
];

export const PHQ9: Questionnaire = {
  id: "phq9",
  name: "PHQ-9",
  fullName: "Patient Health Questionnaire-9",
  scale: "Sintomas depressivos nas últimas 2 semanas",
  description:
    "Triagem padrão internacional pra rastrear depressão. Cobre humor, sono, apetite, energia e ideação. Não substitui diagnóstico clínico.",
  estimatedMinutes: 3,
  attribution:
    "Adaptado de Spitzer RL, Kroenke K, Williams JBW (1999). Patient Health Questionnaire-9.",
  preamble:
    "Nas últimas 2 semanas, com que frequência você foi incomodado por algum dos seguintes problemas?",
  questions: [
    {
      id: "q1",
      text: "Pouco interesse ou pouco prazer em fazer as coisas.",
      options: PHQ_OPTIONS,
    },
    {
      id: "q2",
      text: "Se sentir para baixo, deprimido ou sem perspectiva.",
      options: PHQ_OPTIONS,
    },
    {
      id: "q3",
      text: "Dificuldade para pegar no sono, continuar dormindo ou dormir demais.",
      options: PHQ_OPTIONS,
    },
    { id: "q4", text: "Se sentir cansado ou com pouca energia.", options: PHQ_OPTIONS },
    { id: "q5", text: "Falta de apetite ou comer demais.", options: PHQ_OPTIONS },
    {
      id: "q6",
      text: "Se sentir mal consigo mesmo — ou achar que é um fracasso ou que decepcionou sua família ou você mesmo.",
      options: PHQ_OPTIONS,
    },
    {
      id: "q7",
      text: "Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão.",
      options: PHQ_OPTIONS,
    },
    {
      id: "q8",
      text: "Se mover ou falar tão devagar que outras pessoas notaram. Ou o oposto — estar tão agitado que ficou andando de um lado para o outro mais do que de costume.",
      options: PHQ_OPTIONS,
    },
    {
      id: "q9",
      text: "Pensar em se ferir de alguma maneira ou que seria melhor estar morto.",
      options: PHQ_OPTIONS,
    },
  ],
  score(answers) {
    return Object.values(answers).reduce((acc, v) => acc + (v ?? 0), 0);
  },
  interpretation: [
    {
      min: 0,
      max: 4,
      label: "Sintomas mínimos",
      severity: "ok",
      guidance:
        "Sem sinais relevantes de depressão. Mantenha sono, exposição solar matinal e exercícios de zona 2.",
    },
    {
      min: 5,
      max: 9,
      label: "Depressão leve",
      severity: "low",
      guidance:
        "Atenção plena com hábitos de sono, exposição solar e atividade física. Reavalie em 4 semanas.",
    },
    {
      min: 10,
      max: 14,
      label: "Depressão moderada",
      severity: "moderate",
      guidance:
        "Recomendamos conversar com a equipe Longevify pra avaliar acompanhamento clínico estruturado.",
    },
    {
      min: 15,
      max: 19,
      label: "Depressão moderada a grave",
      severity: "high",
      guidance:
        "Procure a equipe Longevify essa semana. Indicamos avaliação psiquiátrica e plano terapêutico.",
    },
    {
      min: 20,
      max: 27,
      label: "Depressão grave",
      severity: "high",
      guidance:
        "Procure ajuda profissional o quanto antes. Em emergência ligue 188 (CVV) ou 192 (SAMU). Não fique sozinho(a).",
    },
  ],
  recommendThreshold: 10,
  // PHQ-9 Q9 (ideação suicida) — qualquer resposta ≥ 1 dispara avaliação
  // de risco de suicídio independente do score total. Padrão validado.
  // Ref: Simon GE et al., Ann Intern Med 2013; APA Practice Guidelines.
  criticalItems: [
    {
      questionId: "q9",
      thresholdValue: 1,
      reason:
        "Qualquer resposta diferente de 'Nenhuma vez' à pergunta sobre se ferir ou querer estar morto é red flag clínico, independente do score total. PHQ-9 Q9 ≥ 1 tem associação com risco aumentado de suicídio nos 12 meses seguintes.",
      escalation:
        "Procure avaliação de saúde mental AGORA: CVV 188 (24h gratuito) ou pronto-socorro psiquiátrico. Se houver plano ou meio acessível, ligue 192 (SAMU) e não fique sozinho(a). O Concierge IA não substitui profissional humano em situação assim.",
    },
  ],
};

export const GAD7: Questionnaire = {
  id: "gad7",
  name: "GAD-7",
  fullName: "Generalized Anxiety Disorder 7",
  scale: "Sintomas ansiosos nas últimas 2 semanas",
  description:
    "Escala curta pra rastrear transtorno de ansiedade generalizada e estimar gravidade.",
  estimatedMinutes: 2,
  attribution:
    "Adaptado de Spitzer RL, Kroenke K, Williams JBW, Löwe B (2006). Generalized Anxiety Disorder 7.",
  preamble:
    "Nas últimas 2 semanas, com que frequência você foi incomodado por algum dos seguintes problemas?",
  questions: [
    {
      id: "q1",
      text: "Sentir-se nervoso, ansioso ou no limite.",
      options: GAD_OPTIONS,
    },
    {
      id: "q2",
      text: "Não conseguir parar ou controlar as preocupações.",
      options: GAD_OPTIONS,
    },
    {
      id: "q3",
      text: "Preocupar-se demais com diferentes coisas.",
      options: GAD_OPTIONS,
    },
    { id: "q4", text: "Dificuldade em relaxar.", options: GAD_OPTIONS },
    {
      id: "q5",
      text: "Ficar tão inquieto que é difícil permanecer parado.",
      options: GAD_OPTIONS,
    },
    {
      id: "q6",
      text: "Ficar facilmente aborrecido ou irritado.",
      options: GAD_OPTIONS,
    },
    {
      id: "q7",
      text: "Sentir medo como se algo terrível pudesse acontecer.",
      options: GAD_OPTIONS,
    },
  ],
  score(answers) {
    return Object.values(answers).reduce((acc, v) => acc + (v ?? 0), 0);
  },
  interpretation: [
    {
      min: 0,
      max: 4,
      label: "Ansiedade mínima",
      severity: "ok",
      guidance:
        "Sem sinais relevantes. Mantenha respiração diafragmática e atividade física.",
    },
    {
      min: 5,
      max: 9,
      label: "Ansiedade leve",
      severity: "low",
      guidance:
        "Vale incluir 10 minutos diários de respiração, redução de cafeína à tarde e revisar carga de trabalho.",
    },
    {
      min: 10,
      max: 14,
      label: "Ansiedade moderada",
      severity: "moderate",
      guidance:
        "Recomendamos conversar com a equipe Longevify pra estruturar um plano de manejo.",
    },
    {
      min: 15,
      max: 21,
      label: "Ansiedade grave",
      severity: "high",
      guidance:
        "Procure a equipe Longevify essa semana — pode haver indicação de avaliação psiquiátrica.",
    },
  ],
  recommendThreshold: 10,
};

export const PSQI: Questionnaire = {
  id: "psqi",
  name: "PSQI",
  fullName: "Pittsburgh Sleep Quality Index (versão curta)",
  scale: "Qualidade do sono no último mês",
  description:
    "Versão reduzida do PSQI focada em latência, duração, eficiência e qualidade subjetiva — sinais que mais correlacionam com longevidade.",
  estimatedMinutes: 3,
  attribution:
    "Adaptado de Buysse DJ, Reynolds CF, Monk TH, Berman SR, Kupfer DJ (1989). Pittsburgh Sleep Quality Index.",
  preamble:
    "Pensando no último mês, responda pensando no padrão mais frequente de sono.",
  questions: [
    {
      id: "q1",
      text: "Como você avaliaria sua qualidade de sono no último mês?",
      options: PSQI_QUALITY_OPTIONS,
    },
    {
      id: "q2",
      text: "Quanto tempo você costuma demorar para pegar no sono?",
      options: PSQI_LATENCY_OPTIONS,
    },
    {
      id: "q3",
      text: "Quantas horas de sono efetivo você costuma ter por noite?",
      options: PSQI_DURATION_OPTIONS,
    },
    {
      id: "q4",
      text: "Com que frequência você acorda no meio da noite ou de madrugada?",
      options: PSQI_FREQUENCY_OPTIONS,
    },
    {
      id: "q5",
      text: "Com que frequência você se sente sem disposição durante o dia?",
      options: PSQI_FREQUENCY_OPTIONS,
    },
  ],
  score(answers) {
    return Object.values(answers).reduce((acc, v) => acc + (v ?? 0), 0);
  },
  interpretation: [
    {
      min: 0,
      max: 4,
      label: "Sono saudável",
      severity: "ok",
      guidance:
        "Padrão de sono compatível com longevidade. Mantenha consistência de horário e exposição solar matinal.",
    },
    {
      min: 5,
      max: 8,
      label: "Sono limítrofe",
      severity: "low",
      guidance:
        "Comece a tratar sono como prioridade: corte cafeína depois das 14h, sem tela 60min antes de dormir.",
    },
    {
      min: 9,
      max: 12,
      label: "Sono ruim",
      severity: "moderate",
      guidance:
        "Recomendamos conversar com a equipe Longevify — sono assim impacta diretamente seu Longevify Score.",
    },
    {
      min: 13,
      max: 15,
      label: "Sono muito ruim",
      severity: "high",
      guidance:
        "Indicamos avaliação clínica e possivelmente polissonografia. Marque com a equipe Longevify essa semana.",
    },
  ],
  recommendThreshold: 9,
};

export const PSS10: Questionnaire = {
  id: "pss10",
  name: "PSS-10",
  fullName: "Perceived Stress Scale 10",
  scale: "Estresse percebido no último mês",
  description:
    "Mede sua percepção subjetiva de estresse — não é diagnóstico, é o quanto você sentiu que sua vida estava fora de controle.",
  estimatedMinutes: 4,
  attribution:
    "Adaptado de Cohen S, Kamarck T, Mermelstein R (1983). Perceived Stress Scale.",
  preamble:
    "No último mês, com que frequência você se sentiu da seguinte forma? Seja honesto — não tem resposta certa.",
  questions: [
    {
      id: "q1",
      text: "Você ficou chateado por algo que aconteceu inesperadamente?",
      options: PSS_OPTIONS,
    },
    {
      id: "q2",
      text: "Você sentiu que não conseguia controlar as coisas importantes da sua vida?",
      options: PSS_OPTIONS,
    },
    {
      id: "q3",
      text: "Você se sentiu nervoso e estressado?",
      options: PSS_OPTIONS,
    },
    {
      id: "q4",
      text: "Você se sentiu confiante em sua capacidade de lidar com seus problemas pessoais?",
      options: PSS_OPTIONS,
    },
    {
      id: "q5",
      text: "Você sentiu que as coisas estavam indo do seu jeito?",
      options: PSS_OPTIONS,
    },
    {
      id: "q6",
      text: "Você percebeu que não conseguia dar conta de tudo que tinha pra fazer?",
      options: PSS_OPTIONS,
    },
    {
      id: "q7",
      text: "Você conseguiu controlar as irritações da sua vida?",
      options: PSS_OPTIONS,
    },
    {
      id: "q8",
      text: "Você sentiu que estava por cima das coisas?",
      options: PSS_OPTIONS,
    },
    {
      id: "q9",
      text: "Você ficou bravo por causa de coisas que estavam fora do seu controle?",
      options: PSS_OPTIONS,
    },
    {
      id: "q10",
      text: "Você sentiu que as dificuldades estavam se acumulando a ponto de você não conseguir superá-las?",
      options: PSS_OPTIONS,
    },
  ],
  score(answers) {
    // Itens 4, 5, 7, 8 são reversos: 0->4, 1->3, 2->2, 3->1, 4->0
    const REVERSED = new Set(["q4", "q5", "q7", "q8"]);
    let total = 0;
    for (const q of PSS10.questions) {
      const raw = answers[q.id] ?? 0;
      total += REVERSED.has(q.id) ? 4 - raw : raw;
    }
    return total;
  },
  interpretation: [
    {
      min: 0,
      max: 13,
      label: "Estresse baixo",
      severity: "ok",
      guidance:
        "Carga de estresse compatível com vida saudável. Mantenha respiração diafragmática e desconexão à noite.",
    },
    {
      min: 14,
      max: 26,
      label: "Estresse moderado",
      severity: "moderate",
      guidance:
        "Recomendamos conversar com a equipe Longevify pra estruturar gestão de carga e práticas de recuperação.",
    },
    {
      min: 27,
      max: 40,
      label: "Estresse alto",
      severity: "high",
      guidance:
        "Procure a equipe Longevify essa semana — estresse crônico nesse nível eleva inflamação e risco cardiovascular.",
    },
  ],
  recommendThreshold: 14,
};

export const QUESTIONNAIRES: Questionnaire[] = [PHQ9, GAD7, PSQI, PSS10];

export function getQuestionnaire(id: string): Questionnaire | undefined {
  return QUESTIONNAIRES.find((q) => q.id === id);
}

export function getInterpretation(
  q: Questionnaire,
  score: number,
): InterpretationBand {
  return (
    q.interpretation.find((b) => score >= b.min && score <= b.max) ??
    q.interpretation[q.interpretation.length - 1]
  );
}

/**
 * Avalia itens críticos do questionário contra as respostas. Retorna a
 * lista de critical items disparados (zero, um ou mais).
 *
 * UI consumer DEVE chamar antes de exibir o resultado normal. Se a lista
 * não estiver vazia, mostrar bloco de escalação prioritária ANTES do
 * `interpretation` band — com CVV 188 / SAMU 192 / pronto-socorro
 * psiquiátrico, e reforço de que IA não substitui profissional humano.
 *
 * Exemplo PHQ-9: se `answers.q9 >= 1`, retorna critical item de ideação
 * suicida.
 */
export function getCriticalHits(
  q: Questionnaire,
  answers: Record<string, number>,
): CriticalItem[] {
  if (!q.criticalItems || q.criticalItems.length === 0) return [];
  return q.criticalItems.filter(
    (ci) => (answers[ci.questionId] ?? 0) >= ci.thresholdValue,
  );
}
