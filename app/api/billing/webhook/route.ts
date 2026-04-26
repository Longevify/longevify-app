import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

const HANDLED_EVENTS = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    console.warn(
      "[billing/webhook] STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET ausente — webhook em modo no-op.",
    );
    return new Response("Webhook disabled (demo mode).", { status: 200 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header.", { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[billing/webhook] signature verification failed", message);
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    console.log("[billing/webhook] received unhandled event", event.type);
    return new Response("ok", { status: 200 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[billing/webhook] checkout.session.completed", {
        id: session.id,
        customer: session.customer,
        planId: session.metadata?.planId,
        amount: session.amount_total,
      });
      // Wave 3+: persistir em Supabase (subscriptions, profiles).
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      console.log("[billing/webhook]", event.type, {
        id: sub.id,
        status: sub.status,
        customer: sub.customer,
      });
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("[billing/webhook]", event.type, {
        id: invoice.id,
        customer: invoice.customer,
        amount_paid: invoice.amount_paid,
      });
      break;
    }
  }

  return new Response("ok", { status: 200 });
}
