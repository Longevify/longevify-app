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

export const PLANS: Plan[] = [
  {
    id: "essential-anual",
    name: "Essential",
    tagline: "O ponto de partida pra começar a cuidar com método.",
    priceBRL: 3600,
    interval: "year",
    cta: "Assinar Essential",
    features: [
      "1 coleta de sangue/ano (50+ biomarcadores)",
      "Plataforma Longevify completa",
      "Concierge IA com seu histórico",
      "Protocolo personalizado de longevidade",
      "Integrações com wearables",
    ],
  },
  {
    id: "premium-anual",
    name: "Premium",
    tagline: "O plano mais completo — recomendado pra maioria.",
    priceBRL: 4800,
    interval: "year",
    highlight: true,
    badge: "Mais popular",
    cta: "Assinar Premium",
    features: [
      "2 coletas de sangue/ano (50+ biomarcadores)",
      "Tudo do Essential",
      "Médico Longevify trimestral (4 consultas)",
      "Revisão clínica do protocolo a cada exame",
      "Suporte prioritário",
    ],
  },
  {
    id: "concierge-anual",
    name: "Concierge",
    tagline: "Acompanhamento exclusivo com exames avançados bancados.",
    priceBRL: 12000,
    interval: "year",
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
