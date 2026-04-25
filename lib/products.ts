export type ProductCategory =
  | "suplemento"
  | "wearable"
  | "equipamento"
  | "longevify-original";

export type ProductBadge = "Top" | "Novo" | "Exclusivo" | "Curadoria";

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
};

export const PRODUCTS: Product[] = [
  {
    id: "omega-3-nordic",
    name: "Ômega 3 Ultimate (EPA/DHA)",
    brand: "Nordic Naturals",
    category: "suplemento",
    badge: "Curadoria",
    priceBRL: 389,
    currency: "BRL",
    shortDescription:
      "Óleo de peixe de alta pureza com 2g de EPA+DHA por dose, padrão-ouro em estudos cardiometabólicos.",
    longDescription:
      "Fórmula em triglicerídeos naturais, destilada molecularmente para remover metais pesados e PCBs. Concentração de 1280 mg de EPA + 720 mg de DHA por porção, dentro da faixa terapêutica usada em estudos de redução de triglicerídeos e suporte cardiovascular. Terceirizada em testes IFOS — certificação 5 estrelas para pureza e frescor. Embalagem com 60 cápsulas softgel.",
    benefits: [
      "Reduz triglicerídeos e apoia perfil lipídico",
      "Suporte anti-inflamatório sistêmico",
      "Saúde cerebral e cognitiva",
      "Sem refluxo sabor limão",
    ],
    usage: "2 cápsulas ao dia, preferencialmente junto das refeições principais.",
    targetsBiomarkers: ["ldl", "hdl", "crp", "apob"],
    rating: 4.8,
    reviewsCount: 1243,
  },
  {
    id: "vitd3-k2",
    name: "Vitamina D3 5000 UI + K2 MK-7",
    brand: "Thorne",
    category: "suplemento",
    badge: "Top",
    priceBRL: 229,
    currency: "BRL",
    shortDescription:
      "Combinação sinérgica de D3 colecalciferol com K2 MK-7 para saúde óssea e cardiovascular.",
    longDescription:
      "Vitamina D3 na forma colecalciferol (a mesma produzida pela pele) acoplada a 180 mcg de K2 MK-7 all-trans, que direciona o cálcio para ossos e dentes em vez de artérias. Formulação em MCT para absorção superior. Recomendada para níveis séricos de 25(OH)D abaixo de 50 ng/mL, tipicamente por 12 semanas de retomada.",
    benefits: [
      "Eleva 25(OH)D para faixa ótima",
      "Direciona cálcio para ossos",
      "Suporte imunológico",
      "Base MCT, absorção rápida",
    ],
    usage: "1 cápsula ao dia, junto a refeição com gordura — idealmente pela manhã.",
    targetsBiomarkers: ["vitd"],
    rating: 4.9,
    reviewsCount: 2187,
  },
  {
    id: "magnesio-glicinato",
    name: "Magnésio Glicinato 400mg",
    brand: "Pure Encapsulations",
    category: "suplemento",
    priceBRL: 179,
    currency: "BRL",
    shortDescription:
      "Forma quelada de magnésio com alta biodisponibilidade e excelente tolerância gastrointestinal.",
    longDescription:
      "O magnésio é cofator de mais de 300 reações enzimáticas, incluindo síntese de ATP, regulação neuromuscular e sinalização de insulina. A forma glicinato (bisglicinato) é quelada a dois aminoácidos de glicina, evitando efeito laxativo comum em formas como óxido e citrato. Suporte a sono profundo e variabilidade da frequência cardíaca.",
    benefits: [
      "Melhora a qualidade do sono profundo",
      "Reduz cãibras e tensão muscular",
      "Suporte à regulação glicêmica",
      "Sem efeito laxativo",
    ],
    usage: "2 cápsulas 30-60 minutos antes de dormir.",
    targetsBiomarkers: ["hba1c", "crp"],
    rating: 4.7,
    reviewsCount: 892,
  },
  {
    id: "creatina-mono",
    name: "Creatina Monohidratada Creapure",
    brand: "Kion",
    category: "suplemento",
    badge: "Top",
    priceBRL: 219,
    currency: "BRL",
    shortDescription:
      "Creatina Creapure pura, o suplemento mais estudado do mundo para performance e longevidade.",
    longDescription:
      "Creatina monohidratada grau Creapure (Alzchem, Alemanha), padrão-ouro de pureza. Mais de 500 estudos clínicos suportam benefícios em força, potência, recuperação, neuroproteção e massa óssea. Dose diária de 5g mantém saturação muscular de fosfocreatina sem necessidade de fase de carga.",
    benefits: [
      "Aumenta força e potência muscular",
      "Suporte cognitivo e neuroproteção",
      "Preservação de massa magra com a idade",
      "Melhora recuperação entre sessões",
    ],
    usage: "5g (1 colher) ao dia, misturada em água ou shake, em qualquer horário.",
    targetsBiomarkers: ["testo", "hba1c"],
    rating: 4.9,
    reviewsCount: 3104,
  },
  {
    id: "coq10-ubiquinol",
    name: "Coenzima Q10 Ubiquinol 100mg",
    brand: "Jarrow Formulas",
    category: "suplemento",
    priceBRL: 349,
    currency: "BRL",
    shortDescription:
      "Forma ativa (ubiquinol) da CoQ10, essencial para produção mitocondrial de ATP e saúde cardíaca.",
    longDescription:
      "Ubiquinol é a forma reduzida da CoQ10, com biodisponibilidade até 4x superior à ubiquinona especialmente após os 40 anos, quando a capacidade de conversão diminui. Essencial para a cadeia de transporte de elétrons nas mitocôndrias. Particularmente indicada para usuários de estatinas, que depletam CoQ10 endógena.",
    benefits: [
      "Suporte mitocondrial e energético",
      "Proteção cardíaca",
      "Antioxidante potente",
      "Repõe CoQ10 depletada por estatinas",
    ],
    usage: "1 cápsula ao dia, com refeição contendo gordura.",
    targetsBiomarkers: ["ldl", "apob"],
    rating: 4.6,
    reviewsCount: 567,
  },
  {
    id: "nmn-tru-niagen",
    name: "Tru Niagen NR 300mg",
    brand: "ChromaDex",
    category: "suplemento",
    badge: "Novo",
    priceBRL: 599,
    currency: "BRL",
    shortDescription:
      "Precursor de NAD+ (nicotinamida ribosídeo) patenteado com mais de 25 estudos clínicos em humanos.",
    longDescription:
      "NR é um precursor direto de NAD+, coenzima central em metabolismo energético, reparo de DNA e sinalização de longevidade via sirtuínas. Níveis de NAD+ caem 40-50% entre os 40 e 60 anos. Suplementação com NR eleva NAD+ sanguíneo de forma dose-dependente em humanos. Tru Niagen é a forma mais clinicamente validada disponível.",
    benefits: [
      "Eleva NAD+ sanguíneo",
      "Suporte à função mitocondrial",
      "Ativação de sirtuínas de longevidade",
      "25+ estudos clínicos em humanos",
    ],
    usage: "1 cápsula ao dia pela manhã, com ou sem alimento.",
    targetsBiomarkers: ["hba1c", "alt", "crp"],
    rating: 4.5,
    reviewsCount: 412,
  },
  {
    id: "longevify-essentials",
    name: "Longevify Essentials Daily",
    brand: "Longevify",
    category: "longevify-original",
    badge: "Exclusivo",
    priceBRL: 449,
    currency: "BRL",
    shortDescription:
      "Multivitamínico premium formulado pela equipe médica Longevify em doses terapêuticas.",
    longDescription:
      "Base diária com 32 micronutrientes em formas ativas (metilfolato, P-5-P, metilcobalamina, quelatos minerais). Dosagens ajustadas para o perfil de usuário com hábito preventivo — sem ferro, sem cálcio em excesso, com foco em cofatores de metilação e metabolismo mitocondrial. Substitui 4-5 frascos avulsos com melhor custo-benefício.",
    benefits: [
      "Formas ativas de vitaminas do complexo B",
      "Quelatos minerais de alta absorção",
      "Sem ferro (evita sobrecarga)",
      "Formulado por médicos Longevify",
    ],
    usage: "2 cápsulas ao dia, com a primeira refeição.",
    targetsBiomarkers: ["vitd", "ferritin"],
    rating: 4.9,
    reviewsCount: 156,
  },
  {
    id: "longevify-protein-plant",
    name: "Longevify Protein Plant",
    brand: "Longevify",
    category: "longevify-original",
    badge: "Exclusivo",
    priceBRL: 329,
    currency: "BRL",
    shortDescription:
      "Blend vegetal de ervilha e arroz com perfil completo de aminoácidos, 25g de proteína por dose.",
    longDescription:
      "Proteína vegetal combinando isolado de ervilha e concentrado de arroz integral, cobrindo todos os aminoácidos essenciais incluindo os BCAAs em proporção comparável ao whey. Baixo em FODMAPs, sem soja, sem açúcar adicionado. Adoçado com estévia orgânica. Suporta síntese proteica e preservação de massa magra.",
    benefits: [
      "25g de proteína completa por dose",
      "Sem lactose, soja ou glúten",
      "Baixo em FODMAPs",
      "Aminograma comparável ao whey",
    ],
    usage: "1 dose (35g) pós-treino ou entre refeições, em 300 ml de água ou leite vegetal.",
    targetsBiomarkers: ["testo", "ferritin"],
    rating: 4.7,
    reviewsCount: 284,
  },
  {
    id: "oura-ring-heritage",
    name: "Oura Ring Heritage Gen 3",
    brand: "Oura",
    category: "wearable",
    badge: "Top",
    priceBRL: 2499,
    currency: "BRL",
    shortDescription:
      "Anel inteligente que mede sono, HRV, temperatura corporal e prontidão com precisão clínica.",
    longDescription:
      "Oura Ring Gen 3 oferece o rastreamento de sono e recuperação mais validado cientificamente do mercado wearable. Mede estágios de sono, variabilidade da frequência cardíaca, frequência respiratória, temperatura corporal de pele e SpO2. Integra com Longevify via API para cruzamento com biomarcadores. Bateria de até 7 dias.",
    benefits: [
      "Tracking de sono com precisão clínica",
      "HRV noturno contínuo",
      "Temperatura corporal para detecção precoce",
      "Bateria de 7 dias",
    ],
    usage: "Uso contínuo no dedo indicador ou anelar, sincroniza via app Oura.",
    targetsBiomarkers: ["crp", "hba1c"],
    rating: 4.7,
    reviewsCount: 1890,
  },
  {
    id: "garmin-epix-pro",
    name: "Garmin Epix Pro Sapphire 47mm",
    brand: "Garmin",
    category: "wearable",
    priceBRL: 7990,
    currency: "BRL",
    shortDescription:
      "Relógio multiesportivo premium com VO2max, lactate threshold e tela AMOLED protegida por safira.",
    longDescription:
      "Top de linha da Garmin para atletas e entusiastas de performance. Mede VO2max, limiar de lactato, carga de treino e status de recuperação com algoritmos Firstbeat. GPS multibanda, mapas topográficos, lanterna LED embutida. Bateria de até 16 dias em uso smartwatch, 42h em GPS contínuo.",
    benefits: [
      "VO2max e limiar de lactato",
      "GPS multibanda de alta precisão",
      "Mapas topográficos offline",
      "Bateria de 16 dias",
    ],
    usage: "Uso contínuo no pulso. Sincroniza via Garmin Connect.",
    targetsBiomarkers: ["hba1c", "testo"],
    rating: 4.8,
    reviewsCount: 742,
  },
  {
    id: "whoop-4",
    name: "Whoop 4.0 (Membership 12 meses)",
    brand: "Whoop",
    category: "wearable",
    priceBRL: 1890,
    currency: "BRL",
    shortDescription:
      "Pulseira focada em carga de treino, recuperação e strain — sem tela, foco puro em dados.",
    longDescription:
      "Whoop é uma assinatura anual que inclui a pulseira 4.0 (sem custo separado de hardware). Mede continuamente HRV, frequência cardíaca, SpO2, temperatura de pele e sono com amostragem de alta frequência. Algoritmos de strain e recovery ajudam a calibrar intensidade de treino. Sem tela: filosofia 'screenless' para reduzir distração.",
    benefits: [
      "Strain e recovery diários",
      "HRV contínuo 24/7",
      "Bateria recarregável sem remover",
      "Sem tela, sem distração",
    ],
    usage: "Uso contínuo 24/7 no pulso ou bíceps (com sleeve). Sincroniza via app Whoop.",
    targetsBiomarkers: ["crp", "hba1c"],
    rating: 4.5,
    reviewsCount: 1120,
  },
  {
    id: "apple-watch-ultra",
    name: "Apple Watch Ultra 2",
    brand: "Apple",
    category: "wearable",
    priceBRL: 9299,
    currency: "BRL",
    shortDescription:
      "Smartwatch esportivo Apple com ECG, SpO2, temperatura do pulso e GPS dual-frequency.",
    longDescription:
      "Apple Watch Ultra 2 traz ECG de derivação única, SpO2 noturno, sensor de temperatura do pulso e GPS de banda dupla. Case em titânio, certificação IP6X e MIL-STD-810H, visor Always-On de 3000 nits. Longevify não revende o Ultra diretamente — este item é informativo para usuários que já possuem ou pretendem comprar pela Apple.",
    benefits: [
      "ECG derivação única",
      "Temperatura do pulso para ciclo e sono",
      "GPS banda dupla",
      "Ecossistema Apple Health",
    ],
    usage: "Compra direta via Apple. Integração com Longevify via Apple HealthKit.",
    targetsBiomarkers: ["crp"],
    rating: 4.8,
    reviewsCount: 3420,
  },
  {
    id: "withings-body-comp",
    name: "Withings Body Comp",
    brand: "Withings",
    category: "equipamento",
    priceBRL: 1490,
    currency: "BRL",
    shortDescription:
      "Balança de bioimpedância que mede composição corporal, idade vascular e saúde dos nervos.",
    longDescription:
      "Withings Body Comp mede peso, percentual de gordura, massa muscular segmentada, água corporal, massa óssea, gordura visceral, idade vascular (rigidez arterial estimada) e atividade do nervo (VNS score). Sincroniza via Wi-Fi com app Health Mate e pode integrar com Longevify via Withings API. Até 8 perfis de usuário.",
    benefits: [
      "Composição corporal segmentada",
      "Idade vascular estimada",
      "Sincronia Wi-Fi automática",
      "8 perfis familiares",
    ],
    usage: "Pesagem diária pela manhã, descalço, após acordar e usar o banheiro.",
    targetsBiomarkers: ["hba1c", "ldl", "apob"],
    rating: 4.6,
    reviewsCount: 678,
  },
  {
    id: "cgm-libre-3-kit",
    name: "FreeStyle Libre 3 — Kit inicial",
    brand: "Abbott",
    category: "equipamento",
    badge: "Novo",
    priceBRL: 1290,
    currency: "BRL",
    shortDescription:
      "Kit com 2 sensores CGM (28 dias) para monitorar glicose intersticial em tempo real.",
    longDescription:
      "O FreeStyle Libre 3 mede glicose intersticial a cada minuto, sem necessidade de picadas em dedo, com sensor do tamanho de uma moeda aplicado no braço. Kit inicial Longevify inclui 2 sensores (cobertura de 28 dias) e orientação da equipe médica para interpretar glicemia pós-prandial, variabilidade e curva em jejum. Ideal para investigação metabólica mesmo fora de quadro diabético.",
    benefits: [
      "Glicose intersticial contínua",
      "Picos pós-prandiais e variabilidade",
      "Sem picadas em dedo",
      "Orientação médica incluída",
    ],
    usage: "Aplicar no braço. Cada sensor dura 14 dias. Leitura via celular.",
    targetsBiomarkers: ["hba1c"],
    rating: 4.7,
    reviewsCount: 523,
  },
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductsByCategory(category: ProductCategory | "all"): Product[] {
  if (category === "all") return PRODUCTS;
  return PRODUCTS.filter((p) => p.category === category);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}
