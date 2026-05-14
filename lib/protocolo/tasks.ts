/**
 * Gerador de tasks de protocolo derivado dos biomarcadores reais do paciente.
 *
 * Premissa (Lucas, 2026-05): o app deve atuar como um médico —
 * deficiência de Vitamina D → recomenda Vitamina D. NÃO recomendar
 * painéis diagnósticos (Básico/Avançado) como intervenção — esses são
 * extras vendidos na loja separadamente.
 *
 * Mapeamento biomarcador → suplemento (consensos clínicos):
 *
 *   Biomarcador       Status normal/out       Suplemento sugerido
 *   ───────────────   ─────────────────────   ─────────────────────
 *   Vitamina D <50    deficiência limítrofe   Vitamina D 2.000 UI
 *   LDL >100          dislipidemia limítrofe  Ômega 3 (EPA/DHA)
 *   ApoB >80          aterogênico             Ômega 3
 *   PCR >1.0          inflamação sistêmica    Ômega 3
 *   HbA1c >5.4        pré-diabético/glicação  Magnésio Quelato
 *   Testosterona <600 baixo p/ homem          Zinco Quelato
 *   Ferritina baixa   reservas de ferro       (sem produto direto)
 *
 * Cada task tem TANTO posologia clara quanto referência ao produto
 * exato da loja — o botão "Comprar X" leva direto pra /loja?q=X
 * (sem precisar abrir modal antes).
 */

import type { Biomarker } from "@/lib/mock-data";
import { getProductById, type Product } from "@/lib/products";

export interface ProtocolTask {
  id: string;
  /** Frase imperativa, estilo prescrição médica. */
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
      "Tomar 1 cápsula de Vitamina D 2.000 UI com o café da manhã (junto com gordura).",
    goalTitle: "Atingir 50+ ng/dL de Vitamina D",
    goalDescriptionTemplate: (b) =>
      `Você está em ${b.value} ${b.unit}. Suplementação diária + 10 min de sol matinal devem te levar à faixa ótima em 8 a 12 semanas.`,
  },
  ldl: {
    productId: "omega-3",
    posology:
      "Tomar 2 cápsulas de Ômega 3 (EPA/DHA 1.000mg) com o almoço.",
    goalTitle: "Reduzir LDL abaixo de 100 mg/dL",
    goalDescriptionTemplate: (b) =>
      `Seu LDL está em ${b.value} ${b.unit}. Ômega 3 + redução de gordura saturada + 30g de fibra/dia normalizam em ~12 semanas.`,
  },
  apob: {
    productId: "omega-3",
    posology:
      "Tomar 2 cápsulas de Ômega 3 (EPA/DHA 1.000mg) com o almoço.",
    goalTitle: "Otimizar ApoB (perfil aterogênico)",
    goalDescriptionTemplate: (b) =>
      `Sua ApoB está em ${b.value} ${b.unit}. Ômega 3 atua diretamente nas partículas aterogênicas.`,
  },
  crp: {
    productId: "omega-3",
    posology:
      "Tomar 2 cápsulas de Ômega 3 (EPA/DHA 1.000mg) com o almoço.",
    goalTitle: "Reduzir PCR (inflamação sistêmica)",
    goalDescriptionTemplate: (b) =>
      `Seu PCR está em ${b.value} ${b.unit}. Ômega 3 + dieta anti-inflamatória + sono de qualidade reduzem inflamação crônica.`,
  },
  hba1c: {
    productId: "magnesio-quelato",
    posology:
      "Tomar 1 cápsula de Magnésio Quelato 200mg antes de dormir.",
    goalTitle: "Manter HbA1c abaixo de 5.4%",
    goalDescriptionTemplate: (b) =>
      `Sua HbA1c está em ${b.value}${b.unit}. Magnésio melhora sensibilidade à insulina; combine com restrição de açúcar simples.`,
  },
  testo: {
    productId: "zinco",
    posology:
      "Tomar 1 cápsula de Zinco Quelato 25mg após o almoço.",
    goalTitle: "Otimizar testosterona total",
    goalDescriptionTemplate: (b) =>
      `Sua testosterona está em ${b.value} ${b.unit}. Zinco é cofator essencial da síntese — combine com treino de força 3x/semana.`,
  },
  ferritin: {
    productId: "", // sem produto direto — placeholder, vira lifestyle/medical
    posology:
      "Consultar médico sobre suplementação de ferro adequada ao seu caso.",
    goalTitle: "Restaurar reservas de ferro",
    goalDescriptionTemplate: (b) =>
      `Sua ferritina está em ${b.value} ${b.unit}. Avaliação médica é necessária — ferro oral mal dosado pode causar saturação. Vamos investigar causas (perda, absorção).`,
  },
  hdl: {
    productId: "", // sem suplemento — lifestyle
    posology:
      "150 min/semana de exercício aeróbico em Zona 2 (caminhada rápida, bike leve).",
    goalTitle: "Aumentar HDL acima de 60 mg/dL",
    goalDescriptionTemplate: (b) =>
      `Seu HDL em ${b.value} ${b.unit} sobe principalmente com exercício aeróbico de baixa intensidade — não com suplemento.`,
  },
};

// ─── Tasks lifestyle universais (independem de biomarker) ───────────────────

const LIFESTYLE_TASKS: ProtocolTask[] = [
  {
    id: "sol-zona2",
    label: "10 min de sol matinal + 30 min de caminhada em Zona 2",
    lifestyleIcon: "sun",
  },
  {
    id: "agua",
    label: "Beber 2L de água ao longo do dia",
    lifestyleIcon: "droplet",
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
    });
  }

  // Sempre mostrar pelo menos 1 goal lifestyle universal
  if (goals.length === 0) {
    goals.push({
      id: "goal-zone2",
      title: "Construir base aeróbica em Zona 2",
      description:
        "150 min/semana de zona 2 (caminhada rápida, bike leve) é o investimento mais robusto pra longevidade cardiovascular.",
    });
  }

  return goals;
}
