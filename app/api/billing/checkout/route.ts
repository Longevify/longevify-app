import { NextRequest } from "next/server";
import {
  computeFinalPrice,
  getPlanById,
  type PaymentMethod,
} from "@/lib/billing/plans";
import { getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

interface CheckoutRequest {
  planId: string;
  paymentMethod: PaymentMethod;
}

const VALID_METHODS: PaymentMethod[] = ["card", "pix", "boleto"];

export async function POST(request: NextRequest) {
  let body: CheckoutRequest;
  try {
    body = (await request.json()) as CheckoutRequest;
  } catch {
    return Response.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const { planId, paymentMethod } = body;
  if (!planId || !paymentMethod) {
    return Response.json(
      { error: "planId e paymentMethod são obrigatórios." },
      { status: 400 },
    );
  }
  if (!VALID_METHODS.includes(paymentMethod)) {
    return Response.json(
      { error: `paymentMethod inválido: ${paymentMethod}` },
      { status: 400 },
    );
  }

  const plan = getPlanById(planId);
  if (!plan) {
    return Response.json(
      { error: `Plano não encontrado: ${planId}` },
      { status: 404 },
    );
  }

  const pricing = computeFinalPrice(plan, paymentMethod);
  const origin = request.nextUrl.origin;
  const successUrl = `${origin}/planos/${plan.id}/sucesso?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/planos/${plan.id}`;

  const stripe = getStripeClient();
  const priceIdForMethod = plan.stripePriceId?.[paymentMethod];

  // Demo mode: Stripe não configurado OU price IDs não preenchidos.
  if (!stripe || !priceIdForMethod) {
    return Response.json({
      url: `/planos/${plan.id}/sucesso?demo=true`,
      demo: true,
    });
  }

  try {
    // Pix e boleto são one-shot (não há subscription nativa).
    // Cartão usa subscription (renovação anual automática).
    const isSubscription = paymentMethod === "card";
    const paymentMethodTypes: ("card" | "pix" | "boleto")[] =
      paymentMethod === "card"
        ? ["card"]
        : paymentMethod === "pix"
          ? ["pix"]
          : ["boleto"];

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: priceIdForMethod, quantity: 1 }],
      payment_method_types: paymentMethodTypes,
      locale: "pt-BR",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        planId: plan.id,
        paymentMethod,
        totalBRL: String(pricing.total),
      },
      ...(isSubscription
        ? {
            subscription_data: {
              metadata: { planId: plan.id },
            },
          }
        : {
            payment_intent_data: {
              metadata: { planId: plan.id, paymentMethod },
            },
          }),
    });

    if (!session.url) {
      return Response.json(
        { error: "Stripe não retornou URL da sessão." },
        { status: 500 },
      );
    }
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[billing/checkout] stripe error", err);
    return Response.json(
      {
        error: "Falha ao criar sessão de pagamento.",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}
