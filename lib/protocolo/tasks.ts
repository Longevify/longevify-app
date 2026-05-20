/**
 * Gerador de tasks educacionais derivadas dos biomarcadores do paciente.
 *
 * NATUREZA JURÍDICA E CLÍNICA (revisão clínica 2026-05-17):
 * Estas tasks são SUGESTÕES EDUCACIONAIS DE CURADORIA, baseadas em
 * diretrizes nutricionais e clínicas amplamente aceitas (SBC, SBD,
 * SBEM, Endocrine Society, AHA/ACC, etc.). NÃO constituem prescrição
 * médica nos termos da Lei 12.842/2013 (Ato Médico) nem da Resolução
 * CFM 2.337/2023. A Longevify não é clínica e não pratica medicina —
 * decisões de tratamento (começar, mudar dose, combinar com medicação
 * contínua, suspender) cabem ao médico assistente do paciente ou ao
 * médico parceiro credenciado em teleorientação (CFM 2.314/2022).
 *
 * Mapeamento biomarcador → categoria de suplemento sugerida (apoiado
 * em diretrizes; não é prescrição individualizada):
 *
 *   Biomarcador       Cenário                 Categoria sugerida
 *   ───────────────   ─────────────────────   ─────────────────────
 *   Vit D 25(OH)D <30 deficiência            Vitamina D3 (titrar por nível sérico)
 *   LDL/ApoB altos    perfil aterogênico      Ômega-3 EPA/DHA (efeito modesto isolado)
 *   PCR >1.0          inflamação subclínica   Padrão alimentar mediterrâneo + Ômega-3
 *   HbA1c >5.4        pré-DM/glicação         Magnésio (adjuvante a hábitos), atividade
 *   Testosterona ↓    hipogonadismo suspeito  Avaliação endócrina; Zn/D se deficientes
 *   Ferritina baixa   reservas de ferro       Investigar causa antes de suplementar
 *
 * Cada task vem com dose comum e link pro produto. O paciente é
 * orientado em UI a confirmar com médico em uso contínuo, condição
 * crônica, gestação/lactação ou medicação concomitante.
 */

import type { Biomarker } from "@/lib/mock-data";
import { getProductById, type Product } from "@/lib/products";

export interface ProtocolTask {
  id: string;
  /** Frase orientativa em linguagem direta — sugestão educacional, não prescrição médica. */
  label: string;
  /** Por que esse suplemento? Referência ao biomarcador. */
  reasoning?: string;
  /** Produto vinculado (suplemento). Se ausente = task lifestyle (sol/sono/etc). */
  product?: Product;
  /** Query da loja pra pré-filtrar — sempre o name do produto. */
  shopQuery?: string;
  /** Icone (lucide) pra tasks lifestyle. Texto literal pra desacoplar de jsx. */
  lifestyleIcon?: "sun" | "moon" | "droplet" | "activity";
}

export interface WorkingOnGoal {
  id: string;
  title: string;
  description: string;
  /** Severidade pra colorir o card visualmente. */
  severity: "high" | "medium" | "low";
}

// ─── Mapping biomarker → suplemento + posologia ──────────────────────────────

interface BiomarkerProtocolEntry {
  productId: string;
  /** Posologia exata pra task imperativa. */
  posology: string;
  /** Frase pra "no que estamos trabalhando" (goal terapêutico). */
  goalTitle: string;
  goalDescriptionTemplate: (b: Biomarker) => string;
}

