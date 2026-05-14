import { PRODUCTS } from "@/lib/products";
import { PURCHASE_HISTORY } from "./purchase-history";

export type StockStatus =
  | "in-stock"
  | "running-out"
  | "out-of-stock"
  | "never-purchased";

/**
 * Estima o status do estoque de um suplemento com base no histórico de compras.
 *
 * Usa `durationDays` do produto (ou fallback 30) × quantidade de frascos.
 * - in-stock:        dias desde compra < 80% da duração total
 * - running-out:     80% ≤ dias < 100% da duração total
 * - out-of-stock:    dias ≥ duração total
 * - never-purchased: sem registro de compra
 *
 * NOTE: não usa Date.now() diretamente — quem chama deve usar useEffect
 * e passar `nowMs` pra evitar hydration mismatch.
 */
export function estimateStock(
  productId: string,
  nowMs: number,
): { status: StockStatus; daysSince: number; duration: number } {
  const purchases = PURCHASE_HISTORY.filter((p) => p.productId === productId);

  if (purchases.length === 0) {
    return { status: "never-purchased", daysSince: 0, duration: 0 };
  }

  // Pega a compra mais recente
  const last = purchases.sort((a, b) =>
    b.purchasedAt.localeCompare(a.purchasedAt),
  )[0];

  const product = PRODUCTS.find((p) => p.id === productId);
  const durationPerBottle = product?.durationDays ?? 30;
  const duration = durationPerBottle * last.quantity;
  const daysSince = Math.floor(
    (nowMs - new Date(last.purchasedAt).getTime()) / 86_400_000,
  );

  if (daysSince < duration * 0.8) return { status: "in-stock", daysSince, duration };
  if (daysSince < duration) return { status: "running-out", daysSince, duration };
  return { status: "out-of-stock", daysSince, duration };
}
