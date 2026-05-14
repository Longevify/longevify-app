/**
 * Insights por órgão pros popups expandidos de Score e BioAge.
 *
 * Cada órgão tem:
 *   - summary: "como está agora" (1-2 frases, contextual ao valor)
 *   - howToImprove: 3-4 ações concretas (estilo prescrição médica)
 *   - history: 6 pontos de evolução temporal (mock determinístico)
 *
 * Texto inspirado em médico longevidade — fala de causa fisiológica
 * e intervenção concreta, NÃO genéricos "coma bem e durma".
 */

export interface OrganInsight {
  summary: string;
  howToImprove: string[];
  history: { date: string; value: number }[];
}

// ─── Anchors temporais (determinísticos pra evitar hydration mismatch) ──────
const HISTORY_ANCHORS_MONTHS_AGO = [10, 8, 6, 4, 2, 0];

function generateHistory(currentValue: number, type: "score" | "age"): { date: string; value: number }[] {
  // Histórico converge pro valor atual partindo de "pior" há 10 meses
  // (para score: começou menor; para age: começou maior — pior)
  const direction = type === "score" ? -1 : 1;
  const totalDelta = Math.abs(currentValue * 0.08); // 8% de delta total
  const points: { date: string; value: number }[] = [];

  for (let i = 0; i < HISTORY_ANCHORS_MONTHS_AGO.length; i++) {
    const monthsAgo = HISTORY_ANCHORS_MONTHS_AGO[i];
    const progress = 1 - monthsAgo / 10; // 0 → 1 (ago → now)
    // Noise determinístico pseudo-aleatório
    const noise = Math.sin(i * 2.3) * (currentValue * 0.015);
    const value = +(
      currentValue +
      direction * totalDelta * (1 - progress) +
      noise
    ).toFixed(type === "score" ? 0 : 1);

    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    date.setDate(15);
    points.push({ date: date.toISOString(), value });
  }
  return points;
}

// ─── Insights por órgão (BioAge) ────────────────────────────────────────────

interface OrganTemplate {
  /** Como está (template, recebe value pra substituir) */
  goodSummary: (value: number, chronological?: number) => string;
  badSummary: (value: number, chronological?: number) => string;
  howToImprove: string[];
}