const BIOMARKER_PROTOCOL: Record<string, BiomarkerProtocolEntry> = {
  vitd: {
    productId: "vitamina-d",
    posology:
      "Sugestão: 1 cápsula de Vitamina D3 2.000 UI/dia com refeição contendo gordura. Em deficiência grave (<20 ng/mL) doses maiores podem ser necessárias — confirme com seu médico após checar 25(OH)D sérica.",
    goalTitle: "Atingir faixa-alvo de 25(OH)D (40–60 ng/mL)",
    goalDescriptionTemplate: (b) =>
      `Você está em ${b.value} ${b.unit}. Suplementação diária + exposição solar moderada costuma elevar 5–10 ng/mL em 8 a 12 semanas. Reavalie o nível antes de ajustar a dose.`,
  },
  ldl: {
    productId: "omega-3",
    posology:
      "Sugestão alimentar: reduzir gordura saturada (carnes gordas, manteiga, óleo de coco), aumentar fibra solúvel (aveia, feijão, psyllium 5–10g) — esses são os fatores que mais reduzem LDL. Ômega-3 (EPA/DHA 2g/dia, 2 cápsulas com almoço) reduz TG e ApoB, mas tem efeito modesto sobre LDL.",
    goalTitle: "Reduzir LDL conforme seu risco cardiovascular",
    goalDescriptionTemplate: (b) =>
      `Seu LDL está em ${b.value} ${b.unit}. A meta varia por risco individual (SBC/AHA: <100 baixo risco, <70 alto risco). Redução de gordura saturada + fibra solúvel + exercício é a base; estatina pode ser indicada por seu médico se o risco for elevado.`,
  },
  apob: {
    productId: "omega-3",
    posology:
      "Sugestão: Ômega-3 EPA/DHA 2g/dia (2 cápsulas com almoço) — reduz partículas VLDL/IDL e tem efeito modesto sobre ApoB. Para reduções maiores de ApoB, mudanças alimentares (menos gordura saturada, mais fibra) + atividade física são essenciais.",
    goalTitle: "Otimizar ApoB (carga aterogênica)",
    goalDescriptionTemplate: (b) =>
      `Sua ApoB está em ${b.value} ${b.unit}. ApoB é o melhor preditor cardiovascular moderno. Alvo varia por risco — discuta com seu médico se o seu perfil exige meta mais agressiva (estatina/ezetimiba podem ser indicadas).`,
  },
  crp: {
    productId: "omega-3",
    posology:
      "Sugestão: padrão alimentar mediterrâneo (azeite, vegetais, peixes 2-3x/semana, oleaginosas, legumes) + Ômega-3 EPA/DHA 2g/dia (2 cápsulas com almoço) + sono regular. PCR persistentemente alta sem causa óbvia merece investigação médica.",
    goalTitle: "Reduzir PCR (inflamação sistêmica de baixo grau)",
    goalDescriptionTemplate: (b) =>
      `Seu PCR está em ${b.value} ${b.unit}. Ômega-3 e dieta anti-inflamatória reduzem PCR de forma modesta — magnitude maior vem de redução de gordura visceral, qualidade de sono e tratamento de fontes inflamatórias subjacentes (doença periodontal, etc.).`,
  },
  hba1c: {
    productId: "magnesio-quelato",
    posology:
      "Sugestão: 1 cápsula de Magnésio Quelato 200mg/dia (frequentemente recomendado antes de dormir pelo efeito sobre o sono) — adjuvante para sensibilidade à insulina. Maior alavanca: redução de açúcar refinado, perda de gordura visceral, exercício e sono adequado.",
    goalTitle: "Estabilizar HbA1c em faixa não-pré-diabética",
    goalDescriptionTemplate: (b) =>
      `Sua HbA1c está em ${b.value}${b.unit}. Magnésio é adjuvante modesto. As intervenções com maior impacto são: zero bebida açucarada, caminhada de 10-15 min após cada refeição, treino de força 2-3x/semana, e perda de gordura visceral.`,
  },
  testo: {
    productId: "zinco",
    posology:
      "Sugestão: 1 cápsula de Zinco Quelato 25mg/dia (especialmente útil se ingesta dietética baixa). Testosterona baixa persistente merece avaliação com endócrino — investigar SHBG, LH, prolactina, sono, peso, álcool.",
    goalTitle: "Otimizar testosterona — buscar causas modificáveis",
    goalDescriptionTemplate: (b) =>
      `Sua testosterona está em ${b.value} ${b.unit}. Treino de força composto, sono de 7-9h, controle de peso e álcool moderado são as alavancas modificáveis principais. Zinco e vitamina D só fazem diferença se houver deficiência. Reposição hormonal é decisão médica com avaliação completa.`,
  },
  ferritin: {
    productId: "", // sem produto direto — task vira ação one-time daily-completable
    posology:
      "Não suplementar ferro sem antes investigar a causa da queda (perda, absorção, dieta). Mensagem ao Concierge ou consulta com médico parceiro pra orientação.",
    goalTitle: "Investigar e tratar causa de ferritina baixa",
    goalDescriptionTemplate: (b) =>
      `Sua ferritina está em ${b.value} ${b.unit}. Ferro oral mal dosado pode causar sobrecarga; a investigação da causa (menstruação abundante, sangramento digestivo oculto, má absorção, dieta vegana sem reposição) deve preceder a reposição. Avaliação médica necessária.`,
  },
  hdl: {
    productId: "", // sem suplemento — task DIÁRIA (não semanal!) de exercício
    posology:
      "Sugestão: 30 min de caminhada/corrida leve em Zona 2 hoje (ritmo conversável, FC ~60-70% da máx).",
    goalTitle: "Elevar HDL com exercício consistente (não com suplemento)",
    goalDescriptionTemplate: (b) =>
      `Seu HDL em ${b.value} ${b.unit} é melhor modulado por exercício aeróbico (150-300 min/semana de Zona 2) e composição corporal — suplemento isolado tem efeito muito modesto. Importante: HDL baixo é marcador de risco, mas elevá-lo farmacologicamente NÃO reduziu eventos em estudos (niacina, CETPi).`,
  },

  // ─── Glicemia ──────────────────────────────────────────────────────
  glucose: {
    productId: "",
    posology:
      "Sugestão: caminhada de 10-15 minutos APÓS cada refeição hoje. Reduz pico glicêmico pós-prandial significativamente (estudos: até -30% AUC glicose).",
    goalTitle: "Reduzir glicemia de jejum pra <90 mg/dL",
    goalDescriptionTemplate: (b) =>
      `Sua glicose em jejum está em ${b.value} ${b.unit}. Acima de 100 = pré-diabetes; >126 = diabetes. Alavancas: reduzir açúcar refinado, caminhar após comer, treino de força 2-3x/semana, perda de gordura visceral.`,
  },
  insulin_fasting: {
    productId: "",
    posology:
      "Sugestão: priorizar 7-9h de sono hoje + treino de força ou Zona 2 30 min. Sono fragmentado eleva resistência à insulina em poucos dias.",
    goalTitle: "Reduzir insulina de jejum (<6 µUI/mL) e melhorar sensibilidade",
    goalDescriptionTemplate: (b) =>
      `Sua insulina em jejum em ${b.value} ${b.unit} sugere resistência à insulina. Foco: déficit calórico se sobrepeso, exercício resistido, redução de carbs refinados, sono. Magnésio e berberina são adjuvantes secundários.`,
  },
  homa_ir: {
    productId: "magnesio-quelato",
    posology:
      "Sugestão: 1 cápsula de Magnésio 200mg antes de dormir (melhora sensibilidade à insulina via canais GLUT4). Combine com hábitos alimentares e movimento.",
    goalTitle: "HOMA-IR abaixo de 1.9 (sensibilidade à insulina preservada)",
    goalDescriptionTemplate: (b) =>
      `Seu HOMA-IR em ${b.value} indica resistência à insulina. Magnésio é adjuvante; alavancas principais: exercício resistido, perda de gordura visceral, redução de açúcar refinado, sono adequado.`,
  },
  triglycerides: {
    productId: "omega-3",
    posology:
      "Sugestão: 2g/dia de Ômega-3 EPA/DHA (2 cápsulas com almoço). Mais eficaz pra TG que pra LDL. Combine com redução de carbs refinados e álcool — ambos elevam TG dramaticamente.",
    goalTitle: "Triglicérides em faixa ótima (<100 mg/dL)",
    goalDescriptionTemplate: (b) =>
      `Seus TG em ${b.value} ${b.unit}. Triglicérides reflete sobretudo dieta recente: carbs refinados, álcool, frutose líquida. Reduzir bebida açucarada e álcool 7 dias já cai 30-40%.`,
  },

  // ─── Vitaminas / Minerais ─────────────────────────────────────────
  vitb12: {
    productId: "",
    posology:
      "Sugestão: avalie ingesta dietética (carne, ovo, peixe, laticínios). Se vegetariano/vegano ou >50 anos, suplementar é razoável (1.000 µg cianocobalamina sublingual/semana). Confirme com médico se persistir baixo.",
    goalTitle: "Vitamina B12 acima de 500 pg/mL (faixa cognitiva ideal)",
    goalDescriptionTemplate: (b) =>
      `Sua B12 está em ${b.value} ${b.unit}. Faixa "normal" (200+) não é ótima — abaixo de 500 pode causar fadiga, parestesia e prejudicar cognição. Carne/ovo/peixe são fontes principais; vegetarianos quase sempre precisam suplementar.`,
  },
  folate: {
    productId: "",
    posology:
      "Sugestão: aumentar verduras de folhas escuras (couve, espinafre, rúcula — 2-3 porções/dia), feijão, lentilha. Suplementação só se persistir baixo após ajuste alimentar.",
    goalTitle: "Folato (B9) ≥5 ng/mL com fontes alimentares",
    goalDescriptionTemplate: (b) =>
      `Seu folato em ${b.value} ${b.unit}. Importante pra metilação do DNA e formação de neurotransmissores. Folato baixo + B12 baixo eleva homocisteína (fator de risco cardiovascular e cognitivo).`,
  },
  iron_serum: {
    productId: "",
    posology:
      "NÃO suplementar ferro sem investigar causa (perda menstrual abundante, sangramento digestivo, má absorção, dieta). Ferro indevidamente suplementado causa sobrecarga e dano oxidativo.",
    goalTitle: "Ferro sérico adequado SEM sobrecarga",
    goalDescriptionTemplate: (b) =>
      `Seu ferro sérico em ${b.value} ${b.unit}. Avaliar SEMPRE com ferritina + saturação de transferrina antes de qualquer ação. Causa precede tratamento — converse com médico.`,
  },
  magnesium: {
    productId: "magnesio-quelato",
    posology:
      "Sugestão: 1 cápsula de Magnésio Quelato 200mg antes de dormir. Maioria dos brasileiros está abaixo da RDA (320-420 mg/dia). Glicinato/treonato são as melhores formas pra sono e cognição.",
    goalTitle: "Atingir RDA de magnésio (~400 mg/dia)",
    goalDescriptionTemplate: (b) =>
      `Seu magnésio em ${b.value} ${b.unit}. Cofator de 300+ enzimas (ATP, sono, função muscular, sensibilidade à insulina). Deficiência é prevalente e silenciosa. Castanhas, cacau 70%+, folhas verdes ajudam, mas suplementação costuma ser necessária.`,
  },
  zinc: {
    productId: "zinco",
    posology:
      "Sugestão: 1 cápsula de Zinco Quelato 25mg/dia com refeição (longe de café). Mantenha por 4-8 semanas e reavalie.",
    goalTitle: "Zinco adequado (imunidade, testo, cicatrização)",
    goalDescriptionTemplate: (b) =>
      `Seu zinco em ${b.value} ${b.unit}. Crítico pra imunidade, testosterona, cicatrização, paladar. Deficiência é comum em vegetarianos. Carne vermelha, ostra, sementes de abóbora são fontes top.`,
  },

  // ─── Cardiovascular ───────────────────────────────────────────────
  homocysteine: {
    productId: "",
    posology:
      "Sugestão: combinação de B12 + B9 (folato) + B6 + betaína via dieta (ovo, fígado, vegetais verdes). Suplementação de complexo B só se persistir alto após ajuste alimentar — testar primeiro B12 e folato isoladamente.",
    goalTitle: "Homocisteína abaixo de 9 µmol/L",
    goalDescriptionTemplate: (b) =>
      `Sua homocisteína em ${b.value} ${b.unit}. Alta acelera dano vascular e cognitivo. Quase sempre reflete deficiência funcional de B12, B9 ou B6 (mesmo com nível sérico "normal"). Tratar a causa, não o efeito.`,
  },

  // ─── Tireoide ─────────────────────────────────────────────────────
  tsh: {
    productId: "",
    posology:
      "TSH alterado merece avaliação completa: T4 livre, T3 livre, anti-TPO, anti-Tg. Hipotireoidismo subclínico (TSH 4.5-10 com T4 normal) é controverso — não suplementar T4 sem critério médico.",
    goalTitle: "TSH em faixa ótima (0.5-2.5 µUI/mL para longevidade)",
    goalDescriptionTemplate: (b) =>
      `Seu TSH em ${b.value} ${b.unit}. A literatura de longevidade mira 0.5-2.5; valores acima sugerem hipotireoidismo (sub)clínico. Avaliar com perfil completo + anti-TPO antes de qualquer intervenção.`,
  },
};

