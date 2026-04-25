export type ProductCategory =
  | "suplemento"
  | "wearable"
  | "equipamento"
  | "longevify-original"
  | "exame";

export type ProductBadge = "Top" | "Novo" | "Exclusivo" | "Curadoria";

/**
 * Recorrência sugerida — derivada da posologia e quantidade do frasco.
 * Exemplo: 60 cápsulas / 2 por dia → 30 dias.
 */
export interface ProductRecurrence {
  /** dias entre uma compra e a próxima (com base na posologia) */
  intervalDays: number;
  /** rótulo humanizado: "todo mês", "a cada 60 dias" */
  label: string;
  /** % de desconto aplicado se virar assinatura recorrente */
  subscriptionDiscountPct: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  badge?: ProductBadge;
  priceBRL: number;
  currency: "BRL";
  shortDescription: string;
  longDescription: string;
  benefits: string[];
  usage: string;
  /** "60 cápsulas", "30 doses", "750 ml" */
  packageSize?: string;
  /** "1 cápsula/dia", "2 ampolas/dia" */
  posology?: string;
  /** undefined = produto não-consumível (ex: anel, balança) */
  recurrence?: ProductRecurrence;
  targetsBiomarkers: string[];
  rating: number;
  reviewsCount: number;
  image?: string;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  suplemento: "Suplementos",
  "longevify-original": "Originais Longevify",
  wearable: "Wearables",
  equipamento: "Equipamento",
  exame: "Exames adicionais",
};

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/**
 * Catálogo Longevify — preços e produtos extraídos do site oficial
 * longevify.com.br (curadoria + originais + exames adicionais + wearables).
 */
