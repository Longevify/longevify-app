import { calculateClientPrice } from "@/lib/pricing";

export type ProductCategory =
  | "exame"
  | "suplemento"
  | "natural";

export type ProductBadge =
  | "Mais Vendido"
  | "Melhor Custo"
  | "Top"
  | "Novo"
  | "Exclusivo"
  | "Curadoria";

/**
 * Recorrência sugerida — derivada da posologia e quantidade do frasco.
 * Ex: 60 cápsulas × 1/dia = 60 dias.
 */
export interface ProductRecurrence {
  intervalDays: number;
  label: string; // "todo mês", "a cada 2 meses"
  subscriptionDiscountPct: number;
}

export interface Product {
  id: string;
  name: string;
  /**
   * Marca exibida no card. Pra produtos curados (dropshipping) = nome real
   * do fornecedor (ex: "Dux Nutrition"). Pra produtos próprios = "Longevify".
   */
  brand: string;
  /**
   * Fornecedor oficial — quando presente, indica modelo dropshipping.
   * Ausência implica produto próprio Longevify (exames diagnósticos).
   * Pra reposição: o admin acessa `supplierUrl` e compra um a um.
   */
  supplier?: string;
  /** URL da loja oficial onde a Longevify compra pra repassar. Admin-only. */
  supplierUrl?: string;
  /** Custo no fornecedor oficial. Base do cálculo de preço. Admin-only. */
  costBRL?: number;
  category: ProductCategory;
  badge?: ProductBadge;
  /** Categoria visível em label cinza no card */
  kicker: string;
  /** Preço cobrado do cliente (cost + taxa Stripe) — derivado por calculateClientPrice */
  priceBRL: number;
  currency: "BRL";
  shortDescription: string;
  longDescription: string;
  benefits: string[];
  usage: string;
  packageSize?: string;
  posology?: string;
  recurrence?: ProductRecurrence;
  targetsBiomarkers: string[];
  rating: number;
  reviewsCount: number;
  /** caminho da imagem no /public, ex: /marketplace/vitamina-d.png */
  image?: string;
  /** Duração estimada do frasco em dias (helper de estoque/recompra) */
  durationDays?: number;
  /**
   * `true` quando é produto Longevify Original (marca própria, exames ou
   * suplementos formulados pela equipe). Sempre aparece PRIMEIRO em
   * listas filtradas pra dar destaque visual à marca própria — não
   * concorre com o curado dropshipping da mesma categoria, complementa.
   */
  isLongevifyOriginal?: boolean;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  exame: "Exames",
  suplemento: "Suplementos",
  natural: "Naturais & Cuidados",
};

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/**
 * `true` quando o produto é dropshipping (fornecedor terceiro, sem markup).
 * Página de produto deve mostrar disclaimer "Curadoria médica — sem markup".
 */
export function isDropshippingProduct(product: Product): boolean {
  return product.supplier !== undefined;
}

/**
 * Ordena lista de produtos colocando Longevify Original primeiro.
 * Usado em qualquer renderização filtrada/buscada — produto próprio
 * sempre tem destaque visual sobre o curado dropshipping.
 */
export function sortLongevifyFirst(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const aLvg = a.isLongevifyOriginal ? 1 : 0;
    const bLvg = b.isLongevifyOriginal ? 1 : 0;
    if (aLvg !== bLvg) return bLvg - aLvg;
    return 0;
  });
}

// ──────────────────────────────────────────────────────────────────
// Catálogo
// ──────────────────────────────────────────────────────────────────
//
// MODELO DROPSHIPPING (suplementos + naturais):
//   - Curadoria do médico Longevify (evidência clínica)
//   - Sem markup — preço cobre apenas custo do fornecedor + taxa Stripe
//   - Fora de estoque no fornecedor oficial = fora de estoque aqui
//   - Logística e estoque pertencem ao fornecedor; Longevify intermedia
//
// PRODUTOS PRÓPRIOS (exames diagnósticos):
//   - Painel Básico, Avançado, Microbioma — coleta e análise Longevify
//   - Preço próprio (não dropshipping)
//
// Curadoria 2026-05 (medico-longevify):
//   - Creatina: APENAS Creapure (Alzchem, Alemanha)
//   - Whey: grass fed Essential (matéria-prima Irlanda/NZ rastreável)
//   - Ômega-3: TG reesterificado, IFOS 5★
//   - D3 + K2 MK-7 (não MK-4): meia-vida 72h
//   - Magnésio: formas queladas (bisglicinato/treonato/malato), NÃO óxido
//   - Vit C: lipossomal (absorção ~100% vs ascorbato sódico)
//   - Zinco: bisglicinato 15mg (>40mg crônico depleta cobre)
//   - Colágeno: Verisol (Gelita) — 4 RCTs pele
//   - Probiótico: cepa nomeada (S. boulardii CNCM I-745 shelf-stable)
//   - CoQ10: ubiquinol Kaneka (3x biodisp vs ubiquinona)
//   - Melatonina: dose ANVISA (combo Sleepfor com triptofano+glicina)
//
// Aditivos vetados: TiO2, sucralose/aspartame/ace-K, corantes artificiais,
// estearato Mg em excesso, carragenina, óleos vegetais refinados.