// ─── Tasks lifestyle universais (independem de biomarker) ───────────────────

// Tarefas lifestyle DIÁRIAS — todas concluíveis em 1 dia, sem prescrições
// semanais/cumulativas. Lucas (2026-05): "tem que ter apenas tasks que
// possam ser completadas em 1 dia, não pode ter 150 min de cardio/semana".
const LIFESTYLE_TASKS: ProtocolTask[] = [
  {
    id: "sol-manha",
    // Exposição solar moderada: 10-15 min na pele clara, 20-30 min em pele
    // mais escura (Fitzpatrick V/VI), de braços/pernas. Antes das 10h o UV
    // é menor — risco de queimadura/dano menor. Em alto risco de melanoma
    // (histórico familiar, fototipo I, lesões suspeitas) consultar
    // dermatologista antes.
    label: "Pegar 10-15 min de sol matinal hoje (antes das 10h), em braços/pernas — ajuste se você tem pele mais escura ou alto risco de melanoma.",
    lifestyleIcon: "sun",
  },
  {
    id: "agua",
    // 2L/dia é orientação genérica. Necessidade real varia por peso, clima,
    // exercício, dieta (frutas/vegetais já contêm bastante água).
    label: "Manter-se bem hidratado(a) ao longo do dia — para a maioria dos adultos, ~2L de líquidos (água + bebidas + alimentos com água) é uma boa referência.",
    lifestyleIcon: "droplet",
  },
  {
    id: "sono",
    label: "Dormir entre 7h e 9h hoje, priorizando horário consistente (NSF/AASM recomendam ≥7h em adultos).",
    lifestyleIcon: "moon",
  },
];

