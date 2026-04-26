export type ProductCategory =
  | "exame"
  | "suplemento"
  | "longevify-original"
  | "wearable"
  | "equipamento";

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
  brand: string;
  category: ProductCategory;
  badge?: ProductBadge;
  /** Categoria visível em label cinza no card (ex: "Exame Diagnóstico", "Suplemento Longevify") */
  kicker: string;
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
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  exame: "Exames",
  suplemento: "Suplementos",
  "longevify-original": "Originais Longevify",
  wearable: "Wearables",
  equipamento: "Equipamento",
};

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/**
 * Catálogo Longevify — produtos exclusivos da marca + curadoria de wearables/equipamento.
 * Imagens: /public/marketplace/*.png (PNGs reais da equipe).
 */
export const PRODUCTS: Product[] = [
  // ──────────────────────────────────────────────────────────────────
  // EXAMES DIAGNÓSTICOS (3)
  // ──────────────────────────────────────────────────────────────────
  {
    id: "painel-basico",
    name: "Painel Básico",
    brand: "Longevify",
    category: "exame",
    badge: "Melhor Custo",
    kicker: "Exame Diagnóstico",
    priceBRL: 349,
    currency: "BRL",
    image: "/marketplace/painel-basico.png",
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
    usage:
      "Coleta única, jejum de 12h. Recomendado anualmente como baseline.",
    packageSize: "1 coleta · 50+ biomarcadores",
    targetsBiomarkers: ["ldl", "hdl", "hba1c", "tsh", "alt"],
    rating: 4.9,
    reviewsCount: 1247,
  },
  {
    id: "painel-avancado",
    name: "Painel Avançado",
    brand: "Longevify",
    category: "exame",
    badge: "Mais Vendido",
    kicker: "Exame Diagnóstico",
    // Pricing 2026-04: media de mercado de paineis avancados c/ ApoB+Lp(a)+hormonal
    // (~R$1.549) é estruturalmente premium no BR; markup +15% justifica salto >3x.
    priceBRL: 1799,
    currency: "BRL",
    image: "/marketplace/painel-avancado.png",
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
    category: "exame",
    badge: "Novo",
    kicker: "Exame Diagnóstico",
    // Pricing 2026-04: BiomeHub Plus shotgun R$2.710, Vinci R$1.098, Origem ~R$1.500.
    // Mercado de microbioma metagenomico no BR é premium (>R$1.000).
    priceBRL: 1799,
    currency: "BRL",
    image: "/marketplace/microbioma-intestinal.png",
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
  // SUPLEMENTOS LONGEVIFY (8)
  // ──────────────────────────────────────────────────────────────────
  {
    id: "vitamina-d",
    name: "Vitamina D 2.000 UI",
    brand: "Longevify",
    category: "longevify-original",
    badge: "Top",
    kicker: "Suplemento Longevify",
    priceBRL: 49,
    currency: "BRL",
    image: "/marketplace/vitamina-d.png",
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
    recurrence: {
      intervalDays: 60,
      label: "a cada 2 meses",
      subscriptionDiscountPct: 15,
    },
    targetsBiomarkers: ["vitd"],
    rating: 4.8,
    reviewsCount: 1843,
  },
  {
    id: "vitamina-c",
    name: "Vitamina C Efervescente 1.000mg",
    brand: "Longevify",
    category: "longevify-original",
    kicker: "Suplemento Longevify",
    priceBRL: 39,
    currency: "BRL",
    image: "/marketplace/vitamina-c.png",
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
    usage:
      "1 comprimido dissolvido em 200ml de água/dia. De preferência pela manhã.",
    packageSize: "20 comprimidos efervescentes · 80g",
    posology: "1 comprimido/dia",
    recurrence: {
      intervalDays: 20,
      label: "a cada 20 dias",
      subscriptionDiscountPct: 12,
    },
    targetsBiomarkers: [],
    rating: 4.7,
    reviewsCount: 567,
  },
  {
    id: "whey-protein",
    name: "Whey Protein Natural",
    brand: "Longevify",
    category: "longevify-original",
    badge: "Top",
    kicker: "Suplemento Longevify",
    priceBRL: 249,
    currency: "BRL",
    image: "/marketplace/whey-protein.png",
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
    usage:
      "1 dose (30g) em 200ml de água ou leite, pós-treino ou substituindo lanche.",
    packageSize: "900g · 30 porções",
    posology: "1 dose/dia",
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 15,
    },
    targetsBiomarkers: [],
    rating: 4.8,
    reviewsCount: 2143,
  },
  {
    id: "magnesio-quelato",
    name: "Magnésio Quelato 200mg",
    brand: "Longevify",
    category: "longevify-original",
    kicker: "Suplemento Longevify",
    // Pricing 2026-04: bisglicinato 200mg em 120 caps no varejo (Avitalfarma,
    // Vitafor, Amazon) tem media R$105; markup +15% justifica salto de 33%.
    priceBRL: 119,
    currency: "BRL",
    image: "/marketplace/magnesio-quelato.png",
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
    usage:
      "2 cápsulas/dia, preferencialmente 30-60 min antes de dormir.",
    packageSize: "120 cápsulas",
    posology: "2 cápsulas/dia",
    recurrence: {
      intervalDays: 60,
      label: "a cada 2 meses",
      subscriptionDiscountPct: 14,
    },
    targetsBiomarkers: ["hba1c"],
    rating: 4.8,
    reviewsCount: 1432,
  },
  {
    id: "melatonina",
    name: "Melatonina 1mg",
    brand: "Longevify",
    category: "longevify-original",
    kicker: "Suplemento Longevify",
    // Pricing 2026-04: melatonina em capsula no BR é regulada (ANVISA permite
    // doses baixas); 60 caps de marcas premium custam R$55-95. Normalizado
    // para 120 caps a media foi R$115; salto de 87% reflete subprecificacao
    // anterior.
    priceBRL: 129,
    currency: "BRL",
    image: "/marketplace/melatonina.png",
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
    usage:
      "1 cápsula 30-60 min antes do horário-alvo de dormir, em ambiente escuro.",
    packageSize: "120 cápsulas",
    posology: "1 cápsula/noite",
    recurrence: {
      intervalDays: 120,
      label: "a cada 4 meses",
      subscriptionDiscountPct: 12,
    },
    targetsBiomarkers: [],
    rating: 4.6,
    reviewsCount: 988,
  },
  {
    id: "omega-3",
    name: "Ômega 3 Óleo de Peixe 1.000mg",
    brand: "Longevify",
    category: "longevify-original",
    badge: "Mais Vendido",
    kicker: "Suplemento Longevify",
    priceBRL: 159,
    currency: "BRL",
    image: "/marketplace/omega-3.png",
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
    usage:
      "2 cápsulas/dia, com refeição rica em gordura.",
    packageSize: "120 cápsulas",
    posology: "2 cápsulas/dia",
    recurrence: {
      intervalDays: 60,
      label: "a cada 2 meses",
      subscriptionDiscountPct: 17,
    },
    targetsBiomarkers: ["ldl", "apob", "crp", "hdl"],
    rating: 4.9,
    reviewsCount: 2541,
  },
  {
    id: "creatina",
    name: "Creatina Monohidratada Creapure",
    brand: "Longevify",
    category: "longevify-original",
    badge: "Top",
    kicker: "Suplemento Longevify",
    // Pricing 2026-04: Creapure 300g das marcas premium (Vitafor R$259, Dux
    // R$215-349, Nutrify R$199) tem media R$254. Preco antigo R$89 estava
    // muito abaixo do mercado de Creapure puro (so creatina monohidratada
    // generica fica nessa faixa).
    priceBRL: 289,
    currency: "BRL",
    image: "/marketplace/creatina.png",
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
    recurrence: {
      intervalDays: 60,
      label: "a cada 2 meses",
      subscriptionDiscountPct: 15,
    },
    targetsBiomarkers: [],
    rating: 4.9,
    reviewsCount: 3245,
  },
  {
    id: "zinco",
    name: "Zinco Quelato 25mg",
    brand: "Longevify",
    category: "longevify-original",
    kicker: "Suplemento Longevify",
    priceBRL: 69,
    currency: "BRL",
    image: "/marketplace/zinco.png",
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
    usage:
      "1 cápsula/dia com refeição. Evite tomar junto com café ou ferro.",
    packageSize: "100 cápsulas",
    posology: "1 cápsula/dia",
    recurrence: {
      intervalDays: 100,
      label: "a cada 100 dias",
      subscriptionDiscountPct: 10,
    },
    targetsBiomarkers: ["testo"],
    rating: 4.7,
    reviewsCount: 743,
  },
  // ──────────────────────────────────────────────────────────────────
  // WEARABLES (curadoria)
  // ──────────────────────────────────────────────────────────────────
  {
    id: "oura-ring-heritage",
    name: "Oura Ring Heritage",
    brand: "Oura",
    category: "wearable",
    badge: "Curadoria",
    kicker: "Wearable",
    priceBRL: 1199,
    currency: "BRL",
    shortDescription:
      "Anel de tracking de sono, recuperação e atividade — bateria 7 dias.",
    longDescription:
      "Sensores de temperatura corporal, HRV, frequência cardíaca, SpO2 e movimento. Algoritmos avançados de score de sono, prontidão e atividade. Discreto, sem display, foco em dados em vez de notificações.",
    benefits: [
      "Tracking 24/7 de sono e HRV",
      "Bateria 7 dias",
      "Detecção de ciclo menstrual",
      "Sem mensalidade no plano básico",
    ],
    usage: "Use no dedo indicador 24/7 (tira pro banho/sauna).",
    targetsBiomarkers: [],
    rating: 4.7,
    reviewsCount: 5234,
  },
  {
    id: "garmin-epix-pro",
    name: "Garmin Epix Pro",
    brand: "Garmin",
    category: "wearable",
    kicker: "Wearable",
    priceBRL: 5499,
    currency: "BRL",
    shortDescription:
      "Smartwatch premium pra performance — VO2max, lactate threshold, sono detalhado.",
    longDescription:
      "Combina precisão Garmin com tela AMOLED. Métricas avançadas pra atletas amadores e high-performers. Bateria 16+ dias com GPS multi-banda.",
    benefits: [
      "VO2max + lactate threshold",
      "GPS multi-banda",
      "Bateria 16+ dias",
      "Mapas topográficos",
    ],
    usage: "Use no pulso 24/7. Use o Garmin Coach pra treinos guiados.",
    targetsBiomarkers: [],
    rating: 4.6,
    reviewsCount: 1087,
  },
  {
    id: "whoop-membership",
    name: "Whoop 4.0 + Mensalidade Anual",
    brand: "Whoop",
    category: "wearable",
    kicker: "Wearable",
    priceBRL: 2400,
    currency: "BRL",
    shortDescription:
      "Pulseira sem display + assinatura — foco total em recuperação e sono.",
    longDescription:
      "Hardware vem incluso na assinatura. Whoop é a opção pra quem quer dados granulares de recuperação sem distração visual no pulso.",
    benefits: [
      "Strain coach diário",
      "Recovery score (HRV/RHR)",
      "Bateria 5 dias com swap",
      "Sem display = zero distração",
    ],
    usage: "Use no pulso 24/7, sincroniza por Bluetooth.",
    targetsBiomarkers: [],
    rating: 4.4,
    reviewsCount: 3421,
  },
  // ──────────────────────────────────────────────────────────────────
  // EQUIPAMENTO (curadoria)
  // ──────────────────────────────────────────────────────────────────
  {
    id: "withings-body-comp",
    name: "Withings Body Comp",
    brand: "Withings",
    category: "equipamento",
    kicker: "Equipamento",
    priceBRL: 1490,
    currency: "BRL",
    shortDescription:
      "Balança de bioimpedância — idade vascular, gordura visceral e composição segmentar.",
    longDescription:
      "Conecta automaticamente via Wi-Fi ao app Longevify. Pesa em 30 segundos com 6 métricas além do peso, incluindo idade vascular e gordura visceral.",
    benefits: [
      "Idade vascular",
      "Gordura visceral",
      "Composição segmentar",
      "Sincronização automática",
    ],
    usage: "Pesagem diária, mesmo horário, em jejum.",
    targetsBiomarkers: [],
    rating: 4.5,
    reviewsCount: 1654,
  },
  {
    id: "freestyle-libre-3",
    name: "FreeStyle Libre 3 (kit 2 sensores)",
    brand: "Abbott",
    category: "equipamento",
    badge: "Novo",
    kicker: "Equipamento",
    priceBRL: 890,
    currency: "BRL",
    shortDescription:
      "CGM de glicose contínua — descubra como cada refeição afeta sua glicemia.",
    longDescription:
      "Sensor que dura 14 dias por aplicação. Kit Longevify inclui 2 sensores (28 dias de monitoramento) + análise da equipe clínica. Não precisa furar dedo.",
    benefits: [
      "14 dias por sensor",
      "Sem furar dedo",
      "App em tempo real",
      "Análise clínica inclusa",
    ],
    usage: "Aplicar no braço; trocar a cada 14 dias.",
    packageSize: "2 sensores (28 dias)",
    posology: "Sensor contínuo",
    recurrence: {
      intervalDays: 28,
      label: "a cada 28 dias",
      subscriptionDiscountPct: 5,
    },
    targetsBiomarkers: ["hba1c"],
    rating: 4.6,
    reviewsCount: 432,
  },
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductsByCategory(category?: ProductCategory): Product[] {
  if (!category) return PRODUCTS;
  return PRODUCTS.filter((p) => p.category === category);
}