const BIOAGE_TEMPLATES: Record<string, OrganTemplate> = {
  Coração: {
    goodSummary: (v, chrono) =>
      `Seu coração está envelhecendo de forma ${chrono && v < chrono ? "mais lenta" : "saudável"}. Marcadores como LDL e ApoB estão controlados, indicando boa proteção arterial.`,
    badSummary: (v, chrono) =>
      `Seu coração está em ${v} anos${chrono ? ` (cronológica ${chrono})` : ""}. Marcadores lipídicos elevados aceleram o envelhecimento arterial.`,
    howToImprove: [
      "Ômega 3 (EPA/DHA 1.000mg) com almoço — reduz triglicerídeos e LDL aterogênico",
      "150 min/semana de exercício aeróbico em Zona 2",
      "Reduzir gordura saturada (carne vermelha, manteiga) pra <10% das calorias",
      "30g de fibra solúvel/dia (aveia, feijão) — captura colesterol no intestino",
    ],
  },
  Pulmões: {
    goodSummary: (v) =>
      `Seus pulmões estão em ${v} anos — função respiratória excelente. VO2 max preservado é um dos preditores mais fortes de longevidade.`,
    badSummary: (v) =>
      `Pulmões em ${v} anos. PCR elevada sugere inflamação sistêmica que afeta capacidade respiratória.`,
    howToImprove: [
      "30 min de Zona 2 (caminhada rápida, bike leve) — melhora capacidade aeróbica",
      "1 sessão de HIIT/semana — eleva VO2 max em 8-12 semanas",
      "Ômega 3 — reduz PCR e inflamação respiratória",
      "Evitar fumaça (própria ou passiva) e poluição urbana intensa",
    ],
  },
  Fígado: {
    goodSummary: (v) =>
      `Fígado em ${v} anos. ALT e enzimas hepáticas controladas — ótima função de detoxificação.`,
    badSummary: (v) =>
      `Fígado em ${v} anos. ALT/AST elevadas podem indicar esteatose hepática inicial ou sobrecarga metabólica.`,
    howToImprove: [
      "Reduzir frutose adicionada (refrigerante, sucos industriais) pra <25g/dia",
      "Suplementar Vitamina D (rim sintetiza pela 1α-hidroxilase mas fígado armazena)",
      "Café com cafeína (3-4 xícaras/dia) — protetor hepático bem documentado",
      "Treino de força 2x/semana — músculo metaboliza glicose e poupa fígado",
    ],
  },
  Pâncreas: {
    goodSummary: (v) =>
      `Pâncreas em ${v} anos. HbA1c e glicemia em jejum estáveis — sensibilidade à insulina preservada.`,
    badSummary: (v) =>
      `Pâncreas em ${v} anos. HbA1c borderline sugere resistência inicial à insulina; janela de oportunidade pra reverter.`,
    howToImprove: [
      "Magnésio Quelato 200mg antes de dormir — melhora sensibilidade à insulina",
      "Andar 10-15 min após refeições — reduz pico glicêmico em até 30%",
      "Treino de força — músculo é o maior reservatório de glicose",
      "Reduzir carboidrato refinado e ultraprocessado",
    ],
  },
  Rins: {
    goodSummary: (v) =>
      `Rins em ${v} anos. Creatinina e ureia normais — função renal preservada.`,
    badSummary: (v) =>
      `Rins em ${v} anos. Atenção ao volume de proteína animal e pressão arterial — os rins são sensíveis ao longo prazo.`,
    howToImprove: [
      "Hidratação consistente — 2L/dia (urina deve estar amarelo-claro)",
      "Vitamina D — rim ativa via 1α-hidroxilase; sua reposição beneficia ambos",
      "Monitorar pressão arterial — manter <120/80 protege néfrons",
      "Limitar AINEs (ibuprofeno) — sobrecarga renal crônica",
    ],
  },
  Intestino: {
    goodSummary: (v) =>
      `Intestino em ${v} anos. PCR baixa e microbioma provavelmente diverso — ótimo sinal de saúde digestiva.`,
    badSummary: (v) =>
      `Intestino em ${v} anos. Inflamação intestinal pode estar afetando absorção de Vit D, B12 e ferro.`,
    howToImprove: [
      "30g de fibra/dia (vegetais, legumes, frutas) — combustível pro microbioma",
      "Fermentados diariamente (kefir, kombucha, iogurte natural)",
      "Evitar ultraprocessados — emulsificantes danificam mucosa intestinal",
      "Caminhada após refeições — acelera trânsito intestinal",
    ],
  },
  Cérebro: {
    goodSummary: (v) =>
      `Cérebro em ${v} anos. Hormônios (TSH, testosterona) regulados — eixo neuroendócrino funcionando bem.`,
    badSummary: (v) =>
      `Cérebro em ${v} anos. Hormônios desbalanceados (TSH ou testosterona) afetam neurotransmissão e cognição.`,
    howToImprove: [
      "Sono de qualidade 7-9h — pico de GH e testosterona é noturno",
      "Treino de força — eleva testosterona e BDNF (fator neurotrófico)",
      "Zinco Quelato 25mg após almoço — cofator essencial da testosterona",
      "10 min de sol matinal — sincroniza ritmo circadiano e cortisol",
    ],
  },
};

// ─── Score templates (similar mas adapta linguagem 0-100) ───────────────────