// ─── Gera tasks priorizando biomarcadores que precisam de atenção ───────────

/**
 * Retorna lista de tasks pro protocolo derivadas dos biomarcadores reais.
 *
 * Ordem:
 *   1. Tasks de suplemento por biomarcador (status "out" priorizado, depois "normal" borderline)
 *   2. Deduplicado por productId — Ômega 3 aparece só 1x mesmo que LDL+CRP+ApoB todos requisitem
 *   3. Tasks lifestyle no final
 */
export function generateProtocolTasks(biomarkers: Biomarker[]): ProtocolTask[] {
  // Biomarcadores que pedem intervenção (não-optimal)
  const relevant = biomarkers
    .filter((b) => b.status === "out" || b.status === "normal")
    .sort((a, b) => {
      // out vem antes de normal
      if (a.status === "out" && b.status !== "out") return -1;
      if (b.status === "out" && a.status !== "out") return 1;
      return 0;
    });

  const tasks: ProtocolTask[] = [];
  const seenProducts = new Set<string>();

  for (const biomarker of relevant) {
    const entry = BIOMARKER_PROTOCOL[biomarker.id];
    if (!entry) continue;

    // Dedup por produto
    if (entry.productId && seenProducts.has(entry.productId)) continue;

    const product = entry.productId ? getProductById(entry.productId) : undefined;

    tasks.push({
      id: `bio-${biomarker.id}`,
      label: entry.posology,
      reasoning: `${biomarker.name} ${biomarker.value} ${biomarker.unit} (faixa ${biomarker.referenceLabel}).`,
      product,
      shopQuery: product?.name,
    });

    if (entry.productId) seenProducts.add(entry.productId);
  }

  // Lifestyle tasks no final
  tasks.push(...LIFESTYLE_TASKS);

  return tasks;
}