export const PRODUCTS: Product[] = [
  // ──────────────────────────────────────────────────────────────────
  // SUPLEMENTOS — curadoria
  // ──────────────────────────────────────────────────────────────────
  {
    id: "ag1-greens-daily",
    name: "AG1 Greens Daily",
    brand: "AG1",
    category: "suplemento",
    badge: "Top",
    priceBRL: 299,
    currency: "BRL",
    shortDescription:
      "Multinutriente diário com 75 ingredientes — base de micronutrientes pra simplificar.",
    longDescription:
      "Combinação de vitaminas, minerais, adaptógenos, probióticos e enzimas em uma única dose diária. Substitui 5+ suplementos avulsos. NSF Certified for Sport.",
    benefits: [
      "75 ingredientes em 1 dose",
      "Probióticos + prebióticos",
      "Adaptógenos pra estresse",
      "NSF Certified for Sport",
    ],
    usage: "1 sachê dissolvido em água gelada — manhã, em jejum.",
    packageSize: "30 doses",
    posology: "1 dose/dia",
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 10,
    },
    targetsBiomarkers: ["vitd", "ferritin", "crp"],
    rating: 4.8,
    reviewsCount: 2143,
  },
  {
    id: "bioptimizers-magnesium",
    name: "Magnesium Breakthrough",
    brand: "BiOptimizers",
    category: "suplemento",
    priceBRL: 219,
    currency: "BRL",
    shortDescription:
      "7 formas de magnésio biodisponível — sono, recuperação muscular e regulação do sistema nervoso.",
    longDescription:
      "A maioria dos suplementos de magnésio usa apenas 1-2 formas. Aqui são 7 (glicinato, treonato, malato, taurato, citrato, orotato, sucinato) cobrindo todas as funções fisiológicas.",
    benefits: [
      "7 formas em 1 cápsula",
      "Atravessa barreira hemato-encefálica (treonato)",
      "Melhora qualidade do sono",
      "Reduz cãibras e tensão muscular",
    ],
    usage: "2 cápsulas antes de dormir.",
    packageSize: "60 cápsulas",
    posology: "2 cápsulas/dia",
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 10,
    },
    targetsBiomarkers: ["hba1c", "crp"],
    rating: 4.7,
    reviewsCount: 1124,
  },
  {
    id: "quicksilver-methyl-b12",
    name: "Methyl B-12",
    brand: "Quicksilver Scientific",
    category: "suplemento",
    badge: "Curadoria",
    priceBRL: 339,
    currency: "BRL",
    shortDescription:
      "B-12 metilada lipossomal — absorção 5-10x superior à oral comum.",
    longDescription:
      "Tecnologia lipossomal entrega B-12 ativa direto pela mucosa oral. Indicada especialmente pra quem tem variação MTHFR.",
    benefits: [
      "Forma metilada (ativa)",
      "Tecnologia lipossomal",
      "Energia e cognição",
      "Suporte ao MTHFR",
    ],
    usage: "1 ml sob a língua, 1x ao dia. Segurar 30s antes de engolir.",
    packageSize: "50 ml",
    posology: "1 ml/dia",
    recurrence: {
      intervalDays: 50,
      label: "a cada 50 dias",
      subscriptionDiscountPct: 10,
    },
    targetsBiomarkers: ["ferritin"],
    rating: 4.6,
    reviewsCount: 567,
  },
  {
    id: "quinton-hypertonic",
    name: "Quinton Hypertonic",
    brand: "Quinton",
    category: "suplemento",
    priceBRL: 189,
    currency: "BRL",
    shortDescription:
      "Plasma marinho hipertônico — 78 minerais bioativos da água do mar pré-filtrada.",
    longDescription:
      "Coletada em oceano profundo (>30m) por procedimento patenteado desde 1897, restaura equilíbrio mineral celular. Performance, recuperação e suporte adrenal.",
    benefits: [
      "78 minerais em proporção fisiológica",
      "Energia e foco",
      "Hidratação celular",
      "Suporte adrenal",
    ],
    usage: "1 ampola sublingual em jejum, 30 min antes do café.",
    packageSize: "30 ampolas",
    posology: "1 ampola/dia",
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 10,
    },
    targetsBiomarkers: [],
    rating: 4.5,
    reviewsCount: 412,
  },
  {
    id: "zero-acre-oil",
    name: "Zero Acre Oil",
    brand: "Zero Acre",
    category: "suplemento",
    badge: "Novo",
    priceBRL: 249,
    currency: "BRL",
    shortDescription:
      "Óleo de cocção fermentado — substitui seed oils inflamatórios.",
    longDescription:
      "Produzido por fermentação de açúcar de cana, tem 93% gordura monoinsaturada, ponto de fumaça de 250°C e zero gordura saturada de origem industrial.",
    benefits: [
      "93% gordura monoinsaturada",
      "Sem seed oils inflamatórios",
      "Ponto de fumaça 250°C",
      "Sabor neutro pra cozinhar",
    ],
    usage: "Substituto direto do óleo comum em qualquer receita.",
    packageSize: "750 ml",
    posology: "Uso culinário diário",
    recurrence: {
      intervalDays: 45,
      label: "a cada 45 dias",
      subscriptionDiscountPct: 8,
    },
    targetsBiomarkers: ["ldl", "apob", "hdl"],
    rating: 4.4,
    reviewsCount: 289,
  },
  {
    id: "omega-3-nordic",
    name: "Ômega 3 Ultimate (EPA/DHA)",
    brand: "Nordic Naturals",
    category: "suplemento",
    badge: "Top",
    priceBRL: 389,
    currency: "BRL",
    shortDescription:
      "EPA + DHA 2g/dose — padrão-ouro em ensaios cardiometabólicos.",
    longDescription:
      "Óleo de peixe selvagem com baixa oxidação certificada por terceiros. Reduz triglicérides, melhora membrana eritrocitária e modula inflamação sistêmica.",
    benefits: [
      "2g de EPA+DHA por dose",
      "Baixa oxidação certificada",
      "Reduz triglicérides",
      "Modula PCR ultra-sensível",
    ],
    usage: "2 cápsulas/dia, com refeição rica em gordura.",
    packageSize: "120 cápsulas",
    posology: "2 cápsulas/dia",
    recurrence: {
      intervalDays: 60,
      label: "a cada 2 meses",
      subscriptionDiscountPct: 10,
    },
    targetsBiomarkers: ["ldl", "apob", "crp"],
    rating: 4.8,
    reviewsCount: 1843,
  },
  // ──────────────────────────────────────────────────────────────────
  // LONGEVIFY ORIGINALS
  // ──────────────────────────────────────────────────────────────────
  {
    id: "longevify-essentials",
    name: "Longevify Essentials Daily",
    brand: "Longevify",
    category: "longevify-original",
    badge: "Exclusivo",
    priceBRL: 279,
    currency: "BRL",
    shortDescription:
      "Multi diário formulado pela equipe clínica — D, B-complex, magnésio em 1 cápsula.",
    longDescription:
      "Pensado pra cobrir as deficiências mais comuns observadas nos exames dos pacientes Longevify. Doses ajustadas com base nos dados agregados anonimizados do programa.",
    benefits: [
      "8 micronutrientes em 1 cápsula",
      "Doses baseadas em dados clínicos",
      "Sem aditivos desnecessários",
      "Fabricado em GMP no Brasil",
    ],
    usage: "1 cápsula/dia com café da manhã.",
    packageSize: "30 cápsulas",
    posology: "1 cápsula/dia",
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 15,
    },
    targetsBiomarkers: ["vitd", "ferritin"],
    rating: 4.9,
    reviewsCount: 142,
  },
  {
    id: "longevify-protein",
    name: "Longevify Protein Plant",
    brand: "Longevify",
    category: "longevify-original",
    priceBRL: 219,
    currency: "BRL",
    shortDescription:
      "Proteína vegetal isolada — perfil aminoacídico completo, sem açúcar.",
    longDescription:
      "Mix proprietário de ervilha + arroz integral + chia. Iguala o perfil de aminoácidos essenciais do whey isolado, ideal pra sensíveis a lactose.",
    benefits: [
      "25g proteína por dose",
      "Sem açúcar adicionado",
      "Perfil aminoacídico completo",
      "Vegano",
    ],
    usage: "1 dose pós-treino ou substitui um lanche.",
    packageSize: "900g",
    posology: "1 dose/dia",
    recurrence: {
      intervalDays: 30,
      label: "todo mês",
      subscriptionDiscountPct: 12,
    },
    targetsBiomarkers: [],
    rating: 4.7,
    reviewsCount: 88,
  },
  // ──────────────────────────────────────────────────────────────────
  // WEARABLES
  // ──────────────────────────────────────────────────────────────────
  {
    id: "oura-ring-heritage",
    name: "Oura Ring Heritage",
    brand: "Oura",
    category: "wearable",
    badge: "Top",
    priceBRL: 1199,
    currency: "BRL",
    shortDescription:
      "Anel de tracking de sono, recuperação e atividade — bateria 7 dias.",
    longDescription:
      "Sensores de temperatura corporal, HRV, frequência cardíaca, SpO2 e movimento. Algoritmos avançados de score de sono, prontidão e atividade.",
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
    priceBRL: 5499,
    currency: "BRL",
    shortDescription:
      "Smartwatch premium pra performance — VO2max, lactate threshold, sono detalhado.",
    longDescription:
      "Combina precisão Garmin com tela AMOLED. Métricas avançadas pra atletas amadores e high-performers.",
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
    priceBRL: 2400,
    currency: "BRL",
    shortDescription:
      "Pulseira sem display + assinatura — foco total em recuperação e sono.",
    longDescription:
      "O hardware vem grátis na assinatura. Whoop é a opção pra quem quer dados granulares de recuperação sem distração visual.",
    benefits: [
      "Strain coach diário",
      "Recovery score baseado em HRV/RHR",
      "Bateria 5 dias com swap",
      "Sem display = zero distração",
    ],
    usage: "Use no pulso 24/7, sincroniza por Bluetooth.",
    targetsBiomarkers: [],
    rating: 4.4,
    reviewsCount: 3421,
  },
  // ──────────────────────────────────────────────────────────────────
  // EQUIPAMENTO
  // ──────────────────────────────────────────────────────────────────
  {
    id: "withings-body-comp",
    name: "Withings Body Comp",
    brand: "Withings",
    category: "equipamento",
    priceBRL: 1490,
    currency: "BRL",
    shortDescription:
      "Balança de bioimpedância — idade vascular, gordura visceral e composição segmentar.",
    longDescription:
      "Conecta automaticamente via Wi-Fi ao seu app Longevify. Pesa em 30 segundos com 6 métricas além do peso.",
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
    name: "FreeStyle Libre 3 (kit)",
    brand: "Abbott",
    category: "equipamento",
    badge: "Novo",
    priceBRL: 890,
    currency: "BRL",
    shortDescription:
      "CGM de glicose contínua — descubra como cada refeição afeta sua glicemia.",
    longDescription:
      "Sensor que dura 14 dias por aplicação. Kit Longevify inclui 2 sensores (28 dias) + análise da equipe clínica.",
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
  // ──────────────────────────────────────────────────────────────────
  // EXAMES ADICIONAIS
  // ──────────────────────────────────────────────────────────────────
  {
    id: "exam-cancer-mc",
    name: "Detecção Precoce Multi-Câncer",
    brand: "Longevify Labs",
    category: "exame",
    badge: "Novo",
    priceBRL: 1899,
    currency: "BRL",
    shortDescription:
      "Identifica sinais de 50+ tipos de câncer em uma única coleta de sangue.",
    longDescription:
      "Teste de DNA tumoral circulante (ctDNA) com sensibilidade pra detecção precoce em estágios I-II. Inclui consulta de retorno.",
    benefits: [
      "50+ tipos de câncer",
      "1 coleta de sangue",
      "Resultado em 14 dias",
      "Inclui consulta de retorno",
    ],
    usage: "Coleta única — recomendado anualmente após os 40.",
    targetsBiomarkers: [],
    rating: 4.9,
    reviewsCount: 78,
  },
  {
    id: "exam-cholesterol-advanced",
    name: "Painel de Colesterol Avançado",
    brand: "Longevify Labs",
    category: "exame",
    priceBRL: 179,
    currency: "BRL",
    shortDescription:
      "Concentração, tamanho e tipo das partículas (LDL-P, ApoB, Lp(a)).",
    longDescription:
      "Vai além do LDL-C tradicional. Mede número de partículas LDL, fenótipo e Lp(a) — fator genético de risco cardiovascular.",
    benefits: [
      "LDL-P (número de partículas)",
      "ApoB",
      "Lp(a) genético",
      "Tamanho de partícula",
    ],
    usage: "Coleta única, 12h de jejum.",
    targetsBiomarkers: ["ldl", "apob", "hdl"],
    rating: 4.7,
    reviewsCount: 156,
  },
  {
    id: "exam-mthfr",
    name: "Teste Genético MTHFR",
    brand: "Longevify Labs",
    category: "exame",
    priceBRL: 399,
    currency: "BRL",
    shortDescription:
      "Identifica variações no gene MTHFR que afetam metabolismo de folato.",
    longDescription:
      "30-40% da população tem alguma variação MTHFR. Saber se você tem orienta dose e forma da B12/B9.",
    benefits: [
      "Análise C677T + A1298C",
      "Orientação personalizada",
      "Resultado em 21 dias",
    ],
    usage: "Coleta única — uma vez na vida.",
    targetsBiomarkers: [],
    rating: 4.6,
    reviewsCount: 92,
  },
  {
    id: "exam-heavy-metals",
    name: "Teste de Metais Pesados",
    brand: "Longevify Labs",
    category: "exame",
    priceBRL: 199,
    currency: "BRL",
    shortDescription:
      "Mercúrio, chumbo, cádmio, arsênico, alumínio e níquel em uma coleta.",
    longDescription:
      "Importante pra quem consome muito peixe ou vive em áreas industriais. Plano de detox incluso se necessário.",
    benefits: [
      "6 metais analisados",
      "Coleta única",
      "Plano de detox se necessário",
    ],
    usage: "Coleta única.",
    targetsBiomarkers: [],
    rating: 4.5,
    reviewsCount: 67,
  },
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductsByCategory(category?: ProductCategory): Product[] {
  if (!category) return PRODUCTS;
  return PRODUCTS.filter((p) => p.category === category);
}