const productSeed = [
  // ──────────────────────────────────────────────────────────────────
  // EXAMES DIAGNÓSTICOS LONGEVIFY (3) — produtos próprios, sem fornecedor
  // ──────────────────────────────────────────────────────────────────
  {
    id: "painel-basico",
    name: "Painel Básico",
    brand: "Longevify",
    category: "exame" as const,
    badge: "Melhor Custo" as const,
    kicker: "Exame Diagnóstico",
    priceBRL: 349,
    image: "/marketplace/painel-basico.png",
    isLongevifyOriginal: true,
    shortDescription:
      "50+ biomarcadores essenciais — o ponto de partida pra entender sua saúde com método.",
    longDescription:
      "Painel completo cobrindo perfil lipídico (colesterol total, HDL, LDL, triglicérides), glicemia e hemoglobina glicada, função renal (creatinina, ureia), função hepática (ALT, AST, GGT), hormônios da tireoide (TSH, T4 livre), hemograma completo e marcadores de ferro. Inclui análise da equipe Longevify, coleta domiciliar e relatório personalizado integrado à plataforma. Ideal pra primeira consulta ou check-up anual de quem quer começar a cuidar da saúde com base em dados, sem complicação.",
    benefits: [
      "50+ biomarcadores fundamentais",
      "Coleta em domicílio (Profissional Longevify)",
      "Análise médica + relatório na plataforma",
      "Resultado em até 5 dias úteis",
      "Inclui consulta de devolutiva",
    ],
    usage: "Coleta única, jejum de 12h. Recomendado anualmente como baseline.",
    packageSize: "1 coleta · 50+ biomarcadores",
    targetsBiomarkers: ["ldl", "hdl", "hba1c", "tsh", "alt"],
    rating: 4.9,
    reviewsCount: 1247,
  },
  {
    id: "painel-avancado",
    name: "Painel Avançado",
    brand: "Longevify",
    category: "exame" as const,
    badge: "Mais Vendido" as const,
    kicker: "Exame Diagnóstico",
    priceBRL: 1799,
    image: "/marketplace/painel-avancado.png",
    isLongevifyOriginal: true,
    shortDescription:
      "100+ biomarcadores — visão completa pra quem quer protocolo de longevidade real.",
    longDescription:
      "Tudo do Painel Básico + ApoB, Lp(a), partículas LDL (LDL-P), painel hormonal completo (testosterona total e livre, DHEA-S, estradiol, cortisol), micronutrientes avançados (B12, folato, ferritina, vitamina D, zinco, magnésio), PCR ultrassensível, homocisteína, e marcadores de inflamação sistêmica. É o painel que a equipe Longevify usa pra desenhar protocolos personalizados de longevidade — referência de exames preventivos pra quem leva longevidade a sério.",
    benefits: [
      "100+ biomarcadores avançados",
      "Inclui ApoB, Lp(a), LDL-P (perfil aterogênico)",
      "Painel hormonal completo",
      "Inflamação sistêmica (PCR-us, homocisteína)",
      "Análise + protocolo personalizado",
      "Coleta domiciliar inclusa",
    ],
    usage:
      "Coleta única, jejum de 12h. Recomendado a cada 6 meses pra quem quer monitorar protocolo ativo.",
    packageSize: "1 coleta · 100+ biomarcadores",
    targetsBiomarkers: ["ldl", "apob", "hdl", "vitd", "ferritin", "testo", "crp", "tsh"],
    rating: 4.9,
    reviewsCount: 892,
  },
  {
    id: "microbioma-intestinal",
    name: "Teste de Microbioma Intestinal",
    brand: "Longevify",
    category: "exame" as const,
    badge: "Novo" as const,
    kicker: "Exame Diagnóstico",
    priceBRL: 1799,
    image: "/marketplace/microbioma-intestinal.png",
    isLongevifyOriginal: true,
    shortDescription:
      "Análise metagenômica do seu intestino — diversidade bacteriana, espécies-chave e plano alimentar personalizado.",
    longDescription:
      "Sequenciamento metagenômico de última geração que identifica e quantifica as espécies presentes no seu microbioma intestinal. Mede diversidade alfa e beta, abundância de espécies-chave (Akkermansia muciniphila, Bifidobacterium, Lactobacillus, Faecalibacterium prausnitzii), proporção Firmicutes/Bacteroidetes, marcadores de inflamação intestinal e potencial de produção de metabólitos como butirato. Você recebe um plano alimentar personalizado com base no seu perfil bacteriano específico.",
    benefits: [
      "Sequenciamento metagenômico shotgun",
      "Mede diversidade e abundância",
      "Identifica desequilíbrios (disbiose)",
      "Plano alimentar personalizado",
      "Coleta em casa (kit enviado)",
      "Resultado em 21 dias",
    ],
    usage:
      "Coleta única em casa, sem jejum. Recomendado a cada 12 meses ou após mudança de protocolo.",
    packageSize: "1 kit de coleta domiciliar",
    targetsBiomarkers: ["crp"],
    rating: 4.8,
    reviewsCount: 432,
  },
  // ──────────────────────────────────────────────────────────────────
  // SUPLEMENTOS LONGEVIFY ORIGINAL (8) — marca própria, sempre 1º na lista
  // ──────────────────────────────────────────────────────────────────
  {
    id: "longevify-vitamina-d",
    name: "Vitamina D 2.000 UI",
    brand: "Longevify",
    category: "suplemento" as const,
    badge: "Top" as const,
    kicker: "Suplemento Longevify",
    priceBRL: 49,
    image: "/marketplace/longevify-vitamina-d.png",
    isLongevifyOriginal: true,
    shortDescription:
      "Vitamina D3 em cápsulas moles — saúde óssea, imunidade e suporte muscular numa dose diária.",
    longDescription:
      "Vitamina D é um pró-hormônio crítico produzido pela exposição solar — mas no Brasil, mesmo com sol abundante, mais de 70% da população tem níveis abaixo do ideal por uso de protetor, vida indoor e alimentação. A Vitamina D3 (colecalciferol) é a forma idêntica à produzida pela pele e mais eficaz pra elevar os níveis séricos. 2.000 UI/dia é a dose de manutenção recomendada por consenso clínico pra adultos com níveis séricos em faixa normal-baixa.",
    benefits: [
      "Saúde óssea (absorção de cálcio)",
      "Função imune (modulação de citocinas)",
      "Saúde muscular e força",
      "Cápsula mole = absorção lipídica otimizada",
      "Sem corantes ou conservantes desnecessários",
    ],
    usage: "1 cápsula mole/dia, com refeição que contenha gordura.",
    packageSize: "60 cápsulas moles",
    posology: "1 cápsula/dia",
    durationDays: 60,
    recurrence: { intervalDays: 60, label: "a cada 2 meses", subscriptionDiscountPct: 15 },
    targetsBiomarkers: ["vitd"],
    rating: 4.8,
    reviewsCount: 1843,
  },
  {
    id: "longevify-vitamina-c",
    name: "Vitamina C Efervescente 1.000mg",
    brand: "Longevify",
    category: "suplemento" as const,
    kicker: "Suplemento Longevify",
    priceBRL: 39,
    image: "/marketplace/longevify-vitamina-c.png",
    isLongevifyOriginal: true,
    shortDescription:
      "Vitamina C 1g efervescente — antioxidante, suporte imune e síntese de colágeno em formato prático.",
    longDescription:
      "Vitamina C (ácido ascórbico) é o antioxidante hidrossolúvel mais estudado em humanos. Atua como cofator essencial pra síntese de colágeno (pele, vasos, articulações), absorção de ferro não-heme, função imune (atividade de neutrófilos e linfócitos) e regeneração de outros antioxidantes (vitamina E, glutationa). 1.000mg é a dose terapêutica em estudos de prevenção de infecções respiratórias e suporte ao desempenho físico.",
    benefits: [
      "Antioxidante de amplo espectro",
      "Suporte imune (especialmente em períodos de estresse)",
      "Síntese de colágeno",
      "Aumenta absorção de ferro vegetal",
      "Sabor laranja, sem açúcar",
    ],
    usage: "1 comprimido dissolvido em 200ml de água/dia. De preferência pela manhã.",
    packageSize: "20 comprimidos efervescentes · 80g",
    posology: "1 comprimido/dia",
    durationDays: 20,
    recurrence: { intervalDays: 20, label: "a cada 20 dias", subscriptionDiscountPct: 12 },
    targetsBiomarkers: [],
    rating: 4.7,
    reviewsCount: 567,
  },
  {
    id: "longevify-whey-protein",
    name: "Whey Protein Natural",
    brand: "Longevify",
    category: "suplemento" as const,
    badge: "Top" as const,
    kicker: "Suplemento Longevify",
    priceBRL: 249,
    image: "/marketplace/longevify-whey-protein.png",
    isLongevifyOriginal: true,
    shortDescription:
      "Proteína concentrada do soro do leite, 22g por porção — sabor neutro, sem aditivos.",
    longDescription:
      "Atingir 1,6-2,2g de proteína por kg de peso corporal é o que move a agulha em massa magra, saciedade e longevidade muscular — e isso é difícil só com comida. Whey concentrado é a forma com melhor relação custo-benefício de proteína completa, com perfil de aminoácidos essenciais ideal pra síntese muscular. Sabor natural, sem adoçantes, corantes ou aromatizantes — pra você dosar como quiser na hora do uso.",
    benefits: [
      "22g de proteína por porção",
      "4,8g de BCAAs por porção",
      "3,7g de glutamina por porção",
      "Ingredientes naturais",
      "Sem corantes, aromatizantes ou açúcares adicionados",
    ],
    usage: "1 dose (30g) em 200ml de água ou leite, pós-treino ou substituindo lanche.",
    packageSize: "900g · 30 porções",
    posology: "1 dose/dia",
    durationDays: 30,
    recurrence: { intervalDays: 30, label: "todo mês", subscriptionDiscountPct: 15 },
    targetsBiomarkers: [],
    rating: 4.8,
    reviewsCount: 2143,
  },
  {
    id: "longevify-magnesio-quelato",
    name: "Magnésio Quelato 200mg",
    brand: "Longevify",
    category: "suplemento" as const,
    kicker: "Suplemento Longevify",
    priceBRL: 119,
    image: "/marketplace/longevify-magnesio-quelato.png",
    isLongevifyOriginal: true,
    shortDescription:
      "Magnésio quelato bisglicinato — sono, recuperação muscular e regulação do sistema nervoso.",
    longDescription:
      "O magnésio é cofator de mais de 300 reações enzimáticas e quase metade dos brasileiros consome menos do que precisa. A forma quelada (bisglicinato) tem absorção muito superior aos óxidos comuns e não causa o desconforto intestinal típico dos suplementos baratos. Atua na qualidade do sono profundo, recuperação muscular pós-treino, regulação da pressão arterial e modulação do sistema nervoso parassimpático.",
    benefits: [
      "Forma quelada (alta biodisponibilidade)",
      "Qualidade do sono profundo",
      "Recuperação muscular",
      "Redução de cãibras",
      "Sem desconforto intestinal",
      "100% IDR por porção",
    ],
    usage: "2 cápsulas/dia, preferencialmente 30-60 min antes de dormir.",
    packageSize: "120 cápsulas",
    posology: "2 cápsulas/dia",
    durationDays: 60,
    recurrence: { intervalDays: 60, label: "a cada 2 meses", subscriptionDiscountPct: 14 },
    targetsBiomarkers: ["hba1c"],
    rating: 4.8,
    reviewsCount: 1432,
  },
  {
    id: "longevify-melatonina",
    name: "Melatonina 1mg",
    brand: "Longevify",
    category: "suplemento" as const,
    kicker: "Suplemento Longevify",
    priceBRL: 129,
    image: "/marketplace/longevify-melatonina.png",
    isLongevifyOriginal: true,
    shortDescription:
      "Melatonina 1mg em cápsulas — regulação do ciclo circadiano em dose fisiológica, sem ressaca.",
    longDescription:
      "Doses de 0,3-1mg são as fisiológicas — equivalentes ao pico noturno endógeno — e funcionam tão bem quanto doses altas de 5-10mg pra regular o ciclo circadiano, com muito menos efeito de ressaca matinal. Indicada pra ajustar jet lag, regularizar horário de sono em quem dorme tarde demais, e pacientes com baixa produção endógena (>40 anos, exposição alta a luz noturna). Melatonina não é sonífero — é um sinalizador de escuridão pro seu cérebro.",
    benefits: [
      "Dose fisiológica de 1mg",
      "Sem ressaca matinal",
      "Regula ciclo circadiano",
      "Útil pra jet lag e turno noturno",
      "Antioxidante mitocondrial",
    ],
    usage: "1 cápsula 30-60 min antes do horário-alvo de dormir, em ambiente escuro.",
    packageSize: "120 cápsulas",
    posology: "1 cápsula/noite",
    durationDays: 120,
    recurrence: { intervalDays: 120, label: "a cada 4 meses", subscriptionDiscountPct: 12 },
    targetsBiomarkers: [],
    rating: 4.6,
    reviewsCount: 988,
  },
  {
    id: "longevify-omega-3",
    name: "Ômega 3 Óleo de Peixe 1.000mg",
    brand: "Longevify",
    category: "suplemento" as const,
    badge: "Mais Vendido" as const,
    kicker: "Suplemento Longevify",
    priceBRL: 159,
    image: "/marketplace/longevify-omega-3.png",
    isLongevifyOriginal: true,
    shortDescription:
      "EPA + DHA concentrados — saúde cardiovascular, ocular e cerebral em dose terapêutica.",
    longDescription:
      "Ômega 3 EPA + DHA é uma das intervenções com mais evidência pra reduzir triglicérides, modular inflamação sistêmica e suportar função cognitiva. Nossa formulação tem alta concentração de EPA+DHA (60%+) e é destilada molecularmente pra remover metais pesados e PCBs. 2 cápsulas (2g) é a dose terapêutica usada em estudos cardiometabólicos. Reduz PCR ultrassensível, melhora variabilidade da frequência cardíaca e suporta a integridade da membrana eritrocitária.",
    benefits: [
      "Saúde cardiovascular (reduz triglicérides e ApoB)",
      "Saúde ocular (DHA na retina)",
      "Função cognitiva e memória",
      "Modulação de inflamação sistêmica",
      "Alta concentração de EPA+DHA",
    ],
    usage: "2 cápsulas/dia, com refeição rica em gordura.",
    packageSize: "120 cápsulas",
    posology: "2 cápsulas/dia",
    durationDays: 60,
    recurrence: { intervalDays: 60, label: "a cada 2 meses", subscriptionDiscountPct: 17 },
    targetsBiomarkers: ["ldl", "apob", "crp", "hdl"],
    rating: 4.9,
    reviewsCount: 2541,
  },
  {
    id: "longevify-creatina",
    name: "Creatina Monohidratada Creapure",
    brand: "Longevify",
    category: "suplemento" as const,
    badge: "Top" as const,
    kicker: "Suplemento Longevify",
    priceBRL: 289,
    image: "/marketplace/longevify-creatina.png",
    isLongevifyOriginal: true,
    shortDescription:
      "Creatina monohidratada Creapure 5g — força, recuperação e proteção cognitiva.",
    longDescription:
      "Creatina é o suplemento mais bem estudado da história — 800+ ensaios clínicos. Aumenta força, massa magra e capacidade de trabalho de alta intensidade. Mas o ponto que importa pra longevidade é o cérebro: estudos recentes mostram melhora em memória de trabalho, redução de fadiga mental e proteção em quadros de privação de sono. Usamos Creapure (origem alemã, certificada como 99,9% pura), o padrão-ouro em estudos científicos. 5g/dia é dose de manutenção definitiva — sem necessidade de loading.",
    benefits: [
      "100% Creapure (alemã, padrão-ouro)",
      "Ganho de força e massa magra",
      "Recuperação muscular",
      "Proteção cognitiva e memória",
      "Sem sabor, dissolve em água",
      "60 porções de 5g",
    ],
    usage: "1 dose (5g) hidratada em água, todo dia, no horário que preferir.",
    packageSize: "300g · 60 porções",
    posology: "1 dose/dia",
    durationDays: 60,
    recurrence: { intervalDays: 60, label: "a cada 2 meses", subscriptionDiscountPct: 15 },
    targetsBiomarkers: [],
    rating: 4.9,
    reviewsCount: 3245,
  },
  {
    id: "longevify-zinco",
    name: "Zinco Quelato 25mg",
    brand: "Longevify",
    category: "suplemento" as const,
    kicker: "Suplemento Longevify",
    priceBRL: 69,
    image: "/marketplace/longevify-zinco.png",
    isLongevifyOriginal: true,
    shortDescription:
      "Zinco quelato 25mg — imunidade, síntese hormonal e cofator de centenas de enzimas.",
    longDescription:
      "Zinco é cofator de mais de 300 enzimas, incluindo as envolvidas em síntese proteica, divisão celular, função imune e produção de testosterona. A forma quelada (bisglicinato) tem absorção 43% maior que o gluconato comum. Indicado especialmente pra quem treina pesado (perde via suor), homens em idade reprodutiva (importante pra T e fertilidade) e durante períodos de imunidade comprometida.",
    benefits: [
      "Forma quelada (alta absorção)",
      "Função imune robusta",
      "Suporte à testosterona",
      "Saúde da pele e cicatrização",
      "100% IDR por cápsula",
    ],
    usage: "1 cápsula/dia com refeição. Evite tomar junto com café ou ferro.",
    packageSize: "100 cápsulas",
    posology: "1 cápsula/dia",
    durationDays: 100,
    recurrence: { intervalDays: 100, label: "a cada 100 dias", subscriptionDiscountPct: 10 },
    targetsBiomarkers: ["testo"],
    rating: 4.7,
    reviewsCount: 743,
  },
  // ──────────────────────────────────────────────────────────────────
  // SUPLEMENTOS CURADOS (14) — dropshipping, sem markup
  // IDs históricos preservados pra não quebrar protocolo/tasks.ts
  // ──────────────────────────────────────────────────────────────────
  {
    id: "creatina",
    name: "Creatina Creapure® 300g",
    brand: "Dux Nutrition",
    supplier: "Dux Nutrition",
    supplierUrl: "https://www.duxhumanhealth.com/creatinamonohidratada-pote300g/p",
    costBRL: 259,
    category: "suplemento" as const,
    badge: "Top" as const,
    kicker: "Creatina monohidratada · Creapure®",
    image: "/marketplace/creatina.png",
    shortDescription:
      "Creatina monohidratada 100% Creapure® (Alzchem, Alemanha) — pureza >99,9%, sem aditivos.",
    longDescription:
      "Creatina monohidratada Creapure® é a matéria-prima alemã da Alzchem usada como referência em 800+ ensaios clínicos. Pureza >99,9%, sem dicianodiamida nem creatinina residual — diferente de creatina genérica de origem chinesa, cuja pureza varia. Esta versão Dux contém apenas creatina monohidratada, sem flavors, edulcorantes ou aditivos. Dose padrão: 3-5g/dia, sem necessidade de loading (Kreider 2017, JISSN; Antonio 2021, JISSN).",
    benefits: [
      "100% Creapure® (Alzchem, Alemanha)",
      "Pureza >99,9% certificada",
      "Sem dicianodiamida nem creatinina residual",
      "60 porções de 5g",
      "Sem flavors, edulcorantes ou aditivos",
    ],
    usage:
      "5g/dia em água, no horário que preferir. Sem necessidade de saturação.",
    packageSize: "300g · 60 porções",
    posology: "1 dose/dia",
    durationDays: 60,
    recurrence: {
      intervalDays: 60,
      label: "a cada 2 meses",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: [],
    rating: 4.9,
    reviewsCount: 3245,
  },
  {
    id: "creatina-growth",
    name: "Creatina Creapure® 250g",
    brand: "Growth Supplements",
    supplier: "Growth Supplements",
    supplierUrl:
      "https://www.gsuplementos.com.br/creatina-250g-creapure-growth-supplements-p985824",
    costBRL: 169,
    category: "suplemento" as const,
    badge: "Melhor Custo" as const,
    kicker: "Creatina monohidratada · Creapure®",
    shortDescription:
      "Versão Growth da mesma Creapure® alemã — relação custo-benefício pra uso contínuo.",
    longDescription:
      "Mesma matéria-prima Creapure® (Alzchem, Alemanha) usada pela Dux, distribuída pela Growth com preço mais acessível. Pra quem quer o padrão-ouro (>99,9% pureza, sem dicianodiamida) sem pagar pela marca premium. Sem flavors, edulcorantes ou aditivos. 250g rendem ~50 porções de 5g.",
    benefits: [
      "100% Creapure® (Alzchem, Alemanha)",
      "Mesma matéria-prima da versão Dux",
      "~50 porções de 5g",
      "Sem aditivos ou flavors",
    ],
    usage: "5g/dia em água, no horário que preferir.",
    packageSize: "250g · 50 porções",
    posology: "1 dose/dia",
    durationDays: 50,
    recurrence: {
      intervalDays: 50,
      label: "a cada ~50 dias",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: [],
    rating: 4.8,
    reviewsCount: 2156,
  },
  {
    id: "whey-protein",
    name: "Whey Grass Fed Concentrado 900g",
    brand: "Essential Nutrition",
    supplier: "Essential Nutrition",
    supplierUrl: "https://www.essentialnutrition.com.br/",
    costBRL: 249,
    category: "suplemento" as const,
    badge: "Top" as const,
    kicker: "Proteína do soro · grass fed",
    image: "/marketplace/whey-protein.jpg",
    shortDescription:
      "Proteína concentrada do soro de vacas criadas a pasto — matéria-prima Irlanda/NZ rastreável.",
    longDescription:
      "Whey concentrado de vacas grass fed com matéria-prima importada de origem rastreável (Irlanda/Nova Zelândia). Vacas pasto-criadas têm perfil lipídico melhor (mais CLA, ômega-3) e cadeia produtiva geralmente mais limpa em hormônios e antibióticos residuais. Atinge 1,6-2,2g/kg/dia de proteína (a faixa que move a agulha em massa magra) é difícil só com comida — whey resolve com perfil de aminoácidos essenciais ideal pra síntese muscular. Lecitina de girassol como emulsificante; sem corantes artificiais.",
    benefits: [
      "Matéria-prima grass fed rastreável (Irlanda/NZ)",
      "~22g de proteína por porção",
      "Lecitina de girassol (não soja)",
      "Sem corantes artificiais",
      "Versão neutra ou sabor natural",
    ],
    usage:
      "1 dose (30g) em 200ml de água ou leite, pós-treino ou substituindo lanche.",
    packageSize: "900g · 30 porções",
    posology: "1 dose/dia",
    durationDays: 30,
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: [],
    rating: 4.8,
    reviewsCount: 2143,
  },
  {
    id: "omega-3",
    name: "Super Ômega 3 TG IFOS 180 cápsulas",
    brand: "Essential Nutrition",
    supplier: "Essential Nutrition",
    supplierUrl:
      "https://www.essentialnutrition.com.br/super-omega-3-tg-180-caps",
    costBRL: 258,
    category: "suplemento" as const,
    badge: "Mais Vendido" as const,
    kicker: "EPA + DHA · forma triglicerídeo",
    image: "/marketplace/omega-3.jpg",
    shortDescription:
      "Ômega-3 EPA+DHA em forma TG (triglicerídeo reesterificado) com selo IFOS 5★.",
    longDescription:
      "A forma TG (triglicerídeo reesterificado) tem absorção ~70% maior que ômega-3 etil-éster comum (Dyerberg 2010, PLEFA). Cada cápsula entrega ~660mg de EPA+DHA. Alvo terapêutico: 2g EPA+DHA/dia pra índice ômega-3 >8% (Harris 2008, Atherosclerosis). Certificação IFOS 5 estrelas (Nutrasource): destilação molecular com teste por lote de mercúrio, dioxina e PCBs — referência internacional em pureza.",
    benefits: [
      "Forma TG (triglicerídeo) — ~70% mais absorção que EE",
      "Selo IFOS 5★ (teste de mercúrio/dioxina/PCB por lote)",
      "660mg EPA+DHA por cápsula",
      "Destilação molecular",
      "Cápsula gelatinosa, sem óleos vegetais carreadores",
    ],
    usage:
      "2-3 cápsulas/dia, com refeição rica em gordura. Alvo: 2g EPA+DHA/dia.",
    packageSize: "180 cápsulas",
    posology: "2 cápsulas/dia",
    durationDays: 90,
    recurrence: {
      intervalDays: 90,
      label: "a cada 3 meses",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: ["ldl", "apob", "crp", "hdl"],
    rating: 4.9,
    reviewsCount: 2541,
  },
  {
    id: "vitamina-d",
    name: "Vita D3 + K2 MK-7 (20ml)",
    brand: "Vitafor",
    supplier: "Vitafor",
    supplierUrl:
      "https://www.vitafor.com.br/vita-d3---k2---20ml-menta---vitafor/p",
    costBRL: 95,
    category: "suplemento" as const,
    badge: "Top" as const,
    kicker: "Vitamina D3 com K2",
    image: "/marketplace/vitamina-d.jpg",
    shortDescription:
      "Vitamina D3 (colecalciferol) com K2 MK-7 em gotas — direciona cálcio pra osso, não artéria.",
    longDescription:
      "D3 colecalciferol é a forma idêntica à produzida pela pele e mais eficaz pra elevar níveis séricos (>70% dos brasileiros estão abaixo do ideal). K2 MK-7 (menaquinona-7) é a forma de meia-vida longa (72h vs 1h da MK-4) que ativa a osteocalcina e direciona cálcio pra osso/dente em vez de artéria (Geleijnse 2004, J Nutr — Rotterdam Study). Apresentação em gotas com base oleosa permite ajuste de dose pelo médico.",
    benefits: [
      "D3 (colecalciferol) + K2 MK-7 (menaquinona-7)",
      "2.000UI de D3 por dose",
      "Base oleosa (óleo MCT) — absorção otimizada",
      "Gotas permitem ajuste de dose",
      "Sabor menta, zero açúcar, sem glúten",
    ],
    usage:
      "1 gota = 200UI. Dose padrão 5-10 gotas/dia (1.000-2.000UI) com refeição que contenha gordura. Ajustar com seu médico se 25-OH-D <30 ng/mL.",
    packageSize: "20ml · ~100 doses de 2.000UI",
    posology: "10 gotas/dia",
    durationDays: 100,
    recurrence: {
      intervalDays: 100,
      label: "a cada ~3 meses",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: ["vitd"],
    rating: 4.8,
    reviewsCount: 1843,
  },
  {
    id: "magnesio-quelato",
    name: "[Mg] Complex — 4 formas queladas",
    brand: "Essential Nutrition",
    supplier: "Essential Nutrition",
    supplierUrl: "https://www.essentialnutrition.com.br/mg-complex-magnesio",
    costBRL: 132,
    category: "suplemento" as const,
    kicker: "Magnésio · bisglicinato + treonato + malato + quelato",
    image: "/marketplace/magnesio-quelato.jpg",
    shortDescription:
      "Blend de 4 formas queladas de magnésio — sono, cognição e recuperação muscular num mesmo produto.",
    longDescription:
      "Combinação de bisglicinato (sono e ansiedade), treonato (cognição — única forma que atravessa a barreira hematoencefálica, Slutsky 2010, Neuron), malato (energia mitocondrial e fadiga muscular) e quelato. Óxido de magnésio comum em farmácia tem biodisponibilidade <4%; citrato laxa. As formas queladas absorvem 4-6x mais sem desconforto intestinal. Alvo: 200-400mg de magnésio elementar/dia.",
    benefits: [
      "4 formas queladas — bisglicinato + treonato + malato + quelato",
      "Treonato cruza barreira hematoencefálica",
      "Alta absorção, sem desconforto intestinal",
      "300mg de magnésio elementar por porção",
      "Sono, cognição, energia muscular",
    ],
    usage: "3 cápsulas/dia, 30-60min antes de dormir.",
    packageSize: "90 cápsulas",
    posology: "3 cápsulas/dia",
    durationDays: 30,
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: ["hba1c"],
    rating: 4.8,
    reviewsCount: 1432,
  },
  {
    id: "vitamina-c",
    name: "Bio Vit C+ Lipossomal 1100mg",
    brand: "Puravida",
    supplier: "Puravida",
    supplierUrl: "https://www.puravida.com.br/bio-vit-c-70550",
    costBRL: 119,
    category: "suplemento" as const,
    kicker: "Vitamina C lipossomal",
    shortDescription:
      "Vitamina C em vesículas lipossomais — absorção ~100% vs ~30% do ascorbato comum.",
    longDescription:
      "A vit C lipossomal é encapsulada em vesículas de lecitina de girassol (fosfolipídio idêntico ao da membrana celular), permitindo absorção quase total via enterócitos — diferente do ascorbato sódico convencional, que satura em ~200mg e o excesso é excretado (Davis 2016, Nutr Metab). 1g/dia é teto razoável; doses maiores viram oxalato urinário sem benefício adicional.",
    benefits: [
      "Lipossomal — absorção ~100% via lecitina de girassol",
      "1.100mg de vit C por porção",
      "Sem açúcar adicionado",
      "Antioxidante de amplo espectro",
      "Cofator pra síntese de colágeno",
    ],
    usage:
      "2 cápsulas/dia (1 dose = 1.000mg). Preferência matutina, com refeição.",
    packageSize: "60 cápsulas",
    posology: "2 cápsulas/dia",
    durationDays: 30,
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: [],
    rating: 4.7,
    reviewsCount: 567,
  },
  {
    id: "zinco",
    name: "Zinco Quelado 15mg",
    brand: "Vitafor",
    supplier: "Vitafor",
    supplierUrl: "https://www.vitafor.com.br/",
    costBRL: 45,
    category: "suplemento" as const,
    kicker: "Zinco bisglicinato",
    shortDescription:
      "Zinco quelato bisglicinato 15mg — função imune, síntese hormonal, cofator de 300+ enzimas.",
    longDescription:
      "Bisglicinato é a forma quelada com maior absorção e menor irritação gástrica vs sulfato/óxido. Dose de 15mg/dia respeita o teto seguro pra uso contínuo — acima de 40mg/dia crônico depleta cobre e altera o perfil lipídico. Cofator de mais de 300 enzimas (síntese proteica, divisão celular, função imune, produção de testosterona).",
    benefits: [
      "Forma bisglicinato (alta absorção)",
      "15mg/dia — dose segura pra uso contínuo",
      "Função imune e cicatrização",
      "Suporte à testosterona endógena",
      "Não irrita estômago",
    ],
    usage:
      "1 cápsula/dia com refeição. Evite tomar junto com café ou ferro.",
    packageSize: "60 cápsulas",
    posology: "1 cápsula/dia",
    durationDays: 60,
    recurrence: {
      intervalDays: 60,
      label: "a cada 2 meses",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: ["testo"],
    rating: 4.7,
    reviewsCount: 743,
  },
  {
    id: "colageno-verisol",
    name: "Collagen Skin Verisol® 330g",
    brand: "Essential Nutrition",
    supplier: "Essential Nutrition",
    supplierUrl: "https://www.essentialnutrition.com.br/collagen-skin",
    costBRL: 179,
    category: "suplemento" as const,
    badge: "Curadoria" as const,
    kicker: "Colágeno bioativo · Verisol® (Gelita)",
    shortDescription:
      "Peptídeos de colágeno Verisol® — 4 RCTs em firmeza e elasticidade da pele.",
    longDescription:
      "Verisol® (Gelita, Alemanha) é uma fração específica de peptídeos bioativos de colágeno com 4 ensaios clínicos randomizados em pele (Proksch 2014, Skin Pharmacol Physiol; Bolke 2019, Nutrients): firmeza, elasticidade e redução de rugas. 2,5g de Verisol por dose. Diferente de colágeno hidrolisado genérico, que é só fonte de aminoácidos (equivalente a gelatina barata). Evidência boa pra pele/cosmecêutico; evidência fraca pra 'longevidade' geral.",
    benefits: [
      "Verisol® (Gelita) — peptídeos bioativos específicos",
      "2,5g de Verisol por porção",
      "4 RCTs publicados (firmeza, elasticidade, rugas)",
      "Versão neutra ou limão siciliano",
      "Sem sucralose nem corantes artificiais",
    ],
    usage:
      "1 dose (10g) dissolvida em água ou suco, 1×/dia. Resultados em 8-12 semanas.",
    packageSize: "330g · 33 porções",
    posology: "1 dose/dia",
    durationDays: 33,
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: [],
    rating: 4.8,
    reviewsCount: 1124,
  },
  {
    id: "coq10-ubiquinol",
    name: "CoQ10 Ubiquinol Kaneka® 100mg",
    brand: "Essential Nutrition",
    supplier: "Essential Nutrition",
    supplierUrl: "https://www.essentialnutrition.com.br/",
    costBRL: 245,
    category: "suplemento" as const,
    kicker: "Ubiquinol · Kaneka® Japão",
    shortDescription:
      "CoQ10 na forma reduzida (ubiquinol) — biodisponibilidade ~3x maior que ubiquinona, especialmente acima dos 40.",
    longDescription:
      "Ubiquinol (CoQ10 reduzido) tem biodisponibilidade ~3x maior que ubiquinona, principalmente em maiores de 40 anos cuja capacidade de redução enzimática cai (Langsjoen 2014). Kaneka (Japão) é a matéria-prima padrão-ouro usada em estudos clínicos. Indicação principal: mialgia por estatina (Banach 2015, Mayo Clin Proc) e insuficiência cardíaca com fração reduzida (Q-SYMBIO trial, Mortensen 2014, JACC HF).",
    benefits: [
      "Ubiquinol (forma reduzida ativa)",
      "Matéria-prima Kaneka® (Japão)",
      "Biodisponibilidade ~3x ubiquinona",
      "Antioxidante mitocondrial",
      "Suporte cardiovascular e energia",
    ],
    usage: "1 cápsula/dia, com refeição que contenha gordura.",
    packageSize: "30 cápsulas",
    posology: "1 cápsula/dia",
    durationDays: 30,
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: [],
    rating: 4.8,
    reviewsCount: 612,
  },
  {
    id: "r-ala",
    name: "R-ALA 100mg",
    brand: "Essential Nutrition",
    supplier: "Essential Nutrition",
    supplierUrl: "https://www.essentialnutrition.com.br/",
    costBRL: 159,
    category: "suplemento" as const,
    kicker: "Ácido R-alfa lipóico",
    shortDescription:
      "Forma R-isomérica do ácido alfa-lipóico — biodisponibilidade ~2x do racêmico R+S.",
    longDescription:
      "R-ALA é o enantiômero natural (a forma encontrada nas mitocôndrias), com biodisponibilidade aproximadamente 2x superior ao ácido alfa-lipóico racêmico R+S vendido em massa. Antioxidante universal (lipo e hidrossolúvel), regenera glutationa, vit C e vit E. Evidência mais sólida em neuropatia diabética (ALADIN trials, Ziegler). Cuidado: pode causar hipoglicemia em diabéticos em uso de hipoglicemiantes — converse com seu médico.",
    benefits: [
      "Forma R (enantiômero natural)",
      "Biodisponibilidade ~2x do racêmico",
      "Antioxidante lipo e hidrossolúvel",
      "Regenera glutationa endógena",
      "100mg/cápsula",
    ],
    usage:
      "1 cápsula/dia em jejum (absorção otimizada longe de refeição).",
    packageSize: "60 cápsulas",
    posology: "1 cápsula/dia",
    durationDays: 60,
    recurrence: {
      intervalDays: 60,
      label: "a cada 2 meses",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: [],
    rating: 4.6,
    reviewsCount: 287,
  },
  {
    id: "probiotico-boulardii",
    name: "ProB SI — Saccharomyces boulardii",
    brand: "Vitafor",
    supplier: "Vitafor",
    supplierUrl: "https://www.vitafor.com.br/prebioticos-e-probioticos",
    costBRL: 95,
    category: "suplemento" as const,
    kicker: "Probiótico · cepa nomeada CNCM I-745",
    shortDescription:
      "Probiótico shelf-stable (sem refrigeração) — S. boulardii CNCM I-745 com 50+ RCTs.",
    longDescription:
      "Saccharomyces boulardii CNCM I-745 é a cepa probiótica com mais ensaios clínicos publicados — 50+ RCTs em diarreia associada a antibiótico, diarreia do viajante e disbiose (McFarland 2010, World J Gastroenterol). Diferente de probióticos genéricos 'mix de 10 bilhões UFC' sem cepa especificada, a cepa importa muito mais que o gênero. S. boulardii é uma levedura, não bactéria — shelf-stable (não exige refrigeração), o que viabiliza dropshipping seguro.",
    benefits: [
      "Cepa nomeada (CNCM I-745) com 50+ RCTs",
      "Shelf-stable — não exige refrigeração",
      "5 bilhões UFC por cápsula",
      "Levedura (Saccharomyces) — resistente a antibiótico",
      "Modulação de microbiota intestinal",
    ],
    usage:
      "1-2 cápsulas/dia. Aumentar pra 2× em uso de antibiótico ou diarreia aguda.",
    packageSize: "30 cápsulas",
    posology: "1 cápsula/dia",
    durationDays: 30,
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: [],
    rating: 4.7,
    reviewsCount: 421,
  },
  {
    id: "melatonina",
    name: "Sleepfor — Melatonina + Triptofano + Glicina",
    brand: "Vitafor",
    supplier: "Vitafor",
    supplierUrl: "https://www.vitafor.com.br/sleepfor---60-cap---vitafor/p",
    costBRL: 113,
    category: "suplemento" as const,
    kicker: "Sono · dose ANVISA",
    image: "/marketplace/melatonina.jpg",
    shortDescription:
      "Combo regulado pela ANVISA — melatonina 0,21mg + L-triptofano + glicina + vit B3/B6.",
    longDescription:
      "ANVISA liberou melatonina como suplemento alimentar em out/2021 (RDC 480/2021) com dose máxima de 0,21mg/dia — doses 1mg+ continuam off-label e exigem manipulação. Sleepfor combina a dose ANVISA com L-triptofano (precursor de serotonina/melatonina endógena) e glicina (3g de glicina antes de dormir mostra benefício em estudos, Yamadera 2007, Sleep Biol Rhythms). Sem ressaca matinal — é sinalização circadiana, não sonífero.",
    benefits: [
      "Dose ANVISA legal (0,21mg melatonina)",
      "Combo com L-triptofano (240mg)",
      "Glicina como precursor",
      "Vit B3 e B6 (cofatores)",
      "Zero açúcar, vegano",
    ],
    usage: "1 cápsula 30-60min antes de dormir, em ambiente escuro.",
    packageSize: "60 cápsulas",
    posology: "1 cápsula/noite",
    durationDays: 60,
    recurrence: {
      intervalDays: 60,
      label: "a cada 2 meses",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: [],
    rating: 4.6,
    reviewsCount: 988,
  },
  // ──────────────────────────────────────────────────────────────────
  // NATURAIS & CUIDADOS PESSOAIS (7) — dropshipping
  // ──────────────────────────────────────────────────────────────────
  {
    id: "desodorante-true-paleo",
    name: "Desodorante Natural Tallow & Coco",
    brand: "True Paleo",
    supplier: "True Paleo",
    supplierUrl:
      "https://truepaleo.com.br/products/desodorante-natural-tallow-e-coco",
    costBRL: 75,
    category: "natural" as const,
    badge: "Curadoria" as const,
    kicker: "Cuidado pessoal · sem alumínio",
    image: "/marketplace/desodorante-true-paleo.jpg",
    shortDescription:
      "Desodorante artesanal de sebo bovino + coco — sem alumínio, sem parabenos, sem fragrâncias sintéticas.",
    longDescription:
      "Sebo bovino (tallow) + óleo de coco + magnésio + óleos essenciais. Sem cloridrato de alumínio (evidência epidemiológica fraca mas precaução razoável — Mannello 2009, J Inorg Biochem), sem parabenos, sem triclosan. 12h+ de proteção. Marca brasileira pequena, suporte direto. A categoria 'desodorante natural' é cheia de produto que não funciona — esse funciona porque usa ativos que o corpo reconhece (gordura animal e magnésio).",
    benefits: [
      "Sebo bovino + óleo de coco (gordura que o corpo reconhece)",
      "Sem alumínio, parabenos, triclosan, fragrâncias sintéticas",
      "12h+ de proteção",
      "Marca brasileira artesanal",
    ],
    usage:
      "Aplicar nas axilas limpas e secas pela manhã. Pequena quantidade já cobre.",
    packageSize: "60g",
    targetsBiomarkers: [],
    rating: 4.7,
    reviewsCount: 312,
  },
  {
    id: "mel-ultramel",
    name: "Mel Cru Silvestre",
    brand: "Ultramel",
    supplier: "Ultramel",
    supplierUrl: "https://ultramel.com.br/collections/mel",
    costBRL: 49,
    category: "natural" as const,
    kicker: "Mel cru · single-origin",
    image: "/marketplace/mel-ultramel.jpg",
    shortDescription:
      "Mel cru (não-pasteurizado, não-filtrado) — preserva enzimas, propólis residual e perfil polínico verificável.",
    longDescription:
      "Mel cru pula a pasteurização e filtragem que descartam enzimas (diastase, invertase), propólis residual e pólen. Mel de supermercado é frequentemente adulterado com xarope de milho/açúcar (CONAR 2019 detectou em 40% das amostras). Single-origin garante perfil polínico verificável. Aviso clínico: açúcar é açúcar — ~80g/100g de carboidrato. Bom como adoçante natural, NÃO como 'saudável pra emagrecer'.",
    benefits: [
      "Não-pasteurizado, não-filtrado",
      "Single-origin (perfil polínico rastreável)",
      "Mantém enzimas e propólis residual",
      "Sem xarope de milho, sem adulteração",
    ],
    usage:
      "Como adoçante natural — 1 colher de chá em chá ou frutas. ~80g/100g de açúcar (uso moderado).",
    packageSize: "280g",
    targetsBiomarkers: [],
    rating: 4.8,
    reviewsCount: 547,
  },
  {
    id: "pasta-boni-natural",
    name: "Pasta de Dente Natural com Flúor",
    brand: "Boni Natural",
    supplier: "Boni Natural",
    supplierUrl:
      "https://lojaboninatural.com.br/produtos/kit-6-creme-dental-boni-natural-menta-e-melaleuca-90g/",
    costBRL: 28,
    category: "natural" as const,
    kicker: "Higiene bucal · sem SLS",
    image: "/marketplace/pasta-boni-natural.webp",
    shortDescription:
      "Pasta de dente natural com flúor — sem SLS, sem triclosan, sem sacarina.",
    longDescription:
      "Sem laurel sulfato (SLS), sem triclosan, sem sacarina, sem corante artificial. Mantém o flúor (1.450ppm) porque flúor tópico é evidência sólida em prevenção de cárie (Cochrane Marinho 2003 — reduz cárie em 24%). 'Toxicidade do flúor' em doses cosméticas é mito — preocupação é em ingestão sistêmica em água, não em pasta de dente. Versão com flúor é a recomendação clínica padrão.",
    benefits: [
      "Sem laurel sulfato (SLS)",
      "Sem triclosan nem sacarina",
      "Com flúor 1.450ppm (prevenção de cárie evidence-based)",
      "Marca brasileira natural",
    ],
    usage: "Escovar 2-3 vezes ao dia, ~2min cada vez. Cuspir, não enxaguar.",
    packageSize: "90g",
    targetsBiomarkers: [],
    rating: 4.6,
    reviewsCount: 234,
  },
  {
    id: "escova-boni-natural",
    name: "Escova de Dente Bambu",
    brand: "Boni Natural",
    supplier: "Boni Natural",
    supplierUrl: "https://lojaboninatural.com.br/",
    costBRL: 22,
    category: "natural" as const,
    kicker: "Higiene bucal · cabo bambu",
    shortDescription:
      "Cabo de bambu compostável, cerdas macias — alternativa ao plástico sem perder eficácia.",
    longDescription:
      "Cabo de bambu compostável (substitui o plástico que dura 400+ anos). Cerdas macias de náilon — o melhor balanço entre eficácia (remove placa) e segurança (não fere a gengiva). Trocar a cada 3 meses, como qualquer escova.",
    benefits: [
      "Cabo de bambu compostável",
      "Cerdas macias (não machucam a gengiva)",
      "Sem plástico no cabo",
    ],
    usage: "Trocar a cada 3 meses ou quando as cerdas começarem a abrir.",
    packageSize: "1 unidade",
    durationDays: 90,
    recurrence: {
      intervalDays: 90,
      label: "a cada 3 meses",
      subscriptionDiscountPct: 0,
    },
    targetsBiomarkers: [],
    rating: 4.5,
    reviewsCount: 189,
  },
  {
    id: "protetor-adcos-mineral",
    name: "Fluid Mineral FPS 50 — 40ml",
    brand: "Adcos",
    supplier: "Adcos",
    supplierUrl: "https://www.lojaadcos.com.br/protetor-solar-fluid-mineral-fps50/p",
    costBRL: 179,
    category: "natural" as const,
    badge: "Top" as const,
    kicker: "Protetor solar mineral",
    image: "/marketplace/protetor-adcos-mineral.png",
    shortDescription:
      "Filtro 100% mineral (óxido de zinco + dióxido de titânio) — UVA, UVB, luz azul.",
    longDescription:
      "Filtro mineral (físico) com óxido de zinco e dióxido de titânio — protege contra UVB, UVA, UVA longo, luz visível e luz azul. Indicado pra peles sensíveis, sensibilizadas e oleosas. Textura fluida sem efeito branco. Brasil tem sol intenso — protetor solar diário com FPS 30+ é uma das intervenções com mais evidência em prevenção de fotoenvelhecimento e câncer de pele (Hughes 2013, Ann Intern Med). PPD ≥10 obrigatório pra UVA.",
    benefits: [
      "100% filtros minerais (físicos)",
      "FPS 50 + proteção UVA, UVA longo, luz azul",
      "Textura fluida sem efeito branco",
      "Indicado pra pele sensível",
      "Dermocosmético desenvolvido por dermatologistas",
    ],
    usage:
      "Aplicar generosamente no rosto pela manhã. Reaplicar a cada 2h em exposição direta.",
    packageSize: "40ml",
    targetsBiomarkers: [],
    rating: 4.8,
    reviewsCount: 892,
  },
  {
    id: "oleo-coco-copra",
    name: "Óleo de Coco Extra Virgem 500ml",
    brand: "Copra",
    supplier: "Copra",
    supplierUrl: "https://copra.com.br/en/nossosprodutos/extra-virgin-coconut-oil/",
    costBRL: 58,
    category: "natural" as const,
    kicker: "Gordura culinária · prensagem a frio",
    image: "/marketplace/oleo-coco-copra.png",
    shortDescription:
      "Óleo de coco extra virgem, prensagem a frio — gordura estável pra calor, sem refino.",
    longDescription:
      "Prensagem a frio, sem refino, sem desodorização. Gordura estável pra calor (alto ponto de fumaça) — boa pra refogar, cozinhar e fritar (não oxida facilmente). Aviso clínico honesto: óleo de coco NÃO é 'superalimento'. É 90% gordura saturada (láurica). Não baixa LDL — sobe (meta-análise Cochrane Eyres 2017, Nutr Rev). Use como gordura culinária neutra, não como saúde cardiovascular.",
    benefits: [
      "Prensagem a frio, extra virgem",
      "Sem refino, sem desodorização",
      "Estável pra cocção em alta temperatura",
      "Marca brasileira pioneira (Copra, Sergipe)",
    ],
    usage:
      "Substitui óleo de soja/canola pra refogar, fritar, assar. 1 colher por preparo. Uso culinário, não 'saúde'.",
    packageSize: "500ml",
    targetsBiomarkers: [],
    rating: 4.7,
    reviewsCount: 1438,
  },
  {
    id: "mct-essential",
    name: "MCTlift — Óleo de Coco C8/C10 250ml",
    brand: "Essential Nutrition",
    supplier: "Essential Nutrition",
    supplierUrl: "https://www.essentialnutrition.com.br/mctlift-oleo-de-coco",
    costBRL: 95,
    category: "natural" as const,
    kicker: "MCT · C8 + C10",
    image: "/marketplace/mct-essential.jpg",
    shortDescription:
      "Triglicerídeos de cadeia média (C8 caprílico + C10 cáprico) — gera cetonas rapidamente.",
    longDescription:
      "MCT (medium-chain triglycerides) C8 e C10 atravessam direto pra mitocôndria sem passar por sistema linfático — geram cetonas em ~30min. Utilidade prática em jejum prolongado, dieta low-carb e suporte cognitivo agudo. Evidência humana em performance/cognição é modesta. Aviso prático: começar com 1 colher de chá — doses >15g/dia causam diarreia.",
    benefits: [
      "C8 (caprílico) + C10 (cáprico) concentrados",
      "Atravessa direto pra mitocôndria",
      "Cetonas em ~30min",
      "Origem coco, sem solventes",
    ],
    usage:
      "Começar com 1 colher de chá (5ml), aumentar gradual até 15ml. No café ou em iogurte.",
    packageSize: "250ml",
    targetsBiomarkers: [],
    rating: 4.6,
    reviewsCount: 643,
  },
  {
    id: "cafe-three-coracoes",
    name: "Café Especial Gourmet Sul de Minas 250g",
    brand: "3 Corações",
    supplier: "3 Corações",
    supplierUrl: "https://www.3coracoes.com.br/",
    costBRL: 34,
    category: "natural" as const,
    badge: "Melhor Custo" as const,
    kicker: "Café especial · 100% arábica",
    shortDescription:
      "Café especial Sul de Minas — grãos classificados SCAA, processamento limpo.",
    longDescription:
      "Café especial é classificado SCAA >80 pontos com processamento controlado — diferente de café commodity barato, onde micotoxina (ocratoxina A) aparece com mais frequência por úmido/mofo (Garcia-Moraleja 2015, J Sci Food Agric). 100% arábica, torra média, perfil equilibrado. 'Bulletproof Coffee' é hype — café especial brasileiro de qualidade já é tão bom quanto.",
    benefits: [
      "100% arábica especial (SCAA-classificado)",
      "Sul de Minas — terroir reconhecido",
      "Processamento limpo (menos micotoxina)",
      "Torra média, perfil equilibrado",
    ],
    usage:
      "20g (~2 colheres) por 300ml de água. Coado, prensa francesa ou espresso.",
    packageSize: "250g",
    targetsBiomarkers: [],
    rating: 4.6,
    reviewsCount: 524,
  },
];

/**
 * Catálogo Longevify. Pra produtos dropshipping (`supplier` presente),
 * `priceBRL` é derivado de `costBRL + taxa Stripe` — preço sem markup.
 *
 * Pra exames (sem `supplier`), `priceBRL` é definido diretamente porque
 * são produtos próprios Longevify.
 */
export const PRODUCTS: Product[] = productSeed.map((seed) => {
  const priceBRL =
    seed.costBRL !== undefined
      ? calculateClientPrice(seed.costBRL)
      : seed.priceBRL ?? 0;

  return {
    ...seed,
    currency: "BRL",
    priceBRL,
  };
});

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductsByCategory(category?: ProductCategory): Product[] {
  if (!category) return PRODUCTS;
  return PRODUCTS.filter((p) => p.category === category);
}

// ──────────────────────────────────────────────────────────────────
// Recurrence recommendation
// ──────────────────────────────────────────────────────────────────

export interface RecurrenceRecommendation {
  /** Intervalo em dias até a próxima entrega. */
  intervalDays: number;
  /** Texto curto pra mostrar no UI (ex: "a cada 60 dias"). */
  label: string;
  /** Explicação derivada (ex: "60 cápsulas, 1/dia → 60 dias"). */
  reasoning: string;
  /** Desconto sugerido na assinatura (default 0 — sem markup, sem desconto extra). */
  subscriptionDiscountPct: number;
  /** `true` quando veio do campo `product.recurrence` (curado),
   *  `false` quando inferimos da posologia + tamanho do frasco. */
  curated: boolean;
}

const POSOLOGY_PER_DAY_RE =
  /(\d+)\s*(?:c[áa]psul[ao]s?|comprimid[ao]s?|tablet[es]*|gomas?|ml|gotas?|sache(?:s|tes)?|sc?oops?)\s*\/\s*dia/i;

function inferDailyDose(posology?: string): number | null {
  if (!posology) return null;
  const m = posology.match(POSOLOGY_PER_DAY_RE);
  if (m) return Math.max(1, Number(m[1]));
  const alt = posology.match(
    /(\d+)\s*(?:doses?|c[áa]psul[ao]s?)\s+(?:ao|por)\s+dia/i,
  );
  if (alt) return Math.max(1, Number(alt[1]));
  return null;
}

function inferPackUnits(packageSize?: string): number | null {
  if (!packageSize) return null;
  const m = packageSize.match(
    /(\d+)\s*(?:c[áa]psul[ao]s?|comprimid[ao]s?|tablet[es]*|gomas?|sach[eê]s?|sensores?|unidade(?:s)?|doses?)/i,
  );
  if (m) return Math.max(1, Number(m[1]));
  const raw = packageSize.match(/(\d+)/);
  return raw ? Math.max(1, Number(raw[1])) : null;
}

function formatIntervalLabel(days: number): string {
  if (days <= 0) return "a cada uso";
  if (days <= 7) return "semanal";
  if (days >= 28 && days <= 32) return "mensal";
  if (days >= 58 && days <= 62) return "a cada 2 meses";
  if (days >= 88 && days <= 92) return "a cada 3 meses";
  if (days >= 118 && days <= 122) return "a cada 4 meses";
  return `a cada ${days} dias`;
}

/**
 * Devolve a recorrência recomendada pro produto. Prioriza o campo
 * `product.recurrence` (curado pela equipe). Quando ausente, infere a
 * partir de `posology` + `packageSize` ("1 cápsula/dia" + "60 cápsulas"
 * → 60 dias). Devolve `null` se não houver dado suficiente — útil pra
 * exames que não são consumíveis.
 */
export function recommendInterval(
  product: Product,
): RecurrenceRecommendation | null {
  if (product.recurrence) {
    return {
      intervalDays: product.recurrence.intervalDays,
      label: product.recurrence.label,
      reasoning:
        product.posology && product.packageSize
          ? `${product.packageSize}, posologia ${product.posology}.`
          : "Recorrência sugerida pela equipe Longevify.",
      subscriptionDiscountPct: product.recurrence.subscriptionDiscountPct,
      curated: true,
    };
  }
  const dailyDose = inferDailyDose(product.posology);
  const packUnits = inferPackUnits(product.packageSize);
  if (!dailyDose || !packUnits) return null;
  const days = Math.max(7, Math.round(packUnits / dailyDose));
  return {
    intervalDays: days,
    label: formatIntervalLabel(days),
    reasoning: `${packUnits} unidades, ${dailyDose}/dia → dura ${days} dias.`,
    subscriptionDiscountPct: 0,
    curated: false,
  };
}

/**
 * Opções típicas de frequência mostradas no selector. A recomendada
 * sempre vem destacada como primeira opção (mesmo que não bata em nenhuma
 * dessas). O user pode customizar no UI.
 */
export const FREQUENCY_PRESETS: ReadonlyArray<{ days: number; label: string }> = [
  { days: 30, label: "Mensal" },
  { days: 60, label: "A cada 2 meses" },
  { days: 90, label: "A cada 3 meses" },
  { days: 120, label: "A cada 4 meses" },
];