// ─── "No que estamos trabalhando" — objetivos terapêuticos ──────────────────

/**
 * Gera lista de goals (problemas que estamos atacando) a partir dos
 * biomarcadores fora/normais.
 */
export function generateWorkingOnGoals(
  biomarkers: Biomarker[],
): WorkingOnGoal[] {
  const relevant = biomarkers
    .filter((b) => b.status === "out" || b.status === "normal")
    .sort((a, b) => {
      if (a.status === "out" && b.status !== "out") return -1;
      if (b.status === "out" && a.status !== "out") return 1;
      return 0;
    });

  const goals: WorkingOnGoal[] = [];

  for (const biomarker of relevant) {
    const entry = BIOMARKER_PROTOCOL[biomarker.id];
    if (!entry) continue;

    goals.push({
      id: `goal-${biomarker.id}`,
      title: entry.goalTitle,
      description: entry.goalDescriptionTemplate(biomarker),
      severity: biomarker.status === "out" ? "high" : "medium",
    });
  }

  // Sempre mostrar pelo menos 1 goal lifestyle universal (severidade baixa)
  if (goals.length === 0) {
    goals.push({
      id: "goal-zone2",
      title: "Construir base aeróbica em Zona 2",
      description:
        "150 min/semana de zona 2 (caminhada rápida, bike leve) é o investimento mais robusto pra longevidade cardiovascular.",
      severity: "low",
    });
  }

  return goals;
}
