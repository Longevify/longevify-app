#!/usr/bin/env node
/**
 * Cria 4 products + 12 prices no Stripe (test mode).
 * - 4 plans: Individual, Premium, Trio, Concierge
 * - Cada plano: 3 prices (cartao recorrente anual, Pix one-shot c/ 5% off, Boleto one-shot)
 *
 * Run: node scripts/create-stripe-products.mjs
 *
 * Output: imprime os 12 price IDs em formato pra colar em lib/billing/plans.ts
 */

const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(1);
}

const STRIPE = "https://api.stripe.com/v1";
const headers = {
  Authorization: `Basic ${Buffer.from(SECRET + ":").toString("base64")}`,
  "Content-Type": "application/x-www-form-urlencoded",
};

async function stripe(path, body) {
  const r = await fetch(STRIPE + path, {
    method: "POST",
    headers,
    body: body
      ? new URLSearchParams(body).toString()
      : undefined,
  });
  const j = await r.json();
  if (!r.ok) {
    console.error(`Stripe ${path} ERROR:`, JSON.stringify(j, null, 2));
    process.exit(1);
  }
  return j;
}

const PLANS = [
  {
    id: "individual-anual",
    name: "Plano Individual Anual",
    description:
      "100+ biomarcadores em 1 coleta domiciliar/ano + plataforma Longevify completa + Concierge IA.",
    priceBRL: 3000, // valor cheio cartao em reais
    pixDiscountPct: 5,
  },
  {
    id: "premium-anual",
    name: "Plano Premium Anual",
    description:
      "2 coletas/ano + Medico Longevify trimestral + revisao clinica do protocolo + suporte prioritario.",
    priceBRL: 4800,
    pixDiscountPct: 5,
  },
  {
    id: "trio-anual",
    name: "Plano Trio Anual",
    description:
      "3 assinaturas Individual com painel da familia compartilhado + coleta domiciliar coordenada.",
    priceBRL: 7560,
    pixDiscountPct: 5,
  },
  {
    id: "concierge-anual",
    name: "Plano Concierge Anual",
    description:
      "Acompanhamento exclusivo com DEXA, VO2max, RM corpo inteiro e CGM ilimitado bancados.",
    priceBRL: 12000,
    pixDiscountPct: 5,
  },
];

const result = {};

for (const plan of PLANS) {
  console.log(`\nCreating product: ${plan.name}`);
  const product = await stripe("/products", {
    name: plan.name,
    description: plan.description,
    "metadata[longevify_plan_id]": plan.id,
  });

  const fullCents = plan.priceBRL * 100;
  const pixCents = Math.round(fullCents * (1 - plan.pixDiscountPct / 100));

  // 1) Cartao - subscription anual recorrente
  const cardPrice = await stripe("/prices", {
    product: product.id,
    currency: "brl",
    unit_amount: String(fullCents),
    "recurring[interval]": "year",
    nickname: `${plan.name} - Cartao 12x`,
  });

  // 2) Pix - pagamento one-shot com desconto 5%
  const pixPrice = await stripe("/prices", {
    product: product.id,
    currency: "brl",
    unit_amount: String(pixCents),
    nickname: `${plan.name} - Pix a vista (5% off)`,
  });

  // 3) Boleto - pagamento one-shot full price
  const boletoPrice = await stripe("/prices", {
    product: product.id,
    currency: "brl",
    unit_amount: String(fullCents),
    nickname: `${plan.name} - Boleto a vista`,
  });

  result[plan.id] = {
    product: product.id,
    card: cardPrice.id,
    pix: pixPrice.id,
    boleto: boletoPrice.id,
  };

  console.log("  product:", product.id);
  console.log("  card:   ", cardPrice.id);
  console.log("  pix:    ", pixPrice.id);
  console.log("  boleto: ", boletoPrice.id);
}

console.log("\n========================================");
console.log("ALL PRICE IDS - cole em lib/billing/plans.ts");
console.log("========================================");
console.log(JSON.stringify(result, null, 2));