const SCORE_TEMPLATES: Record<string, OrganTemplate> = {
  Coração: {
    goodSummary: (v) =>
      `Coração com score ${v}/100 — biomarcadores cardiovasculares controlados. Mantém o protocolo atual.`,
    badSummary: (v) =>
      `Coração com score ${v}/100. LDL/ApoB elevados puxam o score pra baixo. Intervenção dietética + Ômega 3 podem normalizar em 12 semanas.`,
    howToImprove: [
      "Ômega 3 (EPA/DHA 1.000mg) com almoço — 2 cápsulas/dia",
      "Reduzir gordura saturada (<10% calorias)",
      "150 min/semana de Zona 2",
      "30g de fibra/dia",
    ],
  },
  Pulmões: {
    goodSummary: (v) =>
      `Pulmões com score ${v}/100 — capacidade respiratória ótima. PCR baixa indica pouca inflamação sistêmica.`,
    badSummary: (v) =>
      `Pulmões com score ${v}/100. PCR elevada arrasta o score. Anti-inflamatórios naturais + exercício aeróbico ajudam.`,
    howToImprove: [
      "Ômega 3 — reduz PCR",
      "30 min de Zona 2/dia",
      "1 sessão HIIT/semana pra elevar VO2 max",
      "Evitar fumaça e poluição",
    ],
  },
  Fígado: {
    goodSummary: (v) =>
      `Fígado com score ${v}/100. ALT controlada, detoxificação funcionando bem.`,
    badSummary: (v) =>
      `Fígado com score ${v}/100. ALT/AST elevadas; risco de esteatose. Restringir álcool e frutose é prioridade.`,
    howToImprove: [
      "Limitar frutose adicionada <25g/dia",
      "Reduzir álcool",
      "Café 3-4 xícaras/dia (hepatoprotetor)",
      "Treino de força 2x/semana",
    ],
  },
  Pâncreas: {
    goodSummary: (v) =>
      `Pâncreas com score ${v}/100. HbA1c estável, função glicêmica preservada.`,
    badSummary: (v) =>
      `Pâncreas com score ${v}/100. HbA1c borderline indica resistência inicial à insulina. Magnésio + caminhada pós-refeição revertem em 8-12 semanas.`,
    howToImprove: [
      "Magnésio Quelato 200mg antes de dormir",
      "Andar 10-15 min após cada refeição",
      "Reduzir carboidrato refinado",
      "Treino de força — músculo capta glicose",
    ],
  },
  Rins: {
    goodSummary: (v) =>
      `Rins com score ${v}/100. Marcadores renais normais; filtração preservada.`,
    badSummary: (v) =>
      `Rins com score ${v}/100. Atenção à hidratação, pressão e proteína na dieta.`,
    howToImprove: [
      "2L de água/dia",
      "Vitamina D 2.000 UI/dia (rim ativa)",
      "Monitorar pressão <120/80",
      "Limitar AINEs crônicos",
    ],
  },
  Intestino: {
    goodSummary: (v) =>
      `Intestino com score ${v}/100. PCR baixa, microbioma provavelmente saudável.`,
    badSummary: (v) =>
      `Intestino com score ${v}/100. Inflamação intestinal pode estar afetando absorção de nutrientes.`,
    howToImprove: [
      "30g de fibra/dia",
      "Fermentados diariamente (kefir, kombucha)",
      "Evitar ultraprocessados com emulsificantes",
      "Hidratação adequada",
    ],
  },
  Cérebro: {
    goodSummary: (v) =>
      `Cérebro com score ${v}/100. Eixo hormonal regulado (TSH, testosterona, cortisol).`,
    badSummary: (v) =>
      `Cérebro com score ${v}/100. Desbalanço hormonal — TSH ou testosterona — afeta cognição e energia.`,
    howToImprove: [
      "Sono 7-9h consistentes",
      "Treino de força (eleva testosterona)",
      "Zinco 25mg pós-almoço",
      "10 min de sol matinal (cortisol/melatonina)",
    ],
  },
};

// ─── API pública ────────────────────────────────────────────────────────────

/**
 * Retorna insight pro popup expandido de Idade Biológica por órgão.
 */
export function getBioAgeInsight(
  organName: string,
  age: number,
  status: "optimal" | "normal" | "out",
  chronologicalAge?: number,
): OrganInsight {
  const tpl = BIOAGE_TEMPLATES[organName];
  const isGood = status === "optimal";
  const summary = tpl
    ? isGood
      ? tpl.goodSummary(age, chronologicalAge)
      : tpl.badSummary(age, chronologicalAge)
    : `Idade biológica de ${organName.toLowerCase()}: ${age} anos.`;

  return {
    summary,
    howToImprove: tpl ? tpl.howToImprove : [],
    history: generateHistory(age, "age"),
  };
}

/**
 * Retorna insight pro popup expandido de Longevify Score por órgão.
 */
export function getScoreInsight(
  organName: string,
  score: number,
  status: "optimal" | "normal" | "out",
): OrganInsight {
  const tpl = SCORE_TEMPLATES[organName];
  const isGood = status === "optimal";
  const summary = tpl
    ? isGood
      ? tpl.goodSummary(score)
      : tpl.badSummary(score)
    : `Score de ${organName.toLowerCase()}: ${score}/100.`;

  return {
    summary,
    howToImprove: tpl ? tpl.howToImprove : [],
    history: generateHistory(score, "score"),
  };
}
