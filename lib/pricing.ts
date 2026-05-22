/**
 * Fórmula de precificação pra modelo dropshipping da Loja Longevify.
 *
 * Política: a Longevify NÃO cobra markup. O preço cobrado do cliente é
 * exatamente o custo no fornecedor + taxa do gateway de pagamento (Stripe).
 *
 * O objetivo é não perder dinheiro na operação — não lucrar com o produto.
 * A monetização da Longevify é via assinatura Premium, exames Longevify
 * (Painel Básico/Avançado/Microbioma) e Concierge clínico.
 *
 * ⚠️ Disclaimer obrigatório (CFM 1.974/2011 — conflito de interesse):
 * Toda página de produto curado precisa indicar "Curadoria médica
 * Longevify — operamos sem markup, o preço cobre apenas custos de
 * pagamento e intermediação."
 */

/**
 * Stripe Brasil — pricing 2026:
 *   - Cartão de crédito nacional: 3.99% + R$0.39 por transação aprovada
 *   - Cartão internacional: 4.99% + R$0.39
 *   - Pix:                   0.99%
 *   - Boleto:                R$3.45 + 1.5%
 *
 * Usamos o pior caso "padrão" (cartão nacional). Pra clientes que pagarem
 * Pix, sobra pequena diferença que cobre eventuais chargebacks/disputas.
 * Pra clientes em cartão internacional, a margem fica negativa em ~1% —
 * historicamente isso representa <5% das compras BR, então absorvemos.
 *
 * Se a Stripe mudar as taxas, mude aqui — é o único ponto de verdade.
 */
export const STRIPE_BR_PERCENT_FEE = 0.0399;
export const STRIPE_BR_FIXED_FEE_BRL = 0.39;

/**
 * Calcula o preço cobrado do cliente pra cobrir custo do fornecedor + taxa
 * de pagamento. Fórmula:
 *
 *   price = (cost + fixed_fee) / (1 - percent_fee)
 *
 * Derivação:
 *   liquido_recebido = price - (price * percent_fee + fixed_fee)
 *   queremos liquido_recebido === cost
 *   => cost = price * (1 - percent_fee) - fixed_fee
 *   => price = (cost + fixed_fee) / (1 - percent_fee)
 *
 * Arredondamos pra cima ao real inteiro mais próximo pra dar margem de
 * segurança em cents (~R$0,30 a R$0,90 dependendo do produto) — esse
 * pequeno sobreprice cobre arredondamento, eventual chargeback e variação
 * cambial pequena de fornecedores que reajustam preço.
 */
export function calculateClientPrice(costBRL: number): number {
  const raw = (costBRL + STRIPE_BR_FIXED_FEE_BRL) / (1 - STRIPE_BR_PERCENT_FEE);
  return Math.ceil(raw);
}

/**
 * Quanto da venda vai pra taxa Stripe (transparência pro cliente).
 */
export function calculatePaymentFee(priceBRL: number): number {
  return Math.round((priceBRL * STRIPE_BR_PERCENT_FEE + STRIPE_BR_FIXED_FEE_BRL) * 100) / 100;
}

/**
 * Decompõe o preço cobrado em (custo fornecedor, taxa pagamento) — usado
 * em página de produto pra mostrar "Você paga R$X, sendo R$Y produto e
 * R$Z taxa do gateway de pagamento — Longevify não cobra margem."
 */
export interface PriceBreakdown {
  /** Preço cobrado do cliente */
  totalBRL: number;
  /** Custo no fornecedor oficial */
  productCostBRL: number;
  /** Taxa de gateway (Stripe) */
  paymentFeeBRL: number;
  /** Diferença (positiva = absorvida pela Longevify; negativa = nunca) */
  longevifyMarginBRL: number;
}

export function decomposePrice(
  costBRL: number,
  totalBRL: number,
): PriceBreakdown {
  const paymentFeeBRL = calculatePaymentFee(totalBRL);
  return {
    totalBRL,
    productCostBRL: costBRL,
    paymentFeeBRL,
    longevifyMarginBRL: Math.round((totalBRL - costBRL - paymentFeeBRL) * 100) / 100,
  };
}
