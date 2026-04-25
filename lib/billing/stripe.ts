import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (cached) return cached;
  cached = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    appInfo: {
      name: "longevify-app",
      version: "0.1.0",
    },
  });
  return cached;
}
