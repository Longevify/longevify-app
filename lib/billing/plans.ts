export type BillingInterval = "year" | "month";
export type PaymentMethod = "card" | "pix" | "boleto";

export interface PlanStripePrices {
  card?: string;
  pix?: string;
  boleto?: string;
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  priceBRL: number;
  interval: BillingInterval;
  features: string[];
  highlight?: boolean;
  cta: string;
  badge?: string;
  stripePriceId?: PlanStripePrices;
}

/**
 * Preços oficiais extraídos de longevify.com.br:
 *  - Individual: R$250/mês cobrado anualmente como R$3.000 (de R$3.600)
 *  - Trio Bundle: R$210/mês × 3 = R$7.560/ano (de R$9.000)
 *  - Concierge: produto premium com exames avançados bancados
 */
export interface PlanMonthlyDisplay {
  /** valor "fictício" mensal pra exibição (R$250/mês) — cobrado anualmente */
  monthlyDisplayBRL: number;
  /** valor cheio sem desconto (mostrado riscado) */
  strikePriceBRL?: number;
}

export const PLANS: (Plan & { monthly?: PlanMonthlyDisplay })[] = [
  {
    id: "individual-anual",
    name: "Individual",
    tagline:
      "Tudo o que você precisa pra começar — coleta domiciliar, plataforma e concierge IA.",
    priceBRL: 3000,
    interval: "year",
    monthly: { monthlyDisplayBRL: 250, strikePriceBRL: 3600 },
    badge: "Oferta",
    cta: "Assinar Individual",
    features: [
      "100+ biomarcadores em 1 coleta/ano",
      "Coleta em domicílio (Profissional vai até você)",
      "Plataforma Longevify completa",
      "Concierge IA com seu histórico clínico",
      "Detecção precoce de 1.000+ condições",
      "Integração com wearables",
    ],
  },
  {
    id: "premium-anual",
    name: "Premium",
    tagline: "Acompanhamento médico ativo — 2 coletas/ano + revisão clínica.",
    priceBRL: 4800,
    interval: "year",
    monthly: { monthlyDisplayBRL: 400 },
    highlight: true,
    badge: "Mais popular",
    cta: "Assinar Premium",
    features: [
      "Tudo do Individual, com 2 coletas/ano",
      "Médico Longevify trimestral (4 consultas)",
      "Revisão clínica do protocolo a cada exame",
      "Painel avançado de colesterol incluso",
      "Suporte prioritário",
    ],
  },
  {
    id: "trio-anual",
    name: "Trio Bundle",
    tagline: "Pra você, parceiro(a) e mais alguém — 3 assinaturas com 16% off.",
    priceBRL: 7560,
    interval: "year",
    monthly: { monthlyDisplayBRL: 210, strikePriceBRL: 9000 },
    cta: "Assinar Trio",
    badge: "Em casal/família",
    features: [
      "3 assinaturas Individual completas",
      "Painel da família compartilhado (com permissão)",
      "Coleta em domicílio coordenada",
      "Desconto progressivo em exames adicionais",
    ],
  },
  {
    id: "concierge-anual",
    name: "Concierge",
    tagline: "Acompanhamento exclusivo com exames avançados bancados.",
    priceBRL: 12000,
    interval: "year",
    monthly: { monthlyDisplayBRL: 1000 },
    cta: "Falar com a Longevify",
    features: [
      "Tudo do Premium",
      "Médico Longevify mensal (12 consultas)",
      "DEXA scan anual",
      "VO2max em laboratório",
      "Ressonância de corpo inteiro a cada 2 anos",
      "CGM (monitor de glicose) ilimitado",
      "Linha direta concierge 24/7",
    ],
  },
];

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export interface PaymentMethodInfo {
  id: PaymentMethod;
  label: string;
  description: string;
  discountPct: number;
  installments: number;
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: "card",
    label: "Cartão de crédito",
    description: "Em até 12x sem juros.",
    discountPct: 0,
    installments: 12,
  },
  {
    id: "pix",
    label: "Pix à vista",
    description: "5% de desconto no valor anual.",
    discountPct: 5,
    installments: 1,
  },
  {
    id: "boleto",
    label: "Boleto à vista",
    description: "Sem desconto, compensação em 1-2 dias úteis.",
    discountPct: 0,
    installments: 1,
  },
];

export function getPaymentMethod(id: PaymentMethod): PaymentMethodInfo {
  const method = PAYMENT_METHODS.find((p) => p.id === id);
  if (!method) throw new Error(`Unknown payment method: ${id}`);
  return method;
}

export function computeFinalPrice(
  plan: Plan,
  method: PaymentMethod,
): { total: number; discount: number; installmentValue: number; installments: number } {
  const info = getPaymentMethod(method);
  const discount = Math.round((plan.priceBRL * info.discountPct) / 100);
  const total = plan.priceBRL - discount;
  const installmentValue = Math.round(total / info.installments);
  return {
    total,
    discount,
    installmentValue,
    installments: info.installments,
  };
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
